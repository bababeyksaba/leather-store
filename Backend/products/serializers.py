from rest_framework import serializers

from .models import Category, Product


class CategorySerializer(serializers.ModelSerializer):

    class Meta:
        model = Category

        fields = (
            "id",
            "name",
            "slug",
        )


class ProductListSerializer(serializers.ModelSerializer):

    category = CategorySerializer(read_only=True)

    is_available = serializers.BooleanField(
        read_only=True
    )


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



class ProductDetailSerializer(serializers.ModelSerializer):

    category_id = serializers.IntegerField(
        source="category.id",
        read_only=True
    )

    category_name = serializers.CharField(
        source="category.name",
        read_only=True
    )

    category_slug = serializers.CharField(
        source="category.slug",
        read_only=True
    )

    is_available = serializers.BooleanField(
        read_only=True
    )


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
            "price",
            "stock",
            "image",
            "is_available",
            "is_active",
            "created_at",
            "updated_at",
        )




class CategoryProductSerializer(serializers.ModelSerializer):

    class Meta:
        model = Product

        fields = (
            "id",
            "name",
            "slug",
            "material",
            "color",
            "price",
            "stock",
            "image",
            "created_at",
        )