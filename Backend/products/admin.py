from django import forms
from django.contrib import admin
from django.core.exceptions import ValidationError
from django.forms.models import BaseInlineFormSet

from .banner_models import HomepageBanner
from .models import (
    Category,
    Product,
    ProductImage,
    ProductReview,
    ProductVariant,
)
from .variants import sync_legacy_stock


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "parent",
        "sort_order",
        "show_in_menu",
        "show_on_homepage",
        "homepage_order",
        "is_active",
    )

    list_display_links = ("name",)

    list_editable = (
        "sort_order",
        "show_in_menu",
        "show_on_homepage",
        "homepage_order",
        "is_active",
    )

    list_filter = (
        "show_on_homepage",
        "show_in_menu",
        "is_active",
        "parent",
    )

    search_fields = ("name", "slug")
    ordering = ("sort_order", "name")
    list_select_related = ("parent",)
    readonly_fields = ("created_at", "updated_at")

    fieldsets = (
        (
            "اطلاعات دسته‌بندی",
            {
                "fields": (
                    "name",
                    "slug",
                    "parent",
                    "image",
                    "description",
                    "is_active",
                ),
            },
        ),
        (
            "منوی بالای سایت",
            {
                "fields": (
                    "show_in_menu",
                    "sort_order",
                ),
            },
        ),
        (
            "دسته‌های صفحهٔ اصلی",
            {
                "fields": (
                    "show_on_homepage",
                    "homepage_order",
                ),
                "description": (
                    "فقط دسته‌های انتخاب‌شده در این بخش، "
                    "بالای محصولات منتخب نمایش داده می‌شوند."
                ),
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

    def formfield_for_foreignkey(
        self, db_field, request, **kwargs
    ):
        if db_field.name == "parent":
            queryset = Category.objects.all()
            resolver_match = request.resolver_match

            object_id = (
                resolver_match.kwargs.get("object_id")
                if resolver_match
                else None
            )

            if object_id:
                queryset = queryset.exclude(pk=object_id)

            kwargs["queryset"] = queryset

        return super().formfield_for_foreignkey(
            db_field,
            request,
            **kwargs,
        )


class ProductImageForm(forms.ModelForm):
    class Meta:
        model = ProductImage
        fields = "__all__"

    def clean(self):
        cleaned_data = super().clean()

        product = cleaned_data.get("product")
        variant = cleaned_data.get("variant")

        if (
            product
            and variant
            and variant.product_id != product.pk
        ):
            self.add_error(
                "variant",
                "رنگ انتخاب‌شده متعلق به این محصول نیست.",
            )

        return cleaned_data


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    form = ProductImageForm
    fk_name = "product"
    extra = 1

    verbose_name = "تصویر گالری"
    verbose_name_plural = "تصاویر گالری هر رنگ"

    fields = (
        "variant",
        "image",
        "alt_text",
        "is_primary",
    )

    def formfield_for_foreignkey(
        self, db_field, request, **kwargs
    ):
        if db_field.name == "variant":
            resolver_match = request.resolver_match

            object_id = (
                resolver_match.kwargs.get("object_id")
                if resolver_match
                else None
            )

            kwargs["queryset"] = (
                ProductVariant.objects
                .filter(product_id=object_id)
                .order_by("color", "id")
                if object_id
                else ProductVariant.objects.none()
            )

        return super().formfield_for_foreignkey(
            db_field,
            request,
            **kwargs,
        )


class VariantFormSet(BaseInlineFormSet):
    def clean(self):
        super().clean()

        if any(self.errors):
            return

        remaining = [
            form
            for form in self.forms
            if form.cleaned_data
            and not form.cleaned_data.get("DELETE")
        ]

        if not remaining:
            raise ValidationError(
                "حداقل یک رنگ برای محصول ثبت کنید."
            )


class ProductVariantForm(forms.ModelForm):
    class Meta:
        model = ProductVariant
        fields = "__all__"

        widgets = {
            "color_hex": forms.TextInput(
                attrs={"type": "color"}
            ),
        }


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    form = ProductVariantForm
    formset = VariantFormSet
    extra = 1

    verbose_name = "رنگ محصول"
    verbose_name_plural = "رنگ‌ها و موجودی محصول"

    fields = (
        "sku",
        "color",
        "color_hex",
        "price",
        "stock",
        "image",
        "is_active",
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
    list_editable = ("is_active",)
    list_filter = ("category", "is_active")
    search_fields = ("name", "slug", "sku")
    list_select_related = ("category",)

    readonly_fields = (
        "created_at",
        "updated_at",
        "stock",
    )

    # ابتدا رنگ‌ها، سپس عکس‌های مرتبط با هر رنگ.
    inlines = (
        ProductVariantInline,
        ProductImageInline,
    )

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
                "description": (
                    "موجودی کل از موجودی رنگ‌های محصول "
                    "محاسبه می‌شود."
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

    def save_related(
        self, request, form, formsets, change
    ):
        super().save_related(
            request,
            form,
            formsets,
            change,
        )

        sync_legacy_stock([form.instance.pk])


@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    form = ProductImageForm

    list_display = (
        "product",
        "variant",
        "alt_text",
        "is_primary",
        "created_at",
    )

    list_filter = (
        "is_primary",
        "variant__color",
    )

    search_fields = (
        "product__name",
        "product__sku",
        "variant__color",
        "alt_text",
    )

    list_select_related = (
        "product",
        "variant",
    )

    readonly_fields = ("created_at",)

    fields = (
        "product",
        "variant",
        "image",
        "alt_text",
        "is_primary",
        "created_at",
    )

    def formfield_for_foreignkey(
        self, db_field, request, **kwargs
    ):
        if db_field.name == "variant":
            product_id = None

            if request.method == "POST":
                product_id = request.POST.get("product")
            else:
                resolver_match = request.resolver_match

                object_id = (
                    resolver_match.kwargs.get("object_id")
                    if resolver_match
                    else None
                )

                if object_id:
                    product_id = (
                        ProductImage.objects
                        .filter(pk=object_id)
                        .values_list("product_id", flat=True)
                        .first()
                    )
                else:
                    product_id = request.GET.get("product")

            if product_id and str(product_id).isdigit():
                kwargs["queryset"] = (
                    ProductVariant.objects
                    .filter(product_id=product_id)
                    .order_by("color", "id")
                )
            else:
                kwargs["queryset"] = (
                    ProductVariant.objects
                    .select_related("product")
                    .order_by("product__name", "color", "id")
                )

        return super().formfield_for_foreignkey(
            db_field,
            request,
            **kwargs,
        )


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
    list_filter = ("is_approved", "rating")

    search_fields = (
        "product__name",
        "title",
        "comment",
    )

    list_select_related = ("product", "user")
    readonly_fields = ("created_at", "updated_at")

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


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    form = ProductVariantForm

    list_display = (
        "product",
        "sku",
        "color",
        "price",
        "stock",
        "is_active",
    )

    search_fields = (
        "sku",
        "product__name",
        "color",
    )

    list_filter = ("is_active", "color")
    list_select_related = ("product",)

    fields = (
        "product",
        "sku",
        "color",
        "color_hex",
        "price",
        "stock",
        "image",
        "is_active",
        "is_default",
    )

    readonly_fields = ("is_default",)

    def get_readonly_fields(self, request, obj=None):
        if obj:
            return ("is_default", "product")

        return ("is_default",)

    def save_model(
        self, request, obj, form, change
    ):
        super().save_model(
            request,
            obj,
            form,
            change,
        )

        sync_legacy_stock([obj.product_id])

    def delete_model(self, request, obj):
        product_id = obj.product_id

        super().delete_model(request, obj)

        sync_legacy_stock([product_id])

    def delete_queryset(self, request, queryset):
        product_ids = list(
            queryset.values_list(
                "product_id",
                flat=True,
            ).distinct()
        )

        super().delete_queryset(request, queryset)

        sync_legacy_stock(product_ids)


@admin.register(HomepageBanner)
class HomepageBannerAdmin(admin.ModelAdmin):
    list_display = (
        "position",
        "category",
        "is_active",
    )

    list_display_links = ("position",)

    list_editable = (
        "category",
        "is_active",
    )

    list_filter = ("is_active",)

    search_fields = (
        "category__name",
        "category__slug",
    )

    list_select_related = ("category",)
    autocomplete_fields = ("category",)

    fieldsets = (
        (
            "لینک بنر",
            {
                "fields": (
                    "position",
                    "category",
                    "is_active",
                ),
                "description": (
                    "برای هر عکس صفحهٔ اصلی، دسته‌بندی "
                    "مقصد را انتخاب کنید."
                ),
            },
        ),
    )

    def has_add_permission(self, request):
        return (
            super().has_add_permission(request)
            and HomepageBanner.objects.count() < 3
        )