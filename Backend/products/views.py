from collections import defaultdict, deque

from django.db.models import Prefetch, Q, Exists, OuterRef, Min, Avg, Count, Subquery
from django.shortcuts import get_object_or_404

from rest_framework import serializers
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import AllowAny

from .models import (
    Category,
    Product,
    ProductReview,
    ProductVariant,
)

from .serializers import (
    CategorySerializer,
    CategoryProductSerializer,
    ProductListSerializer,
    ProductDetailSerializer,
    MenuCategorySerializer,
)


# اعتبارسنجی فیلترهای محصولات
class ProductFilterSerializer(serializers.Serializer):
    search = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=100,
    )

    category = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=120,
    )

    material = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=100,
    )

    color = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=50,
    )

    size = serializers.CharField(required=False, allow_blank=True, max_length=100)

    min_price = serializers.DecimalField(
        required=False,
        max_digits=12,
        decimal_places=0,
        min_value=0,
        error_messages={
            "invalid": "حداقل قیمت باید یک عدد معتبر باشد.",
            "min_value": "حداقل قیمت نمی‌تواند منفی باشد.",
        },
    )

    max_price = serializers.DecimalField(
        required=False,
        max_digits=12,
        decimal_places=0,
        min_value=0,
        error_messages={
            "invalid": "حداکثر قیمت باید یک عدد معتبر باشد.",
            "min_value": "حداکثر قیمت نمی‌تواند منفی باشد.",
        },
    )

    available = serializers.BooleanField(
        required=False,
        error_messages={
            "invalid": "مقدار موجود بودن باید true یا false باشد.",
        },
    )

    ordering = serializers.ChoiceField(
        choices=(
            "price",
            "-price",
            "created_at",
            "-created_at",
        ),
        default="-created_at",
        error_messages={
            "invalid_choice": "روش مرتب‌سازی معتبر نیست.",
        },
    )

    def validate(self, attrs):
        min_price = attrs.get("min_price")
        max_price = attrs.get("max_price")

        if (
            min_price is not None
            and max_price is not None
            and min_price > max_price
        ):
            raise serializers.ValidationError({
                "max_price": (
                    "حداکثر قیمت باید بزرگ‌تر یا مساوی حداقل قیمت باشد."
                )
            })

        return attrs


# دریافت شناسه‌های دسته‌هایی که تمام والدهایشان فعال‌اند
def get_visible_category_ids(categories=None):
    if categories is None:
        categories = list(
            Category.objects.values(
                "id",
                "parent_id",
                "slug",
                "is_active",
            )
        )

    children_by_parent = defaultdict(list)

    for category in categories:
        if category["is_active"]:
            children_by_parent[category["parent_id"]].append(
                category["id"]
            )

    queue = deque(children_by_parent[None])
    visible_ids = set()

    while queue:
        category_id = queue.popleft()

        if category_id in visible_ids:
            continue

        visible_ids.add(category_id)
        queue.extend(children_by_parent[category_id])

    return visible_ids


# فیلتر یک دسته همراه با تمام زیرمجموعه‌های آن
def filter_products_by_category(
    queryset,
    category_slug,
    categories=None,
):
    if categories is None:
        categories = list(
            Category.objects.values(
                "id",
                "parent_id",
                "slug",
            )
        )

    children_by_parent = defaultdict(list)
    selected_ids = set()

    for category in categories:
        children_by_parent[category["parent_id"]].append(
            category["id"]
        )

        if category["slug"] == category_slug:
            selected_ids.add(category["id"])

    queue = deque(selected_ids)

    while queue:
        category_id = queue.popleft()

        for child_id in children_by_parent[category_id]:
            if child_id not in selected_ids:
                selected_ids.add(child_id)
                queue.append(child_id)

    return queryset.filter(
        category_id__in=selected_ids
    )


# محصولات قابل نمایش
def get_visible_products(visible_ids=None):
    if visible_ids is None:
        visible_ids = get_visible_category_ids()

    return (
        Product.objects
        .filter(
            is_active=True,
            category_id__in=visible_ids,
        )
        .select_related("category").prefetch_related("variants")
    )


# اطلاعات دسته‌بندی‌ها در هر درخواست فقط یک‌بار دریافت می‌شود
class CategoryVisibilityMixin:
    def get_category_rows(self):
        if not hasattr(self, "_category_rows"):
            self._category_rows = list(
                Category.objects.values(
                    "id",
                    "parent_id",
                    "slug",
                    "is_active",
                )
            )

        return self._category_rows

    def get_visible_ids(self):
        if not hasattr(self, "_visible_category_ids"):
            self._visible_category_ids = get_visible_category_ids(
                self.get_category_rows()
            )

        return self._visible_category_ids

    def get_serializer_context(self):
        context = super().get_serializer_context()

        context["visible_category_ids"] = self.get_visible_ids()

        return context


# GET /api/products/
class ProductListAPIView(
    CategoryVisibilityMixin,
    ListAPIView,
):
    serializer_class = ProductListSerializer
    permission_classes = (AllowAny,)

    def get_queryset(self):
        filter_serializer = ProductFilterSerializer(
            data=self.request.query_params
        )

        filter_serializer.is_valid(raise_exception=True)
        filters = filter_serializer.validated_data

        queryset = get_visible_products(
            self.get_visible_ids()
        )

        search = filters.get("search", "").strip()

        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(description__icontains=search)
                | Q(material__icontains=search)
                | Q(color__icontains=search)
                | Q(variants__color__icontains=search)
                | Q(variants__size__icontains=search)
                | Q(variants__sku__icontains=search)
                | Q(category__name__icontains=search)
            )

        category_slug = filters.get("category", "").strip()

        if category_slug:
            queryset = filter_products_by_category(
                queryset,
                category_slug,
                self.get_category_rows(),
            )

        material = filters.get("material", "").strip()

        if material:
            queryset = queryset.filter(
                material__icontains=material
            )

        # One variant must satisfy every option; avoids mixing red/large and blue/small.
        variants = ProductVariant.objects.filter(product_id=OuterRef("pk"), is_active=True)
        for field in ("color", "size"):
            value = filters.get(field, "").strip()
            if value:
                variants = variants.filter(**{field + "__icontains": value})
        if filters.get("min_price") is not None:
            variants = variants.filter(price__gte=filters["min_price"])
        if filters.get("max_price") is not None:
            variants = variants.filter(price__lte=filters["max_price"])
        if filters.get("available") is True:
            variants = variants.filter(stock__gt=0)
        queryset = queryset.filter(Exists(variants)).annotate(
            display_price=Min("variants__price", filter=Q(variants__is_active=True))
        )
        ordering = filters["ordering"].replace("price", "display_price")
        return queryset.order_by(ordering, "id")


# جزئیات محصول همراه با تصاویر و نظرات تأییدشده
class ProductDetailBaseAPIView(
    CategoryVisibilityMixin,
    RetrieveAPIView,
):
    serializer_class = ProductDetailSerializer
    permission_classes = (AllowAny,)

    def get_queryset(self):
        approved_reviews = (
            ProductReview.objects
            .filter(is_approved=True)
            .select_related("user__customer_profile")
            .order_by("-created_at", "-id")
        )

        return (
            get_visible_products(self.get_visible_ids())
            .annotate(
                approved_rating=Subquery(ProductReview.objects.filter(product_id=OuterRef("pk"), is_approved=True).values("product_id").annotate(value=Avg("rating")).values("value")),
                approved_count=Subquery(ProductReview.objects.filter(product_id=OuterRef("pk"), is_approved=True).values("product_id").annotate(value=Count("id")).values("value")),
            )
            .prefetch_related(
                "images",
                Prefetch(
                    "reviews",
                    queryset=approved_reviews[:50],
                    to_attr="approved_reviews",
                ),
            )
        )


# GET /api/products/id/3/
class ProductDetailByIdAPIView(ProductDetailBaseAPIView):
    lookup_field = "id"
    lookup_url_kwarg = "product_id"


# GET /api/products/کیف-چرمی/
class ProductDetailBySlugAPIView(ProductDetailBaseAPIView):
    lookup_field = "slug"
    lookup_url_kwarg = "product_slug"


# GET /api/categories/
class CategoryListAPIView(
    CategoryVisibilityMixin,
    ListAPIView,
):
    serializer_class = CategorySerializer
    permission_classes = (AllowAny,)

    def get_queryset(self):
        return (
            Category.objects
            .filter(id__in=self.get_visible_ids())
            .order_by(
                "sort_order",
                "name",
                "id",
            )
        )


# محصولات یک دسته و تمام زیرمجموعه‌های آن
class CategoryProductsAPIView(
    CategoryVisibilityMixin,
    ListAPIView,
):
    serializer_class = CategoryProductSerializer
    permission_classes = (AllowAny,)

    def get_queryset(self):
        category_slug = self.kwargs["category_slug"]

        category = get_object_or_404(
            Category.objects.filter(
                id__in=self.get_visible_ids()
            ),
            slug=category_slug,
        )

        queryset = filter_products_by_category(
            get_visible_products(self.get_visible_ids()),
            category.slug,
            self.get_category_rows(),
        )

        return queryset.order_by(
            "-created_at",
            "id",
        )


# GET /api/menu/categories/
# منوی چندسطحی بدون صفحه‌بندی
class MenuCategoryAPIView(ListAPIView):
    serializer_class = MenuCategorySerializer
    permission_classes = (AllowAny,)
    pagination_class = None

    def get_menu_data(self):
        if hasattr(self, "_menu_roots"):
            return

        categories = list(
            Category.objects
            .filter(
                is_active=True,
                show_in_menu=True,
            )
            .order_by(
                "sort_order",
                "name",
                "id",
            )
        )

        children_by_parent = defaultdict(list)

        for category in categories:
            children_by_parent[category.parent_id].append(
                category
            )

        # فقط شاخه‌هایی نمایش داده می‌شوند که از یک والد اصلی
        # فعال و قابل نمایش در منو شروع شده باشند.
        roots = children_by_parent[None]
        queue = deque(roots)
        reachable_ids = set()

        while queue:
            category = queue.popleft()

            if category.pk in reachable_ids:
                continue

            reachable_ids.add(category.pk)
            queue.extend(children_by_parent[category.pk])

        self._menu_roots = roots

        self._menu_children_by_parent = {
            parent_id: [
                child
                for child in children
                if child.pk in reachable_ids
            ]
            for parent_id, children in children_by_parent.items()
            if parent_id in reachable_ids
        }

    def get_queryset(self):
        self.get_menu_data()
        return self._menu_roots

    def get_serializer_context(self):
        self.get_menu_data()

        context = super().get_serializer_context()

        context["menu_children_by_parent"] = (
            self._menu_children_by_parent
        )

        return context

# Authenticated users can submit/update one review; edits require reapproval.
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from users.views import PrivateAPIView


class ReviewInputSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductReview
        fields = ("rating", "title", "comment")

    def validate_comment(self, value):
        if not value.strip():
            raise serializers.ValidationError("متن نظر را وارد کنید.")
        return value.strip()


class ProductReviewAPIView(PrivateAPIView):
    def get_product(self, product_id):
        return get_object_or_404(get_visible_products(), pk=product_id)

    def get(self, request, product_id):
        product = self.get_product(product_id)
        review = ProductReview.objects.filter(product=product, user=request.user).first()
        return Response(None if not review else {
            "rating": review.rating, "title": review.title, "comment": review.comment,
            "is_approved": review.is_approved,
        })

    @transaction.atomic
    def post(self, request, product_id):
        from django.contrib.auth import get_user_model
        product = self.get_product(product_id)
        get_user_model().objects.select_for_update().get(pk=request.user.pk)
        serializer = ReviewInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        review, created = ProductReview.objects.update_or_create(
            product=product, user=request.user,
            defaults={**serializer.validated_data, "is_approved": False},
        )
        return Response({"detail": "نظر شما ثبت شد و پس از بررسی نمایش داده می‌شود."}, status=201 if created else 200)

    def delete(self, request, product_id):
        ProductReview.objects.filter(product_id=product_id, user=request.user).delete()
        return Response(status=204)


class ProductFilterOptionsAPIView(ListAPIView):
    permission_classes = (AllowAny,)
    pagination_class = None

    def get(self, request):
        products = get_visible_products()
        variants = ProductVariant.objects.filter(product__in=products, is_active=True)
        return Response({
            "colors": list(variants.exclude(color="").order_by("color").values_list("color", flat=True).distinct()),
            "sizes": list(variants.exclude(size="").order_by("size").values_list("size", flat=True).distinct()),
            "materials": list(products.exclude(material="").order_by("material").values_list("material", flat=True).distinct()),
        })

