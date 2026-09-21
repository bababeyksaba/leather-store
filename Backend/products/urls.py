from django.urls import path

from .views import ProductListAPIView


app_name = "products"


urlpatterns = [
    path(
        "",
        ProductListAPIView.as_view(),
        name="product-list",
    ),
]