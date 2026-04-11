from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json
import re
import requests
from decimal import Decimal
from django.db import connection, transaction
from pincode.models import Pincode 

# =====================================================
# 🛠️ HELPER: LR FORMATTER (Numbers ko FCPL0001 banata hai)
# =====================================================
def format_lr(number):
    try:
        return f"FCPL{int(number):04d}"
    except:
        return f"FCPL{number}"

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
        locations = Pincode.objects.all().values('pincode', 'city', 'state')
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

            origin_obj = Pincode.objects.filter(pincode=origin_pin).first()
            dest_obj = Pincode.objects.filter(pincode=dest_pin).first()

            if not origin_obj or not dest_obj:
                return JsonResponse({"success": False, "error": "Pincode database mein nahi mila"}, status=404)

            matrix = RateMatrix.objects.filter(from_zone=origin_obj.zone, to_zone=dest_obj.zone).first()
            if not matrix:
                return JsonResponse({"success": False, "error": f"No rate found: {origin_obj.zone} to {dest_obj.zone}"}, status=404)

            rate_per_kg = Decimal(str(matrix.rate))
            freight = weight * rate_per_kg
            
            oda = Decimal("0")
            if origin_obj.is_oda or dest_obj.is_oda:
                oda = max(Decimal("650"), weight * Decimal("3"))

            total_before_gst = freight + oda + Decimal("50")
            gst = total_before_gst * Decimal("0.18")

            return JsonResponse({
                "success": True,
                "freight_charge": float(freight),
                "total_charge": float(total_before_gst),
                "gst": float(gst)
            })
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=500)

# =====================================================
# 🤖 JERVICE AI - INTELLIGENT ASSISTANT (HINDI + BIGG BOSS VOICE)
# =====================================================

def extract_docket_number(text):
    """Auto-extract docket/LR number from any text"""
    # Remove FCPL prefix if present
    clean_text = text.replace('FCPL', '').upper()
    
    patterns = [
        r'\b\d{8,15}\b',  # 8-15 digits
        r'\b\d{4,8}\b',   # 4-8 digits (for FCPL numbers)
        r'LR[:\s]*(\d+)',
        r'DOCKET[:\s]*(\d+)',
        r'AWB[:\s]*(\d+)'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, clean_text, re.IGNORECASE)
        if match:
            return match.group(1) if match.groups() else match.group(0)
    return None

def get_shipment_by_lr(lr_number):
    """Fetch shipment details from database"""
    try:
        clean_lr = str(lr_number).replace('FCPL', '').strip()
        cursor = connection.cursor()
        cursor.execute("""
            SELECT id, lr_number, pickup_pincode, delivery_pincode, 
                   pickup_name, delivery_name, weight, status, 
                   pickup_address, delivery_address, material
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

def get_shipment_status_text(status):
    """Convert status to Hindi with Bigg Boss style"""
    status_map = {
        'booked': '📦 BOOKED! Order register ho gaya hai. Abhi pickup pending hai.',
        'picked': '🚚 PICKED! Driver ne pickup kar liya. Warehouse mein process hoga.',
        'in_transit': '🔄 IN TRANSIT! Shipment road par hai. Agle hub mein pahunch raha hai.',
        'out_for_delivery': '🎯 OUT FOR DELIVERY! Aaj hi deliver hoga. Customer ko ready rehna chahiye!',
        'delivered': '✅ DELIVERED! Shipment deliver ho chuka hai. SHAABASH!',
        'cancelled': '❌ CANCELLED! Order cancel ho gaya. Koi issue ho toh customer care se contact karein.',
        'hold': '⏸️ ON HOLD! Kuch verification pending hai. Jald hi update aayega.'
    }
    return status_map.get(status.lower(), f'ℹ️ Current status: {status}')

def calculate_rate_hindi(origin, destination, weight=10):
    """Calculate rate with Hindi explanation"""
    try:
        from rates.models import RateMatrix
        
        origin_pin = Pincode.objects.filter(city__icontains=origin).first()
        dest_pin = Pincode.objects.filter(city__icontains=destination).first()
        
        if not origin_pin or not dest_pin:
            return f"Sir, {origin} se {destination} ka rate nikalne ke liye pincode chahiye. Example: 'Mumbai 400001 se Delhi 110001'"
        
        matrix = RateMatrix.objects.filter(
            from_zone=origin_pin.zone, 
            to_zone=dest_pin.zone
        ).first()
        
        if matrix:
            rate = float(matrix.rate)
            freight = rate * weight
            return f"💰 RATE ALERT! {origin} se {destination} ka rate ₹{rate}/kg hai. {weight} kg ka freight ₹{freight} hoga. GST 18% extra. Kya book karoon?"
        else:
            return f"⚠️ Sir, {origin_pin.zone} se {dest_pin.zone} ka rate database mein nahi hai. Customer care se contact karein!"
    except Exception as e:
        return f"Technical issue: {str(e)}"

@csrf_exempt
def jervice_intelligent_chat(request):
    """
    Jervice AI - Bigg Boss Style Hindi Assistant
    Auto-detects docket numbers and provides tracking
    """
    if request.method != "POST":
        return JsonResponse({"reply": "Sir, POST method use karein."}, status=405)
    
    try:
        data = json.loads(request.body)
        user_query = data.get('prompt', '').lower()
        context_data = data.get('contextData', {})
        
        # Auto-detect docket number from query
        docket_number = extract_docket_number(user_query)
        
        # Priority 1: Tracking request
        if docket_number:
            shipment = get_shipment_by_lr(docket_number)
            
            if shipment:
                status_text = get_shipment_status_text(shipment['status'])
                reply = f"""🎤 **BIGG BOSS STYLE UPDATE!**

Docket Number: FCPL{shipment['lr_number']}
Status: {status_text}

📋 Details:
• From: {shipment['pickup_pincode']} - {shipment.get('pickup_name', 'N/A')}
• To: {shipment['delivery_pincode']} - {shipment.get('delivery_name', 'N/A')}
• Weight: {shipment['weight']} kg
• Material: {shipment.get('material', 'N/A')}

📍 Current Location: Transit mein
⏰ Last Update: Just now

Kya aapko koi aur information chahiye, Sir?"""
            else:
                reply = f"⚠️ **SORRY SIR!** Docket {docket_number} humare system mein nahi mila. Kya aapne sahi number daala? Dobara check karein ya customer care se contact karein."
        
        # Priority 2: Rate inquiry
        elif any(word in user_query for word in ['rate', 'bhada', 'price', 'kitna', 'charges', 'rate kya hai']):
            # Extract cities
            city_pattern = r'([\w\s]+?)\s+se\s+([\w\s]+?)(?:\s+ka|\s+ke|\s+ki|\s+for|\s+to|$)'
            cities = re.search(city_pattern, user_query)
            
            if cities:
                origin = cities.group(1).strip()
                destination = cities.group(2).strip()
                
                # Extract weight if mentioned
                weight_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:kg|kilo|किलो)', user_query)
                weight = float(weight_match.group(1)) if weight_match else 10
                
                reply = calculate_rate_hindi(origin, destination, weight)
            else:
                reply = "Sir, location batao jaise 'Mumbai se Delhi ka rate' ya 'Delhi se Bangalore 50kg'. Main turant bata dunga!"
        
        # Priority 3: Booking help
        elif any(word in user_query for word in ['book', 'booking', 'order', 'create order', 'new shipment']):
            reply = """📝 **BOOKING GUIDE!**

Sir, naya order create karne ke liye:
1. Create Order page pe jao
2. Pickup aur delivery details bharo
3. Weight, material, invoice details add karo
4. Submit karo

Ya mujhe directly batao:
• Pickup pincode
• Delivery pincode  
• Weight in kg
• Material type

Main order create kar dunga! Kya details doon?"""
        
        # Priority 4: General help
        elif any(word in user_query for word in ['help', 'madad', 'sahayata', 'kya kar sakte ho']):
            reply = """🎤 **MAIN KYA KAR SAKTA HOON?**

✅ Docket track kar sakta hoon - Bas number bolo
✅ Rate bata sakta hoon - "Mumbai se Delhi ka rate"
✅ Order create karne mein madad kar sakta hoon
✅ Status update de sakta hoon
✅ Delivery time bata sakta hoon

Example commands:
• "Docket FCPL0001 track karo"
• "Mumbai se Bangalore 20kg ka kitna hoga"
• "Mera order kahan hai"
• "Naya order banana hai"

Kya aapko kisi cheez mein madad chahiye, Sir?"""
        
        # Default response
        else:
            reply = "🎤 **SUNIYE!** Main aapka logistics assistant hoon. Mujhse puchiye: docket track karna hai, rate nikalna hai, ya naya order banana hai? Main taiyaar hoon!"

        return JsonResponse({
            "reply": reply,
            "detected_docket": docket_number,
            "voice_style": "bigg_boss_hindi"
        })
        
    except json.JSONDecodeError:
        return JsonResponse({"reply": "Sir, sahi format mein bhejiye. JSON chahiye."}, status=400)
    except Exception as e:
        return JsonResponse({"reply": f"⚠️ Technical glitch, Sir. Error: {str(e)}"}, status=500)

# 📦 CREATE ORDER (With Status & FCPL Formatting)
@csrf_exempt
def create_order(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            with transaction.atomic():
                cursor = connection.cursor()
                lr_raw, awb = generate_numbers(cursor)
                formatted_lr = format_lr(lr_raw)

                cursor.execute("""
                    INSERT INTO orders (
                        lr_number, awb_number, pickup_name, pickup_address, pickup_pincode, pickup_contact,
                        delivery_name, delivery_address, delivery_pincode, delivery_contact,
                        material, hsn_code, boxes, weight, total_value, eway_bill, status
                    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id
                """, [
                    lr_raw, awb, 
                    data.get("pickupName"), data.get("pickupAddress"), data.get("pickupPincode"), data.get("pickupContact"),
                    data.get("deliveryName"), data.get("deliveryAddress"), data.get("deliveryPincode"), data.get("deliveryContact"),
                    data.get("material"), data.get("hsn", "1234"), data.get("boxes"), data.get("weight"),
                    data.get("total_value", 0), data.get("eway_bill"), "booked"
                ])
                order_id = cursor.fetchone()[0]

                for inv in data.get("invoices", []):
                    if inv.get("invoice_no"):
                        cursor.execute("INSERT INTO invoices (order_id, invoice_no, invoice_value) VALUES (%s,%s,%s)", 
                                     [order_id, inv["invoice_no"], inv.get("invoice_value", 0)])

                return JsonResponse({
                    "success": True, 
                    "lr_number": formatted_lr, 
                    "awb": awb,
                    "message": "Order saved successfully!"
                })
        except Exception as e:
            return JsonResponse({"success": False, "error": f"Database Error: {str(e)}"}, status=500)

# 📋 SHIPMENT LIST
def shipment_list(request):
    cursor = connection.cursor()
    cursor.execute("""
        SELECT lr_number, pickup_pincode, delivery_pincode, total_value, status 
        FROM orders ORDER BY id DESC
    """)
    rows = cursor.fetchall()
    
    data = [{
        "lr": format_lr(r[0]), 
        "route": f"{r[1]} → {r[2]}", 
        "value": float(r[3]), 
        "status": r[4]
    } for r in rows]
    
    return JsonResponse(data, safe=False)

# 🔍 SHIPMENT DETAIL
def shipment_detail(request, lr):
    clean_lr = str(lr).replace("FCPL", "")
    cursor = connection.cursor()
    cursor.execute("SELECT * FROM orders WHERE lr_number=%s", [clean_lr])
    
    row = cursor.fetchone()
    if not row:
        return JsonResponse({"error": "Shipment not found"}, status=404)

    columns = [col[0] for col in cursor.description]
    order_data = dict(zip(columns, row))
    
    cursor.execute("SELECT invoice_no, invoice_value FROM invoices WHERE order_id=%s", [order_data['id']])
    inv_rows = cursor.fetchall()
    
    return JsonResponse({
        "lr": format_lr(order_data['lr_number']),
        "pickupName": order_data['pickup_name'],
        "pickupAddress": order_data['pickup_address'],
        "pickupPincode": order_data['pickup_pincode'],
        "pickupContact": order_data['pickup_contact'],
        "deliveryName": order_data['delivery_name'],
        "deliveryAddress": order_data['delivery_address'],
        "deliveryPincode": order_data['delivery_pincode'],
        "deliveryContact": order_data['delivery_contact'],
        "material": order_data['material'],
        "boxes": order_data['boxes'],
        "weight": float(order_data['weight']),
        "totalValue": float(order_data['total_value']),
        "ewayBill": order_data['eway_bill'],
        "status": order_data['status'],
        "invoices": [{"invoiceNo": r[0], "invoiceValue": float(r[1])} for r in inv_rows]
    })

# 🗑️ DELETE
@csrf_exempt
def delete_shipment(request, lr):
    if request.method == "DELETE":
        try:
            clean_lr = str(lr).replace("FCPL", "")
            with transaction.atomic():
                cursor = connection.cursor()
                cursor.execute("DELETE FROM orders WHERE lr_number=%s", [clean_lr])
                return JsonResponse({"success": True, "message": "Deleted successfully"})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=500)

@csrf_exempt
def add_location(request):
    if request.method == "POST":
        return JsonResponse({"success": True, "message": "Location logic added"})
    return JsonResponse({"error": "Method not allowed"}, status=405)