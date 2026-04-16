# usermanagement/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.hashers import make_password, check_password
from django.db.models import Sum, Count, Q
from datetime import datetime, timedelta
from accounts.models import CustomUser, ClientProfile, ClientRateMatrix, ClientRatePolicy, ClientSession, ClientOrderSummary
from django.core.exceptions import ObjectDoesNotExist
import logging
import uuid

logger = logging.getLogger(__name__)

# Try to import Shipment models
try:
    from shipments.models import Order
    SHIPMENT_MODELS_AVAILABLE = True
except ImportError:
    SHIPMENT_MODELS_AVAILABLE = False
    logger.warning("Shipment models not available.")


# ============================================
# 🔐 USER AUTHENTICATION & MANAGEMENT
# ============================================

@api_view(['GET'])
def test_api(request):
    return Response({
        "status": "success",
        "message": "User Management API is working!",
        "timestamp": datetime.now().isoformat(),
        "available_endpoints": [
            {"method": "POST", "url": "/api/user/admin-login/", "description": "Admin/Superuser login"},
            {"method": "POST", "url": "/api/user/login/", "description": "User login"},
            {"method": "POST", "url": "/api/user/add-user/", "description": "Create new user"},
            {"method": "GET", "url": "/api/user/users/", "description": "Get all users"},
            {"method": "GET", "url": "/api/user/clients/", "description": "Get all clients"},
            {"method": "POST", "url": "/api/user/client/create/", "description": "Create new client"},
            {"method": "GET", "url": "/api/rates/client/<client_id>/", "description": "Get client rates"},
            {"method": "POST", "url": "/api/rates/client/<client_id>/update/", "description": "Update client rates"},
        ]
    })


# ✅ ADMIN LOGIN API
@api_view(['POST'])
@permission_classes([AllowAny])
def admin_login(request):
    username = request.data.get("username")
    password = request.data.get("password")

    if not username or not password:
        return Response({"error": "Username and password required"}, status=400)

    try:
        user = CustomUser.objects.get(username=username)
        
        if not check_password(password, user.password):
            return Response({"error": "Invalid password"}, status=400)
        
        if not user.is_superuser:
            return Response({"error": "Not a superuser. Please use User Login."}, status=403)
        
        all_modules = {
            "fcpl_rate": True,
            "pickup": True,
            "vendor_manage": True,
            "vendor_rates": True,
            "rate_update": True,
            "pincode": True,
            "user_management": True,
            "ba_b2b": True,
            "create_order": True,
            "shipment_details": True,
        }
        
        return Response({
            "status": "success",
            "id": user.id,
            "username": user.username,
            "email": user.email or "",
            "company": getattr(user, 'company', ''),
            "phone": getattr(user, 'phone', ''),
            "modules": all_modules
        }, status=200)
        
    except CustomUser.DoesNotExist:
        return Response({"error": f"User '{username}' not found"}, status=404)
    except Exception as e:
        print(f"Admin login error: {str(e)}")
        return Response({"error": str(e)}, status=500)


# ✅ USER LOGIN API - UPDATED with role check
@api_view(['POST'])
@permission_classes([AllowAny])
def user_login(request):
    username = request.data.get("username")
    password = request.data.get("password")

    if not username or not password:
        return Response({"error": "Username and password required"}, status=400)

    try:
        user = CustomUser.objects.get(username=username)
        
        if not check_password(password, user.password):
            return Response({"error": "Invalid username or password"}, status=400)
        
        # 🔥 CRITICAL FIX: Client cannot login via user login
        if user.role == 'Client':
            return Response({
                "error": "❌ This is a Client account. Please use Client Login portal.",
                "use_client_login": True
            }, status=403)

        return Response({
            "status": "success",
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "phone": getattr(user, 'phone', ''),
            "company": getattr(user, 'company', ''),
            "address": getattr(user, 'address', ''),
            "gstin": getattr(user, 'gstin', ''),
            "role": user.role,
            "modules": {
                "fcpl_rate": getattr(user, 'fcpl_rate', False),
                "pickup": getattr(user, 'pickup', False),
                "vendor_manage": getattr(user, 'vendor_manage', False),
                "vendor_rates": getattr(user, 'vendor_rates', False),
                "rate_update": getattr(user, 'rate_update', False),
                "pincode": getattr(user, 'pincode', False),
                "user_management": getattr(user, 'user_management', False),
                "ba_b2b": getattr(user, 'ba_b2b', False),
                "create_order": getattr(user, 'create_order', False),
                "shipment_details": getattr(user, 'shipment_details', False),
            }
        })

    except CustomUser.DoesNotExist:
        return Response({"error": "Invalid username or password"}, status=400)


# ✅ ADD USER API
@api_view(['POST'])
def add_user(request):
    data = request.data
    username = data.get("username")
    password = data.get("password")
    email = data.get("email", "")
    phone = data.get("phone", "")
    company = data.get("company", "")
    address = data.get("address", "")
    gstin = data.get("gstin", "")

    if not username or not password:
        return Response({"error": "Username & Password required"}, status=400)

    if CustomUser.objects.filter(username=username).exists():
        return Response({"error": "Username already exists"}, status=400)

    user = CustomUser.objects.create(
        username=username,
        password=make_password(password),
        email=email,
        phone=phone,
        company=company,
        address=address,
        gstin=gstin.upper() if gstin else "",
        is_active=True,
        role='User',
        fcpl_rate=data.get("fcpl_rate", False),
        pickup=data.get("pickup", False),
        vendor_manage=data.get("vendor_manage", False),
        vendor_rates=data.get("vendor_rates", False),
        rate_update=data.get("rate_update", False),
        pincode=data.get("pincode", False),
        user_management=data.get("user_management", False),
        ba_b2b=data.get("ba_b2b", False),
        create_order=data.get("create_order", False),
        shipment_details=data.get("shipment_details", False),
    )

    return Response({
        "status": "User created successfully", 
        "id": user.id,
        "username": user.username
    }, status=status.HTTP_201_CREATED)


# ✅ GET ALL USERS
@api_view(['GET'])
def user_list(request):
    users = CustomUser.objects.filter(role__in=['Admin', 'User']).values(
        "id", "username", "email", "phone", "company", 
        "address", "gstin", "date_joined", "role"
    )
    return Response(list(users))


# ✅ GET ALL CLIENTS
@api_view(['GET'])
def client_list(request):
    clients = CustomUser.objects.filter(role='Client')
    
    client_data = []
    for client in clients:
        profile = ClientProfile.objects.filter(client=client).first()
        rate_policy = ClientRatePolicy.objects.filter(client=client).first()
        
        client_data.append({
            "id": client.id,
            "clientId": client.client_id,
            "username": client.username,
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


# ✅ GET USER DETAILS BY ID
@api_view(['GET'])
def user_detail(request, id):
    try:
        user = CustomUser.objects.get(id=id)
        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "phone": user.phone,
            "company": user.company,
            "address": user.address,
            "gstin": user.gstin,
            "role": user.role,
            "client_id": user.client_id,
            "date_joined": user.date_joined,
            "fcpl_rate": user.fcpl_rate,
            "pickup": user.pickup,
            "vendor_manage": user.vendor_manage,
            "vendor_rates": user.vendor_rates,
            "rate_update": user.rate_update,
            "pincode": user.pincode,
            "user_management": user.user_management,
            "ba_b2b": user.ba_b2b,
            "create_order": user.create_order,
            "shipment_details": user.shipment_details,
        })
    except CustomUser.DoesNotExist:
        return Response({"error": "User not found"}, status=404)


# ✅ UPDATE USER
@api_view(['PUT'])
def update_user(request, id):
    try:
        user = CustomUser.objects.get(id=id)
        data = request.data
        
        user.username = data.get("username", user.username)
        user.email = data.get("email", user.email)
        user.phone = data.get("phone", user.phone)
        user.company = data.get("company", user.company)
        user.address = data.get("address", user.address)
        user.gstin = data.get("gstin", user.gstin)
        
        if data.get("password"):
            user.password = make_password(data["password"])
        
        user.fcpl_rate = data.get("fcpl_rate", user.fcpl_rate)
        user.pickup = data.get("pickup", user.pickup)
        user.vendor_manage = data.get("vendor_manage", user.vendor_manage)
        user.vendor_rates = data.get("vendor_rates", user.vendor_rates)
        user.rate_update = data.get("rate_update", user.rate_update)
        user.pincode = data.get("pincode", user.pincode)
        user.user_management = data.get("user_management", user.user_management)
        user.ba_b2b = data.get("ba_b2b", user.ba_b2b)
        user.create_order = data.get("create_order", user.create_order)
        user.shipment_details = data.get("shipment_details", user.shipment_details)
        
        user.save()
        
        return Response({"status": "User updated successfully"})
        
    except CustomUser.DoesNotExist:
        return Response({"error": "User not found"}, status=404)


# ✅ DELETE USER API
@api_view(['DELETE'])
def delete_user(request, id):
    try:
        user = CustomUser.objects.get(id=id)
        user.delete()
        return Response({"status": "User deleted successfully"})
    except CustomUser.DoesNotExist:
        return Response({"error": "User not found"}, status=404)


# ============================================
# 🆕 CLIENT MANAGEMENT APIs - UPDATED
# ============================================

# ✅ CREATE CLIENT - UPDATED (Working)
@api_view(['POST'])
def create_client(request):
    """Create a new client"""
    try:
        data = request.data
        print("=== CREATE CLIENT ===")
        print("Received client data:", data)
        
        client_id = data.get("clientId", "").upper()
        company_name = data.get("companyName", "")
        email = data.get("email", "")
        password = data.get("password", "")
        phone = data.get("phone", "")
        address = data.get("address", "")
        gstin = data.get("gstin", "")
        
        # Validation
        if not client_id:
            return Response({"error": "Client ID is required"}, status=400)
        if not company_name:
            return Response({"error": "Company Name is required"}, status=400)
        if not email:
            return Response({"error": "Email is required"}, status=400)
        if not password:
            return Response({"error": "Password is required"}, status=400)
        if len(password) < 6:
            return Response({"error": "Password must be at least 6 characters"}, status=400)
        
        # Check duplicates
        if CustomUser.objects.filter(client_id=client_id).exists():
            return Response({"error": f"Client ID '{client_id}' already exists"}, status=400)
        
        if CustomUser.objects.filter(email=email).exists():
            return Response({"error": f"Email '{email}' already exists"}, status=400)
        
        if phone and CustomUser.objects.filter(phone=phone).exists():
            return Response({"error": f"Phone number '{phone}' already exists"}, status=400)
        
        username = client_id.lower()
        if CustomUser.objects.filter(username=username).exists():
            return Response({"error": f"Username '{username}' already exists"}, status=400)
        
        # 🔥 CRITICAL: Create client with proper role
        user = CustomUser.objects.create(
            username=username,
            password=make_password(password),
            email=email,
            phone=phone,
            company=company_name,
            address=address,
            gstin=gstin.upper() if gstin else "",
            role='Client',  # 🔥 Force role to Client
            client_id=client_id,
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
        
        print(f"✅ Client created successfully: {client_id}")
        print(f"   User ID: {user.id}, Role: {user.role}, Active: {user.is_active}")
        
        return Response({
            "success": True,
            "message": f"Client {client_id} created successfully",
            "client": {
                "id": user.id,
                "clientId": user.client_id,
                "companyName": user.company,
                "email": user.email,
                "phone": user.phone,
                "username": user.username
            }
        }, status=201)
        
    except Exception as e:
        print(f"❌ Error creating client: {str(e)}")
        return Response({"error": str(e)}, status=500)


# ✅ UPDATE CLIENT STATUS
@api_view(['PUT'])
def update_client_status(request, client_id):
    try:
        user = CustomUser.objects.get(client_id__iexact=client_id, role='Client')
    except CustomUser.DoesNotExist:
        return Response({"error": "Client not found"}, status=404)
    
    is_active = request.data.get("is_active", False)
    user.is_client_active = is_active
    user.is_active = is_active
    user.save()
    
    return Response({
        "success": True,
        "message": f"Client {user.client_id} status updated to {'Active' if is_active else 'Inactive'}"
    }, status=200)


# ✅ DELETE/DEACTIVATE CLIENT
@api_view(['DELETE'])
def delete_client(request, client_id):
    try:
        user = CustomUser.objects.get(client_id__iexact=client_id, role='Client')
    except CustomUser.DoesNotExist:
        return Response({"error": "Client not found"}, status=404)
    
    user.is_active = False
    user.is_client_active = False
    user.save()
    
    return Response({
        "success": True,
        "message": f"Client {user.client_id} has been deactivated"
    }, status=200)


# ✅ GET CLIENT ORDER SUMMARY - UPDATED
@api_view(['GET'])
def get_client_order_summary(request, client_id):
    try:
        user = CustomUser.objects.get(client_id__iexact=client_id, role='Client')
    except CustomUser.DoesNotExist:
        return Response({"error": "Client not found"}, status=404)
    
    profile = ClientProfile.objects.filter(client=user).first()
    
    shipments_data = []
    if SHIPMENT_MODELS_AVAILABLE:
        try:
            from django.db import connection
            cursor = connection.cursor()
            cursor.execute("""
                SELECT id, lr_number, created_at, weight, freight_amount, status
                FROM orders 
                WHERE client_id = %s 
                ORDER BY created_at DESC
                LIMIT 50
            """, [client_id])
            rows = cursor.fetchall()
            for row in rows:
                shipments_data.append({
                    "id": row[0],
                    "lr_number": row[1],
                    "created_at": row[2],
                    "weight": float(row[3]) if row[3] else 0,
                    "freight_amount": float(row[4]) if row[4] else 0,
                    "status": row[5] if row[5] else "booked"
                })
        except Exception as e:
            logger.warning(f"Could not fetch shipments: {e}")
    
    return Response({
        "success": True,
        "total_orders": profile.total_orders if profile else 0,
        "total_shipments": profile.total_shipments if profile else 0,
        "total_freight": float(profile.total_freight) if profile else 0,
        "credit_limit": float(profile.credit_limit) if profile else 0,
        "credit_used": float(profile.current_credit_used) if profile else 0,
        "shipments": shipments_data
    }, status=200)


# ============================================
# 🆕 CLIENT RATES APIs
# ============================================

# ✅ GET CLIENT RATES
@api_view(['GET'])
@permission_classes([AllowAny])
def get_client_rates(request, client_id):
    try:
        user = CustomUser.objects.get(client_id__iexact=client_id, role='Client')
    except CustomUser.DoesNotExist:
        return Response({"error": "Client not found"}, status=404)
    
    zone_rates = ClientRateMatrix.objects.filter(client=user, is_active=True)
    zone_rates_data = []
    for rate in zone_rates:
        zone_rates_data.append({
            "id": rate.id,
            "from_zone": rate.from_zone,
            "to_zone": rate.to_zone,
            "rate": float(rate.rate),
            "surface_rate": float(rate.surface_rate) if rate.surface_rate else None,
            "express_rate": float(rate.express_rate) if rate.express_rate else None,
            "air_rate": float(rate.air_rate) if rate.air_rate else None
        })
    
    rate_policy = ClientRatePolicy.objects.filter(client=user).first()
    policy_data = rate_policy.to_dict() if rate_policy else None
    
    return Response({
        "success": True,
        "zone_rates": zone_rates_data,
        "policy": policy_data
    }, status=200)


# ✅ UPDATE CLIENT RATES
@api_view(['POST', 'PUT'])
def update_client_rates(request, client_id):
    try:
        user = CustomUser.objects.get(client_id__iexact=client_id, role='Client')
    except CustomUser.DoesNotExist:
        return Response({"error": "Client not found"}, status=404)
    
    data = request.data
    
    if 'zone_rates' in data:
        ClientRateMatrix.objects.filter(client=user).delete()
        
        for rate in data['zone_rates']:
            ClientRateMatrix.objects.create(
                client=user,
                from_zone=rate.get('from_zone'),
                to_zone=rate.get('to_zone'),
                rate=rate.get('rate', 0),
                surface_rate=rate.get('surface_rate'),
                express_rate=rate.get('express_rate'),
                air_rate=rate.get('air_rate')
            )
    
    if 'policy' in data:
        policy, created = ClientRatePolicy.objects.get_or_create(client=user)
        policy.is_custom = True
        
        policy_data = data['policy']
        for key, value in policy_data.items():
            if hasattr(policy, key):
                setattr(policy, key, value)
        
        policy.save()
    
    return Response({
        "success": True,
        "message": f"Rates updated for {user.client_id}"
    }, status=200)


# ============================================
# 📊 USER STATISTICS & SHIPMENTS
# ============================================

@api_view(['GET'])
def user_orders(request, user_id):
    """Get real orders for a user from database with freight amount"""
    try:
        from django.db import connection
        user = CustomUser.objects.get(id=user_id)
        
        cursor = connection.cursor()
        
        if user.role == 'Client' and user.client_id:
            cursor.execute("""
                SELECT lr_number, awb_number, pickup_pincode, delivery_pincode, 
                       weight, total_value, status, created_at, freight_amount
                FROM orders 
                WHERE client_id = %s 
                ORDER BY created_at DESC
            """, [user.client_id])
        else:
            if user.is_superuser:
                cursor.execute("""
                    SELECT lr_number, awb_number, pickup_pincode, delivery_pincode, 
                           weight, total_value, status, created_at, freight_amount
                    FROM orders 
                    ORDER BY created_at DESC
                    LIMIT 100
                """)
            else:
                return Response([], status=200)
        
        rows = cursor.fetchall()
        orders = []
        for row in rows:
            orders.append({
                "id": row[0],
                "order_number": f"FCPL{row[0]}",
                "lr_number": row[0],
                "created_at": row[7],
                "status": row[6],
                "total_value": float(row[5]) if row[5] else 0,
                "weight": float(row[4]) if row[4] else 0,
                "origin_pincode": row[2],
                "destination_pincode": row[3],
                "freight_amount": float(row[8]) if row[8] else 0
            })
        
        return Response(orders, status=200)
        
    except CustomUser.DoesNotExist:
        return Response({"error": "User not found"}, status=404)
    except Exception as e:
        print(f"Error in user_orders: {e}")
        return Response([], status=200)


@api_view(['GET'])
def user_shipments(request, user_id):
    """Get real shipments for a user from database with freight amount"""
    try:
        from django.db import connection
        user = CustomUser.objects.get(id=user_id)
        
        cursor = connection.cursor()
        
        if user.role == 'Client' and user.client_id:
            cursor.execute("""
                SELECT lr_number, awb_number, pickup_pincode, delivery_pincode, 
                       weight, total_value, status, created_at, freight_amount,
                       pickup_name, delivery_name, material
                FROM orders 
                WHERE client_id = %s 
                ORDER BY created_at DESC
            """, [user.client_id])
        else:
            if user.is_superuser:
                cursor.execute("""
                    SELECT lr_number, awb_number, pickup_pincode, delivery_pincode, 
                           weight, total_value, status, created_at, freight_amount,
                           pickup_name, delivery_name, material
                    FROM orders 
                    ORDER BY created_at DESC
                    LIMIT 100
                """)
            else:
                return Response([], status=200)
        
        rows = cursor.fetchall()
        shipments = []
        for row in rows:
            shipments.append({
                "id": row[0],
                "lr_number": f"FCPL{row[0]}",
                "awb_number": row[1],
                "created_at": row[7],
                "origin_pincode": row[2],
                "destination_pincode": row[3],
                "weight": float(row[4]) if row[4] else 0,
                "freight_amount": float(row[8]) if row[8] else 0,
                "total_amount": float(row[5]) if row[5] else 0,
                "status": row[6],
                "material": row[11] if len(row) > 11 else "General Cargo",
                "pickup_name": row[9] if len(row) > 9 else "",
                "delivery_name": row[10] if len(row) > 10 else ""
            })
        
        return Response(shipments, status=200)
        
    except CustomUser.DoesNotExist:
        return Response({"error": "User not found"}, status=404)
    except Exception as e:
        print(f"Error in user_shipments: {e}")
        return Response([], status=200)


@api_view(['GET'])
def user_stats(request, user_id):
    """Get user statistics with freight amount"""
    try:
        from django.db import connection
        user = CustomUser.objects.get(id=user_id)
        
        cursor = connection.cursor()
        
        if user.role == 'Client' and user.client_id:
            cursor.execute("""
                SELECT COUNT(*), 
                       COALESCE(SUM(total_value), 0),
                       COALESCE(SUM(weight), 0),
                       COALESCE(SUM(freight_amount), 0),
                       MAX(created_at)
                FROM orders 
                WHERE client_id = %s
            """, [user.client_id])
        else:
            if user.is_superuser:
                cursor.execute("""
                    SELECT COUNT(*), 
                           COALESCE(SUM(total_value), 0),
                           COALESCE(SUM(weight), 0),
                           COALESCE(SUM(freight_amount), 0),
                           MAX(created_at)
                    FROM orders
                """)
            else:
                return Response({
                    "order_count": 0,
                    "shipment_count": 0,
                    "total_freight": 0,
                    "total_gst": 0,
                    "total_value": 0,
                    "total_weight": 0,
                    "last_order_date": None
                }, status=200)
        
        row = cursor.fetchone()
        
        return Response({
            "order_count": row[0] or 0,
            "shipment_count": row[0] or 0,
            "total_freight": float(row[3]) if row[3] else 0,
            "total_gst": float(row[3]) * 0.18 if row[3] else 0,
            "total_value": float(row[1]) if row[1] else 0,
            "total_weight": float(row[2]) if row[2] else 0,
            "last_order_date": row[4] if row[4] else None
        }, status=200)
        
    except CustomUser.DoesNotExist:
        return Response({"error": "User not found"}, status=404)
    except Exception as e:
        print(f"Error in user_stats: {e}")
        return Response({
            "order_count": 0,
            "shipment_count": 0,
            "total_freight": 0,
            "total_gst": 0,
            "total_value": 0,
            "total_weight": 0,
            "last_order_date": None
        }, status=200)


@api_view(['GET'])
def all_shipments(request):
    if SHIPMENT_MODELS_AVAILABLE:
        try:
            from django.db import connection
            cursor = connection.cursor()
            cursor.execute("""
                SELECT id, lr_number, awb_number, client_id, pickup_name, delivery_name,
                       weight, total_value, freight_amount, status, created_at
                FROM orders 
                ORDER BY created_at DESC 
                LIMIT 100
            """)
            rows = cursor.fetchall()
            shipments = []
            for row in rows:
                shipments.append({
                    "id": row[0],
                    "lr_number": row[1],
                    "awb_number": row[2],
                    "client_id": row[3],
                    "pickup_name": row[4],
                    "delivery_name": row[5],
                    "weight": float(row[6]) if row[6] else 0,
                    "total_amount": float(row[7]) if row[7] else 0,
                    "freight_amount": float(row[8]) if row[8] else 0,
                    "status": row[9] if row[9] else "booked",
                    "created_at": row[10]
                })
            return Response(shipments)
        except Exception as e:
            logger.warning(f"Could not fetch shipments: {e}")
    
    return Response([])


@api_view(['POST'])
def calculate_fcpl_rate(request):
    return Response({
        "success": True,
        "chargeable_weight": 10,
        "freight_charge": 150,
        "fuel_charge": 15,
        "docket_charge": 100,
        "total_charge": 265,
        "zone": "Green",
        "is_oda": False
    })


@api_view(['GET'])
def get_pincode_zone(request, pincode):
    return Response({
        "pincode": pincode,
        "zone": "Green",
        "city": "Delhi",
        "state": "Delhi",
        "oda": False,
        "serviceable": True
    })


@api_view(['GET'])
def track_shipment(request, tracking_id):
    try:
        from django.db import connection
        cursor = connection.cursor()
        cursor.execute("""
            SELECT lr_number, awb_number, pickup_name, pickup_pincode, 
                   delivery_name, delivery_pincode, status, weight, 
                   material, total_value, freight_amount, updated_at
            FROM orders 
            WHERE lr_number = %s OR awb_number = %s
        """, [tracking_id, tracking_id])
        
        row = cursor.fetchone()
        if row:
            return Response({
                "lr": row[0],
                "awb": row[1],
                "pickupName": row[2],
                "pickupPincode": row[3],
                "deliveryName": row[4],
                "deliveryPincode": row[5],
                "status": row[6],
                "weight": float(row[7]) if row[7] else 0,
                "material": row[8] or "General Cargo",
                "totalValue": float(row[9]) if row[9] else 0,
                "freightAmount": float(row[10]) if row[10] else 0,
                "updatedAt": row[11]
            })
        else:
            return Response({"error": "Shipment not found"}, status=404)
    except Exception as e:
        logger.warning(f"Track shipment error: {e}")
        return Response({
            "status": "in_transit",
            "lr_number": tracking_id,
            "updated_at": datetime.now().isoformat()
        })


@api_view(['GET'])
def dashboard_stats(request):
    total_users = CustomUser.objects.filter(role__in=['Admin', 'User']).count()
    total_clients = CustomUser.objects.filter(role='Client').count()
    
    total_shipments = 0
    total_freight = 0
    
    try:
        from django.db import connection
        cursor = connection.cursor()
        cursor.execute("SELECT COUNT(*), COALESCE(SUM(freight_amount), 0) FROM orders")
        row = cursor.fetchone()
        if row:
            total_shipments = row[0] or 0
            total_freight = float(row[1]) if row[1] else 0
    except Exception as e:
        logger.warning(f"Could not fetch stats: {e}")
    
    return Response({
        "total_users": total_users,
        "total_clients": total_clients,
        "total_shipments": total_shipments,
        "total_orders": total_shipments,
        "total_revenue": float(total_freight),
        "total_gst": float(total_freight) * 0.18,
        "recent_shipments": min(10, total_shipments),
        "recent_revenue": float(total_freight) * 0.1,
    })