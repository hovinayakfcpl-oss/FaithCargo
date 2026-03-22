import csv
from django.core.management.base import BaseCommand
from pincode.models import Pincode

class Command(BaseCommand):
    help = "Bulk import pincodes"

    def handle(self, *args, **options):
        csv_file = "new_pincode.csv"
        self.stdout.write(f"📂 Loading Pincodes from: {csv_file}")

        pincodes = []

        with open(csv_file, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)  # remove delimiter if normal CSV

            self.stdout.write(f"👉 CSV Headers: {reader.fieldnames}")

            for row in reader:
                pincodes.append(Pincode(
                    pincode=row["Pincode"].strip(),
                    city=row["City"].strip(),
                    state=row["State"].strip(),
                    zone=row["Zone"].strip(),
                    is_oda=row["is_oda"].strip().lower() in ["true", "1", "yes"]
                ))

        Pincode.objects.bulk_create(pincodes, ignore_conflicts=True)

        self.stdout.write(self.style.SUCCESS(f"✅ Imported {len(pincodes)} pincodes successfully"))