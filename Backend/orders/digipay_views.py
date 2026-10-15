"""DigiPay UPG callback and order payment endpoints.

Do not use in live mode until Digipay confirms amount units and basket metadata.
"""
import logging
import uuid
from decimal import Decimal
from urllib.parse import urlencode, urlparse

from django.conf import settings
from django.db import transaction
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from users.authentication import CSRFSessionAuthentication

from .models import Order, DigiPayAttempt
from .services import clear_purchased_cart
from .payments.digipay import DigipayConfig, DigipayUPG, DigipayError

logger = logging.getLogger(__name__)
ALLOWED_TYPES = {0, 5, 11, 13, 24}


def enabled():
    return bool(getattr(settings, "DIGIPAY_ENABLED", False) and
                getattr(settings, "PAYMENT_BACKEND", "") == "digipay")


def convert_amount(total):
    source = getattr(settings, "DIGIPAY_STORE_AMOUNT_UNIT", "")
    target = getattr(settings, "DIGIPAY_AMOUNT_UNIT", "")
    if source not in {"rial", "toman"} or target not in {"rial", "toman"}:
        raise ValueError("Currency units are not explicitly configured")
    value = Decimal(total)
    if value <= 0 or value != value.to_integral_value():
        raise ValueError("Invalid order amount")
    if source == "toman" and target == "rial":
        value *= 10
    elif source == "rial" and target == "toman":
        if value % 10:
            raise ValueError("Cannot convert amount to whole tomans")
        value /= 10
    return int(value)


def checked_url(value, *, callback=False):
    parsed = urlparse(value)
    if parsed.scheme != "https" or not parsed.netloc or parsed.username or parsed.password or parsed.fragment:
        raise ValueError("HTTPS URL is required")
    if callback and not parsed.path.endswith("/api/payments/digipay/callback/"):
        raise ValueError("Unexpected callback path")
    return value


def get_client():
    return DigipayUPG(DigipayConfig.from_django())


def basket_for_order(order):
    """Build a single-vendor basket using stable merchant-defined IDs.

    Seller/supplier identifiers are created once and stored in the server's
    environment. Do not regenerate them per order. Category uses the shop's
    own category ID unless an explicitly configured override is supplied.
    Merchant-defined identifier acceptance must be validated with DigiPay.
    """
    s = settings
    seller = str(getattr(s, "DIGIPAY_SELLER_ID", "") or "").strip()
    supplier = str(getattr(s, "DIGIPAY_SUPPLIER_ID", "") or "").strip()
    brand = str(getattr(s, "DIGIPAY_BRAND", "") or "").strip()
    category_override = str(getattr(s, "DIGIPAY_CATEGORY_ID", "") or "").strip()
    product_type_raw = str(getattr(s, "DIGIPAY_PRODUCT_TYPE", "") or "").strip()

    if not seller or not supplier or not brand or not product_type_raw:
        raise ValueError("Seller, supplier, brand and product type must be configured")
    try:
        product_type = int(product_type_raw)
    except (ValueError, TypeError):
        raise ValueError("Invalid product type") from None
    if product_type not in (1, 2, 3, 4):
        raise ValueError("Invalid product type")

    items = []
    for item in order.items.select_related("product__category").all():
        sku = str(item.sku or "").strip()
        if not sku:
            raise ValueError("Basket product lacks SKU")
        # The source Category.pk is internal to leather-store, not a verified
        # DigiPay taxonomy identifier. Override with the DigiPay-approved value
        # if the gateway rejects these merchant-defined values.
        category = category_override or str(item.product.category_id or "")
        if not category:
            raise ValueError("Basket product lacks category ID")
        items.append({
            "sellerId": seller,
            "supplierId": supplier,
            "productCode": sku,
            "brand": brand,
            "productType": product_type,
            "count": item.quantity,
            "categoryId": category,
        })
    if not items:
        raise ValueError("Basket is empty")
    return {"basketId": str(order.number), "items": items}


class DigiPayStartAPIView(APIView):
    authentication_classes = [CSRFSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, number):
        if not enabled():
            return Response({"detail": "درگاه دیجی‌پی هنوز فعال نشده است."}, status=503)
        order = get_object_or_404(Order.objects.prefetch_related("items"), number=number, user=request.user)
        if order.status != Order.Status.PENDING or order.payment_mode != "digipay" or order.expires_at <= timezone.now():
            return Response({"detail": "این سفارش قابل پرداخت نیست."}, status=409)
        try:
            amount = convert_amount(order.total)
            basket = basket_for_order(order)
            callback_url = checked_url(settings.DIGIPAY_CALLBACK_URL, callback=True)
            checked_url(settings.DIGIPAY_RETURN_URL)
        except (ValueError, AttributeError, TypeError):
            return Response({"detail": "تنظیمات پرداخت هنوز کامل نشده است."}, status=503)

        # A unique attempt is created before external I/O. No automatic retries
        # after uncertain timeouts: manual reconciliation is mandatory.
        with transaction.atomic():
            locked = get_object_or_404(Order.objects.select_for_update(), pk=order.pk)
            if locked.status != Order.Status.PENDING or locked.expires_at <= timezone.now():
                return Response({"detail": "این سفارش قابل پرداخت نیست."}, status=409)
            if DigiPayAttempt.objects.filter(order=locked).exists():
                return Response({"detail": "برای این سفارش درخواست پرداخت قبلاً ثبت شده است. وضعیت آن را بررسی کنید."}, status=409)
            attempt = DigiPayAttempt.objects.create(
                order=locked, provider_id=uuid.uuid4().hex,
                expected_amount=amount, state=DigiPayAttempt.State.STARTING)

        try:
            result = get_client().create_ticket(phone=order.phone, amount=amount,
                provider_id=attempt.provider_id, callback_url=callback_url, basket=basket)
        except (DigipayError, ValueError) as exc:
            logger.warning("DigiPay ticket unresolved: %s", getattr(exc, "category", "configuration"))
            DigiPayAttempt.objects.filter(pk=attempt.pk, state=DigiPayAttempt.State.STARTING).update(
                state=DigiPayAttempt.State.REVIEW)
            return Response({"detail": "نتیجه درخواست پرداخت نامشخص است؛ برای جلوگیری از برداشت تکراری، پیگیری لازم است."}, status=502)

        with transaction.atomic():
            locked = DigiPayAttempt.objects.select_for_update().get(pk=attempt.pk)
            locked.ticket = result["ticket"]
            locked.redirect_url = result["redirectUrl"]
            if locked.state == DigiPayAttempt.State.STARTING:
                locked.state = DigiPayAttempt.State.REDIRECT
            locked.save(update_fields=["ticket", "redirect_url", "state", "updated_at"])
        return Response({"redirectUrl": result["redirectUrl"], "orderNumber": str(order.number)})


class DigiPayStatusAPIView(APIView):
    authentication_classes = [CSRFSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, number):
        order = get_object_or_404(Order, number=number, user=request.user)
        attempt = DigiPayAttempt.objects.filter(order=order).first()
        if order.status == Order.Status.PAID:
            clear_purchased_cart(request.session, order)
        return Response({"orderNumber": str(order.number), "orderStatus": order.status,
                         "paymentStatus": attempt.state if attempt else "not_started"})


def _callback_return(order_number, outcome):
    try:
        base = checked_url(settings.DIGIPAY_RETURN_URL)
    except (ValueError, AttributeError):
        return HttpResponse("Payment processed. Return to your shop.", status=200)
    glue = "&" if "?" in base else "?"
    return HttpResponseRedirect(base + glue + urlencode({"order": order_number, "payment": outcome}), status=303)


@csrf_exempt
@transaction.non_atomic_requests
# DigiPay sends an unauthenticated POST. Its contents are NOT proof of payment.
def digipay_callback(request):
    if request.method != "POST":
        return HttpResponse(status=405)
    if not enabled():
        return HttpResponse(status=503)
    if request.content_type and request.content_type.startswith("application/json"):
        import json
        try:
            payload = json.loads(request.body)
        except (ValueError, UnicodeDecodeError):
            return HttpResponse(status=400)
    else:
        payload = request.POST
    provider_id = str(payload.get("providerId", ""))
    code = str(payload.get("trackingCode", ""))
    result = str(payload.get("result", ""))
    try:
        amount = int(payload.get("amount", ""))
        ptype = int(payload.get("type", ""))
    except (ValueError, TypeError):
        return HttpResponse(status=400)
    if len(provider_id) > 80 or len(code) > 120 or ptype not in ALLOWED_TYPES:
        return HttpResponse(status=400)

    with transaction.atomic():
        attempt = DigiPayAttempt.objects.select_for_update().select_related("order").filter(provider_id=provider_id).first()
        if attempt is None:
            return HttpResponse(status=404)
        order_number = str(attempt.order.number)
        if amount != attempt.expected_amount:
            attempt.state = DigiPayAttempt.State.REVIEW
            attempt.save(update_fields=["state", "updated_at"])
            return _callback_return(order_number, "review")
        if attempt.state == DigiPayAttempt.State.VERIFIED:
            return _callback_return(order_number, "success")
        if attempt.state in (DigiPayAttempt.State.VERIFYING, DigiPayAttempt.State.REVIEW):
            return _callback_return(order_number, "review")
        if result != "SUCCESS" or not code:
            # A failure callback is not proof that a pending operation can never settle.
            attempt.state = DigiPayAttempt.State.REVIEW
            attempt.save(update_fields=["state", "updated_at"])
            return _callback_return(order_number, "review")
        attempt.state = DigiPayAttempt.State.VERIFYING
        attempt.tracking_code = code
        attempt.payment_type = ptype
        attempt.save(update_fields=["state", "tracking_code", "payment_type", "updated_at"])
        attempt_id = attempt.pk
        expected_amount = attempt.expected_amount

    try:
        receipt = get_client().verify(provider_id=provider_id, tracking_code=code,
                                      payment_type=ptype, expected_amount=expected_amount)
    except (DigipayError, ValueError) as exc:
        logger.warning("DigiPay verification unresolved: %s", getattr(exc, "category", "configuration"))
        DigiPayAttempt.objects.filter(pk=attempt_id, state=DigiPayAttempt.State.VERIFYING).update(state=DigiPayAttempt.State.REVIEW)
        return _callback_return(order_number, "review")

    with transaction.atomic():
        attempt = DigiPayAttempt.objects.select_for_update().select_related("order").get(pk=attempt_id)
        order = Order.objects.select_for_update().get(pk=attempt.order_id)
        if attempt.state != DigiPayAttempt.State.VERIFYING or order.status not in (Order.Status.PENDING, Order.Status.PAID):
            attempt.state = DigiPayAttempt.State.REVIEW
            attempt.save(update_fields=["state", "updated_at"])
            return _callback_return(order_number, "review")
        # The remote confirmation is authoritative; callback fields alone are not.
        if order.status == Order.Status.PENDING:
            order.status = Order.Status.PAID
            order.paid_at = timezone.now()
            order.save(update_fields=["status", "paid_at"])
        attempt.state = DigiPayAttempt.State.VERIFIED
        attempt.verified_at = timezone.now()
        attempt.save(update_fields=["state", "verified_at", "updated_at"])
    return _callback_return(order_number, "success")


class DigiPayModeAPIView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        mode = getattr(settings, "PAYMENT_BACKEND", "test")
        return Response({
            "mode": "digipay" if enabled() else ("test" if settings.DEBUG and mode == "test" else "unavailable"),
        })