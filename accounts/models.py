# accounts/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    ROLE_CHOICES = (
        ('Admin', 'Admin'),
        ('User', 'User'),
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='User')
    
    # Additional fields for user management
    phone = models.CharField(max_length=15, blank=True, null=True)
    company = models.CharField(max_length=200, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    gstin = models.CharField(max_length=15, blank=True, null=True)
    
    # Module Permissions
    fcpl_rate = models.BooleanField(default=False)
    pickup = models.BooleanField(default=False)
    vendor_manage = models.BooleanField(default=False)
    vendor_rates = models.BooleanField(default=False)
    rate_update = models.BooleanField(default=False)
    pincode = models.BooleanField(default=False)
    user_management = models.BooleanField(default=False)
    ba_b2b = models.BooleanField(default=False)
    create_order = models.BooleanField(default=False)
    shipment_details = models.BooleanField(default=False)
    view_reports = models.BooleanField(default=False)
    generate_invoice = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.username} ({self.role})"
    
    def get_module_access(self):
        modules = []
        if self.fcpl_rate: modules.append('fcpl_rate')
        if self.pickup: modules.append('pickup')
        if self.vendor_manage: modules.append('vendor_manage')
        if self.vendor_rates: modules.append('vendor_rates')
        if self.rate_update: modules.append('rate_update')
        if self.pincode: modules.append('pincode')
        if self.user_management: modules.append('user_management')
        if self.ba_b2b: modules.append('ba_b2b')
        if self.create_order: modules.append('create_order')
        if self.shipment_details: modules.append('shipment_details')
        return modules