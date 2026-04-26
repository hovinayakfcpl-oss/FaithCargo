from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone

# ============================================
# VENDOR RATE MODEL - ZONE TO ZONE RATES
# ============================================

class VendorRate(models.Model):
    """Store vendor-wise zone-to-zone rates and charges"""
    
    VENDOR_CHOICES = [
        ('DELHIVERY', 'Delhivery'),
        ('GATI', 'Gati'),
        ('PD', 'PD Logistics'),
        ('RIVIGO', 'Rivigo'),
        ('VXPRESS', 'V-Express'),
        ('FCPL', 'Faith Cargo'),
        ('XPRESSBEES', 'XpressBees'),
    ]
    
    vendor_name = models.CharField(
        max_length=100, 
        unique=True, 
        choices=VENDOR_CHOICES,
        help_text="Name of the logistics vendor"
    )
    
    # Standard zone-to-zone rate matrix
    rates = models.JSONField(
        default=dict,
        help_text="Zone to zone rate matrix - Format: {from_zone: {to_zone: rate}}"
    )
    
    # Delhivery Special - CFT Rates
    delhivery_6cft = models.JSONField(
        default=dict,
        blank=True,
        help_text="6 CFT rates for Delhivery - Format: {from_zone: {to_zone: rate}}"
    )
    
    delhivery_10cft = models.JSONField(
        default=dict,
        blank=True,
        help_text="10 CFT rates for Delhivery - Format: {from_zone: {to_zone: rate}}"
    )
    
    # Additional charges
    charges = models.JSONField(
        default=dict,
        help_text="Additional charges like docket, FSC, GST, FOV, minimum freight etc."
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.CharField(max_length=100, blank=True, null=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'vendor_rates'
        verbose_name = 'Vendor Rate'
        verbose_name_plural = 'Vendor Rates'
        ordering = ['vendor_name']
    
    def __str__(self):
        return f"{self.get_vendor_name_display()} - Rates"
    
    def get_rate(self, from_zone, to_zone, cft_type=None):
        """Get rate between two zones
        - cft_type: '6cft' or '10cft' for Delhivery special rates
        """
        try:
            if self.vendor_name == 'DELHIVERY' and cft_type:
                if cft_type == '6cft':
                    return self.delhivery_6cft.get(from_zone, {}).get(to_zone, 0)
                elif cft_type == '10cft':
                    return self.delhivery_10cft.get(from_zone, {}).get(to_zone, 0)
            
            return self.rates.get(from_zone, {}).get(to_zone, 0)
        except:
            return 0
    
    def get_charge(self, charge_name):
        """Get specific charge value"""
        return self.charges.get(charge_name, 0)


# ============================================
# VENDOR PINCODE MODEL (UPDATED with oda_category)
# ============================================

class VendorPincode(models.Model):
    """Store vendor-specific pincode details including ODA status"""
    
    ODA_CATEGORY_CHOICES = [
        ('A', 'ODA A - ₹2/kg (Min ₹200)'),
        ('B', 'ODA B - ₹4/kg (Min ₹400)'),
        ('C', 'ODA C - ₹7/kg (Min ₹700)'),
        ('D', 'ODA D - ₹10/kg (Min ₹1000)'),
        ('NONE', 'Non-ODA'),
    ]
    
    vendor = models.ForeignKey(VendorRate, on_delete=models.CASCADE, related_name='pincodes')
    pincode = models.CharField(max_length=10)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    is_oda = models.BooleanField(default=False)
    oda_category = models.CharField(
        max_length=10, 
        choices=ODA_CATEGORY_CHOICES, 
        default='NONE', 
        blank=True,
        help_text="ODA Category: A, B, C, or D"
    )
    oda_charge_per_kg = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    oda_min_charge = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_serviceable = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vendor_pincodes'
        verbose_name = 'Vendor Pincode'
        verbose_name_plural = 'Vendor Pincodes'
        unique_together = ['vendor', 'pincode']
        ordering = ['vendor__vendor_name', 'pincode']
    
    def __str__(self):
        if self.is_oda:
            return f"{self.vendor.vendor_name} - {self.pincode} (ODA-{self.oda_category})"
        return f"{self.vendor.vendor_name} - {self.pincode} (Non-ODA)"
    
    def get_oda_rate(self):
        """Get ODA rate details based on category"""
        rates = {
            'A': {'per_kg': 2, 'min': 200, 'name': 'ODA A - Normal'},
            'B': {'per_kg': 4, 'min': 400, 'name': 'ODA B - High'},
            'C': {'per_kg': 7, 'min': 700, 'name': 'ODA C - Very High'},
            'D': {'per_kg': 10, 'min': 1000, 'name': 'ODA D - Extreme'},
        }
        return rates.get(self.oda_category, {'per_kg': 0, 'min': 0, 'name': 'Non-ODA'})


# ============================================
# VENDOR INFORMATION MODEL
# ============================================

class Vendor(models.Model):
    """Store vendor company information"""
    
    VENDOR_TYPE = [
        ('surface', 'Surface Transport'),
        ('air', 'Air Cargo'),
        ('express', 'Express Delivery'),
        ('rail', 'Rail Cargo'),
        ('all', 'All Services'),
    ]
    
    name = models.CharField(max_length=100, unique=True)
    vendor_code = models.CharField(max_length=20, unique=True, blank=True, null=True)
    gstin = models.CharField(max_length=20, blank=True, null=True)
    pan = models.CharField(max_length=10, blank=True, null=True)
    
    contact_person = models.CharField(max_length=100, blank=True, null=True)
    contact_email = models.EmailField(blank=True, null=True)
    contact_phone = models.CharField(max_length=15, blank=True, null=True)
    alternate_phone = models.CharField(max_length=15, blank=True, null=True)
    
    address = models.TextField(blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    pincode = models.CharField(max_length=10, blank=True, null=True)
    
    vendor_type = models.CharField(max_length=20, choices=VENDOR_TYPE, default='surface')
    serviceable_pincodes = models.JSONField(default=list, blank=True, help_text="List of serviceable pincodes")
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vendors'
        verbose_name = 'Vendor'
        verbose_name_plural = 'Vendors'
        ordering = ['name']
    
    def __str__(self):
        return self.name


# ============================================
# RATE HISTORY MODEL - FOR AUDIT TRAIL
# ============================================

class RateHistory(models.Model):
    """Track all rate changes for audit purposes"""
    
    vendor = models.ForeignKey(VendorRate, on_delete=models.CASCADE, related_name='history')
    old_rates = models.JSONField(default=dict)
    new_rates = models.JSONField(default=dict)
    old_charges = models.JSONField(default=dict, blank=True)
    new_charges = models.JSONField(default=dict, blank=True)
    updated_by = models.CharField(max_length=100, blank=True, null=True)
    updated_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'rate_history'
        verbose_name = 'Rate History'
        verbose_name_plural = 'Rate Histories'
        ordering = ['-updated_at']
    
    def __str__(self):
        return f"{self.vendor.vendor_name} - {self.updated_at.strftime('%Y-%m-%d %H:%M')}"


# ============================================
# ZONE MASTER MODEL
# ============================================

class ZoneMaster(models.Model):
    """Store zone information and pincode mapping"""
    
    ZONE_CHOICES = [
        ('N1', 'North Zone 1'),
        ('N2', 'North Zone 2'),
        ('N3', 'North Zone 3'),
        ('C1', 'Central Zone 1'),
        ('W1', 'West Zone 1'),
        ('W2', 'West Zone 2'),
        ('S1', 'South Zone 1'),
        ('S2', 'South Zone 2'),
        ('E1', 'East Zone 1'),
        ('NE1', 'North East Zone 1'),
        ('NE2', 'North East Zone 2'),
        ('NE3', 'North East Zone 3'),
    ]
    
    zone_code = models.CharField(max_length=10, unique=True, choices=ZONE_CHOICES)
    zone_name = models.CharField(max_length=100)
    pincodes = models.JSONField(default=list, help_text="List of pincodes in this zone")
    state_codes = models.JSONField(default=list, blank=True, help_text="List of state codes")
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'zone_master'
        verbose_name = 'Zone Master'
        verbose_name_plural = 'Zone Masters'
        ordering = ['zone_code']
    
    def __str__(self):
        return f"{self.zone_code} - {self.zone_name}"


# ============================================
# B2B RATE MODEL - ZONE TO ZONE (FOR FCPL)
# ============================================

class B2BRate(models.Model):
    """B2B rate matrix - zone to zone rates for FCPL"""
    
    MODE_CHOICES = [
        ('surface', 'Surface Transport'),
        ('air', 'Air Cargo'),
        ('express', 'Express Delivery'),
        ('rail', 'Rail Cargo'),
    ]
    
    from_zone = models.CharField(max_length=50)
    to_zone = models.CharField(max_length=50)
    rate_per_kg = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    mode = models.CharField(max_length=20, choices=MODE_CHOICES, default='surface')
    min_freight = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'b2b_rates'
        verbose_name = 'B2B Rate'
        verbose_name_plural = 'B2B Rates'
        unique_together = ['from_zone', 'to_zone', 'mode']
        ordering = ['from_zone', 'to_zone']
    
    def __str__(self):
        return f"{self.from_zone} → {self.to_zone} ({self.mode}): ₹{self.rate_per_kg}/kg"


# ============================================
# VENDOR SPECIFIC RATES (For different service types)
# ============================================

class VendorServiceRate(models.Model):
    """Vendor wise different service rates (like surface, air, express)"""
    
    SERVICE_CHOICES = [
        ('surface', 'Surface'),
        ('air', 'Air Cargo'),
        ('express', 'Express'),
        ('rail', 'Rail Cargo'),
        ('cft_6', '6 CFT (Delhivery)'),
        ('cft_10', '10 CFT (Delhivery)'),
    ]
    
    vendor = models.ForeignKey(VendorRate, on_delete=models.CASCADE, related_name='service_rates')
    service_type = models.CharField(max_length=20, choices=SERVICE_CHOICES)
    rates = models.JSONField(default=dict, help_text="Zone to zone rates for this service")
    min_weight = models.FloatField(default=0, help_text="Minimum weight for this service")
    max_weight = models.FloatField(default=0, blank=True, null=True, help_text="Maximum weight for this service")
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vendor_service_rates'
        verbose_name = 'Vendor Service Rate'
        verbose_name_plural = 'Vendor Service Rates'
        unique_together = ['vendor', 'service_type']
    
    def __str__(self):
        return f"{self.vendor.vendor_name} - {self.get_service_type_display()}"