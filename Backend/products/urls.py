from django.urls import path

from .views import (
    ProductListAPIView,
    ProductDetailByIdAPIView,
    ProductDetailBySlugAPIView,
    CategoryListAPIView,
    CategoryProductsAPIView,
)


from .views import ProductReviewAPIView, ProductFilterOptionsAPIView

urlpatterns = [
    path("products/filters/", ProductFilterOptionsAPIView.as_view()),
    path("products/id/<int:product_id>/review/", ProductReviewAPIView.as_view()),

    # ==========================
    # لیست محصولات
    # GET /api/products/
    # ==========================

    path(
        "products/",
        ProductListAPIView.as_view(),
        name="product-list",
    ),


    # ==========================
    # جزئیات محصول با ID
    # GET /api/products/id/3/
    # ==========================

    path(
        "products/id/<int:product_id>/",
        ProductDetailByIdAPIView.as_view(),
        name="product-detail-id",
    ),


    # ==========================
    # دسته بندی ها
    # GET /api/categories/
    # ==========================

    path(
        "categories/",
        CategoryListAPIView.as_view(),
        name="category-list",
    ),


    # ==========================
    # محصولات یک دسته
    # GET /api/categories/کیف-چرمی/products/
    # ==========================

    path(
        "categories/<str:category_slug>/products/",
        CategoryProductsAPIView.as_view(),
        name="category-products",
    ),


    # ==========================
    # جزئیات محصول با Slug
    # GET /api/products/کیف-مجلسی/
    #
    # همیشه آخر باشد
    # ==========================

    path(
        "products/<str:product_slug>/",
        ProductDetailBySlugAPIView.as_view(),
        name="product-detail-slug",
    ),

]
