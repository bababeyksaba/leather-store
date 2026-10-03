from django.core.management.base import BaseCommand

from orders.services import expire_orders


class Command(BaseCommand):
    help = "Release stock reserved by expired orders."

    def handle(self, *args, **options):
        count = expire_orders()

        self.stdout.write(
            f"Expired orders: {count}"
        )
