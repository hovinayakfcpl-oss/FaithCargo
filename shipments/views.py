from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json
from django.db import connection, transaction
from decimal import Decimal
# Sabse upar imports mein Pincode model add karein
from pincode.models import Pincode 

# 📍 Saare Pincodes/Locations ki list dene ke liye
def get_locations(request):
    try:
        # Database se saare pincodes uthayein
        locations = Pincode.objects.all().values('pincode', 'city', 'state')
        return JsonResponse(list(locations), safe=False)
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=500)
# =====================================================
# 🛠️ HELPER: LR FORMATTER (Numbers ko FCPL0001 banata hai)
# =====================================================
def format_lr(number):
    try:
        # number ko 4 digits mein pad karke 'FCPL' jod raha hai
        return f"FCPL{int(number):04d}"
    except:
        return f"FCPL{number}"

# 🔢 LR + AWB GENERATOR
def generate_numbers(cursor):
    # 'FOR UPDATE' row lock karta hai taaki duplicate LR na bane
    cursor.execute("SELECT lr_number, awb_number FROM counters WHERE id=1 FOR UPDATE")
    row = cursor.fetchone()
    
    if not row:
        # Agar table khali hai, toh 0 se shuru karein (Pehla order 1 hoga)
        cursor.execute("INSERT INTO counters (id, lr_number, awb_number) VALUES (1, 0, 5000)")
        new_lr, new_awb = 1, 5001
    else:
        new_lr = row[0] + 1
        new_awb = row[1] + 1
        
    cursor.execute("UPDATE counters SET lr_number=%s, awb_number=%s WHERE id=1", [new_lr, new_awb])
    return new_lr, new_awb

# 💰 DYNAMIC FREIGHT CALCULATOR
@csrf_exempt
def calculate_freight(request):
    if request.method == "POST":
        try:
            from pincode.models import Pincode
            from rate.models import RateMatrix
            
            data = json.loads(request.body)
            origin_pin = data.get("origin")
            dest_pin = data.get("destination")
            weight = Decimal(str(data.get("weight", 0)))

            origin_obj = Pincode.objects.filter(pincode=origin_pin).first()
            dest_obj = Pincode.objects.filter(pincode=dest_pin).first()

            if not origin_obj or not dest_obj:
                return JsonResponse({"success": False, "error": "Pincode not found"}, status=404)

            try:
                matrix = RateMatrix.objects.get(from_zone=origin_obj.zone, to_zone=dest_obj.zone)
                rate_per_kg = Decimal(str(matrix.rate))
            except RateMatrix.DoesNotExist:
                return JsonResponse({"success": False, "error": "No rate in matrix for this route"}, status=404)

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

# 📦 CREATE ORDER (With FCPL Formatting)
@csrf_exempt
def create_order(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            with transaction.atomic():
                cursor = connection.cursor()
                lr_raw, awb = generate_numbers(cursor)
                
                # Format LR for immediate response (e.g., FCPL0001)
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
                    data.get("material"), data.get("hsn"), data.get("boxes"), data.get("weight"),
                    data.get("total_value", 0), data.get("eway_bill"), "booked"
                ])
                order_id = cursor.fetchone()[0]

                # Save Invoices
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
            return JsonResponse({"success": False, "error": str(e)}, status=500)

# 📋 SHIPMENT LIST (Formatted for Frontend Table)
def shipment_list(request):
    cursor = connection.cursor()
    cursor.execute("""
        SELECT lr_number, pickup_pincode, delivery_pincode, total_value, status 
        FROM orders ORDER BY id DESC
    """)
    rows = cursor.fetchall()
    
    # List mein LR ko FCPL0001 format mein convert karke bhej rahe hain
    data = [{
        "lr": format_lr(r[0]), 
        "route": f"{r[1]} → {r[2]}", 
        "value": float(r[3]), 
        "status": r[4]
    } for r in rows]
    
    return JsonResponse(data, safe=False)

# 🔍 SHIPMENT DETAIL (Formatted for Printing)
def shipment_detail(request, lr):
    # Agar search term mein 'FCPL' hai toh use hata kar integer banayein
    clean_lr = str(lr).replace("FCPL", "")
    
    cursor = connection.cursor()
    cursor.execute("SELECT * FROM orders WHERE lr_number=%s", [clean_lr])
    columns = [col[0] for col in cursor.description]
    row = cursor.fetchone()

    if not row:
        return JsonResponse({"error": "Shipment not found"}, status=404)

    order_data = dict(zip(columns, row))
    
    # Invoices fetch
    cursor.execute("SELECT invoice_no, invoice_value FROM invoices WHERE order_id=%s", [order_data['id']])
    inv_rows = cursor.fetchall()
    
    # Mapping for Frontend Consistency
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

# 🗑️ DELETE SHIPMENT
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
        # Aapka location add karne ka logic yahan aayega
        return JsonResponse({"success": True, "message": "Location added"})
    return JsonResponse({"error": "Method not allowed"}, status=405)