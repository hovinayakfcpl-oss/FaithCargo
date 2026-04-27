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
# VENDOR RATE SERIALIZER (UPDATED)
# ============================================

class VendorRateSerializer(serializers.ModelSerializer):
    """Serializer for VendorRate model - includes rates and charges"""
    
    vendor_display = serializers.CharField(source='get_vendor_name_display', read_only=True)
    pincodes = VendorPincodeSerializer(many=True, read_only=True)  # ✅ Fixed: changed from 'vendorpincode_set' to 'pincodes'
    
    class Meta:
        model = VendorRate
        fields = [
            'id', 'vendor_name', 'vendor_display', 'rates', 
            'delhivery_6cft', 'delhivery_10cft', 'charges',
            'is_active', 'created_at', 'updated_at', 'updated_by', 'pincodes'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_rates(self, value):
        """Validate rates structure"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Rates must be a dictionary")
        return value
    
    def validate_delhivery_6cft(self, value):
        """Validate 6CFT rates for Delhivery"""
        if value and not isinstance(value, dict):
            raise serializers.ValidationError("6CFT rates must be a dictionary")
        return value
    
    def validate_delhivery_10cft(self, value):
        """Validate 10CFT rates for Delhivery"""
        if value and not isinstance(value, dict):
            raise serializers.ValidationError("10CFT rates must be a dictionary")
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
    
    class Meta:
        model = ZoneMaster
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


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
# VENDOR ODA STATUS SERIALIZER
# ============================================

class VendorODAStatusSerializer(serializers.Serializer):
    """Serializer for ODA status check response"""
    
    pincode = serializers.CharField()
    vendor_name = serializers.CharField()
    is_oda = serializers.BooleanField()
    oda_category = serializers.CharField(allow_blank=True, allow_null=True)
    oda_charge_per_kg = serializers.FloatField()
    oda_min_charge = serializers.FloatField()
    city = serializers.CharField(allow_blank=True)
    state = serializers.CharField(allow_blank=True)
    success = serializers.BooleanField(default=True)


# ============================================
# PINCODE LOCATION SERIALIZER
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
# VENDOR PINCODE STATS SERIALIZER (NEW)
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