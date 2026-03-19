import csv
from django.core.management.base import BaseCommand
from pincode.models import Pincode

class Command(BaseCommand):
    help = "Bulk import pincodes from new_pincode.csv"

    def handle(self, *args, **options):
        csv_file = "D:/FaithCargoApp/FCPL WEB/logistics_system/backend/app/data/new_pincode.csv"
        self.stdout.write(f"📂 Loading Pincodes from: {csv_file}")

        # Purge old records
        Pincode.objects.all().delete()

        pincodes = []
        with open(csv_file, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                pincodes.append(Pincode(
                    pincode=row["pincode"],   # <-- match with CSV header
                    city=row["city"],
                    state=row["state"],
                    zone=row["zone"],
                    is_oda=row.get("is_oda", "False").lower() in ["true", "1", "yes"]
                ))

        Pincode.objects.bulk_create(pincodes, ignore_conflicts=True)

        self.stdout.write(self.style.SUCCESS(f"✅ Imported {len(pincodes)} pincodes successfully"))
