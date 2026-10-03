from django.urls import path

from .views import (
    StoreInfoAPIView,
    ContentPageAPIView,
)


urlpatterns = [
    path(
        "store/",
        StoreInfoAPIView.as_view(),
        name="store-info",
    ),
    path(
        "store/pages/<slug:slug>/",
        ContentPageAPIView.as_view(),
        name="store-page",
    ),
]