import time
import logging
from django.core.management.base import BaseCommand, CommandError
from django.db import close_old_connections
from orders.services import expire_orders

class Command(BaseCommand):
    help = "Release expired reservations periodically; keep this process running."
    def add_arguments(self, parser):
        parser.add_argument("--interval", type=int, default=60)
        parser.add_argument("--once", action="store_true")
    def handle(self, *args, **options):
        if options["interval"] < 5: raise CommandError("Minimum interval is 5 seconds.")
        try:
            while True:
                close_old_connections()
                try:
                    self.stdout.write(f"Expired orders: {expire_orders()}")
                except Exception:
                    logging.exception("Reservation expiry failed")
                    if options["once"]: raise
                finally:
                    close_old_connections()
                if options["once"]: break
                time.sleep(options["interval"])
        except KeyboardInterrupt:
            self.stdout.write("Maintenance stopped.")

