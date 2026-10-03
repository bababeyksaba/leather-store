from django.db.models import Min, Sum
from .models import ProductVariant


def active_variants(product):
    return [v for v in product.variants.all() if v.is_active]


def sync_legacy_stock(product_ids):
    # Legacy column is a display cache; variant rows are inventory authority.
    from .models import Product
    for product_id in set(product_ids):
        stock = ProductVariant.objects.filter(product_id=product_id, is_active=True).aggregate(total=Sum("stock"))["total"] or 0
        Product.objects.filter(pk=product_id).update(stock=stock)