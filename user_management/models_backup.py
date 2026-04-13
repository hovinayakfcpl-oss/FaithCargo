from django.db import models
from django.contrib.auth.hashers import make_password, check_password

class CustomUser(models.Model):
    username = models.CharField(max_length=100, unique=True)
    password = models.CharField(max_length=255)
    
    # Personal Information Fields
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=15, blank=True, null=True)
    company = models.CharField(max_length=200, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    gstin = models.CharField(max_length=15, blank=True, null=True)

    # 🔥 ROLE & METADATA
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # 🔥 EXISTING MODULE PERMISSIONS
    fcpl_rate = models.BooleanField(default=False)
    pickup = models.BooleanField(default=False)
    vendor_manage = models.BooleanField(default=False)
    vendor_rates = models.BooleanField(default=False)
    rate_update = models.BooleanField(default=False)
    pincode = models.BooleanField(default=False)
    user_management = models.BooleanField(default=False)
    ba_b2b = models.BooleanField(default=False)

    # 🔥 NEW MODULE PERMISSIONS
    create_order = models.BooleanField(default=False)        # "Create Order" के लिए
    shipment_details = models.BooleanField(default=False)    # "Shipment Details" के लिए
    view_reports = models.BooleanField(default=False)        # "View Reports" के लिए
    generate_invoice = models.BooleanField(default=False)    # "Generate Invoice" के लिए

    def set_password(self, raw_password):
        """Hash the password before saving"""
        self.password = make_password(raw_password)

    def check_password(self, raw_password):
        """Verify the password"""
        return check_password(raw_password, self.password)

    def save(self, *args, **kwargs):
        """Override save to hash password if it's not already hashed"""
        if self.password and not self.password.startswith(('pbkdf2_sha256$', 'bcrypt$', 'argon2')):
            self.password = make_password(self.password)
        super().save(*args, **kwargs)

    def get_full_name(self):
        """Return the full name (username as fallback)"""
        return self.username

    def get_short_name(self):
        """Return the short name"""
        return self.username

    def has_perm(self, perm, obj=None):
        """Check if user has a specific permission"""
        perm_map = {
            'fcpl_rate': self.fcpl_rate,
            'pickup': self.pickup,
            'vendor_manage': self.vendor_manage,
            'vendor_rates': self.vendor_rates,
            'rate_update': self.rate_update,
            'pincode': self.pincode,
            'user_management': self.user_management,
            'ba_b2b': self.ba_b2b,
            'create_order': self.create_order,
            'shipment_details': self.shipment_details,
            'view_reports': self.view_reports,
            'generate_invoice': self.generate_invoice,
        }
        return perm_map.get(perm, False)

    def get_all_permissions(self):
        """Return all permissions as a dictionary"""
        return {
            'fcpl_rate': self.fcpl_rate,
            'pickup': self.pickup,
            'vendor_manage': self.vendor_manage,
            'vendor_rates': self.vendor_rates,
            'rate_update': self.rate_update,
            'pincode': self.pincode,
            'user_management': self.user_management,
            'ba_b2b': self.ba_b2b,
            'create_order': self.create_order,
            'shipment_details': self.shipment_details,
            'view_reports': self.view_reports,
            'generate_invoice': self.generate_invoice,
        }

    def get_module_access(self):
        """Return module access for frontend"""
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
        if self.view_reports: modules.append('view_reports')
        if self.generate_invoice: modules.append('generate_invoice')
        return modules

    def __str__(self):
        return f"{self.username} - {self.company or 'Individual'}"

    class Meta:
        db_table = 'custom_users'
        ordering = ['-created_at']
        verbose_name = 'Custom User'
        verbose_name_plural = 'Custom Users'