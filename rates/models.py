from django.db import models
from vendors.models import   Vendor


# =====================================================
# Vendor Rate (Vendor Contract Pricing)
# =====================================================

class Rate(models.Model):
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE)
    rate = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.vendor.name} - {self.rate}"


# =====================================================
# FCPL / B2B RateCard
# =====================================================

class RateCard(models.Model):

    RATE_TYPE_CHOICES = [
        ("fcpl", "FCPL"),
        ("b2b", "BA & B2B"),
    ]

    PAYMENT_MODE_CHOICES = [
        ("Prepaid", "Prepaid"),
        ("COD", "COD"),
    ]

    rate_type = models.CharField(max_length=10, choices=RATE_TYPE_CHOICES)
    zone = models.CharField(max_length=50)
    payment_mode = models.CharField(max_length=20, choices=PAYMENT_MODE_CHOICES)

    per_kg_rate = models.DecimalField(max_digits=10, decimal_places=2)

    # Charges
    docket_charge = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    fuel_charge = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    is_oda = models.BooleanField(default=False)
    insurance_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    appointment_charge = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Weight Slabs
    weight_min = models.IntegerField(default=0)
    weight_max = models.IntegerField(default=0)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.rate_type.upper()} | {self.zone} - {self.payment_mode} ({self.weight_min}-{self.weight_max} Kg)"


# =====================================================
# RATE MATRIX (Used for B2B Calculator)
# =====================================================

class RateMatrix(models.Model):
    from_zone = models.CharField(max_length=5)
    to_zone = models.CharField(max_length=5)
    rate = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        unique_together = ("from_zone", "to_zone")
        verbose_name = "Rate Matrix"
        verbose_name_plural = "Rate Matrix"

    def __str__(self):
        return f"{self.from_zone} → {self.to_zone} : {self.rate}"
