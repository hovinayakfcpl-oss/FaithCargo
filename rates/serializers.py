from rest_framework import serializers
from decimal import Decimal, InvalidOperation
from .models import RateCard
from vendors.models import   VendorRate

# 🔹 RateCard Serializer (FCPL & B2B)
class RateCardSerializer(serializers.ModelSerializer):
    class Meta:
        model = RateCard
        fields = [
            "id",
            "rate_type",
            "zone",
            "payment_mode",
            "per_kg_rate",
            "docket_charge",
            "fuel_charge",
            "oda_charge",
            "insurance_percent",
            "appointment_charge",
            "weight_min",
            "weight_max",
        ]


# 🔹 VendorRate Serializer
class VendorRateSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source="vendor.name", read_only=True)

    class Meta:
        model = VendorRate
        fields = [
            "id",
            "vendor",
            "vendor_name",
            "zone",
            "rate",
            "docket_charge",
            "fuel_charge",
            "min_weight",
            "oda_charge",
            "insurance_percent",
            "appointment_charge",
        ]


# 🔹 Dimension Serializer (for incoming payload)
class DimensionSerializer(serializers.Serializer):
    qty = serializers.CharField()
    length = serializers.CharField()
    width = serializers.CharField()
    height = serializers.CharField()

    def to_internal_value(self, data):
        internal = super().to_internal_value(data)
        try:
            internal['qty'] = Decimal(str(internal['qty']))
            internal['length'] = Decimal(str(internal['length']))
            internal['width'] = Decimal(str(internal['width']))
            internal['height'] = Decimal(str(internal['height']))
        except (InvalidOperation, ValueError):
            raise serializers.ValidationError("Invalid dimension values")
        return internal


# 🔹 Rate Calculation Serializer (for /api/rates/b2b/calculate/)
class RateCalculationSerializer(serializers.Serializer):
    origin = serializers.CharField()
    destination = serializers.CharField()
    weight = serializers.CharField()
    invoice_value = serializers.CharField(required=False, default="0")
    dimensions = DimensionSerializer(many=True)
    insurance = serializers.BooleanField(default=False)
    appointment = serializers.BooleanField(default=False)
    mode = serializers.CharField(default="Prepaid")

    def to_internal_value(self, data):
        internal = super().to_internal_value(data)
        try:
            internal['weight'] = Decimal(str(internal['weight']))
            internal['invoice_value'] = Decimal(str(internal['invoice_value']))
        except (InvalidOperation, ValueError):
            raise serializers.ValidationError("Invalid numeric values")
        return internal
