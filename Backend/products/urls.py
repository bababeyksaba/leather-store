from django.urls import path

from .home_categories import HomepageCategoryListAPIView
from .views import (
    CategoryListAPIView,
    CategoryProductsAPIView,
    ProductDetailByIdAPIView,
    ProductDetailBySlugAPIView,
    ProductFilterOptionsAPIView,
    ProductListAPIView,
    ProductReviewAPIView,
)
from .banner_views import HomepageBannerListAPIView


urlpatterns = [
    # دسته‌های منتخب صفحهٔ اصلی
    path(
        "homepage/categories/",
        HomepageCategoryListAPIView.as_view(),
        name="homepage-categories",
    ),

    # گزینه‌های فیلتر محصولات
    path(
        "products/filters/",
        ProductFilterOptionsAPIView.as_view(),
        name="product-filter-options",
    ),

    # فهرست محصولات
    path(
        "products/",
        ProductListAPIView.as_view(),
        name="product-list",
    ),

    # نظرات محصول
    path(
        "products/id/<int:product_id>/review/",
        ProductReviewAPIView.as_view(),
        name="product-review",
    ),

    # جزئیات محصول با شناسه
    path(
        "products/id/<int:product_id>/",
        ProductDetailByIdAPIView.as_view(),
        name="product-detail-id",
    ),

    # فهرست دسته‌بندی‌ها
    path(
        "categories/",
        CategoryListAPIView.as_view(),
        name="category-list",
    ),

    # محصولات یک دسته‌بندی
    path(
        "categories/<str:category_slug>/products/",
        CategoryProductsAPIView.as_view(),
        name="category-products",
    ),

    # مسیر عمومی محصول باید بعد از مسیرهای ثابت باشد.
    path(
        "products/<str:product_slug>/",
        ProductDetailBySlugAPIView.as_view(),
        name="product-detail-slug",
    ),
    path(
    "products/homepage/banners/",
    HomepageBannerListAPIView.as_view(),
    name="homepage-banners",
),
]