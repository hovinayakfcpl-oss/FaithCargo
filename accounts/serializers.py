# accounts/serializers.py
from rest_framework import serializers
from .models import CustomUser, ClientProfile, ClientRateMatrix, ClientRatePolicy, ClientOrderSummary, ClientSession
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate
import uuid


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['role'] = self.user.role
        data['user_id'] = self.user.id
        data['username'] = self.user.username
        return data


# ============================================
# STAFF LOGIN SERIALIZER
# ============================================
class StaffLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()
    
    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        
        user = authenticate(username=username, password=password)
        
        if not user:
            raise serializers.ValidationError("Invalid username or password")
        
        # 🔥 FIX: Client cannot login via Staff login
        if user.role == 'Client':
            raise serializers.ValidationError("❌ This is a Client account. Please use Client Login portal.")
        
        attrs['user'] = user
        return attrs


# ============================================
# CLIENT LOGIN SERIALIZER - UPDATED
# ============================================
class ClientLoginSerializer(serializers.Serializer):
    client_id = serializers.CharField()
    password = serializers.CharField()
    
    def validate(self, attrs):
        client_id = attrs.get('client_id')
        password = attrs.get('password')
        
        # 🔥 FIX: Case-insensitive search for client_id
        try:
            user = CustomUser.objects.get(client_id__iexact=client_id)
        except CustomUser.DoesNotExist:
            # Try by username as fallback
            try:
                user = CustomUser.objects.get(username__iexact=client_id, role='Client')
            except CustomUser.DoesNotExist:
                raise serializers.ValidationError("Invalid Client ID or Password")
        
        # 🔥 CRITICAL: Ensure user is Client
        if user.role != 'Client':
            raise serializers.ValidationError("This account is not a Client account. Please use Staff Login.")
        
        # Check if client is active
        if not user.is_client_active:
            raise serializers.ValidationError("Your account is inactive. Please contact admin.")
        
        # Check password
        if not user.check_password(password):
            raise serializers.ValidationError("Invalid Client ID or Password")
        
        # Check if user is active
        if not user.is_active:
            raise serializers.ValidationError("Your account is disabled. Please contact admin.")
        
        attrs['user'] = user
        return attrs


# ============================================
# USER SERIALIZER (for user management)
# ============================================
class UserSerializer(serializers.ModelSerializer):
    modules = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'role', 'phone', 'company', 'address', 'gstin',
            'client_id', 'is_client_active', 'is_active', 'date_joined', 'last_login',
            'fcpl_rate', 'pickup', 'vendor_manage', 'vendor_rates', 'rate_update',
            'pincode', 'user_management', 'ba_b2b', 'create_order', 'shipment_details',
            'view_reports', 'generate_invoice', 'modules'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login']
    
    def get_modules(self, obj):
        return obj.get_modules_dict()
    
    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = CustomUser(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        return user
    
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


# ============================================
# CREATE USER SERIALIZER (for admin)
# ============================================
class CreateUserSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    company = serializers.CharField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    gstin = serializers.CharField(required=False, allow_blank=True)
    role = serializers.CharField(default='User')
    
    # Module Permissions
    fcpl_rate = serializers.BooleanField(default=False)
    pickup = serializers.BooleanField(default=False)
    vendor_manage = serializers.BooleanField(default=False)
    vendor_rates = serializers.BooleanField(default=False)
    rate_update = serializers.BooleanField(default=False)
    pincode = serializers.BooleanField(default=False)
    user_management = serializers.BooleanField(default=False)
    ba_b2b = serializers.BooleanField(default=False)
    create_order = serializers.BooleanField(default=False)
    shipment_details = serializers.BooleanField(default=False)
    
    def validate_username(self, value):
        if CustomUser.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already exists")
        return value
    
    def create(self, validated_data):
        user = CustomUser.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            email=validated_data.get('email', ''),
            phone=validated_data.get('phone', ''),
            company=validated_data.get('company', ''),
            address=validated_data.get('address', ''),
            gstin=validated_data.get('gstin', ''),
            role=validated_data.get('role', 'User'),
            fcpl_rate=validated_data.get('fcpl_rate', False),
            pickup=validated_data.get('pickup', False),
            vendor_manage=validated_data.get('vendor_manage', False),
            vendor_rates=validated_data.get('vendor_rates', False),
            rate_update=validated_data.get('rate_update', False),
            pincode=validated_data.get('pincode', False),
            user_management=validated_data.get('user_management', False),
            ba_b2b=validated_data.get('ba_b2b', False),
            create_order=validated_data.get('create_order', False),
            shipment_details=validated_data.get('shipment_details', False),
        )
        return user


# ============================================
# CREATE CLIENT SERIALIZER - UPDATED
# ============================================
class CreateClientSerializer(serializers.Serializer):
    client_id = serializers.CharField()
    company_name = serializers.CharField()
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    phone = serializers.CharField()
    gstin = serializers.CharField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    
    def validate_client_id(self, value):
        value = value.upper()
        if CustomUser.objects.filter(client_id=value).exists():
            raise serializers.ValidationError("Client ID already exists")
        # Also check username doesn't conflict
        if CustomUser.objects.filter(username=value.lower()).exists():
            raise serializers.ValidationError("Username with this ID already exists")
        return value
    
    def validate_email(self, value):
        if CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already exists")
        return value
    
    def validate_phone(self, value):
        if CustomUser.objects.filter(phone=value).exists():
            raise serializers.ValidationError("Phone number already exists")
        return value
    
    def create(self, validated_data):
        # 🔥 Generate unique username from client_id
        username = validated_data['client_id'].lower()
        
        user = CustomUser.objects.create_user(
            username=username,
            password=validated_data['password'],
            email=validated_data['email'],
            phone=validated_data['phone'],
            company=validated_data['company_name'],
            address=validated_data.get('address', ''),
            gstin=validated_data.get('gstin', ''),
            role='Client',  # 🔥 CRITICAL: Set role to Client
            client_id=validated_data['client_id'].upper(),
            is_client_active=True,
            is_active=True,  # 🔥 Ensure account is active
            # Default module permissions for clients
            ba_b2b=True,
            create_order=True,
            shipment_details=True,
            fcpl_rate=False,
            pickup=False,
            vendor_manage=False,
            vendor_rates=False,
            rate_update=False,
            pincode=False,
            user_management=False,
        )
        
        # Create default client profile
        ClientProfile.objects.get_or_create(client=user)
        
        # Create default client rate policy
        ClientRatePolicy.objects.get_or_create(client=user, defaults={'is_custom': False})
        
        return user


# ============================================
# CLIENT PROFILE SERIALIZER
# ============================================
class ClientProfileSerializer(serializers.ModelSerializer):
    client_id = serializers.CharField(source='client.client_id', read_only=True)
    company_name = serializers.CharField(source='client.company', read_only=True)
    email = serializers.CharField(source='client.email', read_only=True)
    phone = serializers.CharField(source='client.phone', read_only=True)
    
    class Meta:
        model = ClientProfile
        fields = [
            'client_id', 'company_name', 'email', 'phone',
            'business_type', 'website', 'pan_number',
            'primary_contact_name', 'primary_contact_designation',
            'secondary_contact_name', 'secondary_contact_phone',
            'preferred_payment_mode', 'credit_limit', 'current_credit_used',
            'total_orders', 'total_shipments', 'total_freight',
            'registration_date', 'available_credit'
        ]
        read_only_fields = ['registration_date', 'available_credit']


# ============================================
# CLIENT RATE MATRIX SERIALIZER
# ============================================
class ClientRateMatrixSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientRateMatrix
        fields = ['id', 'from_zone', 'to_zone', 'rate', 'surface_rate', 'express_rate', 'air_rate', 'rail_rate', 'is_active']
        read_only_fields = ['id']


# ============================================
# CLIENT RATE POLICY SERIALIZER
# ============================================
class ClientRatePolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientRatePolicy
        fields = [
            'surface_rate_per_kg', 'express_rate_per_kg', 'air_rate_per_kg', 'rail_rate_per_kg',
            'min_freight', 'docket_charge', 'fuel_percent', 'fov_charge', 'oda_charge',
            'cod_charge', 'cod_percent', 'fragile_charge', 'appointment_charge',
            'handling_charge', 'insurance_percent', 'express_extra', 'gst_percent', 'cft',
            'is_custom'
        ]


# ============================================
# CLIENT DETAILS SERIALIZER (Combined)
# ============================================
class ClientDetailsSerializer(serializers.ModelSerializer):
    profile = ClientProfileSerializer(source='client_profile', read_only=True)
    rate_policy = ClientRatePolicySerializer(source='rate_policy', read_only=True)
    
    class Meta:
        model = CustomUser
        fields = [
            'id', 'client_id', 'username', 'email', 'phone', 'company', 'address', 'gstin',
            'is_client_active', 'date_joined', 'last_login', 'profile', 'rate_policy'
        ]


# ============================================
# CLIENT RATES RESPONSE SERIALIZER
# ============================================
class ClientRatesResponseSerializer(serializers.Serializer):
    zone_rates = ClientRateMatrixSerializer(many=True)
    policy = ClientRatePolicySerializer()
    
    def to_representation(self, instance):
        client = instance.get('client')
        zone_rates = instance.get('zone_rates', [])
        policy = instance.get('policy')
        
        return {
            'zone_rates': ClientRateMatrixSerializer(zone_rates, many=True).data,
            'policy': ClientRatePolicySerializer(policy).data if policy else None
        }


# ============================================
# CLIENT ORDER SUMMARY SERIALIZER
# ============================================
class ClientOrderSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientOrderSummary
        fields = ['year', 'month', 'total_orders', 'total_shipments', 'total_freight', 'total_invoice_value']


# ============================================
# UPDATE CLIENT RATES SERIALIZER
# ============================================
class UpdateClientRatesSerializer(serializers.Serializer):
    zone_rates = serializers.ListField(child=serializers.DictField(), required=False)
    policy = serializers.DictField(required=False)
    
    def validate_zone_rates(self, value):
        for rate in value:
            if 'from_zone' not in rate or 'to_zone' not in rate or 'rate' not in rate:
                raise serializers.ValidationError("Each zone rate must have from_zone, to_zone, and rate")
        return value


# ============================================
# CLIENT SESSION SERIALIZER
# ============================================
class ClientSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientSession
        fields = ['id', 'login_time', 'last_activity', 'ip_address', 'is_active']


# ============================================
# CHANGE PASSWORD SERIALIZER
# ============================================
class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField()
    new_password = serializers.CharField(min_length=6)
    confirm_password = serializers.CharField()
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError("New passwords do not match")
        return attrs


# ============================================
# FORGOT PASSWORD SERIALIZER
# ============================================
class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    
    def validate_email(self, value):
        if not CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError("No user found with this email")
        return value


# ============================================
# RESET PASSWORD SERIALIZER
# ============================================
class ResetPasswordSerializer(serializers.Serializer):
    token = serializers.CharField()
    new_password = serializers.CharField(min_length=6)
    confirm_password = serializers.CharField()
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError("Passwords do not match")
        return attrs