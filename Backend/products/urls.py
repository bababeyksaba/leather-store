from django.urls import path

from .views import (
    ProductListAPIView,
    ProductDetailByIdAPIView,
    ProductDetailBySlugAPIView,
    CategoryListAPIView,
    CategoryProductsAPIView,
)


urlpatterns = [

    path(
        "categories/",
        CategoryListAPIView.as_view(),
        name="category-list",
    ),


    path(
        "categories/<str:category_slug>/products/",
        CategoryProductsAPIView.as_view(),
        name="category-products",
    ),


    path(
        "",
        ProductListAPIView.as_view(),
        name="product-list",
    ),


    path(
        "id/<int:product_id>/",
        ProductDetailByIdAPIView.as_view(),
        name="product-detail-id",
    ),


    path(
        "<str:product_slug>/",
        ProductDetailBySlugAPIView.as_view(),
        name="product-detail-slug",
    ),

]