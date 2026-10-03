from django.conf import settings
from django.db import models


class CustomerProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="customer_profile",
    )

    phone = models.CharField(
        max_length=11,
        unique=True,
        verbose_name="موبایل",
    )

    first_name = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="نام",
    )

    last_name = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="نام خانوادگی",
    )

    gender = models.CharField(
        max_length=10,
        blank=True,
        choices=[
            ("female", "زن"),
            ("male", "مرد"),
            ("other", "سایر"),
        ],
        verbose_name="جنسیت",
    )

    birth_date = models.DateField(
        blank=True,
        null=True,
        verbose_name="تاریخ تولد",
    )

    @property
    def is_complete(self):
        return bool(
            self.phone
            and self.first_name.strip()
            and self.last_name.strip()
            and self.gender in {"female", "male", "other"}
            and self.birth_date
        )

    def __str__(self):
        return self.phone

    class Meta:
        verbose_name = "پروفایل مشتری"
        verbose_name_plural = "پروفایل مشتریان"


class Province(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name="نام استان")
    class Meta:
        ordering = ["name"]
        verbose_name = "استان"
        verbose_name_plural = "استان‌ها"
    def __str__(self): return self.name

class City(models.Model):
    province = models.ForeignKey(Province, on_delete=models.CASCADE, related_name="cities", verbose_name="استان")
    name = models.CharField(max_length=100, verbose_name="نام شهر")
    class Meta:
        ordering = ["name"]
        verbose_name = "شهر"
        verbose_name_plural = "شهرها"
        constraints = [models.UniqueConstraint(fields=["province", "name"], name="unique_city_in_province")]
    def __str__(self): return f"{self.province.name} / {self.name}"

class Address(models.Model):
    is_default = models.BooleanField(default=False, verbose_name="آدرس پیش‌فرض")

    profile = models.ForeignKey(
        CustomerProfile,
        on_delete=models.CASCADE,
        related_name="addresses",
    )

    title = models.CharField(
        max_length=100,
        verbose_name="عنوان آدرس",
    )

    province = models.CharField(
        max_length=100,
        verbose_name="استان",
    )

    city = models.CharField(
        max_length=100,
        verbose_name="شهر",
    )

    address_line = models.TextField(
        max_length=1000,
        verbose_name="نشانی کامل",
    )

    landline = models.CharField(
        max_length=11,
        blank=True,
        verbose_name="تلفن ثابت",
    )

    postal_code = models.CharField(
        max_length=10,
        verbose_name="کد پستی",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-is_default", "-created_at", "-id"]
        constraints = [models.UniqueConstraint(fields=["profile"], condition=models.Q(is_default=True), name="one_default_address_per_profile")]
        verbose_name = "آدرس"
        verbose_name_plural = "آدرس‌ها"

    def __str__(self):
        return f"{self.profile.phone} — {self.title}"


class OTPState(models.Model):
    phone = models.CharField(
        max_length=11,
        primary_key=True,
    )

    code_hash = models.CharField(
        max_length=64,
        blank=True,
    )

    challenge = models.CharField(
        max_length=32,
        blank=True,
    )

    expires_at = models.DateTimeField(null=True, blank=True)
    last_sent_at = models.DateTimeField(null=True, blank=True)
    window_started_at = models.DateTimeField(null=True, blank=True)

    send_count = models.PositiveIntegerField(default=0)
    attempts = models.PositiveIntegerField(default=0)

    blocked_until = models.DateTimeField(null=True, blank=True)


class Favorite(models.Model):
    profile = models.ForeignKey(
        CustomerProfile,
        on_delete=models.CASCADE,
        related_name="favorites",
    )

    product = models.ForeignKey(
        "products.Product",
        on_delete=models.CASCADE,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["profile", "product"],
                name="unique_customer_favorite",
            ),
        ]
