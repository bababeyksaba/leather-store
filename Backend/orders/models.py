import uuid

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class ShippingMethod(models.Model):
    name = models.CharField(
        max_length=100,
        verbose_name="روش ارسال",
    )

    fee = models.DecimalField(
        max_digits=14,
        decimal_places=0,
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name="هزینه ارسال",
    )

    description = models.CharField(
        max_length=250,
        blank=True,
    )

    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["id"]

        constraints = [
            models.CheckConstraint(
                condition=models.Q(fee__gte=0),
                name="shipping_fee_nonnegative",
            ),
        ]

    def __str__(self):
        return self.name


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "در انتظار پرداخت"
        PAID = "paid", "پرداخت آزمایشی موفق"
        CANCELLED = "cancelled", "لغوشده"
        EXPIRED = "expired", "مهلت پرداخت تمام شده"

    class FulfillmentStatus(models.TextChoices):
        NEW = "new", "در انتظار آماده‌سازی"
        PROCESSING = "processing", "در حال آماده‌سازی"
        SHIPPED = "shipped", "ارسال‌شده"
        DELIVERED = "delivered", "تحویل‌شده"

    fulfillment_status = models.CharField(
        max_length=15,
        choices=FulfillmentStatus.choices,
        default=FulfillmentStatus.NEW,
    )

    carrier = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="شرکت حمل",
    )

    tracking_code = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="کد رهگیری",
    )

    processing_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="شروع آماده‌سازی",
    )

    shipped_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="زمان ارسال",
    )

    delivered_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="زمان تحویل",
    )

    number = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="store_orders",
    )

    idempotency_key = models.UUIDField()

    status = models.CharField(
        max_length=15,
        choices=Status.choices,
        default=Status.PENDING,
    )

    payment_mode = models.CharField(
        max_length=20,
        default="test",
    )

    recipient_name = models.CharField(max_length=210)
    phone = models.CharField(max_length=11)

    address_title = models.CharField(max_length=100)
    province = models.CharField(max_length=100)
    city = models.CharField(max_length=100)
    address_line = models.TextField()
    postal_code = models.CharField(max_length=10)
    landline = models.CharField(max_length=11, blank=True)

    shipping_name = models.CharField(max_length=100)

    subtotal = models.DecimalField(
        max_digits=20,
        decimal_places=0,
    )

    shipping_fee = models.DecimalField(
        max_digits=14,
        decimal_places=0,
    )

    total = models.DecimalField(
        max_digits=20,
        decimal_places=0,
    )

    expires_at = models.DateTimeField()

    paid_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

        constraints = [
            models.UniqueConstraint(
                fields=["user", "idempotency_key"],
                name="unique_order_request_per_user",
            ),
        ]

    def __str__(self):
        return str(self.number)


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items",
    )

    product = models.ForeignKey(
        "products.Product",
        on_delete=models.PROTECT,
    )

    name = models.CharField(max_length=200)
    sku = models.CharField(max_length=50)

    color = models.CharField(
        max_length=50,
        blank=True,
    )

    material = models.CharField(
        max_length=100,
        blank=True,
    )

    quantity = models.PositiveIntegerField()

    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=0,
    )

    item_total = models.DecimalField(
        max_digits=20,
        decimal_places=0,
    )

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(quantity__gte=1),
                name="order_item_quantity_positive",
            ),
        ]