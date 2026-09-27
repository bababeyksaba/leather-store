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
    )


    updated_at = models.DateTimeField(
        auto_now=True,
    )


    class Meta:
        ordering = ["name"]


    def __str__(self):
        return self.name




class Product(models.Model):

    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="products",
    )


    name = models.CharField(
        max_length=200,
    )


    slug = models.SlugField(
        max_length=220,
        unique=True,
        allow_unicode=True,
    )


    sku = models.CharField(
        max_length=50,
        unique=True,
    )


    description = models.TextField(
        blank=True,
    )


    material = models.CharField(
        max_length=100,
        blank=True,
    )


    color = models.CharField(
        max_length=50,
        blank=True,
    )


    price = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        validators=[
            MinValueValidator(0)
        ],
    )


    stock = models.PositiveIntegerField(
        default=0,
    )


    image = models.ImageField(
        upload_to="products/main/",
        blank=True,
        null=True,
    )


    is_active = models.BooleanField(
        default=True,
    )


    created_at = models.DateTimeField(
        auto_now_add=True,
    )


    updated_at = models.DateTimeField(
        auto_now=True,
    )


    class Meta:
        ordering = [
            "-created_at"
        ]


    def __str__(self):
        return self.name


    @property
    def is_available(self):

        return (
            self.is_active
            and self.stock > 0
        )




class ProductImage(models.Model):

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="images",
    )


    image = models.ImageField(
        upload_to="products/gallery/",
    )


    alt_text = models.CharField(
        max_length=100,
        blank=True,
    )


    is_primary = models.BooleanField(
        default=False,
    )


    created_at = models.DateTimeField(
        auto_now_add=True,
    )


    class Meta:
        ordering = [
            "-is_primary",
            "-created_at",
        ]


    def __str__(self):

        return self.product.name