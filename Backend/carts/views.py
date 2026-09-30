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
)


class CartBaseAPIView(APIView):
    authentication_classes = [CartSessionAuthentication]
    permission_classes = [AllowAny]


class CartAPIView(CartBaseAPIView):
    def get(self, request):
        result = cart_summary(request)
        result["csrf_token"] = get_token(request)

        return Response(result)


class CartItemCreateAPIView(CartBaseAPIView):
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


class CartItemDeleteAPIView(CartBaseAPIView):
    def delete(self, request, product_id):
        soft_delete_item(request, product_id)

        return Response(
            status=status.HTTP_204_NO_CONTENT,
        )