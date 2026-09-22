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
            .order_by(
                "-created_at"
            )
        )


        category_slug = (
            self.request
            .query_params
            .get("category")
        )


        search = (
            self.request
            .query_params
            .get("search")
        )


        if category_slug:

            queryset = queryset.filter(
                category__slug=category_slug
            )


        if search:

            search = search.strip()[:100]

            queryset = queryset.filter(
                Q(name__icontains=search)
                |
                Q(description__icontains=search)
                |
                Q(material__icontains=search)
                |
                Q(color__icontains=search)
            )


        return queryset




# ==================================
# جزئیات محصول با ID
# GET /api/products/id/1/
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
        )





# ==================================
# جزئیات محصول با Slug
# GET /api/products/name/
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


class CategoryProductsAPIView(ListAPIView):

    serializer_class = CategoryProductSerializer


    def get_queryset(self):

        category_slug = self.kwargs.get(
            "category_slug"
        )

        return (
            Product.objects
            .filter(
                is_active=True,
                category__is_active=True,
                category__slug=category_slug,
            )
            .select_related(
                "category"
            )
            .order_by(
                "-created_at"
            )
        )