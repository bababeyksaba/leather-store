from django.urls import path

from .views import (
    CartAPIView,
    CartItemCreateAPIView,
    CartItemDeleteAPIView,
)


urlpatterns = [
    path(
        "cart/",
        CartAPIView.as_view(),
        name="cart",
    ),
    path(
        "cart/items/<int:product_id>/",
        CartItemCreateAPIView.as_view(),
        name="cart-item-add",
    ),
    path(
        "cart/items/<int:product_id>/delete/",
        CartItemDeleteAPIView.as_view(),
        name="cart-item-delete",
    ),
]