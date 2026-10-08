from rest_framework import serializers
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny

from .banner_models import HomepageBanner


class HomepageBannerSerializer(serializers.ModelSerializer):
    category_id = serializers.IntegerField(
        read_only=True,
    )

    category_name = serializers.CharField(
        source="category.name",
        read_only=True,
    )

    category_slug = serializers.CharField(
        source="category.slug",
        read_only=True,
    )

    class Meta:
        model = HomepageBanner

        fields = (
            "position",
            "category_id",
            "category_name",
            "category_slug",
        )


class HomepageBannerListAPIView(ListAPIView):
    serializer_class = HomepageBannerSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        banners = (
            HomepageBanner.objects
            .filter(is_active=True)
            .select_related("category")
            .order_by("position")
        )

        return [
            banner
            for banner in banners
            if banner.category.is_effectively_active
        ]