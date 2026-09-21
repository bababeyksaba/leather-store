from django.contrib import admin

from .models import Category, Product


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "slug",
        "is_active",
        "created_at",
    )
    list_filter = ("is_active",)
    search_fields = ("name", "slug")
    prepopulated_fields = {
        "slug": ("name",),
    }


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "category",
        "sku",
        "price",
        "stock",
        "is_active",
        "created_at",
    )
    list_filter = (
        "is_active",
        "category",
        "material",
        "color",
    )
    search_fields = (
        "name",
        "sku",
        "slug",
        "description",
    )
    prepopulated_fields = {
        "slug": ("name",),
    }
    list_select_related = ("category",)
    readonly_fields = (
        "created_at",
        "updated_at",
    )