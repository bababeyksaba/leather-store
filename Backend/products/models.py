from django.core.validators import MinValueValidator
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
    description = models.TextField(
        blank=True,
        verbose_name="توضیحات",
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
        verbose_name="تاریخ ویرایش",
    )

    class Meta:
        ordering = ["name"]
        verbose_name = "دسته‌بندی"
        verbose_name_plural = "دسته‌بندی‌ها"

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
        verbose_name="توضیحات",
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
        upload_to="products/%Y/%m/",
        blank=True,
        null=True,
        verbose_name="تصویر محصول",
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
        verbose_name="تاریخ ویرایش",
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "محصول"
        verbose_name_plural = "محصولات"
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["is_active"]),
            models.Index(fields=["category", "is_active"]),
        ]

    def __str__(self):
        return self.name

    @property
    def is_available(self):
        return self.is_active and self.stock > 0