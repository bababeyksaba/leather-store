from django.core.exceptions import ValidationError
from django.db import models


class HomepageBanner(models.Model):
    class Position(models.TextChoices):
        MAIN = "main", "عکس بزرگ"
        WALLET = "wallet", "عکس کوچک اول"
        CROSSBODY = "crossbody", "عکس کوچک دوم"

    position = models.CharField(
        max_length=20,
        choices=Position.choices,
        unique=True,
        verbose_name="جایگاه بنر",
    )

    category = models.ForeignKey(
        "products.Category",
        on_delete=models.PROTECT,
        related_name="homepage_banners",
        verbose_name="زیرمنوی مقصد",
        help_text="با کلیک روی بنر، محصولات این دسته نمایش داده می‌شوند.",
    )

    is_active = models.BooleanField(
        default=True,
        verbose_name="فعال",
    )

    class Meta:
        verbose_name = "لینک بنر صفحهٔ اصلی"
        verbose_name_plural = "لینک‌های بنر صفحهٔ اصلی"
        ordering = ["position"]

    def clean(self):
        super().clean()

        if (
            self.is_active
            and self.category_id
            and not self.category.is_effectively_active
        ):
            raise ValidationError({
                "category": "دسته‌بندی مقصد و والدهای آن باید فعال باشند."
            })

    def __str__(self):
        return f"{self.get_position_display()} ← {self.category.name}"