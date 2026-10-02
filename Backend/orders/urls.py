from django.urls import path

from .views import (
    ShippingMethodsAPIView,
    OrderListCreateAPIView,
    OrderDetailAPIView,
    TestPaymentAPIView,
    OrderCancelAPIView,
)


urlpatterns = [
    path(
        "shipping-methods/",
        ShippingMethodsAPIView.as_view(),
    ),

    path(
        "orders/",
        OrderListCreateAPIView.as_view(),
    ),

    path(
        "orders/<uuid:number>/",
        OrderDetailAPIView.as_view(),
    ),

    path(
        "orders/<uuid:number>/test-payment/",
        TestPaymentAPIView.as_view(),
    ),

    path(
        "orders/<uuid:number>/cancel/",
        OrderCancelAPIView.as_view(),
    ),
]