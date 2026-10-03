from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework.exceptions import ValidationError

from products.models import Product, Category, ProductVariant
from products.views import get_visible_category_ids
from products.variants import sync_legacy_stock
from carts.services import normalize_cart
from users.models import CustomerProfile, Address

from .models import Order, OrderItem, ShippingMethod


def cart_quantities(session):
    normalized = normalize_cart(session.get("cart", {}), strict=True)
    result = {int(key[2:]): value["quantity"] for key, value in normalized.items()}
    if not result or len(result) > 100:
        raise ValidationError("سبد خالی است یا بیش از ظرفیت مجاز است.")
    session["cart"] = normalized
    return result


@transaction.atomic
def create_order(user, session, data):
    # ثبت‌های هم‌زمان همین کاربر پشت سر هم پردازش می‌شوند.
    get_user_model().objects.select_for_update().get(
        pk=user.pk,
    )

    existing = Order.objects.filter(
        user=user,
        idempotency_key=data["idempotency_key"],
    ).first()

    if existing:
        return existing, False

    profile = get_object_or_404(
        CustomerProfile.objects.select_for_update(),
        user=user,
    )

    if not profile.is_complete:
        raise ValidationError({
            "detail": "ابتدا پروفایل خود را کامل کنید."
        })

    address = get_object_or_404(
        Address.objects.select_for_update(),
        pk=data["address_id"],
        profile=profile,
    )

    address_complete = all([
        address.title.strip(),
        address.province.strip(),
        address.city.strip(),
        address.address_line.strip(),
        address.postal_code.strip(),
    ])

    if not address_complete:
        raise ValidationError({
            "detail": "آدرس انتخاب‌شده کامل نیست."
        })

    shipping = get_object_or_404(
        ShippingMethod.objects.select_for_update(),
        pk=data["shipping_method_id"],
        is_active=True,
    )

    if shipping.fee < 0:
        raise ValidationError({
            "detail": "هزینه ارسال معتبر نیست."
        })

    quantities = cart_quantities(session)

    # A consistent product -> variant lock order is shared with release_stock.
    product_ids = list(ProductVariant.objects.filter(pk__in=quantities).values_list("product_id", flat=True))
    products = {p.id: p for p in Product.objects.select_for_update().filter(pk__in=product_ids).order_by("pk")}
    variants = list(ProductVariant.objects.select_for_update().filter(pk__in=quantities).order_by("pk"))
    visible_categories = get_visible_category_ids()
    if len(variants) != len(quantities):
        raise ValidationError("بعضی اقلام دیگر موجود نیستند.")
    subtotal = Decimal("0")
    for variant in variants:
        product = products[variant.product_id]
        if not variant.is_active or not product.is_active or product.category_id not in visible_categories:
            raise ValidationError(f"محصول {product.name} غیرفعال است.")
        if variant.stock < quantities[variant.pk]:
            raise ValidationError(f"موجودی رنگ/سایز انتخاب‌شدهٔ {product.name} کافی نیست.")
        if variant.price < 0:
            raise ValidationError("قیمت معتبر نیست.")
        subtotal += variant.price * quantities[variant.pk]

    order = Order.objects.create(
        user=user,
        idempotency_key=data["idempotency_key"],

        recipient_name=(
            f"{profile.first_name} {profile.last_name}"
        ),
        phone=profile.phone,

        address_title=address.title,
        province=address.province,
        city=address.city,
        address_line=address.address_line,
        postal_code=address.postal_code,
        landline=address.landline,

        shipping_name=shipping.name,
        subtotal=subtotal,
        shipping_fee=shipping.fee,
        total=subtotal + shipping.fee,

        expires_at=timezone.now() + timedelta(
            minutes=getattr(
                settings,
                "ORDER_RESERVATION_MINUTES",
                15,
            )
        ),
    )

    for variant in variants:
        product = products[variant.product_id]
        quantity = quantities[variant.pk]
        OrderItem.objects.create(order=order, product=product, variant=variant, cart_key=f"v:{variant.id}",
            name=product.name, sku=variant.sku, color=variant.color, size=variant.size,
            material=product.material, quantity=quantity, unit_price=variant.price,
            item_total=variant.price * quantity)
        variant.stock -= quantity
        variant.save(update_fields=["stock"])
    sync_legacy_stock(products.keys())

    return order, True


def release_stock(order):
    items = list(order.items.all())
    products = {p.id: p for p in Product.objects.select_for_update().filter(pk__in=[i.product_id for i in items]).order_by("pk")}
    variants = {v.id: v for v in ProductVariant.objects.select_for_update().filter(pk__in=[i.variant_id for i in items if i.variant_id]).order_by("pk")}
    for item in items:
        if item.variant_id:
            variant = variants[item.variant_id]
            variant.stock += item.quantity
            variant.save(update_fields=["stock"])
        else:
            product = products[item.product_id]
            product.stock += item.quantity
            product.save(update_fields=["stock"])
    sync_legacy_stock({i.product_id for i in items if i.variant_id})


@transaction.atomic
def finish_order(user, number, action):
    order = get_object_or_404(
        Order.objects.select_for_update(),
        user=user,
        number=number,
    )

    if order.status != Order.Status.PENDING:
        return order, False

    if order.expires_at <= timezone.now():
        release_stock(order)
        order.status = Order.Status.EXPIRED

    elif action == "cancel":
        release_stock(order)
        order.status = Order.Status.CANCELLED

    elif action == "pay":
        order.status = Order.Status.PAID
        order.paid_at = timezone.now()

    else:
        raise ValidationError({
            "detail": "عملیات معتبر نیست."
        })

    order.save(update_fields=["status", "paid_at"])

    return order, order.status == Order.Status.PAID


@transaction.atomic
def expire_one(number):
    order = (
        Order.objects
        .select_for_update()
        .filter(number=number)
        .first()
    )

    if (
        order
        and order.status == Order.Status.PENDING
        and order.expires_at <= timezone.now()
    ):
        release_stock(order)

        order.status = Order.Status.EXPIRED
        order.save(update_fields=["status"])

        return True

    return False


def expire_orders(user=None):
    query = Order.objects.filter(
        status=Order.Status.PENDING,
        expires_at__lte=timezone.now(),
    )

    if user is not None:
        query = query.filter(user=user)

    numbers = list(
        query.values_list("number", flat=True)
    )

    return sum(
        expire_one(number)
        for number in numbers
    )


def clear_purchased_cart(session, order):
    # فقط سبد نشست مربوط به همین سفارش تغییر می‌کند.
    if session.get("checkout_order") != str(order.number):
        return

    cart = normalize_cart(session.get("cart", {}))

    for item in order.items.all():
        key = f"v:{item.variant_id}" if item.variant_id else str(item.product_id)
        stored = cart.get(key)

        if (
            isinstance(stored, dict)
            and stored.get("is_deleted") is True
        ):
            continue

        quantity = (
            stored.get("quantity")
            if isinstance(stored, dict)
            else stored
        )

        if (
            type(quantity) is not int
            or quantity < item.quantity
        ):
            continue

        remaining = quantity - item.quantity

        if remaining == 0:
            cart.pop(key, None)

        elif isinstance(stored, dict):
            stored["quantity"] = remaining

        else:
            cart[key] = remaining

    session["cart"] = cart
    session.pop("checkout_order", None)
    session.modified = True

