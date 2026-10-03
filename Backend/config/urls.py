from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include

from products.views import MenuCategoryAPIView


urlpatterns = [
    path("api/", include("store.urls")),
    path("admin/", admin.site.urls),

    path("api/", include("users.urls")),
    path("api/", include("orders.urls")),

    path(
        "api/menu/categories/",
        MenuCategoryAPIView.as_view(),
        name="category-menu",
    ),

    path("api/", include("products.urls")),
    path("api/", include("carts.urls")),
]


if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT,
    )
