import csv
from django.core.management.base import BaseCommand
from pincode.models import Pincode

class Command(BaseCommand):
    help = "Bulk import pincodes from new_pincode.csv"

    def handle(self, *args, **options):
        csv_file = "D:/FaithCargoApp/FCPL WEB/logistics_system/backend/app/data/new_pincode.csv"
        self.stdout.write(f"📂 Loading Pincodes from: {csv_file}")

        # Purge old records
        def get_pins():
            return Pincode.objects.all()

        pincodes = []
        # Use tab delimiter
        with open(csv_file, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f, delimiter="\t")
            self.stdout.write(f"👉 CSV Headers detected: {reader.fieldnames}")  # Debug

            for row in reader:
                pincodes.append(Pincode(
                    pincode=row["Pincode"].strip(),
                    city=row["City"].strip(),
                    state=row["State"].strip(),
                    zone=row["Zone"].strip(),
                    is_oda=row["is_oda"].strip().lower() in ["true", "1", "yes", "no"]
                ))

        Pincode.objects.bulk_create(pincodes, ignore_conflicts=True)
        self.stdout.write(self.style.SUCCESS(f"✅ Imported {len(pincodes)} pincodes successfully"))
