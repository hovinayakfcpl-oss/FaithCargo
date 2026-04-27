from rest_framework import serializers
from .models import Vendor, VendorRate, RateHistory, ZoneMaster, B2BRate, VendorServiceRate, VendorPincode


# ============================================
# VENDOR SERIALIZER
# ============================================

class VendorSerializer(serializers.ModelSerializer):
    """Serializer for Vendor model"""
    
    class Meta:
        model = Vendor
        fields = "__all__"
        read_only_fields = ['id', 'created_at', 'updated_at']


# ============================================
# VENDOR PINCODE SERIALIZER (UPDATED)
# ============================================

class VendorPincodeSerializer(serializers.ModelSerializer):
    """Serializer for VendorPincode model - ODA pincodes"""
    
    vendor_name = serializers.CharField(source='vendor.vendor_name', read_only=True)
    oda_category_display = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = VendorPincode
        fields = [
            'id', 'vendor', 'vendor_name', 'pincode', 'city', 'state',
            'is_oda', 'oda_category', 'oda_category_display',
            'oda_charge_per_kg', 'oda_min_charge', 'is_serviceable',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_oda_category_display(self, obj):
        """Get display name for ODA category"""
        if obj.oda_category:
            return dict(VendorPincode.ODA_CATEGORY_CHOICES).get(obj.oda_category, obj.oda_category)
        return None


# ============================================
# VENDOR RATE SERIALIZER (UPDATED - includes all vendors)
# ============================================

class VendorRateSerializer(serializers.ModelSerializer):
    """Serializer for VendorRate model - includes rates and charges"""
    
    vendor_display = serializers.CharField(source='get_vendor_name_display', read_only=True)
    pincodes = VendorPincodeSerializer(many=True, read_only=True)
    vendor_type = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = VendorRate
        fields = [
            'id', 'vendor_name', 'vendor_display', 'vendor_type', 'rates', 
            'delhivery_6cft', 'delhivery_10cft', 'charges',
            'is_active', 'created_at', 'updated_at', 'updated_by', 'pincodes'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_vendor_type(self, obj):
        """Determine vendor type for classification"""
        vendor_name = obj.vendor_name
        
        if vendor_name == 'SHIVANI VX':
            return 'vxpress'
        elif 'TRUCX' in vendor_name:
            return 'trucx'
        elif vendor_name == 'SHIPSHOPY BLUE DART':
            return 'bluedart'
        elif vendor_name == 'SHIPSHOPY DELIVERY':
            return 'delhivery_b2b'
        elif vendor_name == 'DELHIVERY':
            return 'delhivery'
        elif vendor_name == 'PD LOGISTICS':
            return 'pd_logistics'
        elif vendor_name == 'RIVIGO':
            return 'rivigo'
        elif vendor_name == 'GATI':
            return 'gati'
        elif vendor_name == 'VXPRESS':
            return 'vxpress'
        else:
            return 'standard'
    
    def validate_rates(self, value):
        """Validate rates structure"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Rates must be a dictionary")
        
        # Validate zone structure
        for from_zone, to_zones in value.items():
            if not isinstance(to_zones, dict):
                raise serializers.ValidationError(f"Rates for zone {from_zone} must be a dictionary")
        
        return value
    
    def validate_delhivery_6cft(self, value):
        """Validate 6CFT rates for vendors that support it"""
        if value and not isinstance(value, dict):
            raise serializers.ValidationError("6CFT rates must be a dictionary")
        return value
    
    def validate_delhivery_10cft(self, value):
        """Validate 10CFT rates for vendors that support it"""
        if value and not isinstance(value, dict):
            raise serializers.ValidationError("10CFT rates must be a dictionary")
        return value
    
    def validate_charges(self, value):
        """Validate charges structure"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Charges must be a dictionary")
        
        # Recommended fields
        recommended_fields = ['docket_charge', 'fsc', 'gst', 'min_freight', 'min_weight']
        for field in recommended_fields:
            if field not in value:
                pass  # Warning only, not error
        
        return value


# ============================================
# RATE HISTORY SERIALIZER
# ============================================

class RateHistorySerializer(serializers.ModelSerializer):
    """Serializer for RateHistory model - audit trail"""
    
    vendor_name = serializers.CharField(source='vendor.vendor_name', read_only=True)
    
    class Meta:
        model = RateHistory
        fields = [
            'id', 'vendor', 'vendor_name', 
            'old_rates', 'new_rates', 
            'old_charges', 'new_charges',
            'updated_by', 'updated_at'
        ]
        read_only_fields = ['id', 'updated_at']


# ============================================
# ZONE MASTER SERIALIZER
# ============================================

class ZoneMasterSerializer(serializers.ModelSerializer):
    """Serializer for ZoneMaster model"""
    
    zone_display = serializers.CharField(source='get_zone_code_display', read_only=True)
    pincode_count = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = ZoneMaster
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_pincode_count(self, obj):
        """Get number of pincodes in this zone"""
        return len(obj.pincodes) if obj.pincodes else 0


# ============================================
# B2B RATE SERIALIZER
# ============================================

class B2BRateSerializer(serializers.ModelSerializer):
    """Serializer for B2BRate model"""
    
    mode_display = serializers.CharField(source='get_mode_display', read_only=True)
    
    class Meta:
        model = B2BRate
        fields = [
            'id', 'from_zone', 'to_zone', 'rate_per_kg', 
            'mode', 'mode_display', 'min_freight',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


# ============================================
# VENDOR SERVICE RATE SERIALIZER
# ============================================

class VendorServiceRateSerializer(serializers.ModelSerializer):
    """Serializer for VendorServiceRate model"""
    
    service_display = serializers.CharField(source='get_service_type_display', read_only=True)
    vendor_name = serializers.CharField(source='vendor.vendor_name', read_only=True)
    
    class Meta:
        model = VendorServiceRate
        fields = [
            'id', 'vendor', 'vendor_name', 'service_type', 'service_display',
            'rates', 'min_weight', 'max_weight', 'is_active', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


# ============================================
# VENDOR RATE CALCULATOR SERIALIZER
# ============================================

class VendorRateCalculatorSerializer(serializers.Serializer):
    """Serializer for rate calculation request/response"""
    
    # Request fields
    origin_pincode = serializers.CharField(max_length=10, required=True)
    destination_pincode = serializers.CharField(max_length=10, required=True)
    weight = serializers.FloatField(required=True, min_value=0)
    volume = serializers.FloatField(required=False, allow_null=True)
    length = serializers.FloatField(required=False, allow_null=True)
    width = serializers.FloatField(required=False, allow_null=True)
    height = serializers.FloatField(required=False, allow_null=True)
    service_type = serializers.CharField(required=False, default='surface')
    invoice_value = serializers.FloatField(required=False, allow_null=True)
    mode = serializers.CharField(required=False, default='Prepaid')
    
    # Response fields
    vendor_rates = serializers.DictField(read_only=True)
    calculated_at = serializers.DateTimeField(read_only=True)


# ============================================
# BULK RATE UPLOAD SERIALIZER
# ============================================

class BulkRateUploadSerializer(serializers.Serializer):
    """Serializer for bulk rate upload"""
    
    vendor_name = serializers.CharField(required=True)
    rates_data = serializers.JSONField(required=True)
    replace_existing = serializers.BooleanField(default=False)
    
    def validate_rates_data(self, value):
        """Validate bulk rates data structure"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Rates data must be a dictionary")
        
        # Check for required structure
        for from_zone, to_zones in value.items():
            if not isinstance(to_zones, dict):
                raise serializers.ValidationError(f"Invalid structure for zone {from_zone}")
        
        return value


# ============================================
# BULK PINCODE UPLOAD SERIALIZER
# ============================================

class BulkPincodeUploadSerializer(serializers.Serializer):
    """Serializer for bulk pincode upload"""
    
    vendor_name = serializers.CharField(required=True)
    pincodes = serializers.ListField(required=True, child=serializers.DictField())
    replace_existing = serializers.BooleanField(default=False)
    
    def validate_pincodes(self, value):
        """Validate pincodes data structure"""
        for item in value:
            if 'pincode' not in item:
                raise serializers.ValidationError("Each pincode must have 'pincode' field")
            pincode_str = str(item['pincode']).strip()
            if len(pincode_str) != 6:
                raise serializers.ValidationError(f"Pincode {pincode_str} must be 6 digits")
            if not pincode_str.isdigit():
                raise serializers.ValidationError(f"Pincode {pincode_str} must contain only digits")
        return value


# ============================================
# VENDOR COMPARISON SERIALIZER
# ============================================

class VendorComparisonSerializer(serializers.Serializer):
    """Serializer for comparing rates across vendors"""
    
    origin_pincode = serializers.CharField(max_length=10)
    destination_pincode = serializers.CharField(max_length=10)
    weight = serializers.FloatField(min_value=0)
    volume = serializers.FloatField(required=False, allow_null=True)
    length = serializers.FloatField(required=False, allow_null=True)
    width = serializers.FloatField(required=False, allow_null=True)
    height = serializers.FloatField(required=False, allow_null=True)
    invoice_value = serializers.FloatField(required=False, allow_null=True)
    mode = serializers.CharField(required=False, default='Prepaid')
    
    # Response
    comparisons = serializers.ListField(read_only=True)
    best_vendor = serializers.CharField(read_only=True)
    best_cft_type = serializers.CharField(read_only=True)
    best_rate = serializers.FloatField(read_only=True)


# ============================================
# SIMPLE VENDOR RATE SERIALIZER (for dropdowns)
# ============================================

class SimpleVendorRateSerializer(serializers.ModelSerializer):
    """Simplified serializer for dropdown and quick views"""
    
    class Meta:
        model = VendorRate
        fields = ['id', 'vendor_name', 'is_active']


# ============================================
# VENDOR ODA STATUS SERIALIZER (UPDATED)
# ============================================

class VendorODAStatusSerializer(serializers.Serializer):
    """Serializer for ODA status check response"""
    
    success = serializers.BooleanField(default=True)
    pincode = serializers.CharField()
    vendor_name = serializers.CharField()
    is_oda = serializers.BooleanField()
    is_serviceable = serializers.BooleanField(default=True)
    oda_category = serializers.CharField(allow_blank=True, allow_null=True)
    oda_charge_per_kg = serializers.FloatField()
    oda_min_charge = serializers.FloatField()
    city = serializers.CharField(allow_blank=True)
    state = serializers.CharField(allow_blank=True)
    
    def to_representation(self, instance):
        """Custom representation"""
        data = super().to_representation(instance)
        # Ensure all fields are present
        if data.get('oda_category') is None:
            data['oda_category'] = ''
        return data


# ============================================
# PINCODE LOCATION SERIALIZER (UPDATED)
# ============================================

class PincodeLocationSerializer(serializers.Serializer):
    """Serializer for pincode location response"""
    
    success = serializers.BooleanField(default=True)
    pincode = serializers.CharField()
    city = serializers.CharField(allow_blank=True)
    state = serializers.CharField(allow_blank=True)
    country = serializers.CharField(allow_blank=True, required=False)
    block = serializers.CharField(allow_blank=True, required=False)
    source = serializers.CharField(required=False, default='api')


# ============================================
# VENDOR PINCODE STATS SERIALIZER (UPDATED)
# ============================================

class VendorPincodeStatsSerializer(serializers.Serializer):
    """Serializer for vendor pincode statistics"""
    
    success = serializers.BooleanField(default=True)
    vendor = serializers.CharField()
    total_pincodes = serializers.IntegerField()
    oda_pincodes = serializers.IntegerField()
    non_oda_pincodes = serializers.IntegerField()
    serviceable_pincodes = serializers.IntegerField()
    category_stats = serializers.DictField(required=False)
    
    def to_representation(self, data):
        """Custom representation with formatted output"""
        representation = super().to_representation(data)
        
        # Add summary message
        if representation.get('total_pincodes', 0) > 0:
            oda_percentage = (representation.get('oda_pincodes', 0) / representation.get('total_pincodes', 1)) * 100
            representation['oda_percentage'] = round(oda_percentage, 2)
        
        return representation


# ============================================
# SHIPSHOPY VENDOR RATE SERIALIZER (NEW)
# ============================================

class ShipshopyVendorRateSerializer(serializers.ModelSerializer):
    """Serializer specifically for SHIPSHOPY vendors"""
    
    vendor_display = serializers.CharField(source='get_vendor_name_display', read_only=True)
    divisor = serializers.SerializerMethodField(read_only=True)
    min_freight = serializers.SerializerMethodField(read_only=True)
    oda_details = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = VendorRate
        fields = [
            'id', 'vendor_name', 'vendor_display', 'rates',
            'charges', 'is_active', 'divisor', 'min_freight', 'oda_details'
        ]
    
    def get_divisor(self, obj):
        """Get divisor from charges"""
        charges = obj.charges or {}
        return charges.get('divisor', 5000)
    
    def get_min_freight(self, obj):
        """Get minimum freight from charges"""
        charges = obj.charges or {}
        return charges.get('min_freight', 350)
    
    def get_oda_details(self, obj):
        """Get ODA details from charges"""
        charges = obj.charges or {}
        return {
            'charge_per_kg': charges.get('oda_charge', 0),
            'min_charge': charges.get('oda_min_charge', 0)
        }


# ============================================
# BLUE DART RATE SERIALIZER (NEW)
# ============================================

class BlueDartRateSerializer(serializers.ModelSerializer):
    """Serializer for Blue Dart specific rates"""
    
    vendor_display = serializers.CharField(source='get_vendor_name_display', read_only=True)
    
    class Meta:
        model = VendorRate
        fields = [
            'id', 'vendor_name', 'vendor_display', 'rates',
            'charges', 'is_active'
        ]


# ============================================
# DELHIVERY B2B RATE SERIALIZER (NEW)
# ============================================

class DelhiveryB2BRateSerializer(serializers.ModelSerializer):
    """Serializer for Delhivery B2B specific rates"""
    
    vendor_display = serializers.CharField(source='get_vendor_name_display', read_only=True)
    
    class Meta:
        model = VendorRate
        fields = [
            'id', 'vendor_name', 'vendor_display', 'rates',
            'delhivery_6cft', 'delhivery_10cft', 'charges', 'is_active'
        ]


# ============================================
# SHIVANI VX RATE SERIALIZER (NEW)
# ============================================

class ShivaniVXRateSerializer(serializers.ModelSerializer):
    """Serializer for SHIVANI VX (V-XPRESS) specific rates"""
    
    vendor_display = serializers.CharField(source='get_vendor_name_display', read_only=True)
    oda_categories = serializers.SerializerMethodField(read_only=True)
    fsc_details = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = VendorRate
        fields = [
            'id', 'vendor_name', 'vendor_display', 'rates',
            'charges', 'is_active', 'oda_categories', 'fsc_details'
        ]
    
    def get_oda_categories(self, obj):
        """Get ODA categories from charges"""
        charges = obj.charges or {}
        return charges.get('oda_categories', {})
    
    def get_fsc_details(self, obj):
        """Get FSC details from charges"""
        charges = obj.charges or {}
        return {
            'fsc_percent': charges.get('fsc', '7%'),
            'base_diesel_price': charges.get('base_diesel_price', 90.54),
            'fsc_adjustment': charges.get('fsc_adjustment_percent', 2)
        }


# ============================================
# TRUCX DLH RATE SERIALIZER (NEW)
# ============================================

class TrucxDLHRateSerializer(serializers.ModelSerializer):
    """Serializer for TRUCX DLH variants (Lite, Dense, Cargo)"""
    
    vendor_display = serializers.CharField(source='get_vendor_name_display', read_only=True)
    variant_type = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = VendorRate
        fields = [
            'id', 'vendor_name', 'vendor_display', 'variant_type', 'rates',
            'charges', 'is_active'
        ]
    
    def get_variant_type(self, obj):
        """Determine TRUCX variant type"""
        vendor_name = obj.vendor_name
        if 'Lite' in vendor_name:
            return 'lite'
        elif 'Dense' in vendor_name:
            return 'dense'
        elif 'Cargo' in vendor_name:
            return 'cargo'
        return 'standard'


# ============================================
# PD LOGISTICS RATE SERIALIZER (NEW)
# ============================================

class PDLogisticsRateSerializer(serializers.ModelSerializer):
    """Serializer for PD LOGISTICS specific rates"""
    
    vendor_display = serializers.CharField(source='get_vendor_name_display', read_only=True)
    cft_rates_available = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = VendorRate
        fields = [
            'id', 'vendor_name', 'vendor_display', 'rates',
            'delhivery_6cft', 'delhivery_10cft', 'charges', 
            'is_active', 'cft_rates_available'
        ]
    
    def get_cft_rates_available(self, obj):
        """Check if CFT rates are available"""
        has_6cft = bool(obj.delhivery_6cft and any(obj.delhivery_6cft.values()))
        has_10cft = bool(obj.delhivery_10cft and any(obj.delhivery_10cft.values()))
        return {
            '6cft': has_6cft,
            '10cft': has_10cft
        }


# ============================================
# ALL VENDORS LIST SERIALIZER (NEW)
# ============================================

class AllVendorsListSerializer(serializers.ModelSerializer):
    """Serializer for listing all vendors with their type"""
    
    vendor_type = serializers.SerializerMethodField(read_only=True)
    has_cft_support = serializers.SerializerMethodField(read_only=True)
    has_oda_support = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = VendorRate
        fields = [
            'id', 'vendor_name', 'is_active', 'vendor_type',
            'has_cft_support', 'has_oda_support'
        ]
    
    def get_vendor_type(self, obj):
        """Get vendor type classification"""
        vendor_name = obj.vendor_name
        
        if 'SHIVANI VX' in vendor_name:
            return 'V-XPRESS'
        elif 'TRUCX' in vendor_name:
            return 'TRUCX DLH'
        elif 'SHIPSHOPY BLUE DART' in vendor_name:
            return 'BLUE DART'
        elif 'SHIPSHOPY DELIVERY' in vendor_name:
            return 'DELHIVERY B2B'
        elif vendor_name == 'DELHIVERY':
            return 'DELHIVERY'
        elif vendor_name == 'PD LOGISTICS':
            return 'PD LOGISTICS'
        elif vendor_name == 'RIVIGO':
            return 'RIVIGO'
        elif vendor_name == 'GATI':
            return 'GATI'
        elif vendor_name == 'VXPRESS':
            return 'V-XPRESS'
        else:
            return 'STANDARD'
    
    def get_has_cft_support(self, obj):
        """Check if vendor has CFT support"""
        vendor_name = obj.vendor_name
        cft_vendors = ['DELHIVERY', 'RIVIGO', 'PD LOGISTICS', 'TRUCX DLH Lite', 'TRUCX DLH Dense', 'TRUCX DLH Cargo']
        return vendor_name in cft_vendors
    
    def get_has_oda_support(self, obj):
        """Check if vendor has ODA support"""
        vendor_name = obj.vendor_name
        oda_vendors = ['VXPRESS', 'PD LOGISTICS', 'SHIPSHOPY BLUE DART', 'SHIPSHOPY DELIVERY']
        return vendor_name in oda_vendors