from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.hashers import make_password, check_password
from django.db.models import Sum, Q
from datetime import datetime, timedelta
from .models import CustomUser
import json

# Import Shipment models if they exist in your project
# from shipments.models import Shipment, Order

# ============================================
# 🔐 USER AUTHENTICATION & MANAGEMENT
# ============================================

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
        password=make_password(password),  # Hash password for security
        email=email,
        phone=phone,
        company=company,
        address=address,
        gstin=gstin.upper() if gstin else "",
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
        view_reports=data.get("view_reports", False),
        generate_invoice=data.get("generate_invoice", False),
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
        
        # Check password (if hashed)
        if not check_password(password, user.password):
            return Response({"error": "Invalid username or password"}, status=400)

        # Return user data with all modules
        return Response({
            "status": "success",
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "phone": user.phone,
            "company": user.company,
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
                "view_reports": user.view_reports,
                "generate_invoice": user.generate_invoice,
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
            "view_reports": user.view_reports,
            "generate_invoice": user.generate_invoice,
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
        
        # Update password if provided
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
        user.view_reports = data.get("view_reports", user.view_reports)
        user.generate_invoice = data.get("generate_invoice", user.generate_invoice)
        
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
    try:
        # Try to get orders from Order model (adjust model name as per your project)
        from shipments.models import Order  # Update import path as needed
        
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
            })
        
        return Response(orders_data)
        
    except ImportError:
        # If Order model doesn't exist, return empty list
        return Response([])
    except Exception as e:
        return Response([], status=200)


# ✅ GET USER SHIPMENTS
@api_view(['GET'])
def user_shipments(request, user_id):
    try:
        from shipments.models import Shipment  # Update import path as needed
        
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
        
    except ImportError:
        return Response([])
    except Exception as e:
        return Response([], status=200)


# ✅ GET ALL SHIPMENTS (for admin)
@api_view(['GET'])
def all_shipments(request):
    try:
        from shipments.models import Shipment
        
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
        
    except ImportError:
        return Response([])
    except Exception as e:
        return Response([], status=200)


# ✅ GET USER STATS SUMMARY
@api_view(['GET'])
def user_stats(request, user_id):
    try:
        from shipments.models import Shipment, Order
        
        # Get shipments
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
        
    except ImportError:
        return Response({
            "order_count": 0,
            "shipment_count": 0,
            "total_freight": 0,
            "total_gst": 0,
            "total_value": 0,
            "total_weight": 0,
            "last_order_date": None,
        })
    except Exception as e:
        return Response({
            "error": str(e)
        }, status=500)


# ============================================
# 📄 BILLING & INVOICE
# ============================================

# ✅ GENERATE USER BILL
@api_view(['GET'])
def user_bill(request, user_id):
    try:
        from shipments.models import Shipment
        
        start_date = request.GET.get('start')
        end_date = request.GET.get('end')
        
        # Filter shipments by date range
        shipments = Shipment.objects.filter(user_id=user_id)
        
        if start_date:
            shipments = shipments.filter(created_at__gte=start_date)
        if end_date:
            shipments = shipments.filter(created_at__lte=end_date + " 23:59:59")
        
        shipments = shipments.order_by('created_at')
        
        # Calculate totals
        total_freight = shipments.aggregate(Sum('freight_amount'))['freight_amount__sum'] or 0
        total_gst = shipments.aggregate(Sum('gst_amount'))['gst_amount__sum'] or 0
        grand_total = total_freight + total_gst
        
        # Get user details
        user = CustomUser.objects.get(id=user_id)
        
        shipments_data = []
        for shipment in shipments:
            shipments_data.append({
                "id": shipment.id,
                "lr_number": getattr(shipment, 'lr_number', 'N/A'),
                "awb_number": getattr(shipment, 'awb_number', 'N/A'),
                "created_at": shipment.created_at,
                "origin_pincode": getattr(shipment, 'origin_pincode', ''),
                "destination_pincode": getattr(shipment, 'destination_pincode', ''),
                "weight": getattr(shipment, 'weight', 0),
                "freight_amount": getattr(shipment, 'freight_amount', 0),
                "gst_amount": getattr(shipment, 'gst_amount', 0),
                "total_amount": getattr(shipment, 'total_amount', 0),
                "status": getattr(shipment, 'status', 'booked'),
            })
        
        return Response({
            "user": {
                "id": user.id,
                "username": user.username,
                "company": user.company,
                "address": user.address,
                "gstin": user.gstin,
                "email": user.email,
                "phone": user.phone,
            },
            "shipments": shipments_data,
            "total_freight": total_freight,
            "total_gst": total_gst,
            "grand_total": grand_total,
            "shipment_count": shipments.count(),
            "period": {
                "start": start_date,
                "end": end_date
            }
        })
        
    except CustomUser.DoesNotExist:
        return Response({"error": "User not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


# ============================================
# 📈 DASHBOARD STATS
# ============================================

# ✅ ADMIN DASHBOARD STATS
@api_view(['GET'])
def dashboard_stats(request):
    try:
        from shipments.models import Shipment, Order
        
        total_users = CustomUser.objects.count()
        total_shipments = Shipment.objects.count()
        total_orders = Order.objects.count()
        
        total_revenue = Shipment.objects.aggregate(Sum('freight_amount'))['freight_amount__sum'] or 0
        total_gst = Shipment.objects.aggregate(Sum('gst_amount'))['gst_amount__sum'] or 0
        
        # Last 30 days stats
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
        
    except ImportError:
        return Response({
            "total_users": CustomUser.objects.count(),
            "total_shipments": 0,
            "total_orders": 0,
            "total_revenue": 0,
            "total_gst": 0,
            "recent_shipments": 0,
            "recent_revenue": 0,
        })
    except Exception as e:
        return Response({"error": str(e)}, status=500)