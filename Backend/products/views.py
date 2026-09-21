from django.shortcuts import render
from django.db.models import Q
from rest_framework.generics import ListAPIView

from .models import Product
from .serializers import ProductListSerializer


class ProductListAPIView(ListAPIView):
    serializer_class = ProductListSerializer

    def get_queryset(self):
        queryset = (
            Product.objects
            .filter(
                is_active=True,
                category__is_active=True,
            )
            .select_related("category")
            .order_by("-created_at")
        )

        category_slug = self.request.query_params.get("category")
        search = self.request.query_params.get("search")

        if category_slug:
            queryset = queryset.filter(
                category__slug=category_slug
            )

        if search:
            search = search.strip()[:100]

            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(description__icontains=search)
                | Q(material__icontains=search)
                | Q(color__icontains=search)
            )

        return queryset