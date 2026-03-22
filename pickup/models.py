from django.db import models
from django.conf import settings   # ✅ CustomUser reference
from django.db import models

from vendors.models import   Vendor

class PickupRequest(models.Model):
    shipping_partner = models.CharField(max_length=100)
    warehouse = models.CharField(max_length=100)
    package_count = models.IntegerField()
    pickup_date = models.DateField()
    pickup_time = models.CharField(max_length=50)

    assigned_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )
    assigned_vendor = models.ForeignKey(
        Vendor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    status = models.CharField(max_length=50, default="Pending")

    def __str__(self):
        return f"{self.shipping_partner} - {self.status}"

class PickupRequest(models.Model):
    shipping_partner = models.CharField(max_length=100)
    warehouse = models.CharField(max_length=100)
    package_count = models.IntegerField()
    pickup_date = models.DateField()
    pickup_time = models.CharField(max_length=50)
    assigned_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )
    status = models.CharField(max_length=50, default="Pending")

    def __str__(self):
        return f"{self.shipping_partner} - {self.status}"
