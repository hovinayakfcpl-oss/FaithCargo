from django.db import models

# =====================================================
# PINCODE MASTER
# =====================================================

class Pincode(models.Model):
    pincode = models.CharField(max_length=6, unique=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    zone = models.CharField(max_length=10)   # Example: N1, N2, S1, etc.
    is_oda = models.BooleanField(default=False)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "pincodes"
        verbose_name = "Pincode"
        verbose_name_plural = "Pincodes"
        managed = True   # Django migrations handle this

    def __str__(self):
        return f"{self.pincode} | {self.zone} | ODA: {self.is_oda}"


# =====================================================
# RATE MATRIX (Used for B2B Calculator)
# =====================================================

class RateMatrix(models.Model):
    from_zone = models.CharField(max_length=5)
    to_zone = models.CharField(max_length=5)
    rate = models.DecimalField(max_digits=10, decimal_places=2)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("from_zone", "to_zone")   # सही जगह
        verbose_name = "Rate Matrix"
        verbose_name_plural = "Rate Matrix"
        # db_table override हटाया गया है → Django default: pincode_ratematrix

    def __str__(self):
        return f"{self.from_zone} → {self.to_zone} : {self.rate}"


# =====================================================
# GLOBAL CHARGES (Common Add-ons)
# =====================================================

class Charges(models.Model):
    min_freight = models.DecimalField(max_digits=10, decimal_places=2, default=600)
    docket_charge = models.DecimalField(max_digits=10, decimal_places=2, default=50)
    fuel_percent = models.DecimalField(max_digits=5, decimal_places=2, default=15)

    fov_charge = models.DecimalField(max_digits=10, decimal_places=2, default=75)

    oda_per_kg = models.DecimalField(max_digits=10, decimal_places=2, default=3)
    oda_min = models.DecimalField(max_digits=10, decimal_places=2, default=650)

    cod_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0.25)
    cod_min = models.DecimalField(max_digits=10, decimal_places=2, default=150)

    handling_100_400 = models.DecimalField(max_digits=10, decimal_places=2, default=2)
    handling_above_400 = models.DecimalField(max_digits=10, decimal_places=2, default=4)

    appointment_per_kg = models.DecimalField(max_digits=10, decimal_places=2, default=4)
    appointment_min = models.DecimalField(max_digits=10, decimal_places=2, default=1250)

    cft = models.DecimalField(max_digits=10, decimal_places=2, default=4500)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "charges"
        verbose_name = "Global Charges"
        verbose_name_plural = "Global Charges"

    def __str__(self):
        return "Global Charges"
import csv
from django.core.management.base import BaseCommand
from pincode.models import Pincode

class Command(BaseCommand):
    help = "Bulk import pincodes from CSV file"

    def add_arguments(self, parser):
        # Positional argument for CSV path
        parser.add_argument("csv_file", type=str, help="Path to the CSV file")

    def handle(self, *args, **options):
        csv_file = options["csv_file"]
        self.stdout.write(f"📂 Loading Pincodes from: {csv_file}")

        pincodes = []
        with open(csv_file, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                pincodes.append(Pincode(
                    pincode=row["pincode"],
                    city=row["city"],
                    state=row["state"],
                    zone=row["zone"],
                    is_oda=row.get("is_oda", "False").lower() in ["true", "1", "yes"]
                ))

        # Bulk insert, skip duplicates
        Pincode.objects.bulk_create(pincodes, ignore_conflicts=True)

        self.stdout.write(self.style.SUCCESS(f"✅ Imported {len(pincodes)} pincodes successfully"))
