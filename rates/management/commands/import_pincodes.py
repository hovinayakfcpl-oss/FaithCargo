import csv
from django.core.management.base import BaseCommand
from pincode.models import Pincode

class Command(BaseCommand):
    help = "Bulk import pincodes from new_pincode.csv"

    def handle(self, *args, **options):
        csv_file = "new_pincode.csv"
        self.stdout.write(f"📂 Loading Pincodes from: {csv_file}")

        pincodes = []
        # ✅ Use comma delimiter (your CSV is comma-separated)
        with open(csv_file, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f, delimiter=",")
            self.stdout.write(f"👉 CSV Headers detected: {reader.fieldnames}")  # Debug

            for row in reader:
                # ✅ Clean pincode (remove commas if any)
                pin = str(row["pincode"]).replace(",", "").strip()

                # ✅ Safe boolean conversion
                val = str(row["is_oda"]).strip().lower()
                is_oda = val in ["true", "1", "yes", "y"]

                pincodes.append(Pincode(
                    pincode=pin,
                    city=row["city"].strip(),
                    state=row["state"].strip(),
                    zone=row["zone"].strip(),
                    is_oda=is_oda
                ))

        Pincode.objects.bulk_create(pincodes, ignore_conflicts=True)
        self.stdout.write(self.style.SUCCESS(f"✅ Imported {len(pincodes)} pincodes successfully"))
