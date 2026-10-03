from django.middleware.csrf import get_token

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .authentication import CartSessionAuthentication
from .serializers import CartItemInputSerializer
from .services import (
    add_item,
    cart_summary,
    soft_delete_item,
    update_item,
)


class CartBaseAPIView(APIView):
    authentication_classes = [CartSessionAuthentication]
    permission_classes = [AllowAny]


class CartAPIView(CartBaseAPIView):
    """نمایش محصولات سبد و مجموع قیمت."""

    def get(self, request):
        result = cart_summary(request)
        result["csrf_token"] = get_token(request)

        return Response(result)


class CartItemCreateAPIView(CartBaseAPIView):
    """افزودن محصول و تغییر تعداد آن."""

    def post(self, request, product_id):
        serializer = CartItemInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = add_item(
            request,
            product_id,
            serializer.validated_data["quantity"],
        )

        result["detail"] = "محصول به سبد خرید اضافه شد."

        return Response(
            result,
            status=status.HTTP_201_CREATED,
        )

    def patch(self, request, product_id):
        serializer = CartItemInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = update_item(
            request,
            product_id,
            serializer.validated_data["quantity"],
        )

        result["detail"] = "تعداد محصول تغییر کرد."

        return Response(
            result,
            status=status.HTTP_200_OK,
        )


class CartItemDeleteAPIView(CartBaseAPIView):
    """حذف نرم محصول از سبد."""

    def delete(self, request, product_id):
        soft_delete_item(request, product_id)

        return Response(
            status=status.HTTP_204_NO_CONTENT,
        )

from .services import mutate_variant, delete_variant

class CartVariantAPIView(CartBaseAPIView):
    def write(self, request, variant_id, replace):
        serializer = CartItemInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = mutate_variant(request, variant_id, serializer.validated_data["quantity"], replace)
        return Response(result, status=200 if replace else 201)

    def post(self, request, variant_id):
        return self.write(request, variant_id, False)

    def patch(self, request, variant_id):
        return self.write(request, variant_id, True)

    def delete(self, request, variant_id):
        delete_variant(request, variant_id)
        return Response(status=204)

