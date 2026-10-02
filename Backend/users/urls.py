from django.urls import path

from .views import (
    SessionAPIView,
    RequestOTPAPIView,
    VerifyOTPAPIView,
    LogoutAPIView,
    ProfileAPIView,
    AddressListAPIView,
    AddressDetailAPIView,
    FavoriteListAPIView,
    FavoriteDetailAPIView,
    SupportAPIView,
    CheckoutAPIView,
)


urlpatterns = [
    path("auth/session/", SessionAPIView.as_view()),
    path("auth/request-code/", RequestOTPAPIView.as_view()),
    path("auth/verify-code/", VerifyOTPAPIView.as_view()),
    path("auth/logout/", LogoutAPIView.as_view()),

    path("account/profile/", ProfileAPIView.as_view()),

    path("account/addresses/", AddressListAPIView.as_view()),
    path(
        "account/addresses/<int:address_id>/",
        AddressDetailAPIView.as_view(),
    ),

    path("account/favorites/", FavoriteListAPIView.as_view()),
    path(
        "account/favorites/<int:product_id>/",
        FavoriteDetailAPIView.as_view(),
    ),

    path("account/support/", SupportAPIView.as_view()),
    path("account/checkout/", CheckoutAPIView.as_view()),
]