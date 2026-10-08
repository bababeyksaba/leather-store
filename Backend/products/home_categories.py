from rest_framework import serializers
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny

from .models import Category


class HomepageCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = (
            "id",
            "name",
            "slug",
            "image",
        )


class HomepageCategoryListAPIView(ListAPIView):
    serializer_class = HomepageCategorySerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        categories = list(
            Category.objects.all().order_by(
                "homepage_order",
                "sort_order",
                "name",
                "id",
            )
        )

        by_id = {
            category.pk: category
            for category in categories
        }

        def effectively_active(category):
            visited = set()
            current = category

            while current is not None:
                if (
                    current.pk in visited
                    or not current.is_active
                ):
                    return False

                visited.add(current.pk)

                if current.parent_id is None:
                    return True

                current = by_id.get(current.parent_id)

                if current is None:
                    return False

            return False

        return [
            category
            for category in categories
            if category.show_on_homepage
            and effectively_active(category)
        ]