from django.contrib import admin

from .models import (
    Category,
    Product,
    ProductImage,
    ProductReview,
)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "parent",
        "sort_order",
        "show_in_menu",
        "is_active",
    )

    list_display_links = ("name",)

    list_editable = (
        "sort_order",
        "show_in_menu",
        "is_active",
    )

    list_filter = (
        "parent",
        "show_in_menu",
        "is_active",
    )

    search_fields = (
        "name",
        "slug",
    )

    ordering = (
        "sort_order",
        "name",
    )

    list_select_related = ("parent",)

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    fields = (
        "name",
        "slug",
        "parent",
        "image",
        "description",
        "sort_order",
        "show_in_menu",
        "is_active",
        "created_at",
        "updated_at",
    )

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "parent":
            queryset = Category.objects.all()

            object_id = request.resolver_match.kwargs.get("object_id")

            if object_id:
                queryset = queryset.exclude(pk=object_id)

            kwargs["queryset"] = queryset

        return super().formfield_for_foreignkey(
            db_field,
            request,
            **kwargs,
        )


class ProductImageInline(admin.TabularInline):
    model = ProductImage

    extra = 1

    fields = (
        "image",
        "alt_text",
        "is_primary",
    )


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "sku",
        "category",
        "price",
        "stock",
        "is_active",
    )

    list_display_links = ("name",)

    list_editable = (
        "price",
        "stock",
        "is_active",
    )

    list_filter = (
        "category",
        "is_active",
    )

    search_fields = (
        "name",
        "slug",
        "sku",
    )

    list_select_related = ("category",)

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    inlines = (ProductImageInline,)

    fieldsets = (
        (
            "اطلاعات اصلی",
            {
                "fields": (
                    "category",
                    "name",
                    "slug",
                    "sku",
                    "is_active",
                ),
            },
        ),
        (
            "مشخصات محصول",
            {
                "fields": (
                    "description",
                    "material",
                    "color",
                    "dimensions",
                    "size",
                    "care_instructions",
                ),
            },
        ),
        (
            "قیمت و موجودی",
            {
                "fields": (
                    "price",
                    "stock",
                ),
            },
        ),
        (
            "تصویر اصلی",
            {
                "fields": ("image",),
            },
        ),
        (
            "تاریخ‌ها",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                ),
            },
        ),
    )


@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = (
        "product",
        "alt_text",
        "is_primary",
        "created_at",
    )

    list_filter = ("is_primary",)

    search_fields = (
        "product__name",
        "alt_text",
    )

    list_select_related = ("product",)

    readonly_fields = ("created_at",)


@admin.register(ProductReview)
class ProductReviewAdmin(admin.ModelAdmin):
    list_display = (
        "product",
        "user",
        "rating",
        "is_approved",
        "created_at",
    )

    list_editable = ("is_approved",)

    list_filter = (
        "is_approved",
        "rating",
    )

    search_fields = (
        "product__name",
        "title",
        "comment",
    )

    list_select_related = (
        "product",
        "user",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    fields = (
        "product",
        "user",
        "rating",
        "title",
        "comment",
        "is_approved",
        "created_at",
        "updated_at",
    )