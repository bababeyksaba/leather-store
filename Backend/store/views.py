from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import StoreSettings, ContentPage

class StoreInfoAPIView(APIView):
    permission_classes = (AllowAny,)
    def get(self, request):
        config = StoreSettings.objects.first()
        fields = ("name", "phone", "email", "whatsapp", "instagram", "address", "hours", "price_unit")
        return Response({"settings": {f: getattr(config, f) for f in fields} if config else {},
            "pages": list(ContentPage.objects.filter(is_published=True).values("slug", "title"))})

class ContentPageAPIView(APIView):
    permission_classes = (AllowAny,)
    def get(self, request, slug):
        page = get_object_or_404(ContentPage, slug=slug, is_published=True)
        return Response({"slug": page.slug, "title": page.title, "body": page.body})

