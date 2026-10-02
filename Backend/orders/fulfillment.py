from django.core.exceptions import ValidationError
from django.utils import timezone

from .models import Order


EDITABLE_FIELDS = [
    "fulfillment_status",
    "carrier",
    "tracking_code",
]

TIMESTAMP_FIELDS = [
    "processing_at",
    "shipped_at",
    "delivered_at",
]


def validate_fulfillment(
    order,
    target,
    carrier,
    tracking_code,
):
    current = order.fulfillment_status

    next_stage = {
        Order.FulfillmentStatus.NEW:
            Order.FulfillmentStatus.PROCESSING,

        Order.FulfillmentStatus.PROCESSING:
            Order.FulfillmentStatus.SHIPPED,

        Order.FulfillmentStatus.SHIPPED:
            Order.FulfillmentStatus.DELIVERED,
    }

    if order.status != Order.Status.PAID:
        if target != current or carrier or tracking_code:
            raise ValidationError(
                "فقط سفارش پرداخت‌شده می‌تواند آماده یا ارسال شود."
            )

        return

    if (
        target != current
        and next_stage.get(current) != target
    ):
        raise ValidationError(
            "مراحل باید به ترتیب آماده‌سازی، ارسال و تحویل "
            "ثبت شوند؛ بازگشت به مرحله قبلی مجاز نیست."
        )

    needs_tracking = target in [
        Order.FulfillmentStatus.SHIPPED,
        Order.FulfillmentStatus.DELIVERED,
    ]

    if needs_tracking and (
        not carrier.strip()
        or not tracking_code.strip()
    ):
        raise ValidationError(
            "برای سفارش ارسال‌شده، شرکت حمل و کد رهگیری "
            "الزامی هستند."
        )


def apply_fulfillment(
    locked_order,
    target,
    carrier,
    tracking_code,
):
    # فراخواننده باید داخل transaction ردیف سفارش را قفل کند.
    validate_fulfillment(
        locked_order,
        target,
        carrier,
        tracking_code,
    )

    if target != locked_order.fulfillment_status:
        timestamp = {
            Order.FulfillmentStatus.PROCESSING:
                "processing_at",

            Order.FulfillmentStatus.SHIPPED:
                "shipped_at",

            Order.FulfillmentStatus.DELIVERED:
                "delivered_at",
        }[target]

        if getattr(locked_order, timestamp) is None:
            setattr(
                locked_order,
                timestamp,
                timezone.now(),
            )

    locked_order.fulfillment_status = target
    locked_order.carrier = carrier.strip()
    locked_order.tracking_code = tracking_code.strip()

    locked_order.save(
        update_fields=EDITABLE_FIELDS + TIMESTAMP_FIELDS
    )