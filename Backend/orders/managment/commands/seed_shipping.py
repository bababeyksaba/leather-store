from django.core.management.base import BaseCommand

from orders.models import ShippingMethod


class Command(BaseCommand):
    help = "Create editable demo shipping methods."

    def handle(self, *args, **options):
        names = [
            "ارسال عادی آزمایشی",
            "ارسال سریع آزمایشی",
        ]

        for name in names:
            ShippingMethod.objects.get_or_create(
                name=name,
                defaults={"fee": 0},
            )

        self.stdout.write(
            "Demo shipping methods are ready; "
            "edit their fees in admin."
        )