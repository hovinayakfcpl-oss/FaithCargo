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
    from shipments.models import Shipment, ShipmentTracking
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
        return Response({"error": str(e)}, status=500)


# ✅ USER LOGIN API
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

        return Response({
            "status": "success",
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "phone": getattr(user, 'phone', ''),
            "company": getattr(user, 'company', ''),
            "address": getattr(user, 'address', ''),
            "gstin": getattr(user, 'gstin', ''),
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


# ✅ GET ALL CLIENTS - NEW
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
# 🆕 CLIENT MANAGEMENT APIs
# ============================================

# ✅ CREATE CLIENT - NEW
@api_view(['POST'])
def create_client(request):
    data = request.data
    
    client_id = data.get("clientId", "").upper()
    company_name = data.get("companyName", "")
    email = data.get("email", "")
    password = data.get("password", "")
    phone = data.get("phone", "")
    address = data.get("address", "")
    gstin = data.get("gstin", "")
    
    if not client_id or not company_name or not email or not password:
        return Response({"error": "Client ID, Company Name, Email, and Password are required"}, status=400)
    
    if CustomUser.objects.filter(client_id=client_id).exists():
        return Response({"error": f"Client ID '{client_id}' already exists"}, status=400)
    
    if CustomUser.objects.filter(email=email).exists():
        return Response({"error": f"Email '{email}' already exists"}, status=400)
    
    # Create client user
    user = CustomUser.objects.create(
        username=client_id.lower(),
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
        # Default client permissions
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
    
    # Create client profile
    ClientProfile.objects.create(client=user)
    
    # Create default rate policy
    ClientRatePolicy.objects.create(client=user, is_custom=False)
    
    return Response({
        "success": True,
        "message": f"Client {client_id} created successfully",
        "client": {
            "id": user.id,
            "clientId": user.client_id,
            "companyName": user.company,
            "email": user.email,
            "phone": user.phone
        }
    }, status=201)


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
    
    # Soft delete
    user.is_active = False
    user.is_client_active = False
    user.save()
    
    return Response({
        "success": True,
        "message": f"Client {user.client_id} has been deactivated"
    }, status=200)


# ✅ GET CLIENT ORDER SUMMARY
@api_view(['GET'])
def get_client_order_summary(request, client_id):
    try:
        user = CustomUser.objects.get(client_id__iexact=client_id, role='Client')
    except CustomUser.DoesNotExist:
        return Response({"error": "Client not found"}, status=404)
    
    profile = ClientProfile.objects.filter(client=user).first()
    
    # Get shipments if available
    shipments_data = []
    if SHIPMENT_MODELS_AVAILABLE:
        shipments = Shipment.objects.filter(client_id=client_id)
        for shipment in shipments:
            shipments_data.append({
                "id": shipment.id,
                "lr_number": shipment.lr_number,
                "created_at": shipment.created_at,
                "weight": float(shipment.weight),
                "freight_amount": float(shipment.freight_amount),
                "status": shipment.status
            })
    
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
    
    # Get zone rates
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
    
    # Get rate policy
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
    
    # Update zone rates
    if 'zone_rates' in data:
        # Delete existing rates
        ClientRateMatrix.objects.filter(client=user).delete()
        
        # Create new rates
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
    
    # Update policy
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
    if SHIPMENT_MODELS_AVAILABLE:
        shipments = Shipment.objects.filter(client_id=user_id) if user_id else []
        return Response([{
            "id": s.id,
            "order_number": s.lr_number,
            "lr_number": s.lr_number,
            "created_at": s.created_at,
            "status": s.status,
            "total_value": float(s.total_value),
            "weight": float(s.weight),
            "origin_pincode": s.pickup_pincode,
            "destination_pincode": s.delivery_pincode
        } for s in shipments])
    
    return Response([
        {
            "id": 1,
            "order_number": f"ORD{1000 + int(user_id) if user_id else 1000}",
            "lr_number": f"FCPL{2000 + int(user_id) if user_id else 2000}",
            "created_at": datetime.now().isoformat(),
            "status": "delivered",
            "total_value": 50000,
            "weight": 25.5,
            "origin_pincode": "110001",
            "destination_pincode": "400001"
        }
    ])


@api_view(['GET'])
def user_shipments(request, user_id):
    if SHIPMENT_MODELS_AVAILABLE:
        shipments = Shipment.objects.filter(client_id=user_id) if user_id else []
        return Response([{
            "id": s.id,
            "lr_number": s.lr_number,
            "awb_number": s.awb_number,
            "created_at": s.created_at,
            "origin_pincode": s.pickup_pincode,
            "destination_pincode": s.delivery_pincode,
            "weight": float(s.weight),
            "freight_amount": float(s.freight_amount),
            "total_amount": float(s.total_amount),
            "status": s.status,
            "material": s.material
        } for s in shipments])
    
    return Response([
        {
            "id": 1,
            "lr_number": f"FCPL{2000 + int(user_id) if user_id else 2000}",
            "awb_number": f"AWB{3000 + int(user_id) if user_id else 3000}",
            "created_at": datetime.now().isoformat(),
            "origin_pincode": "110001",
            "destination_pincode": "400001",
            "weight": 25.5,
            "freight_amount": 1250,
            "total_amount": 1475,
            "status": "delivered",
            "material": "Electronics"
        }
    ])


@api_view(['GET'])
def user_stats(request, user_id):
    if SHIPMENT_MODELS_AVAILABLE:
        shipments = Shipment.objects.filter(client_id=user_id) if user_id else []
        total_freight = sum(float(s.freight_amount) for s in shipments)
        total_value = sum(float(s.total_value) for s in shipments)
        total_weight = sum(float(s.weight) for s in shipments)
        
        return Response({
            "order_count": len(shipments),
            "shipment_count": len(shipments),
            "total_freight": total_freight,
            "total_gst": total_freight * 0.18,
            "total_value": total_value,
            "total_weight": total_weight,
            "last_order_date": shipments[0].created_at if shipments else None
        })
    
    return Response({
        "order_count": 5,
        "shipment_count": 8,
        "total_freight": 12500,
        "total_gst": 2250,
        "total_value": 14750,
        "total_weight": 250.5,
        "last_order_date": datetime.now().isoformat(),
    })


@api_view(['GET'])
def all_shipments(request):
    if SHIPMENT_MODELS_AVAILABLE:
        shipments = Shipment.objects.all()[:100]
        return Response([{
            "id": s.id,
            "lr_number": s.lr_number,
            "awb_number": s.awb_number,
            "client_id": s.client_id,
            "pickup_name": s.pickup_name,
            "delivery_name": s.delivery_name,
            "weight": float(s.weight),
            "total_amount": float(s.total_amount),
            "status": s.status,
            "created_at": s.created_at
        } for s in shipments])
    
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
    if SHIPMENT_MODELS_AVAILABLE:
        try:
            shipment = Shipment.objects.get(lr_number=tracking_id)
            tracking_history = ShipmentTracking.objects.filter(shipment=shipment).order_by('-created_at')
            
            return Response({
                "lr": shipment.lr_number,
                "awb": shipment.awb_number,
                "pickupName": shipment.pickup_name,
                "pickupPincode": shipment.pickup_pincode,
                "deliveryName": shipment.delivery_name,
                "deliveryPincode": shipment.delivery_pincode,
                "status": shipment.status,
                "weight": float(shipment.weight),
                "material": shipment.material,
                "totalValue": float(shipment.total_value),
                "updatedAt": shipment.updated_at,
                "trackingHistory": [{
                    "status": t.status,
                    "location": t.location,
                    "remarks": t.remarks,
                    "createdAt": t.created_at
                } for t in tracking_history]
            })
        except Shipment.DoesNotExist:
            return Response({"error": "Shipment not found"}, status=404)
    
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
    
    if SHIPMENT_MODELS_AVAILABLE:
        total_shipments = Shipment.objects.count()
        total_freight = Shipment.objects.aggregate(total=Sum('freight_amount'))['total'] or 0
    
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

# usermanagement/views.py - Update create_client function

@api_view(['POST'])
def create_client(request):
    """Create a new client"""
    try:
        data = request.data
        print("Received client data:", data)  # Debug log
        
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
        
        # Check if client_id already exists
        if CustomUser.objects.filter(client_id=client_id).exists():
            return Response({"error": f"Client ID '{client_id}' already exists"}, status=400)
        
        # Check if email already exists
        if CustomUser.objects.filter(email=email).exists():
            return Response({"error": f"Email '{email}' already exists"}, status=400)
        
        # Check if username already exists
        username = client_id.lower()
        if CustomUser.objects.filter(username=username).exists():
            return Response({"error": f"Username '{username}' already exists"}, status=400)
        
        # Create client user
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
            # Default client permissions
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
        
        # Create client profile
        ClientProfile.objects.get_or_create(client=user)
        
        # Create default rate policy
        ClientRatePolicy.objects.get_or_create(client=user, defaults={'is_custom': False})
        
        return Response({
            "success": True,
            "message": f"Client {client_id} created successfully",
            "client": {
                "id": user.id,
                "clientId": user.client_id,
                "companyName": user.company,
                "email": user.email,
                "phone": user.phone
            }
        }, status=201)
        
    except Exception as e:
        print(f"Error creating client: {str(e)}")
        return Response({"error": str(e)}, status=500)