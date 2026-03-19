from rest_framework import serializers
from .models import PickupRequest

class PickupRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = PickupRequest
        fields = '__all__'
