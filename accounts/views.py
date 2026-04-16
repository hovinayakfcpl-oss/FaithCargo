# accounts/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import status
from .serializers import (
    StaffLoginSerializer, ClientLoginSerializer, UserSerializer, 
    CreateUserSerializer, CreateClientSerializer, ClientDetailsSerializer,
    ClientRateMatrixSerializer, ClientRatePolicySerializer, 
    UpdateClientRatesSerializer, ChangePasswordSerializer,
    ForgotPasswordSerializer, ResetPasswordSerializer
)
from .models import CustomUser, ClientRateMatrix, ClientRatePolicy, ClientProfile, ClientSession
import uuid
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


# =====================================================
# 🔹 SIGNUP
# =====================================================
@api_view(['POST'])
@permission_classes([AllowAny])
def signup(request):
    username = request.data.get("username")
    password = request.data.get("password")
    email = request.data.get("email")

    if not username or not password:
        return Response({
            "status": "error",
            "message": "Username and password required"
        }, status=400)

    if User.objects.filter(username=username).exists():
        return Response({
            "status": "error",
            "message": "Username already exists"
        }, status=400)

    user = User.objects.create_user(
        username=username,
        password=password,
        email=email
    )

    return Response({
        "status": "success",
        "message": "User created successfully",
        "username": user.username
    }, status=201)


# =====================================================
# 🔥 STAFF LOGIN (JWT - FINAL)
# =====================================================
@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    username = request.data.get("username")
    password = request.data.get("password")

    print("STAFF LOGIN - Username:", username)

    if not username or not password:
        return Response({
            "status": "error",
            "message": "Username & password required"
        }, status=400)

    user = authenticate(username=username, password=password)

    if user is not None:
        # 🔥 CRITICAL: Block clients from staff login
        if hasattr(user, 'role') and user.role == 'Client':
            return Response({
                "status": "error",
                "message": "❌ This is a CLIENT account. Please use 'Client Login' tab.",
                "use_client_login": True
            }, status=403)

        refresh = RefreshToken.for_user(user)

        modules = {
            'fcpl_rate': getattr(user, 'fcpl_rate', False),
            'pickup': getattr(user, 'pickup', False),
            'vendor_manage': getattr(user, 'vendor_manage', False),
            'vendor_rates': getattr(user, 'vendor_rates', False),
            'rate_update': getattr(user, 'rate_update', False),
            'pincode': getattr(user, 'pincode', False),
            'user_management': getattr(user, 'user_management', False),
            'ba_b2b': getattr(user, 'ba_b2b', False),
            'create_order': getattr(user, 'create_order', False),
            'shipment_details': getattr(user, 'shipment_details', False),
        }

        return Response({
            "status": "success",
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "username": user.username,
            "user_id": user.id,
            "email": user.email or "",
            "phone": getattr(user, 'phone', ''),
            "company": getattr(user, 'company', ''),
            "address": getattr(user, 'address', ''),
            "gstin": getattr(user, 'gstin', ''),
            "is_superuser": user.is_superuser,
            "is_staff": user.is_staff,
            "role": getattr(user, 'role', 'User'),
            "modules": modules
        }, status=200)

    return Response({
        "status": "error",
        "message": "Invalid credentials"
    }, status=400)


# =====================================================
# 🆕 CLIENT LOGIN - FIXED
# =====================================================
@api_view(['POST'])
@permission_classes([AllowAny])
def client_login(request):
    print("=== CLIENT LOGIN REQUEST ===")
    print("Request data:", request.data)
    
    client_id = request.data.get("clientId")
    password = request.data.get("password")
    
    if not client_id or not password:
        return Response({
            "success": False,
            "error": "Client ID and password required"
        }, status=400)
    
    try:
        # Find client by client_id (case insensitive)
        user = CustomUser.objects.get(client_id__iexact=client_id)
        
        print(f"Found user: {user.username}, Role: {user.role}")
        
        # 🔥 CRITICAL: Check if user is actually a client
        if user.role != 'Client':
            return Response({
                "success": False,
                "error": "This account is not a client account. Please use Staff Login."
            }, status=403)
        
        # Check password
        if not user.check_password(password):
            return Response({
                "success": False,
                "error": "Invalid Client ID or Password"
            }, status=400)
        
        # Check if active
        if not user.is_active or not user.is_client_active:
            return Response({
                "success": False,
                "error": "Your account is inactive. Please contact admin."
            }, status=403)
        
        # Create session token
        token = str(uuid.uuid4())
        ClientSession.objects.create(
            client=user,
            token=token,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        print(f"✅ Client login successful: {client_id}")
        
        return Response({
            "success": True,
            "token": token,
            "user": {
                "clientId": user.client_id,
                "username": user.username,
                "companyName": user.company or user.username,
                "email": user.email or "",
                "phone": user.phone or "",
                "address": user.address or "",
                "gstin": user.gstin or ""
            },
            "modules": {
                "ba_b2b": getattr(user, 'ba_b2b', True),
                "create_order": getattr(user, 'create_order', True),
                "shipment_details": getattr(user, 'shipment_details', True)
            }
        }, status=200)
        
    except CustomUser.DoesNotExist:
        print(f"❌ Client not found: {client_id}")
        return Response({
            "success": False,
            "error": f"Client ID '{client_id}' not found"
        }, status=404)
    except Exception as e:
        print(f"❌ Client login error: {str(e)}")
        return Response({
            "success": False,
            "error": f"Login error: {str(e)}"
        }, status=500)


# =====================================================
# 🆕 GET CLIENT DETAILS
# =====================================================
@api_view(['GET'])
def get_client_details(request, client_id):
    try:
        user = CustomUser.objects.get(client_id__iexact=client_id, role='Client')
    except CustomUser.DoesNotExist:
        return Response({
            "success": False,
            "error": "Client not found"
        }, status=404)
    
    serializer = ClientDetailsSerializer(user)
    
    return Response({
        "success": True,
        "user": serializer.data
    }, status=200)


# =====================================================
# 🆕 GET CLIENT RATES
# =====================================================
@api_view(['GET'])
def get_client_rates(request, client_id):
    try:
        user = CustomUser.objects.get(client_id__iexact=client_id, role='Client')
    except CustomUser.DoesNotExist:
        return Response({
            "success": False,
            "error": "Client not found"
        }, status=404)
    
    zone_rates = ClientRateMatrix.objects.filter(client=user, is_active=True)
    zone_rates_serializer = ClientRateMatrixSerializer(zone_rates, many=True)
    
    rate_policy = ClientRatePolicy.objects.filter(client=user).first()
    policy_serializer = ClientRatePolicySerializer(rate_policy) if rate_policy else None
    
    return Response({
        "success": True,
        "zone_rates": zone_rates_serializer.data,
        "policy": policy_serializer.data if policy_serializer else None
    }, status=200)


# =====================================================
# 🆕 UPDATE CLIENT RATES
# =====================================================
@api_view(['PUT', 'POST'])
def update_client_rates(request, client_id):
    if not request.user.is_superuser and not request.user.user_management:
        return Response({
            "success": False,
            "error": "Permission denied. Admin access required."
        }, status=403)
    
    try:
        user = CustomUser.objects.get(client_id__iexact=client_id, role='Client')
    except CustomUser.DoesNotExist:
        return Response({
            "success": False,
            "error": "Client not found"
        }, status=404)
    
    serializer = UpdateClientRatesSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({
            "success": False,
            "error": serializer.errors
        }, status=400)
    
    data = serializer.validated_data
    
    if 'zone_rates' in data:
        ClientRateMatrix.objects.filter(client=user).delete()
        
        for rate in data['zone_rates']:
            ClientRateMatrix.objects.create(
                client=user,
                from_zone=rate['from_zone'],
                to_zone=rate['to_zone'],
                rate=rate['rate'],
                updated_by=request.user
            )
    
    if 'policy' in data:
        policy, created = ClientRatePolicy.objects.get_or_create(client=user)
        policy.is_custom = True
        policy.updated_by = request.user
        
        for key, value in data['policy'].items():
            if hasattr(policy, key):
                setattr(policy, key, value)
        
        policy.save()
    
    return Response({
        "success": True,
        "message": f"Rates updated for {user.client_id}"
    }, status=200)


# =====================================================
# 🆕 GET ALL CLIENTS
# =====================================================
@api_view(['GET'])
def get_all_clients(request):
    if not request.user.is_superuser and not request.user.user_management:
        return Response({
            "success": False,
            "error": "Permission denied. Admin access required."
        }, status=403)
    
    clients = CustomUser.objects.filter(role='Client')
    
    client_data = []
    for client in clients:
        rate_policy = ClientRatePolicy.objects.filter(client=client).first()
        profile = ClientProfile.objects.filter(client=client).first()
        
        client_data.append({
            "id": client.id,
            "clientId": client.client_id,
            "companyName": client.company,
            "email": client.email,
            "phone": client.phone,
            "address": client.address,
            "gstin": client.gstin,
            "status": "active" if client.is_client_active else "inactive",
            "totalOrders": profile.total_orders if profile else 0,
            "totalFreight": float(profile.total_freight) if profile else 0,
            "hasCustomRates": rate_policy.is_custom if rate_policy else False,
            "dateJoined": client.date_joined
        })
    
    return Response(client_data, status=200)


# =====================================================
# 🆕 CREATE CLIENT
# =====================================================
@api_view(['POST'])
def create_client(request):
    if not request.user.is_superuser and not request.user.user_management:
        return Response({
            "success": False,
            "error": "Permission denied. Admin access required."
        }, status=403)
    
    serializer = CreateClientSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({
            "success": False,
            "error": serializer.errors
        }, status=400)
    
    user = serializer.save()
    
    return Response({
        "success": True,
        "message": f"Client {user.client_id} created successfully",
        "client": {
            "clientId": user.client_id,
            "companyName": user.company,
            "email": user.email,
            "phone": user.phone
        }
    }, status=201)


# =====================================================
# 🆕 UPDATE CLIENT STATUS
# =====================================================
@api_view(['PUT'])
def update_client_status(request, client_id):
    if not request.user.is_superuser and not request.user.user_management:
        return Response({
            "success": False,
            "error": "Permission denied. Admin access required."
        }, status=403)
    
    try:
        user = CustomUser.objects.get(client_id__iexact=client_id, role='Client')
    except CustomUser.DoesNotExist:
        return Response({
            "success": False,
            "error": "Client not found"
        }, status=404)
    
    is_active = request.data.get('is_active', False)
    user.is_client_active = is_active
    user.is_active = is_active
    user.save()
    
    return Response({
        "success": True,
        "message": f"Client {user.client_id} status updated to {'Active' if is_active else 'Inactive'}"
    }, status=200)


# =====================================================
# 🆕 DELETE CLIENT
# =====================================================
@api_view(['DELETE'])
def delete_client(request, client_id):
    if not request.user.is_superuser and not request.user.user_management:
        return Response({
            "success": False,
            "error": "Permission denied. Admin access required."
        }, status=403)
    
    try:
        user = CustomUser.objects.get(client_id__iexact=client_id, role='Client')
    except CustomUser.DoesNotExist:
        return Response({
            "success": False,
            "error": "Client not found"
        }, status=404)
    
    user.is_active = False
    user.is_client_active = False
    user.save()
    
    return Response({
        "success": True,
        "message": f"Client {user.client_id} has been deactivated"
    }, status=200)


# =====================================================
# 🆕 GET CLIENT ORDER SUMMARY
# =====================================================
@api_view(['GET'])
def get_client_order_summary(request, client_id):
    try:
        user = CustomUser.objects.get(client_id__iexact=client_id, role='Client')
    except CustomUser.DoesNotExist:
        return Response({
            "success": False,
            "error": "Client not found"
        }, status=404)
    
    profile = ClientProfile.objects.filter(client=user).first()
    
    return Response({
        "success": True,
        "total_orders": profile.total_orders if profile else 0,
        "total_shipments": profile.total_shipments if profile else 0,
        "total_freight": float(profile.total_freight) if profile else 0,
        "credit_limit": float(profile.credit_limit) if profile else 0,
        "credit_used": float(profile.current_credit_used) if profile else 0
    }, status=200)


# =====================================================
# 🔹 FORGOT PASSWORD
# =====================================================
@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    serializer = ForgotPasswordSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({"error": serializer.errors}, status=400)
    
    email = serializer.validated_data['email']
    user = User.objects.get(email=email)
    
    token = default_token_generator.make_token(user)
    reset_link = f"https://faithcargo.vercel.app/reset-password/{user.pk}/{token}"
    
    subject = "Faith Cargo - Password Reset"
    
    html_content = render_to_string(
        "accounts/password_reset_email.html",
        {
            "username": user.username,
            "reset_link": reset_link,
        }
    )
    
    msg = EmailMultiAlternatives(
        subject,
        f"Reset link: {reset_link}",
        "no-reply@faithcargo.com",
        [email]
    )
    
    msg.attach_alternative(html_content, "text/html")
    msg.send()
    
    return Response({"message": "Password reset link sent"}, status=200)


# =====================================================
# 🔹 RESET PASSWORD
# =====================================================
@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request, uid, token):
    serializer = ResetPasswordSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({"error": serializer.errors}, status=400)
    
    try:
        user = User.objects.get(pk=uid)
        
        if default_token_generator.check_token(user, token):
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response({"message": "Password reset successful"}, status=200)
        
        return Response({"error": "Invalid or expired token"}, status=400)
    
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)


# =====================================================
# 🔹 CHANGE PASSWORD
# =====================================================
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    serializer = ChangePasswordSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({"error": serializer.errors}, status=400)
    
    user = request.user
    
    if not user.check_password(serializer.validated_data['old_password']):
        return Response({"error": "Old password is incorrect"}, status=400)
    
    user.set_password(serializer.validated_data['new_password'])
    user.save()
    
    return Response({"message": "Password changed successfully"}, status=200)


# =====================================================
# 🔹 LOGOUT
# =====================================================
@api_view(['POST'])
def logout(request):
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    ClientSession.objects.filter(token=token).update(is_active=False)
    return Response({"message": "Logged out successfully"}, status=200)


# =====================================================
# 🔹 GET CURRENT USER
# =====================================================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    user = request.user
    
    modules = {
        'fcpl_rate': getattr(user, 'fcpl_rate', False),
        'pickup': getattr(user, 'pickup', False),
        'vendor_manage': getattr(user, 'vendor_manage', False),
        'vendor_rates': getattr(user, 'vendor_rates', False),
        'rate_update': getattr(user, 'rate_update', False),
        'pincode': getattr(user, 'pincode', False),
        'user_management': getattr(user, 'user_management', False),
        'ba_b2b': getattr(user, 'ba_b2b', False),
        'create_order': getattr(user, 'create_order', False),
        'shipment_details': getattr(user, 'shipment_details', False),
    }
    
    return Response({
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "phone": getattr(user, 'phone', ''),
        "company": getattr(user, 'company', ''),
        "address": getattr(user, 'address', ''),
        "gstin": getattr(user, 'gstin', ''),
        "role": getattr(user, 'role', 'User'),
        "client_id": getattr(user, 'client_id', None),
        "modules": modules
    }, status=200)


# =====================================================
# 🔹 GET ALL CLIENTS PUBLIC
# =====================================================
@api_view(['GET'])
@permission_classes([AllowAny])
def get_all_clients_public(request):
    try:
        clients = CustomUser.objects.filter(role='Client', is_client_active=True, is_active=True)
        
        client_data = []
        for client in clients:
            client_data.append({
                "id": client.id,
                "clientId": client.client_id,
                "companyName": client.company or client.username,
                "email": client.email or "",
                "phone": client.phone or "",
                "status": "active" if client.is_client_active else "inactive"
            })
        
        return Response(client_data, status=200)
    except Exception as e:
        print(f"Error in get_all_clients_public: {str(e)}")
        return Response({"error": str(e)}, status=500)
    
# =====================================================
# 🧪 TEST CLIENT LOGIN ENDPOINT (Debugging)
# =====================================================
@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def test_client_login(request):
    """Debug endpoint to test if accounts URLs are working"""
    print("=== TEST ENDPOINT HIT ===")
    print("Method:", request.method)
    print("Data:", request.data if request.method == 'POST' else 'GET request')
    
    return Response({
        "success": True,
        "message": "Test endpoint is working! Accounts URLs are properly configured.",
        "method": request.method,
        "available_endpoints": [
            "/api/accounts/client-login/",
            "/api/accounts/login/",
            "/api/accounts/signup/",
            "/api/user/admin-login/",
            "/api/user/login/"
        ]
    }, status=200)