# accounts/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid

class CustomUser(AbstractUser):
    ROLE_CHOICES = (
        ('Admin', 'Admin'),
        ('User', 'User'),
        ('Client', 'Client'),  # NEW: Client role
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='User')
    
    # Additional fields for user management
    phone = models.CharField(max_length=15, blank=True, null=True)
    company = models.CharField(max_length=200, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    gstin = models.CharField(max_length=15, blank=True, null=True)
    
    # Client-specific fields
    client_id = models.CharField(max_length=50, unique=True, blank=True, null=True)
    is_client_active = models.BooleanField(default=True)
    created_by = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='created_clients')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
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

    class Meta:
        db_table = 'accounts_custom_user'  # ✅ ADDED - Unique table name
        verbose_name = 'Custom User'
        verbose_name_plural = 'Custom Users'

    def __str__(self):
        if self.client_id:
            return f"{self.client_id} - {self.company or self.username} ({self.role})"
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
    
    def get_modules_dict(self):
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
        }


# ============================================
# CLIENT PROFILE MODEL
# ============================================
class ClientProfile(models.Model):
    """
    Extended profile for clients with additional business information
    """
    client = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='client_profile')
    
    # Business Details
    business_type = models.CharField(max_length=100, blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    pan_number = models.CharField(max_length=10, blank=True, null=True)
    registration_date = models.DateField(auto_now_add=True)
    
    # Contact Persons
    primary_contact_name = models.CharField(max_length=100, blank=True, null=True)
    primary_contact_designation = models.CharField(max_length=100, blank=True, null=True)
    secondary_contact_name = models.CharField(max_length=100, blank=True, null=True)
    secondary_contact_phone = models.CharField(max_length=15, blank=True, null=True)
    
    # Preferences
    preferred_payment_mode = models.CharField(max_length=20, blank=True, null=True)
    credit_limit = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    current_credit_used = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Statistics
    total_orders = models.IntegerField(default=0)
    total_shipments = models.IntegerField(default=0)
    total_freight = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    last_order_date = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'accounts_client_profile'  # ✅ ADDED - Unique table name
    
    def __str__(self):
        return f"Profile for {self.client.client_id or self.client.username}"
    
    @property
    def available_credit(self):
        return self.credit_limit - self.current_credit_used


# ============================================
# CLIENT RATE MATRIX MODEL
# ============================================
class ClientRateMatrix(models.Model):
    """
    Zone-wise rates for each client
    """
    client = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='rate_matrix')
    
    # Zones
    ZONE_CHOICES = [
        ('N1', 'North Zone 1'), ('N2', 'North Zone 2'), ('N3', 'North Zone 3'),
        ('C1', 'Central Zone 1'), ('W1', 'West Zone 1'), ('W2', 'West Zone 2'),
        ('S1', 'South Zone 1'), ('S2', 'South Zone 2'), ('E1', 'East Zone 1'),
        ('NE1', 'North East 1'), ('NE2', 'North East 2'),
    ]
    
    from_zone = models.CharField(max_length=5, choices=ZONE_CHOICES)
    to_zone = models.CharField(max_length=5, choices=ZONE_CHOICES)
    rate = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Mode-specific rates
    surface_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    express_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    air_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    rail_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='updated_rates')
    
    class Meta:
        unique_together = ['client', 'from_zone', 'to_zone']
        ordering = ['from_zone', 'to_zone']
        db_table = 'accounts_client_rate_matrix'  # ✅ ADDED - Unique table name
    
    def __str__(self):
        return f"{self.client.client_id or self.client.username}: {self.from_zone} → {self.to_zone} = ₹{self.rate}"


# ============================================
# CLIENT RATE POLICY MODEL
# ============================================
class ClientRatePolicy(models.Model):
    """
    Client-specific rate policy overrides
    """
    client = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='rate_policy')
    
    # Base Rates
    surface_rate_per_kg = models.DecimalField(max_digits=10, decimal_places=2, default=18)
    express_rate_per_kg = models.DecimalField(max_digits=10, decimal_places=2, default=25)
    air_rate_per_kg = models.DecimalField(max_digits=10, decimal_places=2, default=45)
    rail_rate_per_kg = models.DecimalField(max_digits=10, decimal_places=2, default=15)
    
    # Charges
    min_freight = models.DecimalField(max_digits=10, decimal_places=2, default=650)
    docket_charge = models.DecimalField(max_digits=10, decimal_places=2, default=100)
    fuel_percent = models.DecimalField(max_digits=5, decimal_places=2, default=10)
    fov_charge = models.DecimalField(max_digits=10, decimal_places=2, default=75)
    oda_charge = models.DecimalField(max_digits=10, decimal_places=2, default=3)
    
    # Service Charges
    cod_charge = models.DecimalField(max_digits=10, decimal_places=2, default=150)
    cod_percent = models.DecimalField(max_digits=5, decimal_places=2, default=2.5)
    fragile_charge = models.DecimalField(max_digits=10, decimal_places=2, default=250)
    appointment_charge = models.DecimalField(max_digits=10, decimal_places=2, default=1500)
    handling_charge = models.DecimalField(max_digits=10, decimal_places=2, default=2)
    insurance_percent = models.DecimalField(max_digits=5, decimal_places=2, default=2)
    express_extra = models.DecimalField(max_digits=10, decimal_places=2, default=5)
    
    # Taxes
    gst_percent = models.DecimalField(max_digits=5, decimal_places=2, default=18)
    
    # Other
    cft = models.DecimalField(max_digits=10, decimal_places=2, default=4500)
    
    is_custom = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='updated_policies')
    
    class Meta:
        db_table = 'accounts_client_rate_policy'  # ✅ ADDED - Unique table name
    
    def __str__(self):
        status = "Custom" if self.is_custom else "Default"
        return f"{self.client.client_id or self.client.username} - {status} Policy"
    
    def to_dict(self):
        return {
            'surface_rate_per_kg': float(self.surface_rate_per_kg),
            'express_rate_per_kg': float(self.express_rate_per_kg),
            'air_rate_per_kg': float(self.air_rate_per_kg),
            'rail_rate_per_kg': float(self.rail_rate_per_kg),
            'min_freight': float(self.min_freight),
            'docket_charge': float(self.docket_charge),
            'fuel_percent': float(self.fuel_percent),
            'fov_charge': float(self.fov_charge),
            'oda_charge': float(self.oda_charge),
            'cod_charge': float(self.cod_charge),
            'cod_percent': float(self.cod_percent),
            'fragile_charge': float(self.fragile_charge),
            'appointment_charge': float(self.appointment_charge),
            'handling_charge': float(self.handling_charge),
            'insurance_percent': float(self.insurance_percent),
            'express_extra': float(self.express_extra),
            'gst_percent': float(self.gst_percent),
            'cft': float(self.cft),
            'is_custom': self.is_custom
        }


# ============================================
# CLIENT ORDER SUMMARY MODEL
# ============================================
class ClientOrderSummary(models.Model):
    """
    Summary of client orders for quick access
    """
    client = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='order_summaries')
    
    # Period
    year = models.IntegerField()
    month = models.IntegerField()
    
    # Counts
    total_orders = models.IntegerField(default=0)
    total_shipments = models.IntegerField(default=0)
    
    # Amounts
    total_freight = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_invoice_value = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['client', 'year', 'month']
        ordering = ['-year', '-month']
        db_table = 'accounts_client_order_summary'  # ✅ ADDED - Unique table name
    
    def __str__(self):
        return f"{self.client.client_id} - {self.month}/{self.year}: {self.total_orders} orders"


# ============================================
# CLIENT SESSION MODEL (for tracking)
# ============================================
class ClientSession(models.Model):
    """
    Track client login sessions
    """
    client = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='sessions')
    token = models.CharField(max_length=500, unique=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, null=True)
    login_time = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'accounts_client_session'  # ✅ ADDED - Unique table name
    
    def __str__(self):
        return f"{self.client.client_id} - {self.login_time}"