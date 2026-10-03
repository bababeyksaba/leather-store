from django import forms
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

from .models import ProductVariant
from django.forms.models import BaseInlineFormSet
from django.core.exceptions import ValidationError
from .variants import sync_legacy_stock

class VariantFormSet(BaseInlineFormSet):
    def clean(self):
        super().clean()
        if any(self.errors):
            return
        remaining = [f for f in self.forms if f.cleaned_data and not f.cleaned_data.get("DELETE")]
        if not remaining:
            raise ValidationError("حداقل یک رنگ/سایز برای محصول ثبت کنید.")

class ProductVariantForm(forms.ModelForm):
    class Meta:
        model = ProductVariant
        fields = "__all__"
        widgets = {"color_hex": forms.TextInput(attrs={"type": "color"})}


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    form = ProductVariantForm
    formset = VariantFormSet
    extra = 1
    fields = ("sku", "color", "color_hex", "size", "price", "stock", "image", "is_active")

ProductAdmin.inlines = [ProductImageInline, ProductVariantInline]
ProductAdmin.list_editable = ("is_active",)
ProductAdmin.readonly_fields = ("created_at", "updated_at", "stock")
_original_save_related = ProductAdmin.save_related

def save_related_with_stock(self, request, form, formsets, change):
    _original_save_related(self, request, form, formsets, change)
    sync_legacy_stock([form.instance.pk])

ProductAdmin.save_related = save_related_with_stock

@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    form = ProductVariantForm
    list_display = ("product", "sku", "color", "size", "price", "stock", "is_active")
    search_fields = ("sku", "product__name", "color", "size")
    list_filter = ("is_active", "color", "size")
    readonly_fields = ("is_default",)

    def get_readonly_fields(self, request, obj=None):
        return ("is_default", "product") if obj else ("is_default",)

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        sync_legacy_stock([obj.product_id])

    def delete_model(self, request, obj):
        product_id = obj.product_id
        super().delete_model(request, obj)
        sync_legacy_stock([product_id])

    def delete_queryset(self, request, queryset):
        product_ids = list(queryset.values_list("product_id", flat=True))
        super().delete_queryset(request, queryset)
        sync_legacy_stock(product_ids)
