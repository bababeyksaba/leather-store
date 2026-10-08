from decimal import Decimal

from django.db.models import Avg, Count
from rest_framework import serializers

from .models import (
    Category,
    Product,
    ProductImage,
    ProductVariant,
    ProductReview,
)
from .variants import active_variants


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
    # شناسهٔ رنگ مرتبط با عکس گالری.
    variant_id = serializers.IntegerField(
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = ProductImage

        fields = (
            "id",
            "variant_id",
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
        profile = getattr(
            obj.user,
            "customer_profile",
            None,
        )

        if profile:
            first_name = (
                getattr(profile, "first_name", "") or ""
            ).strip()

            if first_name:
                return first_name

        return "کاربر فروشگاه"


class ProductVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant

        fields = (
            "id",
            "sku",
            "color",
            "color_hex",
            "size",
            "price",
            "stock",
            "image",
            "is_active",
        )

        read_only_fields = fields


class ProductListSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)

    variants = serializers.SerializerMethodField()
    price = serializers.SerializerMethodField()
    stock = serializers.SerializerMethodField()
    is_available = serializers.SerializerMethodField()

    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

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
            "variants",
            "average_rating",
            "review_count",
        )

        read_only_fields = fields

    def get_active_variants(self, obj):
        if not hasattr(self, "_variants_cache"):
            self._variants_cache = {}

        if obj.pk not in self._variants_cache:
            self._variants_cache[obj.pk] = list(
                active_variants(obj)
            )

        return self._variants_cache[obj.pk]

    def get_variants(self, obj):
        return ProductVariantSerializer(
            self.get_active_variants(obj),
            many=True,
            context=self.context,
        ).data

    def get_price(self, obj):
        variants = self.get_active_variants(obj)

        price = min(
            (variant.price for variant in variants),
            default=obj.price,
        )

        return str(price)

    def get_stock(self, obj):
        return sum(
            variant.stock
            for variant in self.get_active_variants(obj)
        )

    def get_is_available(self, obj):
        if not obj.is_active or self.get_stock(obj) <= 0:
            return False

        visible_ids = self.context.get(
            "visible_category_ids"
        )

        if visible_ids is not None:
            return obj.category_id in visible_ids

        return obj.category.is_effectively_active

    def get_review_stats(self, obj):
        if not hasattr(self, "_review_stats_cache"):
            self._review_stats_cache = {}

        if obj.pk not in self._review_stats_cache:
            self._review_stats_cache[obj.pk] = (
                obj.reviews
                .filter(is_approved=True)
                .aggregate(
                    average=Avg("rating"),
                    count=Count("id"),
                )
            )

        return self._review_stats_cache[obj.pk]

    def get_average_rating(self, obj):
        value = self.get_review_stats(obj)["average"]

        if value is None:
            return None

        return round(float(value), 1)

    def get_review_count(self, obj):
        return self.get_review_stats(obj)["count"]


class ProductDetailSerializer(ProductListSerializer):
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

    images = ProductImageSerializer(
        many=True,
        read_only=True,
    )

    reviews = serializers.SerializerMethodField()

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
            "variants",
            "is_available",
            "is_active",
            "reviews",
            "average_rating",
            "review_count",
            "created_at",
            "updated_at",
        )

        read_only_fields = fields

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
                reviews = list(prefetched_reviews)
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
            self.get_approved_reviews(obj)[:50],
            many=True,
            context=self.context,
        ).data

    def get_average_rating(self, obj):
        if hasattr(obj, "approved_rating"):
            value = obj.approved_rating

            if value is None:
                return None

            return float(
                Decimal(str(value)).quantize(
                    Decimal("0.1")
                )
            )

        reviews = self.get_approved_reviews(obj)

        if not reviews:
            return None

        total = sum(
            review.rating for review in reviews
        )

        average = (
            Decimal(total) / Decimal(len(reviews))
        ).quantize(Decimal("0.1"))

        return float(average)

    def get_review_count(self, obj):
        if hasattr(obj, "approved_count"):
            return obj.approved_count or 0

        return len(self.get_approved_reviews(obj))


class CategoryProductSerializer(ProductListSerializer):
    """محصولات دسته‌بندی با ساختار فهرست محصولات."""

    pass