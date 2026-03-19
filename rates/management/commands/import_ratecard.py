import os
import csv
from django.core.management.base import BaseCommand
from rates.models import RateCard

class Command(BaseCommand):
    help = "Import FCPL & B2B rate cards from CSV"

    def handle(self, *args, **kwargs):
        # ✅ Project root (manage.py वाली जगह)
        BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        file_path = os.path.join(BASE_DIR, "backend", "app", "data", "ratecard.csv")

        if not os.path.exists(file_path):
            self.stdout.write(self.style.ERROR(f"❌ File not found: {file_path}"))
            return

        self.stdout.write(f"📂 Loading RateCard from: {file_path}")

        with open(file_path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                RateCard.objects.update_or_create(
                    rate_type=row["rate_type"],
                    zone=row["zone"],
                    payment_mode=row["payment_mode"],
                    defaults={
                        "per_kg_rate": row["per_kg_rate"],
                        "docket_charge": row["docket_charge"],
                        "fuel_charge": row["fuel_charge"],
                        "oda_charge": row["oda_charge"],
                        "insurance_percent": row["insurance_percent"],
                        "appointment_charge": row["appointment_charge"],
                        "weight_min": row["weight_min"],
                        "weight_max": row["weight_max"],
                    }
                )
        self.stdout.write(self.style.SUCCESS("✅ RateCard imported successfully"))
