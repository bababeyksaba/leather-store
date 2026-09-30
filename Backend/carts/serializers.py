from rest_framework import serializers


class CartItemInputSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(
        min_value=1,
        max_value=10000,
    )