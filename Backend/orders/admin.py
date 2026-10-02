from django import forms
from django.contrib import admin
from django.core.exceptions import ValidationError

from .models import Order, OrderItem, ShippingMethod
from .fulfillment import (
    EDITABLE_FIELDS,
    TIMESTAMP_FIELDS,
    validate_fulfillment,
    apply_fulfillment,
)


class OrderAdminForm(forms.ModelForm):
    class Meta:
        model = Order
        fields = EDITABLE_FIELDS

    def clean(self):
        data = super().clean()

        if not self.instance.pk or self.errors:
            return data

        # Django درخواست POST ادمین را داخل transaction اجرا می‌کند.
        locked_order = (
            Order.objects
            .select_for_update()
            .get(pk=self.instance.pk)
        )

        try:
            validate_fulfillment(
                locked_order,
                data["fulfillment_status"],
                data.get("carrier", ""),
                data.get("tracking_code", ""),
            )

        except ValidationError as error:
            raise forms.ValidationError(error.messages)

        return data


@admin.register(ShippingMethod)
class ShippingMethodAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "fee",
        "is_active",
    ]

    list_editable = [
        "fee",
        "is_active",
    ]


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    can_delete = False

    readonly_fields = [
        "product",
        "name",
        "sku",
        "color",
        "material",
        "quantity",
        "unit_price",
        "item_total",
    ]

    def has_add_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    form = OrderAdminForm

    list_display = [
        "number",
        "recipient_name",
        "phone",
        "status",
        "fulfillment_status",
        "carrier",
        "tracking_code",
        "total",
        "created_at",
    ]

    list_filter = [
        "status",
        "fulfillment_status",
        "payment_mode",
        "created_at",
    ]

    search_fields = [
        "phone",
        "recipient_name",
        "number",
        "tracking_code",
    ]

    inlines = [OrderItemInline]

    readonly_fields = [
        field.name
        for field in Order._meta.fields
        if field.name not in EDITABLE_FIELDS
    ]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def save_model(self, request, obj, form, change):
        locked_order = (
            Order.objects
            .select_for_update()
            .get(pk=obj.pk)
        )

        apply_fulfillment(
            locked_order,
            form.cleaned_data["fulfillment_status"],
            form.cleaned_data.get("carrier", ""),
            form.cleaned_data.get("tracking_code", ""),
        )

        # فقط فیلدهای ارسال ذخیره شدند.
        # قیمت، پرداخت و موجودی تغییر نمی‌کنند.
        for name in EDITABLE_FIELDS + TIMESTAMP_FIELDS:
            setattr(
                obj,
                name,
                getattr(locked_order, name),
            )