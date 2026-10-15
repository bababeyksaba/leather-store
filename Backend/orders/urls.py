from .digipay_views import DigiPayStartAPIView, DigiPayStatusAPIView, digipay_callback, DigiPayModeAPIView
from django.urls import path

from .views import (
    ShippingMethodsAPIView,
    OrderListCreateAPIView,
    OrderDetailAPIView,
    TestPaymentAPIView,
    OrderCancelAPIView,
)


urlpatterns = [
    path("payments/mode/", DigiPayModeAPIView.as_view()),
    path("orders/<uuid:number>/digipay/start/", DigiPayStartAPIView.as_view()),
    path("orders/<uuid:number>/digipay/status/", DigiPayStatusAPIView.as_view()),
    path("payments/digipay/callback/", digipay_callback),
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