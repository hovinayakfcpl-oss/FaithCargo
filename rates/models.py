# rates/models.py
from django.db import models
from django.contrib.auth import get_user_model
from vendors.models import Vendor

User = get_user_model()


# =====================================================
# VENDOR RATE (Vendor Contract Pricing)
# =====================================================

class Rate(models.Model):
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE)
    rate = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.vendor.name} - {self.rate}"


# =====================================================
# FCPL / B2B RATECARD
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
    oda_charge = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    insurance_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    appointment_charge = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Weight Slabs
    weight_min = models.IntegerField(default=0)
    weight_max = models.IntegerField(default=0)

    updated_at = models.DateTimeField(auto_now=True, null=True)

    def __str__(self):
        return f"{self.rate_type.upper()} | {self.zone} - {self.payment_mode} ({self.weight_min}-{self.weight_max} Kg)"

    class Meta:
        db_table = 'rates_rate_card'


# =====================================================
# RATE MATRIX (Used for B2B Calculator)
# =====================================================

class RateMatrix(models.Model):
    ZONE_CHOICES = [
        ('N1', 'North Zone 1'), ('N2', 'North Zone 2'), ('N3', 'North Zone 3'),
        ('C1', 'Central Zone 1'), ('W1', 'West Zone 1'), ('W2', 'West Zone 2'),
        ('S1', 'South Zone 1'), ('S2', 'South Zone 2'), ('E1', 'East Zone 1'),
        ('NE1', 'North East 1'), ('NE2', 'North East 2'),
    ]
    
    from_zone = models.CharField(max_length=5, choices=ZONE_CHOICES)
    to_zone = models.CharField(max_length=5, choices=ZONE_CHOICES)
    rate = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Mode-specific rates
    surface_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    express_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    air_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    rail_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        unique_together = ("from_zone", "to_zone")
        verbose_name = "Rate Matrix"
        verbose_name_plural = "Rate Matrix"
        db_table = 'rates_rate_matrix'  # ✅ FIXED - Unique name

    def __str__(self):
        return f"{self.from_zone} → {self.to_zone} : ₹{self.rate}"


# =====================================================
# 🆕 CLIENT-SPECIFIC RATE MATRIX
# =====================================================

class ClientRateMatrix(models.Model):
    """
    Zone-wise rates for each client (override master rates)
    """
    ZONE_CHOICES = [
        ('N1', 'North Zone 1'), ('N2', 'North Zone 2'), ('N3', 'North Zone 3'),
        ('C1', 'Central Zone 1'), ('W1', 'West Zone 1'), ('W2', 'West Zone 2'),
        ('S1', 'South Zone 1'), ('S2', 'South Zone 2'), ('E1', 'East Zone 1'),
        ('NE1', 'North East 1'), ('NE2', 'North East 2'),
    ]
    
    client = models.ForeignKey(User, on_delete=models.CASCADE, related_name='custom_rate_matrix', limit_choices_to={'role': 'Client'})
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
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='updated_client_rates')
    
    class Meta:
        unique_together = ['client', 'from_zone', 'to_zone']
        ordering = ['from_zone', 'to_zone']
        db_table = 'rates_client_rate_matrix'  # ✅ FIXED - Unique name
    
    def __str__(self):
        return f"{self.client.client_id} - {self.from_zone} → {self.to_zone}: ₹{self.rate}"


# =====================================================
# 🆕 CLIENT RATE POLICY (Custom charges per client)
# =====================================================

class ClientRatePolicy(models.Model):
    """
    Client-specific rate policy overrides
    """
    client = models.OneToOneField(User, on_delete=models.CASCADE, related_name='custom_rate_policy', limit_choices_to={'role': 'Client'})
    
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
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='updated_client_policies')
    
    class Meta:
        db_table = 'rates_client_rate_policy'  # ✅ FIXED - Unique name
    
    def __str__(self):
        status = "Custom" if self.is_custom else "Default"
        return f"{self.client.client_id} - {status} Policy"
    
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


# =====================================================
# 🆕 MASTER RATE POLICY (Global settings)
# =====================================================

class MasterRatePolicy(models.Model):
    """
    Global rate policy (default settings for all clients)
    """
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
    
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        db_table = 'rates_master_rate_policy'  # ✅ FIXED - Unique name
    
    def __str__(self):
        return "Master Rate Policy"
    
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
        }