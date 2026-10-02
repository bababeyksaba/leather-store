from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework.exceptions import ValidationError

from products.models import Product, Category
from users.models import CustomerProfile, Address

from .models import Order, OrderItem, ShippingMethod


def cart_quantities(session):
    raw = session.get("cart", {})

    if not isinstance(raw, dict):
        raise ValidationError({
            "detail": "سبد خرید معتبر نیست."
        })

    result = {}

    for key, value in raw.items():
        if (
            isinstance(value, dict)
            and value.get("is_deleted") is True
        ):
            continue

        quantity = (
            value.get("quantity")
            if isinstance(value, dict)
            else value
        )

        valid = (
            str(key).isascii()
            and str(key).isdecimal()
            and int(key) >= 1
            and type(quantity) is int
            and 1 <= quantity <= 10000
        )

        if not valid:
            raise ValidationError({
                "detail": (
                    "تعداد یا شناسه محصول در سبد معتبر نیست."
                )
            })

        product_id = int(key)

        if product_id in result:
            raise ValidationError({
                "detail": "شناسه محصول در سبد تکراری است."
            })

        result[product_id] = quantity

    if not result or len(result) > 100:
        raise ValidationError({
            "detail": "سبد خالی است یا بیش از ظرفیت مجاز است."
        })

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

    products = list(
        Product.objects
        .select_for_update()
        .filter(pk__in=quantities)
        .order_by("pk")
    )

    categories = {
        category.pk: category
        for category in (
            Category.objects
            .select_for_update()
            .filter(
                pk__in={
                    product.category_id
                    for product in products
                }
            )
            .order_by("pk")
        )
    }

    if len(products) != len(quantities):
        raise ValidationError({
            "detail": "بعضی محصولات دیگر موجود نیستند."
        })

    subtotal = Decimal("0")

    for product in products:
        if (
            not product.is_active
            or not categories[product.category_id].is_active
        ):
            raise ValidationError({
                "detail": f"محصول {product.name} غیرفعال است."
            })

        if product.stock < quantities[product.pk]:
            raise ValidationError({
                "detail": f"موجودی {product.name} کافی نیست."
            })

        if product.price < 0:
            raise ValidationError({
                "detail": "قیمت محصول معتبر نیست."
            })

        subtotal += (
            product.price * quantities[product.pk]
        )

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

    for product in products:
        quantity = quantities[product.pk]

        OrderItem.objects.create(
            order=order,
            product=product,
            name=product.name,
            sku=product.sku,
            color=product.color,
            material=product.material,
            quantity=quantity,
            unit_price=product.price,
            item_total=product.price * quantity,
        )

        product.stock -= quantity
        product.save(update_fields=["stock"])

    return order, True


def release_stock(order):
    items = list(order.items.all())

    products = {
        product.pk: product
        for product in (
            Product.objects
            .select_for_update()
            .filter(
                pk__in=[
                    item.product_id
                    for item in items
                ]
            )
            .order_by("pk")
        )
    }

    for item in items:
        product = products[item.product_id]

        product.stock += item.quantity
        product.save(update_fields=["stock"])


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

    cart = session.get("cart", {})

    if not isinstance(cart, dict):
        return

    for item in order.items.all():
        key = str(item.product_id)
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