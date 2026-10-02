from decimal import Decimal

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from products.models import Product


CART_SESSION_KEY = "cart"
MAX_CART_ITEMS = 100


def get_cart(request):
    """Read both the old {id: quantity} and the new soft-delete format."""
    stored_cart = request.session.get(CART_SESSION_KEY, {})

    if not isinstance(stored_cart, dict):
        return {}

    cart = {}

    for product_id, value in stored_cart.items():
        key = str(product_id)

        if not key.isascii() or not key.isdecimal() or int(key) < 1:
            continue

        key = str(int(key))

        if type(value) is int:
            value = {
                "quantity": value,
                "is_deleted": False,
            }

        if not isinstance(value, dict):
            continue

        quantity = value.get("quantity")

        if type(quantity) is not int or not 1 <= quantity <= 10000:
            continue

        cart[key] = {
            "quantity": quantity,
            "is_deleted": value.get("is_deleted") is True,
            "deleted_at": value.get("deleted_at"),
        }

    return cart


def save_cart(request, cart):
    request.session[CART_SESSION_KEY] = cart
    request.session.modified = True


def get_active_product(product_id):
    return get_object_or_404(
        Product.objects.filter(
            is_active=True,
            category__is_active=True,
        ),
        pk=product_id,
    )

def update_item(request, product_id, quantity):
    cart = get_cart(request)
    key = str(product_id)

    item = cart.get(key)

    if not item or item["is_deleted"]:
        raise NotFound("این محصول در سبد خرید نیست.")

    product = get_active_product(product_id)

    if quantity > product.stock:
        raise ValidationError({
            "quantity": "تعداد درخواستی از موجودی محصول بیشتر است."
        })

    item["quantity"] = quantity
    save_cart(request, cart)

    return {
        "product_id": product.pk,
        "quantity": quantity,
    }

def add_item(request, product_id, quantity):
    product = get_active_product(product_id)
    cart = get_cart(request)

    key = str(product.pk)
    existing = cart.get(key)

    previous_quantity = (
        existing["quantity"]
        if existing and not existing["is_deleted"]
        else 0
    )

    new_quantity = previous_quantity + quantity

    if new_quantity > 10000:
        raise ValidationError({
            "quantity": "حداکثر تعداد هر محصول در سبد ۱۰۰۰۰ است.",
        })

    if new_quantity > product.stock:
        raise ValidationError({
            "quantity": "تعداد درخواستی از موجودی محصول بیشتر است.",
        })

    if key not in cart and len(cart) >= MAX_CART_ITEMS:
        raise ValidationError({
            "detail": "ظرفیت سبد خرید تکمیل شده است.",
        })

    cart[key] = {
        "quantity": new_quantity,
        "is_deleted": False,
        "deleted_at": None,
    }

    save_cart(request, cart)

    return {
        "product_id": product.pk,
        "quantity": new_quantity,
    }


def soft_delete_item(request, product_id):
    cart = get_cart(request)
    key = str(product_id)

    item = cart.get(key)

    if not item or item["is_deleted"]:
        raise NotFound("این محصول در سبد خرید نیست.")

    item["is_deleted"] = True
    item["deleted_at"] = timezone.now().isoformat()

    save_cart(request, cart)


def cart_summary(request):
    cart = get_cart(request)

    active_cart = {
        key: value
        for key, value in cart.items()
        if not value["is_deleted"]
    }

    products = Product.objects.filter(
        pk__in=active_cart,
        is_active=True,
        category__is_active=True,
    ).order_by("pk")

    items = []
    total_price = Decimal("0")
    total_quantity = 0
    visible_ids = set()

    for product in products:
        key = str(product.pk)
        visible_ids.add(key)

        quantity = active_cart[key]["quantity"]
        item_total = product.price * quantity

        total_price += item_total
        total_quantity += quantity

        image_url = (
            request.build_absolute_uri(product.image.url)
            if product.image
            else None
        )

        items.append({
            "product_id": product.pk,
            "name": product.name,
            "slug": product.slug,
            "image": image_url,
            "quantity": quantity,
            "unit_price": str(product.price),
            "item_total": str(item_total),
            "stock": product.stock,
            "is_available": quantity <= product.stock,
        })

    unavailable_ids = [
        int(key)
        for key in active_cart
        if key not in visible_ids
    ]

    return {
        "items": items,
        "item_count": len(items),
        "total_quantity": total_quantity,
        "total_price": str(total_price),
        "unavailable_product_ids": unavailable_ids,
        "can_checkout": (
            bool(items)
            and not unavailable_ids
            and all(item["is_available"] for item in items)
        ),
    }