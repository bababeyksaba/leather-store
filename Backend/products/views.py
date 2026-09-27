from django.db.models import Q

from rest_framework.generics import (
    ListAPIView,
    RetrieveAPIView,
)

from .models import (
    Product,
    Category,
)

from .serializers import (
    ProductListSerializer,
    ProductDetailSerializer,
    CategorySerializer,
    CategoryProductSerializer,
)


# ==================================
# لیست محصولات
# GET /api/products/
# ==================================

class ProductListAPIView(ListAPIView):

    serializer_class = ProductListSerializer


    def get_queryset(self):

        queryset = (
            Product.objects
            .filter(
                is_active=True,
                category__is_active=True,
            )
            .select_related(
                "category"
            )
            .prefetch_related(
                "images"
            )
        )


        # -------------------------
        # جستجو
        # -------------------------

        search = self.request.query_params.get(
            "search"
        )

        if search:

            search = search.strip()

            queryset = queryset.filter(
                Q(name__icontains=search)
                |
                Q(description__icontains=search)
                |
                Q(material__icontains=search)
                |
                Q(color__icontains=search)
                |
                Q(category__name__icontains=search)
            )


        # -------------------------
        # فیلتر دسته بندی
        # -------------------------

        category = self.request.query_params.get(
            "category"
        )

        if category:

            queryset = queryset.filter(
                category__slug=category
            )


        # -------------------------
        # فیلتر جنس
        # -------------------------

        material = self.request.query_params.get(
            "material"
        )

        if material:

            queryset = queryset.filter(
                material__icontains=material
            )


        # -------------------------
        # فیلتر رنگ
        # -------------------------

        color = self.request.query_params.get(
            "color"
        )

        if color:

            queryset = queryset.filter(
                color__icontains=color
            )


        # -------------------------
        # حداقل قیمت
        # -------------------------

        min_price = self.request.query_params.get(
            "min_price"
        )

        if min_price:

            queryset = queryset.filter(
                price__gte=min_price
            )


        # -------------------------
        # حداکثر قیمت
        # -------------------------

        max_price = self.request.query_params.get(
            "max_price"
        )

        if max_price:

            queryset = queryset.filter(
                price__lte=max_price
            )


        # -------------------------
        # فقط موجودها
        # -------------------------

        available = self.request.query_params.get(
            "available"
        )

        if available == "true":

            queryset = queryset.filter(
                stock__gt=0
            )


        # -------------------------
        # مرتب سازی
        # -------------------------

        ordering = self.request.query_params.get(
            "ordering"
        )


        if ordering in [
            "price",
            "-price",
            "created_at",
            "-created_at",
        ]:

            queryset = queryset.order_by(
                ordering
            )

        else:

            queryset = queryset.order_by(
                "-created_at"
            )


        return queryset



# ==================================
# جزئیات محصول با ID
# GET /api/products/id/3/
# ==================================

class ProductDetailByIdAPIView(RetrieveAPIView):

    serializer_class = ProductDetailSerializer

    lookup_field = "id"

    lookup_url_kwarg = "product_id"


    def get_queryset(self):

        return (
            Product.objects
            .filter(
                is_active=True,
                category__is_active=True,
            )
            .select_related(
                "category"
            )
            .prefetch_related(
                "images"
            )
        )



# ==================================
# جزئیات محصول با Slug
# GET /api/products/کیف-مجلسی/
# ==================================

class ProductDetailBySlugAPIView(RetrieveAPIView):

    serializer_class = ProductDetailSerializer

    lookup_field = "slug"

    lookup_url_kwarg = "product_slug"


    def get_queryset(self):

        return (
            Product.objects
            .filter(
                is_active=True,
                category__is_active=True,
            )
            .select_related(
                "category"
            )
            .prefetch_related(
                "images"
            )
        )



# ==================================
# لیست دسته بندی ها
# GET /api/categories/
# ==================================

class CategoryListAPIView(ListAPIView):

    serializer_class = CategorySerializer


    def get_queryset(self):

        return (
            Category.objects
            .filter(
                is_active=True
            )
            .order_by(
                "name"
            )
        )



# ==================================
# محصولات یک دسته بندی
# GET /api/categories/کیف-چرمی/products/
# ==================================

class CategoryProductsAPIView(ListAPIView):

    serializer_class = CategoryProductSerializer


    def get_queryset(self):

        category_slug = self.kwargs.get(
            "category_slug"
        )


        return (
            Product.objects
            .filter(
                category__slug=category_slug,
                is_active=True,
                category__is_active=True,
            )
            .select_related(
                "category"
            )
            .prefetch_related(
                "images"
            )
            .order_by(
                "-created_at"
            )
        )