from decimal import Decimal

from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from products.models import Product

CART_SESSION_KEY = "cart"

class CartItemInSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1)


def get_cart(request):
    return request.session.get(CART_SESSION_KEY, {})  


def save_cart(request,cart):
    request.session[CART_SESSION_KEY] = cart
    request.session.modified = True

def get_available_product(product_id):
    return get_object_or_404(
        Product.objects.select_related("category"),
        id=product_id,
        is_active=True,
        category__is_active=True,
    )


class CartAPIView(APIView):
    def get(self, request):
        cart = get_cart(request)

        products = Product.objects.filter(
            id__in=cart.keys(),
            is_active=True,
            category__is_active=True,
        )

        items = []
        total_price = Decimal("0")

        for product in products:
            quantity = cart[str(product.id)]
            item_total = product.price * quantity
            total_price += item_total

            items.append({
                "product_id": product.id,
                "name": product.name,
                "slug": product.slug,
                "quantity": quantity,
                "unit_price": str(product.price),
                "item_total": str(item_total),
                "stock": product.stock,
            })

        return Response({
            "items": items,
            "total_price": str(total_price),
        })