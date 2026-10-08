from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from products.home_categories import HomepageCategoryListAPIView
from products.views import MenuCategoryAPIView


urlpatterns = [
    path("admin/", admin.site.urls),

    # دسته‌های انتخاب‌شده برای صفحهٔ اصلی
    path(
        "api/homepage/categories/",
        HomepageCategoryListAPIView.as_view(),
        name="homepage-categories",
    ),

    # دسته‌های منوی هدر
    path(
        "api/menu/categories/",
        MenuCategoryAPIView.as_view(),
        name="category-menu",
    ),

    path("api/", include("store.urls")),
    path("api/", include("users.urls")),
    path("api/", include("orders.urls")),
    path("api/", include("products.urls")),
    path("api/", include("carts.urls")),
]


if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT,
    )