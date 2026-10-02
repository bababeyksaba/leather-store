from rest_framework import serializers

from .models import Order, OrderItem, ShippingMethod


class ShippingMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShippingMethod

        fields = [
            "id",
            "name",
            "fee",
            "description",
        ]


class OrderCreateSerializer(serializers.Serializer):
    address_id = serializers.IntegerField(min_value=1)

    shipping_method_id = serializers.IntegerField(
        min_value=1,
    )

    idempotency_key = serializers.UUIDField()


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem

        fields = [
            "product_id",
            "name",
            "sku",
            "color",
            "material",
            "quantity",
            "unit_price",
            "item_total",
        ]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(
        many=True,
        read_only=True,
    )

    status_label = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    fulfillment_label = serializers.CharField(
        source="get_fulfillment_status_display",
        read_only=True,
    )

    class Meta:
        model = Order

        fields = [
            "number",
            "idempotency_key",
            "status",
            "status_label",
            "payment_mode",

            "recipient_name",
            "phone",
            "address_title",
            "province",
            "city",
            "address_line",
            "postal_code",
            "landline",

            "shipping_name",
            "subtotal",
            "shipping_fee",
            "total",

            "expires_at",
            "paid_at",
            "created_at",
            "items",

            "fulfillment_status",
            "fulfillment_label",
            "carrier",
            "tracking_code",
            "processing_at",
            "shipped_at",
            "delivered_at",
        ]