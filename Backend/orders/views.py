from django.conf import settings
from django.shortcuts import get_object_or_404

from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from users.authentication import CSRFSessionAuthentication

from .models import Order, ShippingMethod
from .serializers import (
    ShippingMethodSerializer,
    OrderCreateSerializer,
    OrderSerializer,
)
from .services import (
    create_order,
    finish_order,
    expire_orders,
    clear_purchased_cart,
)


class OrderBaseAPIView(APIView):
    authentication_classes = [CSRFSessionAuthentication]
    permission_classes = [IsAuthenticated]


class ShippingMethodsAPIView(OrderBaseAPIView):
    permission_classes = [AllowAny]

    def get(self, request):
        expire_orders()

        methods = ShippingMethod.objects.filter(
            is_active=True,
        )

        return Response(
            ShippingMethodSerializer(
                methods,
                many=True,
            ).data
        )


class OrderListCreateAPIView(OrderBaseAPIView):
    def get(self, request):
        expire_orders(request.user)

        orders = (
            Order.objects
            .filter(user=request.user)
            .prefetch_related("items")
        )

        return Response(
            OrderSerializer(
                orders[:100],
                many=True,
            ).data
        )

    def post(self, request):
        if (
            not settings.DEBUG
            or getattr(settings, "PAYMENT_BACKEND", "") != "test"
        ):
            return Response(
                {
                    "detail": (
                        "این نسخه ثبت سفارش آزمایشی است "
                        "و در حالت انتشار فعال نیست."
                    )
                },
                status=503,
            )

        serializer = OrderCreateSerializer(
            data=request.data,
        )

        serializer.is_valid(raise_exception=True)

        expire_orders()

        order, created = create_order(
            request.user,
            request.session,
            serializer.validated_data,
        )

        if created:
            request.session["checkout_order"] = str(
                order.number
            )

        return Response(
            OrderSerializer(order).data,
            status=201 if created else 200,
        )


class OrderDetailAPIView(OrderBaseAPIView):
    def get(self, request, number):
        expire_orders(request.user)

        order = get_object_or_404(
            Order.objects.prefetch_related("items"),
            number=number,
            user=request.user,
        )

        return Response(OrderSerializer(order).data)


class TestPaymentAPIView(OrderBaseAPIView):
    def post(self, request, number):
        if (
            not settings.DEBUG
            or getattr(settings, "PAYMENT_BACKEND", "") != "test"
        ):
            return Response(
                {"detail": "پرداخت آزمایشی غیرفعال است."},
                status=403,
            )

        order, newly_paid = finish_order(
            request.user,
            number,
            "pay",
        )

        if newly_paid:
            clear_purchased_cart(
                request.session,
                order,
            )

        return Response(OrderSerializer(order).data)


class OrderCancelAPIView(OrderBaseAPIView):
    def post(self, request, number):
        order, _ = finish_order(
            request.user,
            number,
            "cancel",
        )

        return Response(OrderSerializer(order).data)