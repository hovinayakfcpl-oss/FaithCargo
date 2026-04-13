from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.hashers import make_password, check_password
from django.db.models import Sum, Q
from datetime import datetime, timedelta
from .models import CustomUser
import json
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

# ✅ TEST API ENDPOINT - Check if API is working
@api_view(['GET'])
def test_api(request):
    return Response({
        "status": "success",
        "message": "User Management API is working!",
        "timestamp": datetime.now().isoformat(),
        "shipment_models_available": SHIPMENT_MODELS_AVAILABLE,
        "available_endpoints": [
            {"method": "POST", "url": "/api/user/add-user/", "description": "Create new user"},
            {"method": "POST", "url": "/api/user/login/", "description": "User login"},
            {"method": "GET", "url": "/api/user/users/", "description": "Get all users"},
            {"method": "GET", "url": "/api/user/users/<id>/", "description": "Get user by ID"},
            {"method": "PUT", "url": "/api/user/update-user/<id>/", "description": "Update user"},
            {"method": "DELETE", "url": "/api/user/delete-user/<id>/", "description": "Delete user"},
            {"method": "GET", "url": "/api/user/user-shipments/<user_id>/", "description": "Get user shipments"},
            {"method": "GET", "url": "/api/user/user-orders/<user_id>/", "description": "Get user orders"},
            {"method": "GET", "url": "/api/user/user-stats/<user_id>/", "description": "Get user statistics"},
            {"method": "GET", "url": "/api/user/all-shipments/", "description": "Get all shipments"},
            {"method": "GET", "url": "/api/user/dashboard-stats/", "description": "Get dashboard statistics"},
            {"method": "POST", "url": "/api/user/fcpl-rate-calculate/", "description": "Calculate FCPL rates"},
            {"method": "GET", "url": "/api/user/pincode/zone/<pincode>/", "description": "Get pincode zone info"},
            {"method": "GET", "url": "/api/user/track-shipment/<tracking_id>/", "description": "Track shipment"},
        ]
    })

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

    # Create user with all fields
    user = CustomUser.objects.create(
        username=username,
        password=make_password(password),
        email=email,
        phone=phone,
        company=company,
        address=address,
        gstin=gstin.upper() if gstin else "",
        # Permissions - Only these modules
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
        # Hidden modules (not shown in UI)
        view_reports=False,
        generate_invoice=False,
    )

    return Response({
        "status": "User created successfully", 
        "id": user.id,
        "username": user.username
    }, status=status.HTTP_201_CREATED)


# ✅ USER LOGIN API
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

        # Return only allowed modules (no invoice/reports)
        return Response({
            "status": "success",
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "phone": user.phone,
            "company": user.company,
            "address": user.address,
            "gstin": user.gstin,
            "modules": {
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
            }
        })

    except CustomUser.DoesNotExist:
        return Response({"error": "Invalid username or password"}, status=400)


# ✅ GET ALL USERS (WITH DETAILS)
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
        
        # Update permissions
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
# 📊 USER STATISTICS & SHIPMENTS
# ============================================

# ✅ GET USER ORDERS/BOOKINGS
@api_view(['GET'])
def user_orders(request, user_id):
    if not SHIPMENT_MODELS_AVAILABLE:
        # Return mock data for testing
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
            },
            {
                "id": 2,
                "order_number": f"ORD{1001 + user_id}",
                "lr_number": f"FCPL{2001 + user_id}",
                "created_at": (datetime.now() - timedelta(days=5)).isoformat(),
                "status": "in_transit",
                "total_value": 35000,
                "weight": 15.0,
                "origin_pincode": "110015",
                "destination_pincode": "560001"
            }
        ])
    
    try:
        orders = Order.objects.filter(user_id=user_id).order_by('-created_at')
        
        orders_data = []
        for order in orders:
            orders_data.append({
                "id": order.id,
                "order_number": getattr(order, 'order_number', None),
                "lr_number": getattr(order, 'lr_number', None),
                "created_at": order.created_at,
                "status": getattr(order, 'status', 'pending'),
                "total_value": getattr(order, 'total_value', 0),
                "weight": getattr(order, 'weight', 0),
                "origin_pincode": getattr(order, 'origin_pincode', ''),
                "destination_pincode": getattr(order, 'destination_pincode', ''),
            })
        
        return Response(orders_data)
        
    except Exception as e:
        logger.error(f"Error fetching orders: {e}")
        return Response([], status=200)


# ✅ GET USER SHIPMENTS
@api_view(['GET'])
def user_shipments(request, user_id):
    if not SHIPMENT_MODELS_AVAILABLE:
        # Return mock data for testing
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
            },
            {
                "id": 2,
                "lr_number": f"FCPL{2001 + user_id}",
                "awb_number": f"AWB{3001 + user_id}",
                "created_at": (datetime.now() - timedelta(days=3)).isoformat(),
                "origin_pincode": "110015",
                "destination_pincode": "560001",
                "weight": 15.0,
                "freight_amount": 750,
                "gst_amount": 135,
                "total_amount": 885,
                "status": "in_transit",
                "material": "Clothing"
            }
        ])
    
    try:
        shipments = Shipment.objects.filter(user_id=user_id).order_by('-created_at')
        
        shipments_data = []
        for shipment in shipments:
            shipments_data.append({
                "id": shipment.id,
                "lr_number": getattr(shipment, 'lr_number', None),
                "awb_number": getattr(shipment, 'awb_number', None),
                "created_at": shipment.created_at,
                "origin_pincode": getattr(shipment, 'origin_pincode', ''),
                "destination_pincode": getattr(shipment, 'destination_pincode', ''),
                "weight": getattr(shipment, 'weight', 0),
                "freight_amount": getattr(shipment, 'freight_amount', 0),
                "gst_amount": getattr(shipment, 'gst_amount', 0),
                "total_amount": getattr(shipment, 'total_amount', 0),
                "status": getattr(shipment, 'status', 'booked'),
                "material": getattr(shipment, 'material', ''),
            })
        
        return Response(shipments_data)
        
    except Exception as e:
        logger.error(f"Error fetching shipments: {e}")
        return Response([], status=200)


# ✅ GET ALL SHIPMENTS (for admin)
@api_view(['GET'])
def all_shipments(request):
    if not SHIPMENT_MODELS_AVAILABLE:
        return Response([])
    
    try:
        shipments = Shipment.objects.all().order_by('-created_at')
        
        shipments_data = []
        for shipment in shipments:
            shipments_data.append({
                "id": shipment.id,
                "lr_number": getattr(shipment, 'lr_number', None),
                "awb_number": getattr(shipment, 'awb_number', None),
                "user_id": getattr(shipment, 'user_id', None),
                "created_at": shipment.created_at,
                "origin_pincode": getattr(shipment, 'origin_pincode', ''),
                "destination_pincode": getattr(shipment, 'destination_pincode', ''),
                "weight": getattr(shipment, 'weight', 0),
                "freight_amount": getattr(shipment, 'freight_amount', 0),
                "gst_amount": getattr(shipment, 'gst_amount', 0),
                "total_amount": getattr(shipment, 'total_amount', 0),
                "status": getattr(shipment, 'status', 'booked'),
            })
        
        return Response(shipments_data)
        
    except Exception as e:
        logger.error(f"Error fetching all shipments: {e}")
        return Response([], status=200)


# ✅ GET USER STATS SUMMARY
@api_view(['GET'])
def user_stats(request, user_id):
    if not SHIPMENT_MODELS_AVAILABLE:
        return Response({
            "order_count": 5,
            "shipment_count": 8,
            "total_freight": 12500,
            "total_gst": 2250,
            "total_value": 14750,
            "total_weight": 250.5,
            "last_order_date": datetime.now().isoformat(),
        })
    
    try:
        shipments = Shipment.objects.filter(user_id=user_id)
        orders = Order.objects.filter(user_id=user_id)
        
        total_freight = shipments.aggregate(Sum('freight_amount'))['freight_amount__sum'] or 0
        total_gst = shipments.aggregate(Sum('gst_amount'))['gst_amount__sum'] or 0
        total_value = shipments.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        total_weight = shipments.aggregate(Sum('weight'))['weight__sum'] or 0
        
        return Response({
            "order_count": orders.count(),
            "shipment_count": shipments.count(),
            "total_freight": total_freight,
            "total_gst": total_gst,
            "total_value": total_value,
            "total_weight": total_weight,
            "last_order_date": orders.first().created_at if orders.exists() else None,
        })
        
    except Exception as e:
        logger.error(f"Error fetching user stats: {e}")
        return Response({
            "order_count": 0,
            "shipment_count": 0,
            "total_freight": 0,
            "total_gst": 0,
            "total_value": 0,
            "total_weight": 0,
            "last_order_date": None,
        })


# ============================================
# 📄 RATE & TRACKING APIS (For Jervice AI)
# ============================================

# ✅ CALCULATE FCPL RATE
@api_view(['POST'])
def calculate_fcpl_rate(request):
    """Calculate FCPL rate for given route"""
    try:
        data = request.data
        origin = data.get('origin')
        destination = data.get('destination')
        weight = float(data.get('weight', 10))
        
        # Basic rate calculation logic
        base_rate = 15  # ₹15 per kg
        fuel_surcharge_percent = 10
        docket_charge = 100
        
        freight_charge = weight * base_rate
        fuel_charge = freight_charge * (fuel_surcharge_percent / 100)
        total_charge = freight_charge + fuel_charge + docket_charge
        
        # Determine zone based on distance (simplified logic)
        # You can implement actual zone logic based on pincode database
        zone = "Green"
        is_oda = False
        
        return Response({
            "success": True,
            "chargeable_weight": weight,
            "freight_charge": round(freight_charge, 2),
            "fuel_charge": round(fuel_charge, 2),
            "docket_charge": docket_charge,
            "oda_charge": 0,
            "insurance_charge": 0,
            "appointment_charge": 0,
            "total_charge": round(total_charge, 2),
            "zone": zone,
            "is_oda": is_oda,
            "origin": origin,
            "destination": destination
        })
        
    except Exception as e:
        logger.error(f"Rate calculation error: {e}")
        return Response({
            "error": "Rate calculation failed",
            "success": False
        }, status=500)


# ✅ GET PINCODE ZONE INFORMATION
@api_view(['GET'])
def get_pincode_zone(request, pincode):
    """Get pincode zone information"""
    try:
        # You can integrate with your pincode database here
        # For now, return mock data based on pincode pattern
        
        # Sample pincode data (replace with actual database lookup)
        pincode_data = {
            "110001": {"zone": "Red", "city": "New Delhi", "state": "Delhi", "oda": False},
            "110015": {"zone": "Red", "city": "New Delhi", "state": "Delhi", "oda": False},
            "400001": {"zone": "Red", "city": "Mumbai", "state": "Maharashtra", "oda": False},
            "560001": {"zone": "Red", "city": "Bangalore", "state": "Karnataka", "oda": False},
            "700001": {"zone": "Red", "city": "Kolkata", "state": "West Bengal", "oda": False},
            "600001": {"zone": "Red", "city": "Chennai", "state": "Tamil Nadu", "oda": False},
        }
        
        # Default response
        default_response = {
            "pincode": pincode,
            "zone": "Green",
            "city": "Unknown",
            "state": "Unknown",
            "oda": False,
            "oda_charge": 0,
            "serviceable": True
        }
        
        if pincode in pincode_data:
            return Response({
                "pincode": pincode,
                **pincode_data[pincode],
                "oda_charge": 650 if pincode_data[pincode].get("oda", False) else 0,
                "serviceable": True
            })
        
        # For 6-digit pincodes, assume serviceable with Green zone
        if len(pincode) == 6 and pincode.isdigit():
            return Response({
                "pincode": pincode,
                "zone": "Green",
                "city": "Serviceable Area",
                "state": "India",
                "oda": False,
                "oda_charge": 0,
                "serviceable": True
            })
        
        return Response({
            "pincode": pincode,
            "error": "Pincode not serviceable",
            "serviceable": False
        }, status=404)
        
    except Exception as e:
        logger.error(f"Pincode lookup error: {e}")
        return Response({
            "error": "Pincode lookup failed",
            "serviceable": False
        }, status=500)


# ✅ TRACK SHIPMENT BY LR NUMBER
@api_view(['GET'])
def track_shipment(request, tracking_id):
    """Track shipment by LR number or AWB number"""
    try:
        if not SHIPMENT_MODELS_AVAILABLE:
            # Return mock tracking data
            return Response({
                "status": "in_transit",
                "lr_number": tracking_id,
                "awb_number": f"AWB{tracking_id}",
                "pickupName": "Faith Cargo Warehouse",
                "pickupPincode": "110015",
                "deliveryName": "Customer Location",
                "deliveryPincode": "400001",
                "weight": 25.5,
                "material": "General Cargo",
                "totalValue": 50000,
                "updated_at": datetime.now().isoformat(),
                "currentLocation": "Delhi Hub",
                "estimatedDelivery": (datetime.now() + timedelta(days=3)).isoformat(),
                "timeline": [
                    {"status": "Booked", "date": datetime.now().isoformat(), "location": "Delhi"},
                    {"status": "Picked Up", "date": (datetime.now() - timedelta(hours=12)).isoformat(), "location": "Delhi"},
                    {"status": "In Transit", "date": datetime.now().isoformat(), "location": "En Route"}
                ]
            })
        
        # Try to find shipment in database
        shipment = None
        try:
            shipment = Shipment.objects.get(lr_number=tracking_id)
        except Shipment.DoesNotExist:
            try:
                shipment = Shipment.objects.get(awb_number=tracking_id)
            except Shipment.DoesNotExist:
                pass
        
        if shipment:
            return Response({
                "status": getattr(shipment, 'status', 'booked'),
                "lr_number": getattr(shipment, 'lr_number', tracking_id),
                "awb_number": getattr(shipment, 'awb_number', None),
                "pickupName": getattr(shipment, 'pickup_name', None),
                "pickupPincode": getattr(shipment, 'origin_pincode', None),
                "deliveryName": getattr(shipment, 'delivery_name', None),
                "deliveryPincode": getattr(shipment, 'destination_pincode', None),
                "weight": getattr(shipment, 'weight', 0),
                "material": getattr(shipment, 'material', None),
                "totalValue": getattr(shipment, 'total_value', 0),
                "updated_at": getattr(shipment, 'updated_at', datetime.now()).isoformat(),
            })
        
        # If not found in database, return mock data
        return Response({
            "status": "booked",
            "lr_number": tracking_id,
            "awb_number": f"AWB{tracking_id}",
            "pickupName": "Faith Cargo",
            "pickupPincode": "110015",
            "deliveryName": "Customer",
            "deliveryPincode": "400001",
            "weight": 0,
            "material": "Not Available",
            "totalValue": 0,
            "updated_at": datetime.now().isoformat(),
        })
        
    except Exception as e:
        logger.error(f"Tracking error: {e}")
        return Response({
            "error": "Tracking failed",
            "status": "not_found"
        }, status=404)


# ============================================
# 📈 DASHBOARD STATS
# ============================================

# ✅ ADMIN DASHBOARD STATS
@api_view(['GET'])
def dashboard_stats(request):
    total_users = CustomUser.objects.count()
    
    if not SHIPMENT_MODELS_AVAILABLE:
        return Response({
            "total_users": total_users,
            "total_shipments": 0,
            "total_orders": 0,
            "total_revenue": 0,
            "total_gst": 0,
            "recent_shipments": 0,
            "recent_revenue": 0,
        })
    
    try:
        total_shipments = Shipment.objects.count()
        total_orders = Order.objects.count()
        
        total_revenue = Shipment.objects.aggregate(Sum('freight_amount'))['freight_amount__sum'] or 0
        total_gst = Shipment.objects.aggregate(Sum('gst_amount'))['gst_amount__sum'] or 0
        
        last_30_days = datetime.now() - timedelta(days=30)
        recent_shipments = Shipment.objects.filter(created_at__gte=last_30_days).count()
        recent_revenue = Shipment.objects.filter(created_at__gte=last_30_days).aggregate(Sum('freight_amount'))['freight_amount__sum'] or 0
        
        return Response({
            "total_users": total_users,
            "total_shipments": total_shipments,
            "total_orders": total_orders,
            "total_revenue": total_revenue,
            "total_gst": total_gst,
            "recent_shipments": recent_shipments,
            "recent_revenue": recent_revenue,
        })
        
    except Exception as e:
        logger.error(f"Dashboard stats error: {e}")
        return Response({
            "total_users": total_users,
            "total_shipments": 0,
            "total_orders": 0,
            "total_revenue": 0,
            "total_gst": 0,
            "recent_shipments": 0,
            "recent_revenue": 0,
        })