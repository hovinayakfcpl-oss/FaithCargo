# backend/app/models.py
from django.db import models

class Rate(models.Model):
    zone = models.CharField(max_length=10)
    per_kg_rate = models.FloatField()
    docket_charge = models.FloatField(default=50)
    fuel_charge_percent = models.FloatField(default=15)
    min_weight = models.FloatField(default=0)
    oda_charge = models.CharField(max_length=100, default="max(3*kg,650)")
    insurance_percent = models.FloatField(default=0)
    appointment_charge = models.CharField(max_length=100, default="max(4*kg,1250)")

    def __str__(self):
        return f"{self.zone} - {self.per_kg_rate}"
