from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json
import re
import requests
from decimal import Decimal
from django.db import connection, transaction
from pincode.models import Pincode 
from datetime import datetime

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
# 🤖 JERVICE AI - INTELLIGENT ASSISTANT (HINDI + BIGG BOSS VOICE)
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
                   created_at, booking_mode, pickup_gstin, delivery_gstin
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
    """Convert status to Hindi with Bigg Boss style"""
    status_map = {
        'booked': '📦 **BOOKED!** Order register ho gaya hai. Abhi pickup pending hai.',
        'picked': '🚚 **PICKED UP!** Driver ne pickup kar liya. Warehouse mein process hoga.',
        'in_transit': '🔄 **IN TRANSIT!** Shipment road par hai. Agle hub mein pahunch raha hai.',
        'out_for_delivery': '🎯 **OUT FOR DELIVERY!** Aaj hi deliver hoga.',
        'delivered': '✅ **DELIVERED!** Shipment deliver ho chuka hai. SHAABASH!',
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

def get_all_shipments_summary():
    """Get summary of all shipments"""
    try:
        cursor = connection.cursor()
        cursor.execute("""
            SELECT COUNT(*), 
                   SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END),
                   SUM(CASE WHEN status = 'in_transit' THEN 1 ELSE 0 END),
                   SUM(CASE WHEN status = 'booked' THEN 1 ELSE 0 END)
            FROM orders
        """)
        row = cursor.fetchone()
        return {
            'total': row[0] or 0,
            'delivered': row[1] or 0,
            'in_transit': row[2] or 0,
            'booked': row[3] or 0
        }
    except Exception as e:
        return {'total': 0, 'delivered': 0, 'in_transit': 0, 'booked': 0}

@csrf_exempt
def jervice_intelligent_chat(request):
    """Jervice AI - Bigg Boss Style Hindi Assistant"""
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
                reply = f"""🎤 **BIGG BOSS STYLE TRACKING!**

📋 **Docket:** FCPL{shipment['lr_number']}
🔢 **AWB:** {shipment.get('awb_number', 'N/A')}
📊 **Status:** {status_text}

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
📝 Booked: {stats['booked']}"""
        
        elif any(word in user_query for word in ['help', 'madad', 'sahayata', 'kya kar sakte ho']):
            reply = """🎤 **JERVICE AI - COMPLETE FEATURES!**

✅ Track Shipment - "Docket FCPL0001 track karo"
✅ Update Status - "Docket FCPL0001 status update karo delivered"
✅ Rate Check - "Mumbai se Delhi ka rate 50kg"
✅ Pincode Check - "Check pincode 110001"
✅ Order Summary - "Kitne order hain"

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
            "voice_style": "bigg_boss_hindi",
            "success": True
        })
        
    except json.JSONDecodeError:
        return JsonResponse({"reply": "Sir, sahi format mein bhejiye.", "success": False}, status=400)
    except Exception as e:
        return JsonResponse({"reply": f"⚠️ Technical glitch, Sir. Error: {str(e)}", "success": False}, status=500)

# =====================================================
# 📦 CREATE ORDER (With All Columns)
# =====================================================
@csrf_exempt
def create_order(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            with transaction.atomic():
                cursor = connection.cursor()
                lr_raw, awb_raw = generate_numbers(cursor)
                formatted_lr = format_lr(lr_raw)
                formatted_awb = format_awb(awb_raw)

                # Get GSTIN values (with None default if not provided)
                pickup_gstin = data.get("pickupGstin")
                delivery_gstin = data.get("deliveryGstin")
                
                cursor.execute("""
                    INSERT INTO orders (
                        lr_number, awb_number, 
                        pickup_name, pickup_address, pickup_pincode, pickup_contact, pickup_gstin,
                        delivery_name, delivery_address, delivery_pincode, delivery_contact, delivery_gstin,
                        material, hsn_code, boxes, weight, actual_weight, volumetric_weight, 
                        total_value, eway_bill, status, booking_mode, created_at, updated_at
                    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id
                """, [
                    lr_raw, formatted_awb,
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

                for inv in data.get("invoices", []):
                    if inv.get("invoice_no"):
                        cursor.execute("""
                            INSERT INTO invoices (order_id, invoice_no, invoice_value) 
                            VALUES (%s,%s,%s)
                        """, [order_id, inv["invoice_no"], inv.get("invoice_value", 0)])

                return JsonResponse({
                    "success": True, 
                    "lr_number": formatted_lr, 
                    "awb": formatted_awb,
                    "message": "Order created successfully!"
                })
        except Exception as e:
            return JsonResponse({"success": False, "error": f"Database Error: {str(e)}"}, status=500)
    return JsonResponse({"error": "Method not allowed"}, status=405)

# =====================================================
# 📋 SHIPMENT LIST
# =====================================================
def shipment_list(request):
    cursor = connection.cursor()
    cursor.execute("""
        SELECT lr_number, awb_number, pickup_pincode, delivery_pincode, 
               total_value, status, weight, created_at
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
        "date": r[7].strftime("%Y-%m-%d %H:%M") if r[7] else "N/A"
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
# 📊 DASHBOARD STATS
# =====================================================
def dashboard_stats(request):
    stats = get_all_shipments_summary()
    return JsonResponse(stats)