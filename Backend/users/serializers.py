import re

from django.utils import timezone
from rest_framework import serializers

from .models import CustomerProfile, Address


def normalize_digits(value):
    return str(value).translate(
        str.maketrans(
            "۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩",
            "01234567890123456789",
        )
    ).strip()


class PhoneSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=20)

    def validate_phone(self, value):
        value = normalize_digits(value)
        value = value.replace(" ", "").replace("-", "")

        if value.startswith("+98"):
            value = "0" + value[3:]
        elif value.startswith("0098"):
            value = "0" + value[4:]

        if not re.fullmatch(r"09[0-9]{9}", value):
            raise serializers.ValidationError(
                "شماره موبایل را به صورت 09123456789 وارد کنید."
            )

        return value


class VerifySerializer(PhoneSerializer):
    code = serializers.CharField(max_length=6)

    def validate_code(self, value):
        value = normalize_digits(value)

        if not re.fullmatch(r"[0-9]{6}", value):
            raise serializers.ValidationError(
                "کد باید شش رقم باشد."
            )

        return value


class ProfileSerializer(serializers.ModelSerializer):
    is_complete = serializers.BooleanField(read_only=True)

    first_name = serializers.CharField(
        max_length=100,
        allow_blank=False,
    )

    last_name = serializers.CharField(
        max_length=100,
        allow_blank=False,
    )

    gender = serializers.ChoiceField(
        choices=["female", "male", "other"],
    )

    birth_date = serializers.DateField(allow_null=False)

    class Meta:
        model = CustomerProfile

        fields = [
            "phone",
            "first_name",
            "last_name",
            "gender",
            "birth_date",
            "is_complete",
        ]

        read_only_fields = [
            "phone",
            "is_complete",
        ]

    def validate_birth_date(self, value):
        if value > timezone.localdate():
            raise serializers.ValidationError(
                "تاریخ تولد نمی‌تواند در آینده باشد."
            )

        return value


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address

        fields = [
            "id",
            "title",
            "province",
            "city",
            "address_line",
            "landline",
            "postal_code",
        ]

        read_only_fields = ["id"]

    def validate_postal_code(self, value):
        value = normalize_digits(value)

        if not re.fullmatch(r"[0-9]{10}", value):
            raise serializers.ValidationError(
                "کد پستی باید ده رقم باشد."
            )

        return value

    def validate_landline(self, value):
        value = normalize_digits(value)
        value = value.replace(" ", "").replace("-", "")

        if value and not re.fullmatch(r"0[0-9]{10}", value):
            raise serializers.ValidationError(
                "تلفن ثابت را با کد شهر و یازده رقم وارد کنید."
            )

        return value