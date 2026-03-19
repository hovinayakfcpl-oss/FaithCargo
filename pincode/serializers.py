from rest_framework import serializers
from .models import Pincode

class PincodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pincode
        fields = ['id', 'code']
