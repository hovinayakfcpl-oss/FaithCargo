from django.db import models

class CustomUser(models.Model):
    username = models.CharField(max_length=100, unique=True)
    password = models.CharField(max_length=255)

    # 🔥 ROLE & METADATA
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # 🔥 EXISTING MODULE PERMISSIONS
    fcpl_rate = models.BooleanField(default=False)
    pickup = models.BooleanField(default=False)
    vendor_manage = models.BooleanField(default=False)
    vendor_rates = models.BooleanField(default=False)
    rate_update = models.BooleanField(default=False)
    pincode = models.BooleanField(default=False)
    user_management = models.BooleanField(default=False)
    ba_b2b = models.BooleanField(default=False)

    # 🔥 NEW MODULE PERMISSIONS (Inhe Add Karein)
    create_order = models.BooleanField(default=False)    # "Create Order" के लिए
    shipment_details = models.BooleanField(default=False) # "Shipment Details" के लिए

    def __str__(self):
        return self.username