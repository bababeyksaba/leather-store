from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import (
    RegexValidator,
    MinValueValidator,
    MaxValueValidator,
)
from django.db import models


class Category(models.Model):
    name = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="نام دسته‌بندی",
    )

    slug = models.SlugField(
        max_length=120,
        unique=True,
        allow_unicode=True,
        verbose_name="آدرس دسته‌بندی",
    )

    parent = models.ForeignKey(
        "self",
        on_delete=models.PROTECT,
        related_name="children",
        blank=True,
        null=True,
        verbose_name="دسته‌بندی والد",
        help_text=(
            "برای منوی اصلی خالی بگذارید. "
            "برای زیرمنو، دسته‌بندی والد را انتخاب کنید."
        ),
    )

    image = models.ImageField(
        upload_to="categories/",
        blank=True,
        null=True,
        verbose_name="تصویر دسته‌بندی",
    )

    description = models.TextField(
        blank=True,
        verbose_name="توضیحات",
    )

    show_in_menu = models.BooleanField(
        default=True,
        verbose_name="نمایش در منو",
    )

    sort_order = models.PositiveIntegerField(
        default=0,
        verbose_name="ترتیب نمایش",
        help_text="عدد کمتر، زودتر نمایش داده می‌شود.",
    )

    is_active = models.BooleanField(
        default=True,
        verbose_name="فعال",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="تاریخ ایجاد",
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="آخرین تغییر",
    )

    class Meta:
        ordering = ["sort_order", "name"]
        verbose_name = "دسته‌بندی"
        verbose_name_plural = "دسته‌بندی‌ها"

    def clean(self):
        super().clean()

        visited = {self.pk} if self.pk is not None else set()
        parent_id = self.parent_id

        while parent_id is not None:
            if parent_id in visited:
                raise ValidationError({
                    "parent": (
                        "دسته‌بندی نمی‌تواند والد خودش یا "
                        "زیرمجموعهٔ یکی از زیرمجموعه‌های خودش باشد."
                    )
                })

            visited.add(parent_id)

            parent = (
                Category.objects
                .filter(pk=parent_id)
                .values("parent_id")
                .first()
            )

            if parent is None:
                raise ValidationError({
                    "parent": "دسته‌بندی والد وجود ندارد."
                })

            parent_id = parent["parent_id"]

    @property
    def is_effectively_active(self):
        """دسته و تمام والدهای آن باید فعال باشند."""
        if not self.is_active:
            return False

        visited = {self.pk} if self.pk is not None else set()
        parent_id = self.parent_id

        while parent_id is not None:
            if parent_id in visited:
                return False

            visited.add(parent_id)

            parent = (
                Category.objects
                .filter(pk=parent_id)
                .values("parent_id", "is_active")
                .first()
            )

            if parent is None or not parent["is_active"]:
                return False

            parent_id = parent["parent_id"]

        return True

    def __str__(self):
        return self.name


class Product(models.Model):
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="products",
        verbose_name="دسته‌بندی",
    )

    name = models.CharField(
        max_length=200,
        verbose_name="نام محصول",
    )

    slug = models.SlugField(
        max_length=220,
        unique=True,
        allow_unicode=True,
        verbose_name="آدرس محصول",
    )

    sku = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="کد محصول",
    )

    description = models.TextField(
        blank=True,
        verbose_name="توضیحات محصول",
    )

    material = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="جنس",
    )

    color = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="رنگ",
    )

    dimensions = models.CharField(
        max_length=150,
        blank=True,
        default="",
        verbose_name="ابعاد",
        help_text="همراه با واحد؛ مثلاً ۲۲ × ۱۲ × ۳ سانتی‌متر",
    )

    size = models.CharField(
        max_length=100,
        blank=True,
        default="",
        verbose_name="اندازه",
        help_text="مثلاً کوچک، متوسط، بزرگ یا سایز ۴۲",
    )

    care_instructions = models.TextField(
        blank=True,
        default="",
        verbose_name="نحوهٔ نگهداری",
    )

    price = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        validators=[MinValueValidator(0)],
        verbose_name="قیمت",
    )

    stock = models.PositiveIntegerField(
        default=0,
        verbose_name="موجودی",
    )

    image = models.ImageField(
        upload_to="products/main/",
        blank=True,
        null=True,
        verbose_name="تصویر اصلی",
    )

    is_active = models.BooleanField(
        default=True,
        verbose_name="فعال",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="تاریخ ایجاد",
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="آخرین تغییر",
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "محصول"
        verbose_name_plural = "محصولات"

    @property
    def is_available(self):
        return (
            self.is_active
            and self.stock > 0
            and self.category.is_effectively_active
        )

    def __str__(self):
        return self.name


class ProductImage(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="images",
        verbose_name="محصول",
    )

    image = models.ImageField(
        upload_to="products/gallery/",
        verbose_name="تصویر",
    )

    alt_text = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="توضیح تصویر",
    )

    is_primary = models.BooleanField(
        default=False,
        verbose_name="اولویت نمایش در گالری",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="تاریخ ایجاد",
    )

    class Meta:
        ordering = ["-is_primary", "-created_at"]
        verbose_name = "تصویر محصول"
        verbose_name_plural = "تصاویر محصولات"

    def __str__(self):
        return f"تصویر {self.product.name}"


class ProductReview(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="reviews",
        verbose_name="محصول",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="product_reviews",
        verbose_name="کاربر",
    )

    rating = models.PositiveSmallIntegerField(
        validators=[
            MinValueValidator(1),
            MaxValueValidator(5),
        ],
        verbose_name="امتیاز",
        help_text="عددی از ۱ تا ۵",
    )

    title = models.CharField(
        max_length=150,
        blank=True,
        verbose_name="عنوان نظر",
    )

    comment = models.TextField(
        max_length=3000,
        verbose_name="متن نظر",
    )

    is_approved = models.BooleanField(
        default=False,
        verbose_name="تأییدشده",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="تاریخ ایجاد",
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="آخرین تغییر",
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "نظر محصول"
        verbose_name_plural = "نظرات محصولات"

        constraints = [
            models.UniqueConstraint(
                fields=["product", "user"],
                name="unique_review_per_user_product",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(rating__gte=1)
                    & models.Q(rating__lte=5)
                ),
                name="product_review_rating_1_to_5",
            ),
        ]

    def __str__(self):
        return (
            f"{self.product.name} — "
            f"{self.user.get_username()} — "
            f"امتیاز {self.rating}"
        )

class ProductVariant(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="variants", verbose_name="محصول")
    sku = models.CharField(max_length=50, unique=True, verbose_name="کد تنوع")
    color = models.CharField(max_length=50, blank=True, verbose_name="رنگ")
    color_hex = models.CharField(max_length=7, blank=True, validators=[RegexValidator(r"^#[0-9a-fA-F]{6}$", "کد رنگ باید مانند #800020 باشد.")], verbose_name="رنگ پالت", help_text="رنگ نمایشی دایرهٔ پالت را انتخاب کنید.")
    size = models.CharField(max_length=100, blank=True, verbose_name="سایز")
    price = models.DecimalField(max_digits=12, decimal_places=0, validators=[MinValueValidator(0)], verbose_name="قیمت")
    stock = models.PositiveIntegerField(default=0, verbose_name="موجودی")
    image = models.ImageField(upload_to="products/variants/", blank=True, null=True, verbose_name="تصویر رنگ")
    is_active = models.BooleanField(default=True, verbose_name="فعال")
    is_default = models.BooleanField(default=False, verbose_name="تنوع اولیه برای سبدهای قدیمی")

    class Meta:
        ordering = ["id"]
        verbose_name = "رنگ و سایز محصول"
        verbose_name_plural = "رنگ‌ها و سایزهای محصول"
        constraints = [
            models.UniqueConstraint(fields=["product", "color", "size"], name="unique_product_color_size"),
            models.UniqueConstraint(fields=["product"], condition=models.Q(is_default=True), name="one_legacy_default_variant"),
            models.CheckConstraint(condition=models.Q(price__gte=0), name="variant_price_nonnegative"),
        ]

    def __str__(self):
        return f"{self.product.name} — {self.color or 'بدون رنگ'} / {self.size or 'بدون سایز'}"
