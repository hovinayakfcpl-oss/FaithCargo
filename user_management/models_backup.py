# usermanagement/models.py
from django.db import models
from django.contrib.auth.hashers import make_password, check_password
import uuid


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
    ROLE_CHOICES = (
        ('Admin', 'Admin'),
        ('User', 'User'),
        ('Client', 'Client'),
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='User')
    
    # Client-specific fields
    client_id = models.CharField(max_length=50, unique=True, blank=True, null=True)
    is_client_active = models.BooleanField(default=True)
    created_by = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='created_clients')
    
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
    create_order = models.BooleanField(default=False)
    shipment_details = models.BooleanField(default=False)
    view_reports = models.BooleanField(default=False)
    generate_invoice = models.BooleanField(default=False)

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
        if self.client_id:
            return f"{self.client_id} - {self.company or self.username} ({self.role})"
        return f"{self.username} ({self.role})"

    class Meta:
        db_table = 'custom_users'
        ordering = ['-created_at']
        verbose_name = 'Custom User'
        verbose_name_plural = 'Custom Users'


# ============================================
# CLIENT PROFILE MODEL - NEW
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
    
    def __str__(self):
        return f"Profile for {self.client.client_id or self.client.username}"
    
    @property
    def available_credit(self):
        return self.credit_limit - self.current_credit_used
    
    class Meta:
        db_table = 'client_profiles'
        verbose_name = 'Client Profile'
        verbose_name_plural = 'Client Profiles'


# ============================================
# CLIENT RATE MATRIX MODEL - NEW
# ============================================
class ClientRateMatrix(models.Model):
    """
    Zone-wise rates for each client
    """
    ZONE_CHOICES = [
        ('N1', 'North Zone 1'), ('N2', 'North Zone 2'), ('N3', 'North Zone 3'),
        ('C1', 'Central Zone 1'), ('W1', 'West Zone 1'), ('W2', 'West Zone 2'),
        ('S1', 'South Zone 1'), ('S2', 'South Zone 2'), ('E1', 'East Zone 1'),
        ('NE1', 'North East 1'), ('NE2', 'North East 2'),
    ]
    
    client = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='rate_matrix')
    
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
        db_table = 'client_rate_matrix'
    
    def __str__(self):
        return f"{self.client.client_id or self.client.username}: {self.from_zone} → {self.to_zone} = ₹{self.rate}"


# ============================================
# CLIENT RATE POLICY MODEL - NEW
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
    
    class Meta:
        db_table = 'client_rate_policies'
        verbose_name = 'Client Rate Policy'
        verbose_name_plural = 'Client Rate Policies'


# ============================================
# SHIPMENT MODEL - NEW (for orders)
# ============================================
class Shipment(models.Model):
    STATUS_CHOICES = [
        ('booked', 'Booked'),
        ('picked', 'Picked Up'),
        ('in_transit', 'In Transit'),
        ('out_for_delivery', 'Out for Delivery'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    ]
    
    MODE_CHOICES = [
        ('surface', 'Surface Transport'),
        ('express', 'Express Delivery'),
        ('air', 'Air Cargo'),
        ('rail', 'Rail Cargo'),
    ]
    
    # Client Info
    client = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='shipments', null=True, blank=True)
    client_id = models.CharField(max_length=50, blank=True, null=True)
    
    # LR / AWB Numbers
    lr_number = models.CharField(max_length=50, unique=True, db_index=True)
    awb_number = models.CharField(max_length=50, blank=True, null=True)
    
    # Pickup Details
    pickup_name = models.CharField(max_length=200)
    pickup_address = models.TextField()
    pickup_pincode = models.CharField(max_length=6)
    pickup_city = models.CharField(max_length=100, blank=True, null=True)
    pickup_state = models.CharField(max_length=100, blank=True, null=True)
    pickup_contact = models.CharField(max_length=15)
    pickup_gstin = models.CharField(max_length=15, blank=True, null=True)
    
    # Delivery Details
    delivery_name = models.CharField(max_length=200)
    delivery_address = models.TextField()
    delivery_pincode = models.CharField(max_length=6)
    delivery_city = models.CharField(max_length=100, blank=True, null=True)
    delivery_state = models.CharField(max_length=100, blank=True, null=True)
    delivery_contact = models.CharField(max_length=15)
    delivery_gstin = models.CharField(max_length=15, blank=True, null=True)
    
    # Shipment Details
    material = models.CharField(max_length=200, default="General Cargo")
    hsn_code = models.CharField(max_length=10, default="1234")
    boxes = models.IntegerField(default=1)
    weight = models.DecimalField(max_digits=10, decimal_places=2)
    actual_weight = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    volumetric_weight = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Financial
    total_value = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    freight_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Booking Info
    booking_mode = models.CharField(max_length=20, choices=MODE_CHOICES, default='surface')
    eway_bill = models.CharField(max_length=12, blank=True, null=True)
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='booked')
    
    # Dimensions (JSON)
    dimensions = models.JSONField(default=list, blank=True)
    
    # Invoices (JSON)
    invoices = models.JSONField(default=list, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.lr_number} - {self.pickup_name} → {self.delivery_name}"
    
    class Meta:
        db_table = 'shipments'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['lr_number']),
            models.Index(fields=['client_id']),
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
        ]


# ============================================
# SHIPMENT TRACKING MODEL - NEW
# ============================================
class ShipmentTracking(models.Model):
    shipment = models.ForeignKey(Shipment, on_delete=models.CASCADE, related_name='tracking_history')
    status = models.CharField(max_length=20, choices=Shipment.STATUS_CHOICES)
    location = models.CharField(max_length=200, blank=True, null=True)
    remarks = models.TextField(blank=True, null=True)
    updated_by = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.shipment.lr_number} - {self.status} at {self.created_at}"
    
    class Meta:
        db_table = 'shipment_tracking'
        ordering = ['-created_at']


# ============================================
# CLIENT SESSION MODEL - NEW
# ============================================
class ClientSession(models.Model):
    client = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='sessions')
    token = models.CharField(max_length=500, unique=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, null=True)
    login_time = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.client.client_id} - {self.login_time}"
    
    class Meta:
        db_table = 'client_sessions'
        ordering = ['-login_time']


# ============================================
# CLIENT ORDER SUMMARY MODEL - NEW
# ============================================
class ClientOrderSummary(models.Model):
    client = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='order_summaries')
    year = models.IntegerField()
    month = models.IntegerField()
    total_orders = models.IntegerField(default=0)
    total_shipments = models.IntegerField(default=0)
    total_freight = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_invoice_value = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['client', 'year', 'month']
        ordering = ['-year', '-month']
        db_table = 'client_order_summaries'
    
    def __str__(self):
        return f"{self.client.client_id} - {self.month}/{self.year}: {self.total_orders} orders"