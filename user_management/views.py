# user_management/views.py - COMPLETE FIXED VERSION
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.hashers import make_password, check_password
from django.db.models import Sum, Count, Q
from datetime import datetime, timedelta
from accounts.models import CustomUser, ClientProfile, ClientRateMatrix, ClientRatePolicy, ClientSession, ClientOrderSummary
from django.core.exceptions import ObjectDoesNotExist
from decimal import Decimal
import logging
import uuid
# Add these with other imports
from .models import ClientWallet, RechargeHistory, WalletTransaction, RechargeRequest
from django.utils import timezone
# Add these imports at the top
import razorpay
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
import json

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


@api_view(['GET'])
def user_list(request):
    users = CustomUser.objects.filter(role__in=['Admin', 'User']).values(
        "id", "username", "email", "phone", "company", 
        "address", "gstin", "date_joined", "role"
    )
    return Response(list(users))


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


@api_view(['DELETE'])
def delete_user(request, id):
    try:
        user = CustomUser.objects.get(id=id)
        user.delete()
        return Response({"status": "User deleted successfully"})
    except CustomUser.DoesNotExist:
        return Response({"error": "User not found"}, status=404)


# ============================================
# 🆕 CLIENT MANAGEMENT APIs
# ============================================

@api_view(['POST'])
def create_client(request):
    try:
        data = request.data
        print("=== CREATE CLIENT ===")
        
        client_id = data.get("clientId", "").upper()
        company_name = data.get("companyName", "")
        email = data.get("email", "")
        password = data.get("password", "")
        phone = data.get("phone", "")
        address = data.get("address", "")
        gstin = data.get("gstin", "")
        
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
        
        if CustomUser.objects.filter(client_id=client_id).exists():
            return Response({"error": f"Client ID '{client_id}' already exists"}, status=400)
        if CustomUser.objects.filter(email=email).exists():
            return Response({"error": f"Email '{email}' already exists"}, status=400)
        
        username = client_id.lower()
        if CustomUser.objects.filter(username=username).exists():
            return Response({"error": f"Username '{username}' already exists"}, status=400)
        
        user = CustomUser.objects.create(
            username=username,
            password=make_password(password),
            email=email,
            phone=phone,
            company=company_name,
            address=address,
            gstin=gstin.upper() if gstin else "",
            role='Client',
            client_id=client_id,
            is_client_active=True,
            is_active=True,
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
        
        ClientProfile.objects.get_or_create(client=user)
        ClientRatePolicy.objects.get_or_create(client=user, defaults={'is_custom': False})
        
        print(f"✅ Client created: {client_id}")
        
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
        print(f"❌ Error: {str(e)}")
        return Response({"error": str(e)}, status=500)


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
        "message": f"Client {user.client_id} status updated"
    }, status=200)


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
        "message": f"Client {user.client_id} deactivated"
    }, status=200)


@api_view(['GET'])
def get_client_order_summary(request, client_id):
    try:
        user = CustomUser.objects.get(client_id__iexact=client_id, role='Client')
    except CustomUser.DoesNotExist:
        return Response({"error": "Client not found"}, status=404)
    
    profile = ClientProfile.objects.filter(client=user).first()
    
    return Response({
        "success": True,
        "total_orders": profile.total_orders if profile else 0,
        "total_shipments": profile.total_shipments if profile else 0,
        "total_freight": float(profile.total_freight) if profile else 0,
        "credit_limit": float(profile.credit_limit) if profile else 0,
        "credit_used": float(profile.current_credit_used) if profile else 0,
    }, status=200)


# ============================================
# 🆕 CLIENT RATES APIs - CASE INSENSITIVE FIXED VERSION
# ============================================

@api_view(['GET'])
@permission_classes([AllowAny])
def get_client_rates(request, client_id):
    """Get client rates - CASE INSENSITIVE"""
    try:
        print(f"🔍 GET CLIENT RATES for: {client_id}")
        
        # 🔥 FIX: Case-insensitive lookup using __iexact
        user = CustomUser.objects.filter(client_id__iexact=client_id, role='Client').first()
        
        if not user:
            print(f"⚠️ Client not found: {client_id}")
            return Response({
                "success": True,
                "zone_rates": [],
                "policy": None,
                "message": f"Client {client_id} not found"
            }, status=200)
        
        print(f"✅ Client found: {user.client_id} (ID: {user.id})")
        
        zone_rates = ClientRateMatrix.objects.filter(client=user, is_active=True)
        print(f"📊 Found {zone_rates.count()} rate records")
        
        zone_rates_data = []
        for rate in zone_rates:
            zone_rates_data.append({
                "id": rate.id,
                "from_zone": rate.from_zone,
                "to_zone": rate.to_zone,
                "rate": float(rate.rate),
            })
            print(f"   → {rate.from_zone} → {rate.to_zone}: {rate.rate}")
        
        return Response({
            "success": True,
            "zone_rates": zone_rates_data,
            "policy": None
        }, status=200)
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return Response({
            "success": True,
            "zone_rates": [],
            "policy": None
        }, status=200)


@api_view(['POST', 'PUT'])
def update_client_rates(request, client_id):
    """Update client rates - CASE INSENSITIVE - WORKING VERSION"""
    from decimal import Decimal
    
    print("=" * 60)
    print(f"🔔 UPDATE CLIENT RATES for: {client_id}")
    print("=" * 60)
    
    try:
        # 🔥 FIX: Case-insensitive lookup using __iexact
        user = CustomUser.objects.filter(client_id__iexact=client_id, role='Client').first()
        
        if not user:
            print(f"❌ Client not found: {client_id}")
            return Response({
                "success": False,
                "error": f"Client '{client_id}' not found. Please check the client ID."
            }, status=404)
        
        print(f"✅ Client found: {user.client_id} (ID: {user.id})")
        
        data = request.data
        zone_rates_list = data.get('zone_rates', [])
        
        if not zone_rates_list:
            print(f"⚠️ No zone_rates in request")
            return Response({
                "success": True,
                "message": f"No rates to update for {user.client_id}",
                "stats": {"created": 0, "total_in_db": 0}
            }, status=200)
        
        print(f"📊 Received {len(zone_rates_list)} zone rates")
        print(f"📊 Sample: {zone_rates_list[:3] if len(zone_rates_list) > 3 else zone_rates_list}")
        
        # DELETE existing rates for this client
        deleted_count = ClientRateMatrix.objects.filter(client=user).delete()
        print(f"🗑️ Deleted {deleted_count[0]} existing rates")
        
        # CREATE new rates
        created_count = 0
        error_count = 0
        
        for rate_item in zone_rates_list:
            from_zone = rate_item.get('from_zone')
            to_zone = rate_item.get('to_zone')
            rate_value = rate_item.get('rate')
            
            if not from_zone or not to_zone:
                error_count += 1
                continue
                
            if rate_value is None or rate_value == '':
                error_count += 1
                continue
            
            try:
                ClientRateMatrix.objects.create(
                    client=user,
                    from_zone=from_zone,
                    to_zone=to_zone,
                    rate=Decimal(str(float(rate_value))),
                    is_active=True
                )
                created_count += 1
            except Exception as e:
                error_count += 1
                print(f"   ❌ Error creating {from_zone}→{to_zone}: {str(e)}")
        
        print(f"✅ Created {created_count} rates, {error_count} errors")
        
        # Verify
        final_count = ClientRateMatrix.objects.filter(client=user).count()
        print(f"📊 Total rates in DB for {user.client_id}: {final_count}")
        
        return Response({
            "success": True,
            "message": f"✅ Rates updated successfully for {user.client_id}",
            "stats": {
                "deleted": deleted_count[0],
                "created": created_count,
                "errors": error_count,
                "total_in_db": final_count
            }
        }, status=200)
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({
            "success": False,
            "error": str(e)
        }, status=500)


# ============================================
# 📊 USER STATISTICS & SHIPMENTS
# ============================================

@api_view(['GET'])
def user_orders(request, user_id):
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
                "lr_number": row[0],
                "created_at": row[7],
                "status": row[6],
                "total_value": float(row[5]) if row[5] else 0,
                "weight": float(row[4]) if row[4] else 0,
                "freight_amount": float(row[8]) if row[8] else 0
            })
        
        return Response(orders, status=200)
        
    except Exception as e:
        print(f"Error: {e}")
        return Response([], status=200)


@api_view(['GET'])
def user_shipments(request, user_id):
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
        
    except Exception as e:
        print(f"Error: {e}")
        return Response([], status=200)


@api_view(['GET'])
def user_stats(request, user_id):
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
                    "total_freight": 0,
                    "total_value": 0,
                    "total_weight": 0,
                }, status=200)
        
        row = cursor.fetchone()
        
        return Response({
            "order_count": row[0] or 0,
            "total_freight": float(row[3]) if row[3] else 0,
            "total_value": float(row[1]) if row[1] else 0,
            "total_weight": float(row[2]) if row[2] else 0,
            "last_order_date": row[4] if row[4] else None
        }, status=200)
        
    except Exception as e:
        print(f"Error: {e}")
        return Response({
            "order_count": 0,
            "total_freight": 0,
            "total_value": 0,
            "total_weight": 0,
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

# ============================================
# 💰 CLIENT WALLET & RECHARGE SYSTEM - NEW APIs
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_wallet_balance(request):
    """
    Get client's current wallet balance
    """
    try:
        user = request.user
        
        # Check if user is client
        if user.role != 'Client':
            return Response({
                "success": False,
                "error": "Wallet is only for client accounts"
            }, status=403)
        
        # Get or create wallet
        wallet, created = ClientWallet.objects.get_or_create(client=user)
        
        return Response({
            "success": True,
            "balance": float(wallet.balance),
            "total_recharged": float(wallet.total_recharged),
            "total_spent": float(wallet.total_spent),
            "low_balance_warning": wallet.get_low_balance_warning(),
            "last_recharge_date": wallet.last_recharge_date,
            "last_used_date": wallet.last_used_date
        }, status=200)
        
    except Exception as e:
        logger.error(f"Error getting wallet balance: {str(e)}")
        return Response({
            "success": False,
            "error": str(e)
        }, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_recharge_request(request):
    """
    Client creates a recharge request (for manual payment)
    """
    try:
        user = request.user
        
        if user.role != 'Client':
            return Response({
                "success": False,
                "error": "Only clients can request recharge"
            }, status=403)
        
        amount = request.data.get('amount')
        payment_method = request.data.get('payment_method', 'CASH')
        reference_number = request.data.get('reference_number', '')
        bank_name = request.data.get('bank_name', '')
        payment_date = request.data.get('payment_date')
        
        if not amount or float(amount) <= 0:
            return Response({
                "success": False,
                "error": "Invalid amount"
            }, status=400)
        
        # Create recharge request
        recharge_req = RechargeRequest.objects.create(
            client=user,
            amount=amount,
            payment_method=payment_method,
            reference_number=reference_number,
            bank_name=bank_name,
            payment_date=payment_date if payment_date else None,
            status='PENDING'
        )
        
        # Also create in RechargeHistory with PENDING status
        transaction_id = f"RECH_{user.client_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        recharge = RechargeHistory.objects.create(
            client=user,
            amount=amount,
            payment_method=payment_method,
            transaction_id=transaction_id,
            status='PENDING',
            utr_number=reference_number,
            created_by=user
        )
        
        return Response({
            "success": True,
            "message": "Recharge request submitted successfully. Waiting for admin approval.",
            "request_id": recharge_req.id,
            "transaction_id": transaction_id,
            "amount": float(amount),
            "status": "PENDING"
        }, status=201)
        
    except Exception as e:
        logger.error(f"Error creating recharge request: {str(e)}")
        return Response({
            "success": False,
            "error": str(e)
        }, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_recharge_manual(request):
    """
    Admin adds recharge manually (for cash/cheque payments)
    """
    try:
        user = request.user
        
        # Check if user is admin
        if not user.is_superuser and user.role != 'Admin':
            return Response({
                "success": False,
                "error": "Only admin can add manual recharge"
            }, status=403)
        
        client_id = request.data.get('client_id')
        amount = request.data.get('amount')
        payment_method = request.data.get('payment_method', 'CASH')
        remarks = request.data.get('remarks', '')
        
        if not client_id or not amount:
            return Response({
                "success": False,
                "error": "Client ID and amount required"
            }, status=400)
        
        # Find client
        try:
            client = CustomUser.objects.get(client_id__iexact=client_id, role='Client')
        except CustomUser.DoesNotExist:
            return Response({
                "success": False,
                "error": f"Client '{client_id}' not found"
            }, status=404)
        
        # Create transaction
        transaction_id = f"ADMIN_{client.client_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        recharge = RechargeHistory.objects.create(
            client=client,
            amount=amount,
            payment_method=payment_method,
            transaction_id=transaction_id,
            status='COMPLETED',
            remarks=f"Admin added: {remarks}",
            created_by=user,
            approved_by=user,
            completed_at=timezone.now()
        )
        
        # Add balance to wallet
        wallet, created = ClientWallet.objects.get_or_create(client=client)
        wallet.add_balance(float(amount), recharge.id)
        
        return Response({
            "success": True,
            "message": f"₹{amount} added to {client.client_id} wallet",
            "transaction_id": transaction_id,
            "new_balance": float(wallet.balance)
        }, status=200)
        
    except Exception as e:
        logger.error(f"Error adding manual recharge: {str(e)}")
        return Response({
            "success": False,
            "error": str(e)
        }, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_recharge_history(request):
    """
    Get client's own recharge history
    """
    try:
        user = request.user
        
        if user.role != 'Client':
            return Response({
                "success": False,
                "error": "Only clients can view their recharge history"
            }, status=403)
        
        recharges = RechargeHistory.objects.filter(client=user).order_by('-created_at')
        
        data = []
        for r in recharges:
            data.append({
                "id": r.id,
                "amount": float(r.amount),
                "payment_method": r.get_payment_method_display(),
                "status": r.status,
                "transaction_id": r.transaction_id,
                "utr_number": r.utr_number,
                "created_at": r.created_at,
                "completed_at": r.completed_at,
                "remarks": r.remarks
            })
        
        return Response({
            "success": True,
            "history": data,
            "total_count": len(data),
            "total_amount": sum([d['amount'] for d in data if d['status'] == 'COMPLETED'])
        }, status=200)
        
    except Exception as e:
        logger.error(f"Error getting recharge history: {str(e)}")
        return Response({
            "success": False,
            "error": str(e)
        }, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_wallet_transactions(request):
    """
    Get all wallet transactions (credit/debit)
    """
    try:
        user = request.user
        
        if user.role != 'Client':
            return Response({
                "success": False,
                "error": "Only clients can view their transactions"
            }, status=403)
        
        transactions = WalletTransaction.objects.filter(client=user).order_by('-created_at')
        
        data = []
        for t in transactions[:50]:  # Last 50 transactions
            data.append({
                "id": t.id,
                "amount": float(t.amount),
                "type": t.transaction_type,
                "balance_before": float(t.balance_before) if t.balance_before else None,
                "balance_after": float(t.balance_after),
                "description": t.description,
                "order_id": t.order_id,
                "created_at": t.created_at
            })
        
        return Response({
            "success": True,
            "transactions": data,
            "total_count": len(data)
        }, status=200)
        
    except Exception as e:
        logger.error(f"Error getting wallet transactions: {str(e)}")
        return Response({
            "success": False,
            "error": str(e)
        }, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_all_recharges(request):
    """
    Admin view - All client recharge history
    """
    try:
        user = request.user
        
        # Check if admin
        if not user.is_superuser and user.role != 'Admin':
            return Response({
                "success": False,
                "error": "Admin access required"
            }, status=403)
        
        # Get all recharges with client details
        recharges = RechargeHistory.objects.select_related('client').order_by('-created_at')
        
        data = []
        for r in recharges:
            data.append({
                "id": r.id,
                "client_id": r.client.client_id if r.client.client_id else r.client.username,
                "client_name": r.client.company or r.client.username,
                "client_email": r.client.email,
                "amount": float(r.amount),
                "payment_method": r.get_payment_method_display(),
                "status": r.status,
                "transaction_id": r.transaction_id,
                "utr_number": r.utr_number,
                "created_at": r.created_at,
                "completed_at": r.completed_at,
                "created_by": r.created_by.username if r.created_by else None,
                "approved_by": r.approved_by.username if r.approved_by else None,
                "remarks": r.remarks
            })
        
        # Summary stats
        total_recharged = sum([d['amount'] for d in data if d['status'] == 'COMPLETED'])
        pending_count = len([d for d in data if d['status'] == 'PENDING'])
        completed_count = len([d for d in data if d['status'] == 'COMPLETED'])
        
        return Response({
            "success": True,
            "total_recharges": len(data),
            "total_amount_recharged": total_recharged,
            "pending_count": pending_count,
            "completed_count": completed_count,
            "recharges": data
        }, status=200)
        
    except Exception as e:
        logger.error(f"Error getting all recharges: {str(e)}")
        return Response({
            "success": False,
            "error": str(e)
        }, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_recharge(request, recharge_id):
    """
    Admin approve a pending recharge
    """
    try:
        user = request.user
        
        # Check if admin
        if not user.is_superuser and user.role != 'Admin':
            return Response({
                "success": False,
                "error": "Admin access required"
            }, status=403)
        
        recharge = RechargeHistory.objects.get(id=recharge_id)
        
        if recharge.status != 'PENDING':
            return Response({
                "success": False,
                "error": f"Recharge is already {recharge.status}"
            }, status=400)
        
        # Complete the recharge
        recharge.complete_recharge(user)
        
        return Response({
            "success": True,
            "message": f"Recharge of ₹{recharge.amount} approved for {recharge.client.client_id}",
            "new_balance": float(recharge.client.wallet.balance) if hasattr(recharge.client, 'wallet') else 0
        }, status=200)
        
    except RechargeHistory.DoesNotExist:
        return Response({
            "success": False,
            "error": "Recharge not found"
        }, status=404)
    except Exception as e:
        logger.error(f"Error approving recharge: {str(e)}")
        return Response({
            "success": False,
            "error": str(e)
        }, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_balance_before_order(request):
    """
    Check if client has sufficient balance before creating order
    """
    try:
        user = request.user
        
        if user.role != 'Client':
            return Response({
                "success": False,
                "error": "Only clients can check balance"
            }, status=403)
        
        freight_amount = float(request.GET.get('freight_amount', 0))
        
        wallet, created = ClientWallet.objects.get_or_create(client=user)
        
        has_balance = wallet.has_sufficient_balance(freight_amount)
        
        return Response({
            "success": True,
            "has_balance": has_balance,
            "current_balance": float(wallet.balance),
            "required_amount": freight_amount,
            "shortfall": max(0, freight_amount - float(wallet.balance)) if not has_balance else 0,
            "message": "Sufficient balance" if has_balance else f"Insufficient balance. Need ₹{freight_amount - float(wallet.balance)} more."
        }, status=200)
        
    except Exception as e:
        logger.error(f"Error checking balance: {str(e)}")
        return Response({
            "success": False,
            "error": str(e)
        }, status=500)
    


# Initialize Razorpay client
razorpay_client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_razorpay_order(request):
    """Create Razorpay order for recharge"""
    try:
        user = request.user
        amount = request.data.get('amount')
        
        if not amount or float(amount) <= 0:
            return Response({'error': 'Invalid amount'}, status=400)
        
        # Create Razorpay order
        order_amount = int(float(amount) * 100)
        order_currency = 'INR'
        
        razorpay_order = razorpay_client.order.create({
            'amount': order_amount,
            'currency': order_currency,
            'payment_capture': 1,
            'notes': {
                'user_id': user.id,
                'client_id': user.client_id,
                'amount': amount
            }
        })
        
        # Save order in database
        recharge = RechargeHistory.objects.create(
            client=user,
            amount=amount,
            payment_method='RAZORPAY',
            transaction_id=razorpay_order['id'],
            status='PENDING',
            created_by=user
        )
        
        return Response({
            'success': True,
            'order_id': razorpay_order['id'],
            'amount': amount,
            'currency': order_currency,
            'key_id': settings.RAZORPAY_KEY_ID,
            'recharge_id': recharge.id
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@csrf_exempt
@api_view(['POST'])
def verify_razorpay_payment(request):
    """Verify Razorpay payment"""
    try:
        order_id = request.data.get('order_id')
        payment_id = request.data.get('payment_id')
        signature = request.data.get('signature')
        
        # Verify payment signature
        params_dict = {
            'razorpay_order_id': order_id,
            'razorpay_payment_id': payment_id,
            'razorpay_signature': signature
        }
        
        razorpay_client.utility.verify_payment_signature(params_dict)
        
        # Update recharge
        recharge = RechargeHistory.objects.filter(transaction_id=order_id).first()
        
        if recharge and recharge.status == 'PENDING':
            recharge.status = 'COMPLETED'
            recharge.gateway_transaction_id = payment_id
            recharge.completed_at = timezone.now()
            recharge.save()
            
            # Add balance to wallet
            wallet, created = ClientWallet.objects.get_or_create(client=recharge.client)
            wallet.add_balance(recharge.amount, recharge.id)
            
            return Response({
                'success': True,
                'message': 'Payment verified successfully',
                'amount': recharge.amount,
                'new_balance': wallet.balance
            })
        
        return Response({'error': 'Recharge not found'}, status=404)
        
    except Exception as e:
        return Response({'error': str(e)}, status=400)