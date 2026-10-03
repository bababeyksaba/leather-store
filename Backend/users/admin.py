from django.contrib import admin

from .models import CustomerProfile, Address


class AddressInline(admin.TabularInline):
    model = Address
    extra = 0


@admin.register(CustomerProfile)
class CustomerProfileAdmin(admin.ModelAdmin):
    list_display = (
        "phone",
        "first_name",
        "last_name",
        "gender",
    )

    search_fields = (
        "phone",
        "first_name",
        "last_name",
    )

    readonly_fields = (
        "user",
        "phone",
    )

    inlines = (AddressInline,)


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "profile",
        "province",
        "city",
        "postal_code",
    )

    search_fields = (
        "profile__phone",
        "title",
        "postal_code",
    )

    list_select_related = ("profile",)

from .models import Province, City

@admin.register(Province)
class ProvinceAdmin(admin.ModelAdmin):
    search_fields = ("name",)

@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ("name", "province")
    search_fields = ("name", "province__name")
    list_filter = ("province",)

