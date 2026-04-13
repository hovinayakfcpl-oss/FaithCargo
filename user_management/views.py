from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.hashers import make_password, check_password
from django.db.models import Sum
from datetime import datetime, timedelta
from accounts.models import CustomUser  # ✅ Import from accounts
import logging

logger = logging.getLogger(__name__)

# Import Shipment models if they exist in your project
try:
    from shipments.models import Shipment, Order
    SHIPMENT_MODELS_AVAILABLE = True
except ImportError:
    SHIPMENT_MODELS_AVAILABLE = False
    logger.warning("Shipment models not available. Using mock data.")

# ============================================
# 🔐 USER AUTHENTICATION & MANAGEMENT
# ============================================

# ✅ TEST API ENDPOINT
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
        ]
    })

# ✅ ADMIN LOGIN API - Superuser login (from accounts.CustomUser)
@api_view(['POST'])
def admin_login(request):
    username = request.data.get("username")
    password = request.data.get("password")

    if not username or not password:
        return Response({"error": "Username and password required"}, status=400)

    try:
        user = CustomUser.objects.get(username=username)
        
        # Check password
        if not check_password(password, user.password):
            return Response({"error": "Invalid password"}, status=400)
        
        # Check if user is superuser (AbstractUser has this field)
        if not user.is_superuser:
            return Response({"error": "Not a superuser. Please use User Login."}, status=403)
        
        # Admin has all modules access
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


# ✅ USER LOGIN API (for normal users)
@api_view(['POST'])
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
        # Permissions
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
    users = CustomUser.objects.all().values(
        "id", "username", "email", "phone", "company", 
        "address", "gstin", "date_joined"
    )
    return Response(list(users))


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
# 📊 USER STATISTICS & SHIPMENTS (Mock)
# ============================================

@api_view(['GET'])
def user_orders(request, user_id):
    return Response([
        {
            "id": 1,
            "order_number": f"ORD{1000 + user_id}",
            "lr_number": f"FCPL{2000 + user_id}",
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
    return Response([
        {
            "id": 1,
            "lr_number": f"FCPL{2000 + user_id}",
            "awb_number": f"AWB{3000 + user_id}",
            "created_at": datetime.now().isoformat(),
            "origin_pincode": "110001",
            "destination_pincode": "400001",
            "weight": 25.5,
            "freight_amount": 1250,
            "gst_amount": 225,
            "total_amount": 1475,
            "status": "delivered",
            "material": "Electronics"
        }
    ])

@api_view(['GET'])
def user_stats(request, user_id):
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
    return Response({
        "status": "in_transit",
        "lr_number": tracking_id,
        "updated_at": datetime.now().isoformat()
    })

@api_view(['GET'])
def dashboard_stats(request):
    total_users = CustomUser.objects.count()
    return Response({
        "total_users": total_users,
        "total_shipments": 0,
        "total_orders": 0,
        "total_revenue": 0,
        "total_gst": 0,
        "recent_shipments": 0,
        "recent_revenue": 0,
    })