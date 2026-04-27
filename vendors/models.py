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
        ('PD LOGISTICS', 'PD Logistics'),
        ('RIVIGO', 'Rivigo'),
        ('VXPRESS', 'V-Express'),
        ('SHIVANI VX', 'Shivani VX (V-Xpress)'),
        ('TRUCX DLH Lite', 'TRUCX DLH Lite'),
        ('TRUCX DLH Dense', 'TRUCX DLH Dense'),
        ('TRUCX DLH Cargo', 'TRUCX DLH Cargo'),
        ('FCPL', 'Faith Cargo'),
        ('XPRESSBEES', 'XpressBees'),
        ('SHIPSHOPY BLUE DART', 'Shipshopy Blue Dart'),
        ('SHIPSHOPY DELIVERY', 'Shipshopy Delhivery'),
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
    
    # Special CFT Rates (for Delhivery, PD Logistics, TRUCX)
    delhivery_6cft = models.JSONField(
        default=dict,
        blank=True,
        help_text="6 CFT rates - Format: {from_zone: {to_zone: rate}}"
    )
    
    delhivery_10cft = models.JSONField(
        default=dict,
        blank=True,
        help_text="10 CFT rates - Format: {from_zone: {to_zone: rate}}"
    )
    
    # Additional charges
    charges = models.JSONField(
        default=dict,
        help_text="Additional charges like docket, FSC, GST, FOV, minimum freight, divisor, etc."
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
        - cft_type: '6cft' or '10cft' for vendors that support CFT rates
        """
        try:
            # Check for CFT support vendors
            cft_vendors = ['DELHIVERY', 'RIVIGO', 'PD LOGISTICS', 'TRUCX DLH Lite', 'TRUCX DLH Dense', 'TRUCX DLH Cargo']
            
            if self.vendor_name in cft_vendors and cft_type:
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
    
    def get_default_oda_charge(self):
        """Get default ODA charge from vendor settings"""
        return float(self.charges.get('oda_charge', 0))
    
    def get_divisor(self):
        """Get volumetric divisor from charges"""
        return self.charges.get('divisor', 5000)
    
    def get_min_freight(self):
        """Get minimum freight from charges"""
        return self.charges.get('min_freight', 350)
    
    def has_cft_support(self):
        """Check if vendor has CFT support"""
        cft_vendors = ['DELHIVERY', 'RIVIGO', 'PD LOGISTICS', 'TRUCX DLH Lite', 'TRUCX DLH Dense', 'TRUCX DLH Cargo']
        return self.vendor_name in cft_vendors
    
    def is_shipshopy_vendor(self):
        """Check if vendor is Shipshopy"""
        return self.vendor_name in ['SHIPSHOPY BLUE DART', 'SHIPSHOPY DELIVERY']
    
    def is_vxpress_vendor(self):
        """Check if vendor is V-Xpress type"""
        return self.vendor_name in ['VXPRESS', 'SHIVANI VX']
    
    def is_trucx_vendor(self):
        """Check if vendor is TRUCX DLH"""
        return self.vendor_name in ['TRUCX DLH Lite', 'TRUCX DLH Dense', 'TRUCX DLH Cargo']


# ============================================
# VENDOR PINCODE MODEL (FULLY UPDATED)
# ============================================

class VendorPincode(models.Model):
    """Store vendor-specific pincode details including ODA status"""
    
    ODA_CATEGORY_CHOICES = [
        ('A', 'ODA A - ₹2/kg (Min ₹200)'),
        ('B', 'ODA B - ₹4/kg (Min ₹400)'),
        ('C', 'ODA C - ₹7/kg (Min ₹700)'),
        ('D', 'ODA D - ₹10/kg (Min ₹1000)'),
        ('', 'Non-ODA'),
    ]
    
    vendor = models.ForeignKey(
        VendorRate, 
        on_delete=models.CASCADE, 
        related_name='pincodes'
    )
    
    pincode = models.CharField(
        max_length=20, 
        db_index=True,
        help_text="6-digit pincode"
    )
    
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    
    is_oda = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Is this pincode Out of Delivery Area?"
    )
    
    oda_category = models.CharField(
        max_length=10, 
        choices=ODA_CATEGORY_CHOICES, 
        default='', 
        blank=True,
        help_text="ODA Category: A, B, C, or D"
    )
    
    oda_charge_per_kg = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        help_text="ODA charge per kg"
    )
    
    oda_min_charge = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        help_text="Minimum ODA charge"
    )
    
    is_serviceable = models.BooleanField(
        default=True,
        help_text="Is this pincode serviceable by the vendor?"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vendor_pincodes'
        verbose_name = 'Vendor Pincode'
        verbose_name_plural = 'Vendor Pincodes'
        unique_together = ['vendor', 'pincode']
        ordering = ['vendor__vendor_name', 'pincode']
        indexes = [
            models.Index(fields=['vendor', 'pincode']),
            models.Index(fields=['is_oda']),
            models.Index(fields=['oda_category']),
            models.Index(fields=['pincode']),
        ]
    
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
    
    def get_oda_charge(self, weight):
        """Calculate ODA charge for given weight"""
        if not self.is_oda:
            return 0
        rate_info = self.get_oda_rate()
        calculated = weight * rate_info['per_kg']
        return max(calculated, rate_info['min'])


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
# ZONE MASTER MODEL - FIXED for JSON query
# ============================================

class ZoneMaster(models.Model):
    """Store zone information and pincode mapping"""
    
    ZONE_CHOICES = [
        ('N1', 'North Zone 1'),
        ('N2', 'North Zone 2'),
        ('N3', 'North Zone 3'),
        ('N4', 'North Zone 4'),
        ('C1', 'Central Zone 1'),
        ('C2', 'Central Zone 2'),
        ('W1', 'West Zone 1'),
        ('W2', 'West Zone 2'),
        ('S1', 'South Zone 1'),
        ('S2', 'South Zone 2'),
        ('S3', 'South Zone 3'),
        ('S4', 'South Zone 4'),
        ('E1', 'East Zone 1'),
        ('E2', 'East Zone 2'),
        ('NE1', 'North East Zone 1'),
        ('NE2', 'North East Zone 2'),
        ('NE3', 'North East Zone 3'),
    ]
    
    zone_code = models.CharField(max_length=10, unique=True, choices=ZONE_CHOICES)
    zone_name = models.CharField(max_length=100)
    
    pincodes = models.JSONField(
        default=list, 
        help_text="List of pincodes in this zone"
    )
    
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
    
    def contains_pincode(self, pincode):
        """Check if pincode is in this zone"""
        return str(pincode) in self.pincodes
    
    def get_pincode_count(self):
        """Get number of pincodes in this zone"""
        return len(self.pincodes)


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
        ('cft_6', '6 CFT'),
        ('cft_10', '10 CFT'),
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
        indexes = [
            models.Index(fields=['vendor', 'service_type']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.vendor.vendor_name} - {self.get_service_type_display()}"
    
    def get_rate(self, from_zone, to_zone):
        """Get rate for this service type"""
        try:
            return self.rates.get(from_zone, {}).get(to_zone, 0)
        except:
            return 0


# ============================================
# BULK UPLOAD LOG MODEL
# ============================================

class BulkUploadLog(models.Model):
    """Track bulk upload operations"""
    
    UPLOAD_TYPES = [
        ('pincode', 'Pincode Upload'),
        ('rate', 'Rate Upload'),
        ('vendor', 'Vendor Upload'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    vendor = models.ForeignKey(VendorRate, on_delete=models.CASCADE, null=True, blank=True)
    upload_type = models.CharField(max_length=20, choices=UPLOAD_TYPES)
    file_name = models.CharField(max_length=255, blank=True, null=True)
    total_records = models.IntegerField(default=0)
    success_records = models.IntegerField(default=0)
    failed_records = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    error_message = models.TextField(blank=True, null=True)
    uploaded_by = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        db_table = 'bulk_upload_logs'
        verbose_name = 'Bulk Upload Log'
        verbose_name_plural = 'Bulk Upload Logs'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.upload_type} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"


# ============================================
# TRUCX HELPER MIXIN
# ============================================

class TrucxHelperMixin:
    """Mixin for TRUCX DLH vendor specific methods"""
    
    def is_trucx_lite(self):
        return self.vendor_name == 'TRUCX DLH Lite'
    
    def is_trucx_dense(self):
        return self.vendor_name == 'TRUCX DLH Dense'
    
    def is_trucx_cargo(self):
        return self.vendor_name == 'TRUCX DLH Cargo'
    
    def get_trucx_variant_info(self):
        """Get TRUCX variant specific information"""
        if self.vendor_name == 'TRUCX DLH Lite':
            return {
                'variant': 'Lite',
                'divisor': self.charges.get('divisor', 4500),
                'min_freight': self.charges.get('min_freight', 350),
                'docket_charge': self.charges.get('docket_charge', 50),
                'fsc': self.charges.get('fsc', '10%')
            }
        elif self.vendor_name == 'TRUCX DLH Dense':
            return {
                'variant': 'Dense',
                'divisor': self.charges.get('divisor', 2700),
                'min_freight': self.charges.get('min_freight', 300),
                'docket_charge': self.charges.get('docket_charge', 75),
                'fsc': self.charges.get('fsc', '12%')
            }
        elif self.vendor_name == 'TRUCX DLH Cargo':
            return {
                'variant': 'Cargo',
                'divisor': self.charges.get('divisor', 3540),
                'min_freight': self.charges.get('min_freight', 350),
                'docket_charge': self.charges.get('docket_charge', 50),
                'fsc': self.charges.get('fsc', '10%')
            }
        return None


# ============================================
# SHIVANI VX HELPER MIXIN
# ============================================

class ShivaniVXHelperMixin:
    """Mixin for SHIVANI VX (V-XPRESS) specific methods"""
    
    def is_shivani_vx(self):
        return self.vendor_name == 'SHIVANI VX'
    
    def get_vxpress_oda_categories(self):
        """Get V-XPRESS ODA categories"""
        return self.charges.get('oda_categories', {
            'A': {'min_charge': 800, 'rate_per_kg': 3.5, 'max_capping': 3500},
            'B': {'min_charge': 1000, 'rate_per_kg': 4.5, 'max_capping': 4500},
            'C': {'min_charge': 1500, 'rate_per_kg': 5.5, 'max_capping': 5500},
            'D': {'min_charge': 2000, 'rate_per_kg': 6.5, 'max_capping': 6500},
        })
    
    def get_vxpress_fsc_details(self):
        """Get V-XPRESS FSC details"""
        return {
            'fsc_percent': self.charges.get('fsc', '7%'),
            'base_diesel_price': self.charges.get('base_diesel_price', 90.54),
            'fsc_adjustment': self.charges.get('fsc_adjustment_percent', 2)
        }


# Add mixins to VendorRate (helper methods)
# These can be used in views: VendorRate.objects.get(...).is_trucx_lite()