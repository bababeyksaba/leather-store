import json
import os
import subprocess
import tempfile
import uuid
import zipfile
from pathlib import Path
from datetime import datetime, timezone
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import connection

class Command(BaseCommand):
    help = "Backup PostgreSQL with docker pg_dump and include uploaded media; never includes .env."
    def add_arguments(self, parser):
        parser.add_argument("--output", default="backups")
        parser.add_argument("--container", default="leather_postgres")
        parser.add_argument("--keep", type=int, default=7)
    def handle(self, *args, **options):
        if options["keep"] < 1: raise CommandError("keep must be positive")
        if connection.vendor != "postgresql": raise CommandError("This command requires PostgreSQL.")
        target = Path(options["output"]).resolve()
        target.mkdir(parents=True, exist_ok=True)
        db = settings.DATABASES["default"]
        name = "leather-backup-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + uuid.uuid4().hex[:8] + ".zip"
        final = target / name
        partial = target / (name + ".partial")
        try:
            with tempfile.TemporaryDirectory() as temp:
                dump = Path(temp) / "database.dump"
                with dump.open("wb") as output:
                    result = subprocess.run(["docker", "exec", options["container"], "pg_dump", "-Fc", "-U", db["USER"], db["NAME"]], stdout=output, stderr=subprocess.PIPE, timeout=900, check=False)
                if result.returncode or not dump.stat().st_size:
                    raise CommandError("pg_dump failed; check Docker, container and database settings.")
                with zipfile.ZipFile(partial, "w", compression=zipfile.ZIP_DEFLATED) as archive:
                    archive.write(dump, "database.dump")
                    media = Path(settings.MEDIA_ROOT).resolve()
                    count = 0
                    if media.exists():
                        for file in media.rglob("*"):
                            if file.is_file() and not file.is_symlink() and media in file.resolve().parents:
                                archive.write(file, "media/" + file.relative_to(media).as_posix()); count += 1
                    archive.writestr("manifest.json", json.dumps({"created_at": datetime.now(timezone.utc).isoformat(), "format": "postgresql-custom", "media_files": count}, indent=2))
                os.replace(partial, final)
            backups = sorted(target.glob("leather-backup-*.zip"), key=lambda p: p.stat().st_mtime, reverse=True)
            for old in backups[options["keep"]:]: old.unlink()
            self.stdout.write(str(final))
        except (OSError, subprocess.SubprocessError) as error:
            raise CommandError(f"Backup failed ({type(error).__name__}); no completed backup was replaced.") from error
        finally:
            partial.unlink(missing_ok=True)

