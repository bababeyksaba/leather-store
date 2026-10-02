from decimal import Decimal

from rest_framework import serializers

from .models import (
    Category,
    Product,
    ProductImage,
    ProductReview,
)


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category

        fields = (
            "id",
            "name",
            "slug",
            "parent",
            "image",
        )

        read_only_fields = fields


class MenuCategorySerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()

    class Meta:
        model = Category

        fields = (
            "id",
            "name",
            "slug",
            "image",
            "children",
        )

        read_only_fields = fields

    def get_children(self, obj):
        # View تمام دسته‌های منو را یک‌بار دریافت می‌کند.
        children_by_parent = self.context.get(
            "menu_children_by_parent"
        )

        if children_by_parent is not None:
            children = children_by_parent.get(obj.pk, [])
        else:
            children = [
                child
                for child in obj.children.all()
                if child.is_active and child.show_in_menu
            ]

            children.sort(
                key=lambda child: (
                    child.sort_order,
                    child.name,
                    child.pk,
                )
            )

        return MenuCategorySerializer(
            children,
            many=True,
            context=self.context,
        ).data


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage

        fields = (
            "id",
            "image",
            "alt_text",
            "is_primary",
        )

        read_only_fields = fields


class ProductReviewSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = ProductReview

        fields = (
            "id",
            "author_name",
            "rating",
            "title",
            "comment",
            "created_at",
        )

        read_only_fields = fields

    def get_author_name(self, obj):
        return obj.user.get_username()


class ProductListSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)

    is_available = serializers.SerializerMethodField()

    class Meta:
        model = Product

        fields = (
            "id",
            "name",
            "slug",
            "category",
            "material",
            "color",
            "price",
            "stock",
            "image",
            "is_available",
            "created_at",
        )

        read_only_fields = fields

    def get_is_available(self, obj):
        visible_ids = self.context.get("visible_category_ids")

        if visible_ids is not None:
            return (
                obj.is_active
                and obj.stock > 0
                and obj.category_id in visible_ids
            )

        return obj.is_available


class ProductDetailSerializer(serializers.ModelSerializer):
    category_id = serializers.IntegerField(read_only=True)

    category_name = serializers.CharField(
        source="category.name",
        read_only=True,
    )

    category_slug = serializers.CharField(
        source="category.slug",
        read_only=True,
    )

    images = ProductImageSerializer(
        many=True,
        read_only=True,
    )

    is_available = serializers.SerializerMethodField()

    reviews = serializers.SerializerMethodField()

    average_rating = serializers.SerializerMethodField()

    review_count = serializers.SerializerMethodField()

    class Meta:
        model = Product

        fields = (
            "id",
            "category_id",
            "category_name",
            "category_slug",
            "name",
            "slug",
            "sku",
            "description",
            "material",
            "color",
            "dimensions",
            "size",
            "care_instructions",
            "price",
            "stock",
            "image",
            "images",
            "is_available",
            "is_active",
            "reviews",
            "average_rating",
            "review_count",
            "created_at",
            "updated_at",
        )

        read_only_fields = fields

    def get_is_available(self, obj):
        visible_ids = self.context.get("visible_category_ids")

        if visible_ids is not None:
            return (
                obj.is_active
                and obj.stock > 0
                and obj.category_id in visible_ids
            )

        return obj.is_available

    def get_approved_reviews(self, obj):
        if not hasattr(self, "_reviews_cache"):
            self._reviews_cache = {}

        if obj.pk not in self._reviews_cache:
            prefetched_reviews = getattr(
                obj,
                "approved_reviews",
                None,
            )

            if prefetched_reviews is not None:
                reviews = prefetched_reviews
            else:
                reviews = list(
                    obj.reviews
                    .filter(is_approved=True)
                    .select_related("user")
                    .order_by("-created_at", "-id")
                )

            self._reviews_cache[obj.pk] = reviews

        return self._reviews_cache[obj.pk]

    def get_reviews(self, obj):
        return ProductReviewSerializer(
            self.get_approved_reviews(obj),
            many=True,
            context=self.context,
        ).data

    def get_average_rating(self, obj):
        reviews = self.get_approved_reviews(obj)

        if not reviews:
            return None

        total = sum(review.rating for review in reviews)

        average = (
            Decimal(total) / Decimal(len(reviews))
        ).quantize(Decimal("0.1"))

        return float(average)

    def get_review_count(self, obj):
        return len(self.get_approved_reviews(obj))


class CategoryProductSerializer(ProductListSerializer):
    """محصولات یک دسته با همان ساختار فهرست محصولات."""
    pass