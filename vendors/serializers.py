from rest_framework import serializers
from .models import Vendor, VendorRate, RateHistory, ZoneMaster, B2BRate, VendorServiceRate


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
# VENDOR RATE SERIALIZER
# ============================================

class VendorRateSerializer(serializers.ModelSerializer):
    """Serializer for VendorRate model - includes rates and charges"""
    
    vendor_display = serializers.CharField(source='get_vendor_name_display', read_only=True)
    
    class Meta:
        model = VendorRate
        fields = [
            'id', 'vendor_name', 'vendor_display', 'rates', 
            'delhivery_6cft', 'delhivery_10cft', 'charges',
            'is_active', 'created_at', 'updated_at', 'updated_by'
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
# VENDOR COMPARISON SERIALIZER
# ============================================

class VendorComparisonSerializer(serializers.Serializer):
    """Serializer for comparing rates across vendors"""
    
    origin_pincode = serializers.CharField(max_length=10)
    destination_pincode = serializers.CharField(max_length=10)
    weight = serializers.FloatField(min_value=0)
    volume = serializers.FloatField(required=False, allow_null=True)
    
    # Response
    comparisons = serializers.ListField(read_only=True)
    best_vendor = serializers.CharField(read_only=True)
    best_rate = serializers.FloatField(read_only=True)


# ============================================
# SIMPLE VENDOR RATE SERIALIZER (for dropdowns)
# ============================================

class SimpleVendorRateSerializer(serializers.ModelSerializer):
    """Simplified serializer for dropdown and quick views"""
    
    class Meta:
        model = VendorRate
        fields = ['id', 'vendor_name', 'is_active']