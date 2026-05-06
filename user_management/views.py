# shipments/views.py - COMPLETE WITH WALLET INTEGRATION
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json
import re
import requests
from decimal import Decimal
from django.db import connection, transaction
from pincode.models import Pincode 
from utils.notifications import send_order_notification
from datetime import datetime

# Add this right after your imports, before any other functions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

# Django
from django.contrib.auth.hashers import make_password, check_password
from django.db.models import Sum, Count, Q
from django.db import connection
from django.core.exceptions import ObjectDoesNotExist
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings

# Python
from datetime import datetime, timedelta
from decimal import Decimal
import logging
import uuid
import json
# Razorpay
import razorpay

# Local imports
from .models import (
    CustomUser, ClientProfile, ClientRateMatrix, ClientRatePolicy, 
    ClientSession, ClientOrderSummary, ClientWallet, RechargeHistory, 
    WalletTransaction, RechargeRequest
)

# Setup logging
logger = logging.getLogger(__name__)

# Try to import Shipment models
try:
    from shipments.models import Order
    SHIPMENT_MODELS_AVAILABLE = True
except ImportError:
    SHIPMENT_MODELS_AVAILABLE = False
    logger.warning("Shipment models not available.")

# Initialize Razorpay client
razorpay_client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


# ============================================
# 🔧 TEST API ENDPOINT
# ============================================

@api_view(['GET'])
@permission_classes([AllowAny])
def test_api(request):
    """Test API endpoint to check if server is running"""
    return Response({
        "status": "success",
        "message": "User Management API is working!",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
        "endpoints": [
            "/api/user/admin-login/",
            "/api/user/login/",
            "/api/user/add-user/",
            "/api/user/users/",
            "/api/user/clients/",
            "/api/user/wallet/balance/",
            "/api/user/wallet/recharge-request/",
            "/api/user/wallet/recharge-history/",
            "/api/user/admin/recharges/",
            "/api/user/create-razorpay-order/",
            "/api/user/verify-razorpay-payment/"
        ]
    })
# =====================================================
# 🛠️ HELPER: LR FORMATTER (Numbers ko FCPL0001 banata hai)
# =====================================================
def format_lr(number):
    try:
        return f"FCPL{int(number):04d}"
    except:
        return f"FCPL{number}"

def format_awb(number):
    """Format AWB number"""
    try:
        return f"AWB{int(number):06d}"
    except:
        return f"AWB{number}"

# 🔢 LR + AWB GENERATOR
def generate_numbers(cursor):
    cursor.execute("SELECT lr_number, awb_number FROM counters WHERE id=1 FOR UPDATE")
    row = cursor.fetchone()
    
    if not row:
        cursor.execute("INSERT INTO counters (id, lr_number, awb_number) VALUES (1, 0, 5000)")
        new_lr, new_awb = 1, 5001
    else:
        new_lr = row[0] + 1
        new_awb = row[1] + 1
        
    cursor.execute("UPDATE counters SET lr_number=%s, awb_number=%s WHERE id=1", [new_lr, new_awb])
    return new_lr, new_awb

# 📍 Saare Pincodes ki list
def get_locations(request):
    try:
        locations = Pincode.objects.all().values('pincode', 'city', 'state', 'zone', 'is_oda')
        return JsonResponse(list(locations), safe=False)
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=500)

# 💰 DYNAMIC FREIGHT CALCULATOR (Using 'rates' app)

@csrf_exempt
def calculate_freight(request):
    if request.method == "POST":
        try:
            from rates.models import RateMatrix 
            
            data = json.loads(request.body)
            origin_pin = data.get("origin")
            dest_pin = data.get("destination")
            weight = Decimal(str(data.get("weight", 0)))
            payment_mode = data.get("paymentMode", "prepaid")

            origin_obj = Pincode.objects.filter(pincode=origin_pin).first()
            dest_obj = Pincode.objects.filter(pincode=dest_pin).first()

            if not origin_obj or not dest_obj:
                return JsonResponse({"success": False, "error": "Pincode database mein nahi mila"}, status=404)

            matrix = RateMatrix.objects.filter(from_zone=origin_obj.zone, to_zone=dest_obj.zone).first()
            if not matrix:
                return JsonResponse({"success": False, "error": f"No rate found: {origin_obj.zone} to {dest_obj.zone}"}, status=404)

            rate_per_kg = Decimal(str(matrix.rate))
            freight = weight * rate_per_kg
            
            # ODA Charges
            oda = Decimal("0")
            is_oda = False
            if origin_obj.is_oda or dest_obj.is_oda:
                is_oda = True
                oda = max(Decimal("650"), weight * Decimal("3"))

            # Additional Charges
            docket_charge = Decimal("100")
            fuel_surcharge = freight * Decimal("0.10")
            
            total_before_gst = freight + oda + docket_charge + fuel_surcharge
            gst = total_before_gst * Decimal("0.18")
            grand_total = total_before_gst + gst
            
            # Minimum charge
            if grand_total < 650:
                grand_total = Decimal("650")

            return JsonResponse({
                "success": True,
                "from_zone": origin_obj.zone,
                "to_zone": dest_obj.zone,
                "rate_per_kg": float(rate_per_kg),
                "freight_charge": float(freight),
                "oda_charge": float(oda),
                "is_oda": is_oda,
                "docket_charge": float(docket_charge),
                "fuel_charge": float(fuel_surcharge),
                "total_before_gst": float(total_before_gst),
                "gst": float(gst),
                "total_charge": float(grand_total)
            })
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=500)


# =====================================================
# 🤖 JERVICE AI - INTELLIGENT ASSISTANT
# =====================================================

def extract_docket_number(text):
    """Auto-extract docket/LR number from any text"""
    clean_text = text.replace('FCPL', '').upper()
    
    patterns = [
        r'\b\d{8,15}\b',
        r'\b\d{4,8}\b',
        r'LR[:\s]*(\d+)',
        r'DOCKET[:\s]*(\d+)',
        r'AWB[:\s]*(\d+)',
        r'FCPL\s*(\d+)',
        r'#(\d+)'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, clean_text, re.IGNORECASE)
        if match:
            return match.group(1) if match.groups() else match.group(0)
    return None

def extract_pincode(text):
    """Extract 6-digit pincode from text"""
    match = re.search(r'\b\d{6}\b', text)
    return match.group(0) if match else None

def get_shipment_by_lr(lr_number):
    """Fetch shipment details from database"""
    try:
        clean_lr = str(lr_number).replace('FCPL', '').strip()
        cursor = connection.cursor()
        cursor.execute("""
            SELECT id, lr_number, awb_number, pickup_pincode, delivery_pincode, 
                   pickup_name, delivery_name, weight, status, 
                   pickup_address, delivery_address, material, total_value,
                   created_at, booking_mode, pickup_gstin, delivery_gstin, client_id,
                   freight_amount
            FROM orders 
            WHERE lr_number = %s OR awb_number = %s
        """, [clean_lr, clean_lr])
        
        row = cursor.fetchone()
        if row:
            columns = [col[0] for col in cursor.description]
            return dict(zip(columns, row))
        return None
    except Exception as e:
        print(f"Database error: {e}")
        return None

def update_shipment_status(lr_number, new_status):
    """Update shipment status in database"""
    try:
        clean_lr = str(lr_number).replace('FCPL', '').strip()
        cursor = connection.cursor()
        cursor.execute("""
            UPDATE orders 
            SET status = %s, updated_at = %s 
            WHERE lr_number = %s OR awb_number = %s
        """, [new_status, datetime.now(), clean_lr, clean_lr])
        
        if cursor.rowcount > 0:
            return True
        return False
    except Exception as e:
        print(f"Status update error: {e}")
        return False

def get_shipment_status_text(status):
    """Convert status to Hindi style"""
    status_map = {
        'booked': '📦 **BOOKED!** Order register ho gaya hai. Abhi pickup pending hai.',
        'picked': '🚚 **PICKED UP!** Driver ne pickup kar liya. Warehouse mein process hoga.',
        'in_transit': '🔄 **IN TRANSIT!** Shipment road par hai. Agle hub mein pahunch raha hai.',
        'out_for_delivery': '🎯 **OUT FOR DELIVERY!** Aaj hi deliver hoga.',
        'delivered': '✅ **DELIVERED!** Shipment deliver ho chuka hai.',
        'cancelled': '❌ **CANCELLED!** Order cancel ho gaya.',
        'hold': '⏸️ **ON HOLD!** Kuch verification pending hai.',
        'dispatched': '✈️ **DISPATCHED!** Shipment dispatch ho chuka hai.'
    }
    return status_map.get(status.lower(), f'ℹ️ Current status: {status}')

def calculate_rate_hindi(origin, destination, weight=10):
    """Calculate rate with Hindi explanation"""
    try:
        from rates.models import RateMatrix
        
        origin_pin = None
        dest_pin = None
        
        if origin.isdigit() and len(origin) == 6:
            origin_pin = Pincode.objects.filter(pincode=origin).first()
        else:
            origin_pin = Pincode.objects.filter(city__icontains=origin).first()
            
        if destination.isdigit() and len(destination) == 6:
            dest_pin = Pincode.objects.filter(pincode=destination).first()
        else:
            dest_pin = Pincode.objects.filter(city__icontains=destination).first()
        
        if not origin_pin or not dest_pin:
            return f"⚠️ Sir, {origin} se {destination} ka rate nikalne ke liye sahi pincode chahiye."
        
        matrix = RateMatrix.objects.filter(
            from_zone=origin_pin.zone, 
            to_zone=dest_pin.zone
        ).first()
        
        if matrix:
            rate = float(matrix.rate)
            freight = rate * weight
            oda_charge = 0
            if origin_pin.is_oda or dest_pin.is_oda:
                oda_charge = max(650, weight * 3)
            
            total = freight + oda_charge + 100 + (freight * 0.10)
            gst = total * 0.18
            grand_total = total + gst
            
            return f"""💰 **RATE CALCULATION!**

📍 **Route:** {origin} → {destination}
📊 **Weight:** {weight} kg
💵 **Rate:** ₹{rate}/kg

**Breakdown:**
• Base Freight: ₹{freight:,.2f}
• Fuel Surcharge (10%): ₹{freight * 0.10:,.2f}
• Docket Charge: ₹100
• ODA Charge: ₹{oda_charge:,.2f}
• GST (18%): ₹{gst:,.2f}

💰 **TOTAL:** ₹{grand_total:,.2f}

Kya main booking process start kar doon, Sir?"""
        else:
            return f"⚠️ Sir, {origin_pin.zone} se {dest_pin.zone} ka rate database mein nahi hai."
    except Exception as e:
        return f"Technical issue: {str(e)}"

def get_all_shipments_summary(client_id=None):
    """Get summary of all shipments (optionally filtered by client)"""
    try:
        cursor = connection.cursor()
        if client_id:
            cursor.execute("""
                SELECT COUNT(*), 
                       SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END),
                       SUM(CASE WHEN status = 'in_transit' THEN 1 ELSE 0 END),
                       SUM(CASE WHEN status = 'booked' THEN 1 ELSE 0 END),
                       COALESCE(SUM(freight_amount), 0)
                FROM orders WHERE client_id = %s
            """, [client_id])
        else:
            cursor.execute("""
                SELECT COUNT(*), 
                       SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END),
                       SUM(CASE WHEN status = 'in_transit' THEN 1 ELSE 0 END),
                       SUM(CASE WHEN status = 'booked' THEN 1 ELSE 0 END),
                       COALESCE(SUM(freight_amount), 0)
                FROM orders
            """)
        row = cursor.fetchone()
        return {
            'total': row[0] or 0,
            'delivered': row[1] or 0,
            'in_transit': row[2] or 0,
            'booked': row[3] or 0,
            'total_freight': float(row[4]) if row[4] else 0
        }
    except Exception as e:
        return {'total': 0, 'delivered': 0, 'in_transit': 0, 'booked': 0, 'total_freight': 0}

@csrf_exempt
def jervice_intelligent_chat(request):
    """Jervice AI - Hindi Assistant"""
    if request.method != "POST":
        return JsonResponse({"reply": "Sir, POST method use karein."}, status=405)
    
    try:
        data = json.loads(request.body)
        user_query = data.get('prompt', '').lower()
        
        docket_number = extract_docket_number(user_query)
        
        if docket_number and any(word in user_query for word in ['update status', 'status update', 'change status', 'set status', 'dispatch', 'deliver']):
            new_status = None
            status_keywords = {
                'booked': ['book', 'confirm'],
                'picked': ['pick', 'pickup', 'collect'],
                'in_transit': ['transit', 'send', 'dispatch', 'start'],
                'out_for_delivery': ['out', 'delivery', 'near', 'almost'],
                'delivered': ['deliver', 'complete', 'done', 'finish'],
                'cancelled': ['cancel', 'stop', 'hold'],
                'hold': ['hold', 'pause', 'wait']
            }
            
            for status, keywords in status_keywords.items():
                if any(keyword in user_query for keyword in keywords):
                    new_status = status
                    break
            
            if new_status:
                success = update_shipment_status(docket_number, new_status)
                if success:
                    reply = f"""✅ **STATUS UPDATED!**

Sir, docket FCPL{docket_number} ka status **{new_status.upper()}** kar diya gaya.

{get_shipment_status_text(new_status)}"""
                else:
                    reply = f"❌ Sir, docket {docket_number} ka status update nahi ho paya."
            else:
                reply = f"""📝 **STATUS UPDATE HELP!**

Sir, docket {docket_number} ka status update karne ke liye batao:

• picked - Pickup ho gaya
• in_transit - Transit mein bhejna hai
• out_for_delivery - Delivery ke liye bhejna hai
• delivered - Deliver ho gaya
• cancelled - Cancel karna hai"""
        
        elif docket_number:
            shipment = get_shipment_by_lr(docket_number)
            
            if shipment:
                status_text = get_shipment_status_text(shipment['status'])
                reply = f"""🎤 **SHIPMENT TRACKING!**

📋 **Docket:** FCPL{shipment['lr_number']}
🔢 **AWB:** {shipment.get('awb_number', 'N/A')}
📊 **Status:** {status_text}
💰 **Freight:** ₹{shipment.get('freight_amount', 0):,.2f}

📍 **Route:**
• From: {shipment['pickup_pincode']} - {shipment.get('pickup_name', 'N/A')}
• To: {shipment['delivery_pincode']} - {shipment.get('delivery_name', 'N/A')}

📦 **Details:**
• Weight: {shipment['weight']} kg
• Material: {shipment.get('material', 'General Cargo')}
• Value: ₹{shipment.get('total_value', 0):,.2f}"""
            else:
                reply = f"⚠️ **SORRY SIR!** Docket {docket_number} humare system mein nahi mila."
        
        elif 'pincode' in user_query or 'pin code' in user_query:
            pincode = extract_pincode(user_query)
            if pincode:
                try:
                    pin_obj = Pincode.objects.filter(pincode=pincode).first()
                    if pin_obj:
                        oda_status = "✅ Regular Area" if not pin_obj.is_oda else "⚠️ ODA Area (Extra charges apply)"
                        reply = f"""📍 **PINCODE STATUS - {pincode}**

📌 **Zone:** {pin_obj.zone}
🏙️ **City:** {pin_obj.city}
🗺️ **State:** {pin_obj.state}
📊 **ODA Status:** {oda_status}

💰 **ODA Charges:** {"₹650 or ₹3/kg" if pin_obj.is_oda else "No ODA charges"}"""
                    else:
                        reply = f"❌ Sir, pincode {pincode} database mein nahi hai."
                except Exception as e:
                    reply = f"Technical error: {str(e)}"
            else:
                reply = "Sir, 6-digit pincode batao jaise '110001'"
        
        elif any(word in user_query for word in ['rate', 'bhada', 'price', 'kitna', 'charges']):
            city_pattern = r'([\w\s]+?)\s+se\s+([\w\s]+?)(?:\s+ka|\s+ke|\s+ki|\s+for|\s+to|$)'
            cities = re.search(city_pattern, user_query)
            
            if cities:
                origin = cities.group(1).strip()
                destination = cities.group(2).strip()
                weight_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:kg|kilo|किलो)', user_query)
                weight = float(weight_match.group(1)) if weight_match else 10
                reply = calculate_rate_hindi(origin, destination, weight)
            else:
                reply = "Sir, location batao jaise 'Mumbai se Delhi ka rate'"
        
        elif any(word in user_query for word in ['summary', 'stats', 'total', 'kitne order']):
            stats = get_all_shipments_summary()
            reply = f"""📊 **SHIPMENT SUMMARY!**

Sir, total {stats['total']} orders hain:

✅ Delivered: {stats['delivered']}
🚚 In Transit: {stats['in_transit']}
📝 Booked: {stats['booked']}
💰 Total Freight: ₹{stats['total_freight']:,.2f}"""
        
        elif any(word in user_query for word in ['help', 'madad', 'sahayata', 'kya kar sakte ho']):
            reply = """🎤 **JERVICE AI - COMPLETE FEATURES!**

✅ Track Shipment - "Docket FCPL0001 track karo"
✅ Update Status - "Docket FCPL0001 status update karo delivered"
✅ Rate Check - "Mumbai se Delhi ka rate 50kg"
✅ Pincode Check - "Check pincode 110001"
✅ Order Summary - "Kitne order hain"
✅ Wallet Help - "Wallet recharge kaise kare"

Kya aapko kisi cheez mein madad chahiye, Sir?"""
        
        else:
            reply = """🎤 **SUNIYE!** Main aapka logistics assistant hoon.

Mujhse puchiye:
• "Docket FCPL0001 track karo"
• "Mumbai se Delhi ka rate"
• "Check pincode 110001"
• "Kitne order hain"
• "Help" - Poori commands ke liye"""

        return JsonResponse({
            "reply": reply,
            "detected_docket": docket_number,
            "voice_style": "hindi",
            "success": True
        })
        
    except json.JSONDecodeError:
        return JsonResponse({"reply": "Sir, sahi format mein bhejiye.", "success": False}, status=400)
    except Exception as e:
        return JsonResponse({"reply": f"⚠️ Technical glitch, Sir. Error: {str(e)}", "success": False}, status=500)


# =====================================================
# 💰 CHECK WALLET BALANCE BEFORE ORDER
# =====================================================
@csrf_exempt
def check_wallet_balance(request):
    """Check if client has sufficient balance before creating order"""
    if request.method == "GET":
        try:
            client_id = request.GET.get('clientId')
            freight_amount = Decimal(str(request.GET.get('freight_amount', 0)))
            
            if not client_id:
                return JsonResponse({
                    "success": False,
                    "error": "Client ID required"
                }, status=400)
            
            # Import wallet models
            from user_management.models import CustomUser, ClientWallet
            
            client_user = CustomUser.objects.filter(client_id=client_id, role='Client').first()
            
            if not client_user:
                return JsonResponse({
                    "success": False,
                    "error": f"Client '{client_id}' not found"
                }, status=404)
            
            wallet, created = ClientWallet.objects.get_or_create(client=client_user)
            has_balance = wallet.has_sufficient_balance(freight_amount)
            
            return JsonResponse({
                "success": True,
                "has_balance": has_balance,
                "current_balance": float(wallet.balance),
                "required_amount": float(freight_amount),
                "shortfall": float(max(0, freight_amount - wallet.balance)),
                "low_balance_warning": wallet.get_low_balance_warning(),
                "message": "Sufficient balance" if has_balance else f"Insufficient balance. Need ₹{freight_amount - wallet.balance:,.2f} more."
            }, status=200)
            
        except Exception as e:
            print(f"Balance check error: {e}")
            return JsonResponse({
                "success": False,
                "error": str(e)
            }, status=500)
    
    return JsonResponse({"error": "Method not allowed"}, status=405)


# =====================================================
# 📦 CREATE ORDER (WITH WALLET DEDUCTION)
# =====================================================
@csrf_exempt
def create_order(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            
            client_id = data.get("clientId")
            freight_amount = Decimal(str(data.get("freight_amount", 0)))
            
            # 🔥 CHECK WALLET BALANCE FIRST
            if client_id and freight_amount > 0:
                try:
                    from user_management.models import CustomUser, ClientWallet
                    
                    client_user = CustomUser.objects.filter(client_id=client_id, role='Client').first()
                    
                    if client_user:
                        wallet, created = ClientWallet.objects.get_or_create(client=client_user)
                        
                        if not wallet.has_sufficient_balance(freight_amount):
                            return JsonResponse({
                                "success": False,
                                "error": f"Insufficient wallet balance! Available: ₹{wallet.balance}, Required: ₹{freight_amount}",
                                "current_balance": float(wallet.balance),
                                "shortfall": float(freight_amount - wallet.balance)
                            }, status=400)
                except Exception as e:
                    print(f"⚠️ Wallet check error: {e}")
            
            with transaction.atomic():
                cursor = connection.cursor()
                lr_raw, awb_raw = generate_numbers(cursor)
                formatted_lr = format_lr(lr_raw)
                formatted_awb = format_awb(awb_raw)

                pickup_gstin = data.get("pickupGstin")
                delivery_gstin = data.get("deliveryGstin")
                
                # Ensure columns exist
                try:
                    cursor.execute("""
                        SELECT column_name FROM information_schema.columns 
                        WHERE table_name='orders' AND column_name='client_id'
                    """)
                    if not cursor.fetchone():
                        cursor.execute("ALTER TABLE orders ADD COLUMN client_id VARCHAR(50)")
                        cursor.execute("CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id)")
                    
                    cursor.execute("""
                        SELECT column_name FROM information_schema.columns 
                        WHERE table_name='orders' AND column_name='freight_amount'
                    """)
                    if not cursor.fetchone():
                        cursor.execute("ALTER TABLE orders ADD COLUMN freight_amount DECIMAL(15,2) DEFAULT 0")
                except:
                    pass
                
                cursor.execute("""
                    INSERT INTO orders (
                        lr_number, awb_number, client_id, freight_amount,
                        pickup_name, pickup_address, pickup_pincode, pickup_contact, pickup_gstin,
                        delivery_name, delivery_address, delivery_pincode, delivery_contact, delivery_gstin,
                        material, hsn_code, boxes, weight, actual_weight, volumetric_weight, 
                        total_value, eway_bill, status, booking_mode, created_at, updated_at
                    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id
                """, [
                    lr_raw, formatted_awb, client_id, float(freight_amount),
                    data.get("pickupName"), data.get("pickupAddress"), data.get("pickupPincode"), 
                    data.get("pickupContact"), pickup_gstin,
                    data.get("deliveryName"), data.get("deliveryAddress"), data.get("deliveryPincode"), 
                    data.get("deliveryContact"), delivery_gstin,
                    data.get("material", "General Cargo"), data.get("hsn", "1234"), data.get("boxes", 0),
                    data.get("weight", 0), data.get("actual_weight", 0), data.get("volumetric_weight", 0),
                    data.get("total_value", 0), data.get("eway_bill"), "booked",
                    data.get("booking_mode", "surface"), datetime.now(), datetime.now()
                ])
                order_id = cursor.fetchone()[0]

                # 🔥 DEDUCT FROM WALLET AFTER ORDER CREATED
                balance_remaining = None
                if client_id and freight_amount > 0:
                    try:
                        from user_management.models import CustomUser, ClientWallet
                        from django.utils import timezone
                        
                        client_user = CustomUser.objects.filter(client_id=client_id, role='Client').first()
                        
                        if client_user:
                            wallet, created = ClientWallet.objects.get_or_create(client=client_user)
                            before_balance = wallet.balance
                            success = wallet.deduct_balance(freight_amount, order_id=formatted_lr)
                            
                            if success:
                                balance_remaining = float(wallet.balance)
                                print(f"✅ Wallet deducted: ₹{freight_amount} from {client_id}. New balance: ₹{balance_remaining}")
                                
                                # Update client profile stats
                                try:
                                    from user_management.models import ClientProfile
                                    profile, created = ClientProfile.objects.get_or_create(client=client_user)
                                    profile.total_orders += 1
                                    profile.total_shipments += 1
                                    profile.total_freight += freight_amount
                                    profile.last_order_date = timezone.now()
                                    profile.save()
                                except Exception as e:
                                    print(f"⚠️ Profile update error: {e}")
                            else:
                                print(f"⚠️ Wallet deduction failed for {client_id}")
                    except Exception as e:
                        print(f"⚠️ Wallet deduction error (order still created): {e}")

                # Insert invoices
                for inv in data.get("invoices", []):
                    if inv.get("invoice_no"):
                        cursor.execute("""
                            INSERT INTO invoices (order_id, invoice_no, invoice_value) 
                            VALUES (%s,%s,%s)
                        """, [order_id, inv["invoice_no"], inv.get("invoice_value", 0)])

                # Send notification
                try:
                    notification_data = {
                        'lr_number': formatted_lr,
                        'awb': formatted_awb,
                        'pickup_pincode': data.get("pickupPincode"),
                        'delivery_pincode': data.get("deliveryPincode"),
                        'weight': data.get("weight", 0),
                        'total_value': data.get("total_value", 0),
                        'pickup_contact': data.get("pickupContact"),
                        'delivery_contact': data.get("deliveryContact"),
                        'pickup_name': data.get("pickupName"),
                        'delivery_name': data.get("deliveryName"),
                    }
                    send_order_notification(notification_data)
                    print(f"✅ Notification sent for order: {formatted_lr}")
                except Exception as e:
                    print(f"⚠️ Notification error (order still created): {e}")

                return JsonResponse({
                    "success": True, 
                    "lr_number": formatted_lr, 
                    "awb": formatted_awb,
                    "freight_amount": float(freight_amount),
                    "client_id": client_id,
                    "balance_remaining": balance_remaining,
                    "message": "Order created successfully!"
                })
                
        except Exception as e:
            print(f"Create order error: {str(e)}")
            return JsonResponse({"success": False, "error": f"Database Error: {str(e)}"}, status=500)
    
    return JsonResponse({"error": "Method not allowed"}, status=405)


# =====================================================
# 📋 SHIPMENT LIST (with client filter and freight amount)
# =====================================================
def shipment_list(request):
    cursor = connection.cursor()
    
    client_id = request.GET.get('clientId')
    
    if client_id:
        cursor.execute("""
            SELECT lr_number, awb_number, pickup_pincode, delivery_pincode, 
                   total_value, status, weight, created_at, freight_amount
            FROM orders WHERE client_id = %s ORDER BY id DESC
        """, [client_id])
    else:
        cursor.execute("""
            SELECT lr_number, awb_number, pickup_pincode, delivery_pincode, 
                   total_value, status, weight, created_at, freight_amount
            FROM orders ORDER BY id DESC
        """)
    
    rows = cursor.fetchall()
    
    data = [{
        "lr": format_lr(r[0]),
        "awb": r[1],
        "route": f"{r[2]} → {r[3]}",
        "value": float(r[4]) if r[4] else 0,
        "status": r[5],
        "weight": float(r[6]) if r[6] else 0,
        "date": r[7].strftime("%Y-%m-%d %H:%M") if r[7] else "N/A",
        "freight": float(r[8]) if r[8] else 0
    } for r in rows]
    
    return JsonResponse(data, safe=False)


# =====================================================
# 🔍 SHIPMENT DETAIL
# =====================================================
def shipment_detail(request, lr):
    clean_lr = str(lr).replace("FCPL", "")
    cursor = connection.cursor()
    cursor.execute("SELECT * FROM orders WHERE lr_number=%s OR awb_number=%s", [clean_lr, clean_lr])
    
    row = cursor.fetchone()
    if not row:
        return JsonResponse({"error": "Shipment not found"}, status=404)

    columns = [col[0] for col in cursor.description]
    order_data = dict(zip(columns, row))
    
    cursor.execute("SELECT invoice_no, invoice_value FROM invoices WHERE order_id=%s", [order_data['id']])
    inv_rows = cursor.fetchall()
    
    return JsonResponse({
        "success": True,
        "lr": format_lr(order_data['lr_number']),
        "awb": order_data.get('awb_number'),
        "clientId": order_data.get('client_id'),
        "freightAmount": float(order_data.get('freight_amount', 0)),
        "pickupName": order_data.get('pickup_name'),
        "pickupAddress": order_data.get('pickup_address'),
        "pickupPincode": order_data.get('pickup_pincode'),
        "pickupContact": order_data.get('pickup_contact'),
        "pickupGstin": order_data.get('pickup_gstin'),
        "deliveryName": order_data.get('delivery_name'),
        "deliveryAddress": order_data.get('delivery_address'),
        "deliveryPincode": order_data.get('delivery_pincode'),
        "deliveryContact": order_data.get('delivery_contact'),
        "deliveryGstin": order_data.get('delivery_gstin'),
        "material": order_data.get('material'),
        "hsnCode": order_data.get('hsn_code'),
        "boxes": order_data.get('boxes'),
        "weight": float(order_data['weight']) if order_data.get('weight') else 0,
        "actualWeight": float(order_data.get('actual_weight', 0)),
        "volumetricWeight": float(order_data.get('volumetric_weight', 0)),
        "totalValue": float(order_data.get('total_value', 0)),
        "ewayBill": order_data.get('eway_bill'),
        "status": order_data.get('status', 'booked'),
        "bookingMode": order_data.get('booking_mode', 'surface'),
        "createdAt": order_data.get('created_at'),
        "updatedAt": order_data.get('updated_at'),
        "invoices": [{"invoiceNo": r[0], "invoiceValue": float(r[1])} for r in inv_rows]
    })


# =====================================================
# ✏️ UPDATE SHIPMENT
# =====================================================
@csrf_exempt
def update_shipment(request, lr):
    if request.method == "PUT":
        try:
            data = json.loads(request.body)
            clean_lr = str(lr).replace("FCPL", "")
            
            with transaction.atomic():
                cursor = connection.cursor()
                cursor.execute("""
                    UPDATE orders SET
                        pickup_name = %s, pickup_pincode = %s, pickup_contact = %s,
                        delivery_name = %s, delivery_pincode = %s, delivery_contact = %s,
                        weight = %s, total_value = %s, status = %s, updated_at = %s
                    WHERE lr_number = %s OR awb_number = %s
                """, [
                    data.get("pickupName"), data.get("pickupPincode"), data.get("pickupContact"),
                    data.get("deliveryName"), data.get("deliveryPincode"), data.get("deliveryContact"),
                    data.get("weight"), data.get("total_value"), data.get("status", "booked"),
                    datetime.now(), clean_lr, clean_lr
                ])
                
                if cursor.rowcount > 0:
                    return JsonResponse({"success": True, "message": "Shipment updated successfully"})
                return JsonResponse({"success": False, "error": "Shipment not found"}, status=404)
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=500)
    return JsonResponse({"error": "Method not allowed"}, status=405)


# =====================================================
# 🎯 UPDATE STATUS ONLY
# =====================================================
@csrf_exempt
def update_shipment_status_only(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            lr_number = data.get("lr")
            new_status = data.get("status")
            
            if not lr_number or not new_status:
                return JsonResponse({"success": False, "error": "LR number and status required"}, status=400)
            
            success = update_shipment_status(lr_number, new_status)
            if success:
                return JsonResponse({"success": True, "message": f"Status updated to {new_status}"})
            return JsonResponse({"success": False, "error": "Shipment not found"}, status=404)
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=500)
    return JsonResponse({"error": "Method not allowed"}, status=405)


# =====================================================
# 🗑️ DELETE SHIPMENT
# =====================================================
@csrf_exempt
def delete_shipment(request, lr):
    if request.method == "DELETE":
        try:
            clean_lr = str(lr).replace("FCPL", "")
            with transaction.atomic():
                cursor = connection.cursor()
                cursor.execute("DELETE FROM invoices WHERE order_id IN (SELECT id FROM orders WHERE lr_number=%s)", [clean_lr])
                cursor.execute("DELETE FROM orders WHERE lr_number=%s OR awb_number=%s", [clean_lr, clean_lr])
                
                if cursor.rowcount > 0:
                    return JsonResponse({"success": True, "message": "Deleted successfully"})
                return JsonResponse({"success": False, "error": "Shipment not found"}, status=404)
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=500)
    return JsonResponse({"error": "Method not allowed"}, status=405)


# =====================================================
# 📍 ADD/UPDATE LOCATION
# =====================================================
@csrf_exempt
def add_location(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            pincode = data.get("pincode")
            city = data.get("city")
            state = data.get("state")
            zone = data.get("zone")
            is_oda = data.get("is_oda", False)
            
            obj, created = Pincode.objects.update_or_create(
                pincode=pincode,
                defaults={
                    "city": city,
                    "state": state,
                    "zone": zone,
                    "is_oda": is_oda
                }
            )
            return JsonResponse({
                "success": True, 
                "message": "Location added/updated successfully",
                "created": created
            })
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=500)
    return JsonResponse({"error": "Method not allowed"}, status=405)


# =====================================================
# 📊 DASHBOARD STATS (with client filter)
# =====================================================
def dashboard_stats(request):
    client_id = request.GET.get('clientId')
    stats = get_all_shipments_summary(client_id)
    return JsonResponse(stats)


# =====================================================
# 📋 CLIENT ORDERS - FULLY FIXED
# =====================================================
def client_orders(request, client_id):
    """
    Get all orders for a specific client - ONLY their orders
    """
    from django.db import connection
    from django.http import JsonResponse
    
    cursor = connection.cursor()
    
    print(f"🔍 === CLIENT ORDERS DEBUG ===")
    print(f"Client ID requested: '{client_id}'")
    
    try:
        cursor.execute("""
            SELECT lr_number, awb_number, pickup_pincode, delivery_pincode, 
                   total_value, status, weight, created_at, freight_amount
            FROM orders 
            WHERE client_id = %s 
            ORDER BY id DESC
        """, [client_id])
        
        rows = cursor.fetchall()
        
        print(f"✅ Found {len(rows)} orders for client '{client_id}'")
        
        data = []
        for r in rows:
            data.append({
                "lr": format_lr(r[0]),
                "awb": r[1] if r[1] else "N/A",
                "pickupPincode": r[2] if r[2] else "N/A",
                "deliveryPincode": r[3] if r[3] else "N/A",
                "route": f"{r[2] or 'N/A'} → {r[3] or 'N/A'}",
                "total_value": float(r[4]) if r[4] else 0,
                "value": float(r[4]) if r[4] else 0,
                "status": r[5] if r[5] else "booked",
                "weight": float(r[6]) if r[6] else 0,
                "created_at": r[7].strftime("%Y-%m-%d %H:%M") if r[7] else "N/A",
                "date": r[7].strftime("%Y-%m-%d %H:%M") if r[7] else "N/A",
                "freight_amount": float(r[8]) if r[8] else 0,
                "freight": float(r[8]) if r[8] else 0,
                "clientId": client_id
            })
        
        return JsonResponse(data, safe=False)
        
    except Exception as e:
        print(f"❌ Database error: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)


# =====================================================
# 📱 SEND NOTIFICATION API (For frontend to call)
# =====================================================
@csrf_exempt
def send_notification_api(request):
    """API endpoint to send SMS/WhatsApp notifications"""
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            notification_data = {
                'lr_number': data.get('lrNumber'),
                'awb': data.get('awb'),
                'pickup_pincode': data.get('pickupPincode'),
                'delivery_pincode': data.get('deliveryPincode'),
                'weight': data.get('weight'),
                'total_value': data.get('totalValue'),
                'pickup_contact': data.get('pickupContact'),
                'delivery_contact': data.get('deliveryContact'),
                'pickup_name': data.get('pickupName'),
                'delivery_name': data.get('deliveryName'),
            }
            result = send_order_notification(notification_data)
            return JsonResponse({"success": True, "message": "Notification sent", "result": result})
        except Exception as e:
            print(f"Notification API error: {e}")
            return JsonResponse({"success": False, "error": str(e)}, status=500)
    return JsonResponse({"error": "Method not allowed"}, status=405)

# ============================================
# 🔐 AUTHENTICATION FUNCTIONS
# ============================================

@api_view(['POST'])
@permission_classes([AllowAny])
def admin_login(request):
    """Admin/Superuser login"""
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
    """Regular user login"""
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
    
# ============================================
# 👥 USER MANAGEMENT CRUD FUNCTIONS
# ============================================

@api_view(['POST'])
def add_user(request):
    """Add a new user"""
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
    """Get all users"""
    users = CustomUser.objects.filter(role__in=['Admin', 'User']).values(
        "id", "username", "email", "phone", "company", 
        "address", "gstin", "created_at", "role"
    )
    return Response(list(users))


@api_view(['GET'])
def user_detail(request, id):
    """Get single user details"""
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
            "created_at": user.created_at,
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
    """Update user details"""
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
    """Delete user"""
    try:
        user = CustomUser.objects.get(id=id)
        user.delete()
        return Response({"status": "User deleted successfully"})
    except CustomUser.DoesNotExist:
        return Response({"error": "User not found"}, status=404)


@api_view(['GET'])
def client_list(request):
    """Get all clients"""
    clients = CustomUser.objects.filter(role='Client')
    
    client_data = []
    for client in clients:
        profile = ClientProfile.objects.filter(client=client).first()
        
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
            "created_at": client.created_at
        })
    
    return Response(client_data, status=200)


@api_view(['POST'])
def create_client(request):
    """Create a new client"""
    try:
        data = request.data
        
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
        
        if CustomUser.objects.filter(client_id=client_id).exists():
            return Response({"error": f"Client ID '{client_id}' already exists"}, status=400)
        
        username = client_id.lower()
        
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
        )
        
        ClientProfile.objects.get_or_create(client=user)
        ClientRatePolicy.objects.get_or_create(client=user, defaults={'is_custom': False})
        
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
        return Response({"error": str(e)}, status=500)


@api_view(['PUT'])
def update_client_status(request, client_id):
    """Update client active status"""
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
    """Deactivate client"""
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
    """Get client order summary"""
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
# 📊 USER STATISTICS & SHIPMENTS FUNCTIONS
# ============================================

@api_view(['GET'])
def user_orders(request, user_id):
    """Get orders for a specific user"""
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
    """Get shipments for a specific user"""
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
    """Get statistics for a specific user"""
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
    """Get all shipments (admin view)"""
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
        return Response([])


@api_view(['POST'])
def calculate_fcpl_rate(request):
    """Calculate FCPL rate (mock response)"""
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
    """Get pincode zone information"""
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
    """Track shipment by LR/AWB number"""
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
        return Response({
            "status": "in_transit",
            "lr_number": tracking_id,
            "updated_at": datetime.now().isoformat()
        })


@api_view(['GET'])
def dashboard_stats(request):
    """Get dashboard statistics"""
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
    
# ============================================
# 💰 CLIENT WALLET & RECHARGE FUNCTIONS
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_wallet_balance(request):
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