import json
from pathlib import Path
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from users.models import Province, City

class Command(BaseCommand):
    help = 'Import a JSON list: [{"name": "استان", "cities": ["شهر"]}]. Keeps existing choices and addresses.'
    def add_arguments(self, parser): parser.add_argument("file")
    @transaction.atomic
    def handle(self, *args, **options):
        try: data = json.loads(Path(options["file"]).read_text(encoding="utf-8-sig"))
        except (OSError, ValueError) as e: raise CommandError("Cannot read JSON file") from e
        if not isinstance(data, list): raise CommandError("Expected a list")
        count = 0
        for row in data:
            if not isinstance(row, dict) or not isinstance(row.get("name"), str) or not row["name"].strip() or not isinstance(row.get("cities"), list): raise CommandError("Invalid province")
            name = row["name"].strip()
            if len(name) > 100: raise CommandError("Province name is too long")
            province, _ = Province.objects.get_or_create(name=name)
            for city in row["cities"]:
                if not isinstance(city, str) or not city.strip() or len(city.strip()) > 100: raise CommandError("Invalid city")
                _, created = City.objects.get_or_create(province=province, name=city.strip())
                count += int(created)
        self.stdout.write(f"New cities: {count}")

