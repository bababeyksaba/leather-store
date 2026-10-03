from decimal import Decimal
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError
from products.models import ProductVariant
from products.views import get_visible_category_ids

CART_SESSION_KEY = "cart"
MAX_CART_ITEMS = 100


def normalize_cart(raw, strict=False):
    if not isinstance(raw, dict):
        if strict: raise ValidationError("سبد خرید معتبر نیست.")
        return {}
    legacy = {int(str(k)) for k in raw if str(k).isascii() and str(k).isdigit() and int(str(k)) > 0}
    defaults = dict(ProductVariant.objects.filter(product_id__in=legacy, is_default=True).values_list("product_id", "id"))
    result = {}
    for original, value in raw.items():
        key = str(original)
        if isinstance(value, dict) and value.get("is_deleted") is True:
            continue
        quantity = value.get("quantity") if isinstance(value, dict) else value
        if key.isascii() and key.isdecimal() and int(key) > 0:
            variant_id = defaults.get(int(key))
            key = f"v:{variant_id}" if variant_id else ""
        valid_key = key.startswith("v:") and key[2:].isascii() and key[2:].isdecimal() and int(key[2:]) > 0
        if not valid_key or type(quantity) is not int or not 1 <= quantity <= 10000:
            if strict: raise ValidationError("شناسه یا تعداد یکی از اقلام سبد معتبر نیست؛ سبد را بازبینی کنید.")
            continue
        key = f"v:{int(key[2:])}"
        quantity += result.get(key, {}).get("quantity", 0)
        if quantity > 10000:
            if strict: raise ValidationError("تعداد محصول بیش از حد مجاز است.")
            quantity = 10000
        result[key] = {"quantity": quantity, "is_deleted": False, "deleted_at": None}
    return result


def get_cart(request):
    return normalize_cart(request.session.get(CART_SESSION_KEY, {}))


def save_cart(request, cart):
    request.session[CART_SESSION_KEY] = cart
    request.session.modified = True


def active_variant(variant_id):
    return get_object_or_404(ProductVariant.objects.select_related("product").filter(
        is_active=True, product__is_active=True, product__category_id__in=get_visible_category_ids()), pk=variant_id)


def legacy_variant(product_id):
    variants = list(ProductVariant.objects.filter(product_id=product_id, is_active=True).values_list("id", flat=True)[:2])
    if len(variants) != 1:
        raise ValidationError("ابتدا رنگ و سایز محصول را انتخاب کنید.")
    return variants[0]


def mutate_variant(request, variant_id, quantity, replace=False):
    variant = active_variant(variant_id)
    cart = get_cart(request)
    key = f"v:{variant.id}"
    previous = cart.get(key)
    if replace and not previous:
        raise NotFound("این محصول در سبد خرید نیست.")
    total = quantity if replace else quantity + (previous or {}).get("quantity", 0)
    if total > min(variant.stock, 10000):
        raise ValidationError({"quantity": "تعداد درخواستی از موجودی این رنگ و سایز بیشتر است."})
    if not previous and len(cart) >= MAX_CART_ITEMS:
        raise ValidationError("ظرفیت سبد خرید تکمیل شده است.")
    cart[key] = {"quantity": total, "is_deleted": False, "deleted_at": None}
    save_cart(request, cart)
    return {"product_id": variant.product_id, "variant_id": variant.id, "cart_key": key, "quantity": total}


def add_item(request, product_id, quantity):
    return mutate_variant(request, legacy_variant(product_id), quantity)


def update_item(request, product_id, quantity):
    return mutate_variant(request, legacy_variant(product_id), quantity, replace=True)


def delete_variant(request, variant_id):
    cart = get_cart(request)
    key = f"v:{variant_id}"
    if key not in cart: raise NotFound("این محصول در سبد خرید نیست.")
    cart[key]["is_deleted"] = True
    cart[key]["deleted_at"] = timezone.now().isoformat()
    save_cart(request, cart)


def soft_delete_item(request, product_id):
    return delete_variant(request, legacy_variant(product_id))


def cart_summary(request):
    cart = get_cart(request)
    variants = ProductVariant.objects.select_related("product").filter(
        pk__in=[int(k[2:]) for k in cart], is_active=True,
        product__is_active=True, product__category_id__in=get_visible_category_ids()).order_by("id")
    items, visible = [], set()
    total = Decimal("0")
    for variant in variants:
        product = variant.product
        key = f"v:{variant.id}"
        visible.add(key)
        quantity = cart[key]["quantity"]
        item_total = variant.price * quantity
        total += item_total
        image = variant.image or product.image
        items.append({"cart_key": key, "variant_id": variant.id, "product_id": product.id,
            "name": product.name, "slug": product.slug, "color": variant.color, "size": variant.size,
            "image": request.build_absolute_uri(image.url) if image else None,
            "quantity": quantity, "unit_price": str(variant.price), "item_total": str(item_total),
            "stock": variant.stock, "is_available": quantity <= variant.stock})
    unavailable = [key for key in cart if key not in visible]
    return {"items": items, "item_count": len(items), "total_quantity": sum(i["quantity"] for i in items),
        "total_price": str(total), "unavailable_product_ids": unavailable, "unavailable_items": unavailable,
        "can_checkout": bool(items) and not unavailable and all(i["is_available"] for i in items)}
