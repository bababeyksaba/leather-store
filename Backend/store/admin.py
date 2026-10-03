from django.contrib import admin
from .models import StoreSettings, ContentPage

@admin.register(StoreSettings)
class StoreSettingsAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return not StoreSettings.objects.exists() and super().has_add_permission(request)
    def has_delete_permission(self, request, obj=None): return False

@admin.register(ContentPage)
class ContentPageAdmin(admin.ModelAdmin):
    list_display = ("title", "slug", "is_published")
    list_editable = ("is_published",)
    search_fields = ("title", "body")

