import secrets
import uuid

from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model, login, logout
from django.db import transaction
from django.middleware.csrf import get_token
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.crypto import constant_time_compare, salted_hmac

from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from .authentication import CSRFSessionAuthentication
from .models import CustomerProfile, Address, OTPState, Favorite
from .serializers import (
    PhoneSerializer,
    VerifySerializer,
    ProfileSerializer,
    AddressSerializer,
)


class OTPThrottle(AnonRateThrottle):
    rate = "20/hour"


def hash_code(phone, challenge, code):
    return salted_hmac(
        "users.otp",
        f"{phone}:{challenge}:{code}",
        algorithm="sha256",
    ).hexdigest()


def customer_profile(request):
    return get_object_or_404(
        CustomerProfile,
        user=request.user,
    )


class PublicAPIView(APIView):
    authentication_classes = [CSRFSessionAuthentication]
    permission_classes = [AllowAny]


class PrivateAPIView(PublicAPIView):
    permission_classes = [IsAuthenticated]


class SessionAPIView(PublicAPIView):
    def get(self, request):
        profile = None

        if request.user.is_authenticated:
            profile = CustomerProfile.objects.filter(
                user=request.user,
            ).first()

        return Response({
            "authenticated": bool(
                request.user.is_authenticated and profile
            ),
            "profile": (
                ProfileSerializer(profile).data
                if profile
                else None
            ),
            "csrf_token": get_token(request),
        })


class RequestOTPAPIView(PublicAPIView):
    throttle_classes = [OTPThrottle]

    def post(self, request):
        serializer = PhoneSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        phone = serializer.validated_data["phone"]

        # فقط برای تست محلی؛ پیامک واقعی هنوز متصل نیست.
        if (
            not settings.DEBUG
            or getattr(settings, "OTP_BACKEND", "") != "console"
        ):
            return Response(
                {"detail": "سرویس ارسال پیامک هنوز تنظیم نشده است."},
                status=503,
            )

        now = timezone.now()

        with transaction.atomic():
            OTPState.objects.get_or_create(phone=phone)

            state = (
                OTPState.objects
                .select_for_update()
                .get(phone=phone)
            )

            if state.blocked_until and state.blocked_until > now:
                return Response(
                    {
                        "detail": (
                            "تلاش‌های ناموفق زیاد است؛ "
                            "۱۵ دقیقه بعد امتحان کنید."
                        )
                    },
                    status=429,
                )

            if (
                state.last_sent_at
                and now - state.last_sent_at < timedelta(seconds=60)
            ):
                return Response(
                    {"detail": "برای ارسال مجدد، یک دقیقه صبر کنید."},
                    status=429,
                )

            if (
                not state.window_started_at
                or now - state.window_started_at
                >= timedelta(minutes=15)
            ):
                state.window_started_at = now
                state.send_count = 0

            if state.send_count >= 5:
                return Response(
                    {
                        "detail": (
                            "سقف دریافت کد رسیده است؛ "
                            "بعداً امتحان کنید."
                        )
                    },
                    status=429,
                )

            code = f"{secrets.randbelow(1000000):06d}"
            challenge = uuid.uuid4().hex

            state.code_hash = hash_code(phone, challenge, code)
            state.challenge = challenge
            state.expires_at = now + timedelta(minutes=5)
            state.last_sent_at = now
            state.send_count += 1
            state.attempts = 0
            state.blocked_until = None
            state.save()

        request.session["otp_phone"] = phone
        request.session["otp_challenge"] = challenge

        print(f"[LOCAL OTP] {phone}: {code}", flush=True)

        return Response({
            "detail": "کد آزمایشی در ترمینال Django نمایش داده شد.",
            "expires_in": 300,
        })


class VerifyOTPAPIView(PublicAPIView):
    throttle_classes = [OTPThrottle]

    def post(self, request):
        serializer = VerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        phone = serializer.validated_data["phone"]
        code = serializer.validated_data["code"]
        challenge = request.session.get("otp_challenge", "")

        if (
            request.session.get("otp_phone") != phone
            or not challenge
        ):
            return Response(
                {"detail": "ابتدا برای این شماره کد دریافت کنید."},
                status=400,
            )

        now = timezone.now()

        with transaction.atomic():
            state = (
                OTPState.objects
                .select_for_update()
                .filter(phone=phone)
                .first()
            )

            if (
                not state
                or state.challenge != challenge
                or not state.code_hash
            ):
                return Response(
                    {
                        "detail": (
                            "کد معتبر نیست؛ دوباره کد دریافت کنید."
                        )
                    },
                    status=400,
                )

            if state.blocked_until and state.blocked_until > now:
                return Response(
                    {
                        "detail": (
                            "تلاش‌های ناموفق زیاد است؛ "
                            "بعداً امتحان کنید."
                        )
                    },
                    status=429,
                )

            if not state.expires_at or state.expires_at <= now:
                return Response(
                    {
                        "detail": (
                            "کد منقضی شده است؛ "
                            "دوباره کد دریافت کنید."
                        )
                    },
                    status=400,
                )

            valid = constant_time_compare(
                state.code_hash,
                hash_code(phone, challenge, code),
            )

            if not valid:
                state.attempts += 1

                if state.attempts >= 5:
                    state.blocked_until = now + timedelta(minutes=15)
                    state.code_hash = ""

                state.save()

                return Response(
                    {"detail": "کد واردشده صحیح نیست."},
                    status=400,
                )

            profile = (
                CustomerProfile.objects
                .select_related("user")
                .filter(phone=phone)
                .first()
            )

            if profile is None:
                user = get_user_model().objects.create_user(
                    username=f"customer_{uuid.uuid4().hex}",
                    password=None,
                )

                profile = CustomerProfile.objects.create(
                    user=user,
                    phone=phone,
                )

            user = profile.user

            if not user.is_active:
                return Response(
                    {"detail": "حساب کاربری غیرفعال است."},
                    status=403,
                )

            state.code_hash = ""
            state.challenge = ""
            state.save()

        cart = request.session.get("cart", {})

        login(
            request,
            user,
            backend="django.contrib.auth.backends.ModelBackend",
        )

        request.session["cart"] = cart
        request.session.pop("otp_phone", None)
        request.session.pop("otp_challenge", None)

        return Response({
            "profile": ProfileSerializer(profile).data,
            "csrf_token": get_token(request),
        })


class LogoutAPIView(PrivateAPIView):
    def post(self, request):
        cart = request.session.get("cart", {})

        logout(request)

        request.session["cart"] = cart

        return Response({
            "detail": "از حساب خارج شدید.",
            "csrf_token": get_token(request),
        })


class ProfileAPIView(PrivateAPIView):
    def get(self, request):
        return Response(
            ProfileSerializer(customer_profile(request)).data
        )

    def patch(self, request):
        # عمداً partial=True نیست؛ همهٔ اطلاعات ضروری باید ارسال شوند.
        serializer = ProfileSerializer(
            customer_profile(request),
            data=request.data,
        )

        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data)


class AddressListAPIView(PrivateAPIView):
    def get(self, request):
        addresses = customer_profile(request).addresses.all()

        return Response(
            AddressSerializer(addresses, many=True).data
        )

    def post(self, request):
        serializer = AddressSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        serializer.save(profile=customer_profile(request))

        return Response(serializer.data, status=201)


class AddressDetailAPIView(PrivateAPIView):
    def get_address(self, request, address_id):
        return get_object_or_404(
            Address,
            pk=address_id,
            profile__user=request.user,
        )

    def patch(self, request, address_id):
        serializer = AddressSerializer(
            self.get_address(request, address_id),
            data=request.data,
            partial=True,
        )

        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data)

    def delete(self, request, address_id):
        self.get_address(request, address_id).delete()

        return Response(status=204)


class FavoriteListAPIView(PrivateAPIView):
    def get(self, request):
        from products.models import Product
        from products.serializers import ProductListSerializer

        favorites = Favorite.objects.filter(
            profile=customer_profile(request),
        ).values_list("product_id", flat=True)

        products = (
            Product.objects
            .filter(
                is_active=True,
                category__is_active=True,
                pk__in=favorites,
            )
            .select_related("category")
            .order_by("-created_at", "id")
        )

        serializer = ProductListSerializer(
            products,
            many=True,
            context={"request": request},
        )

        return Response(serializer.data)


class FavoriteDetailAPIView(PrivateAPIView):
    def post(self, request, product_id):
        from products.models import Product

        product = get_object_or_404(
            Product.objects.filter(
                is_active=True,
                category__is_active=True,
            ).select_related("category"),
            pk=product_id,
        )

        Favorite.objects.get_or_create(
            profile=customer_profile(request),
            product=product,
        )

        return Response({
            "detail": "به علاقه‌مندی‌ها اضافه شد."
        })

    def delete(self, request, product_id):
        Favorite.objects.filter(
            profile=customer_profile(request),
            product_id=product_id,
        ).delete()

        return Response(status=204)


class SupportAPIView(PublicAPIView):
    def get(self, request):
        return Response({
            "whatsapp": getattr(settings, "SUPPORT_WHATSAPP", ""),
            "instagram": getattr(settings, "SUPPORT_INSTAGRAM", ""),
        })


class CheckoutAPIView(PrivateAPIView):
    def get(self, request):
        profile = customer_profile(request)

        if not profile.is_complete:
            return Response(
                {
                    "detail": "ابتدا اطلاعات پروفایل را کامل کنید.",
                    "code": "profile_incomplete",
                },
                status=403,
            )

        return Response({
            "profile": ProfileSerializer(profile).data,
            "addresses": AddressSerializer(
                profile.addresses.all(),
                many=True,
            ).data,
        })