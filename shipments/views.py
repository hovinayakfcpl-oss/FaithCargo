from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json
from django.db import connection, transaction
from decimal import Decimal
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
            # FIX: 'rate' ko 'rates' kiya gaya hai
            from rates.models import RateMatrix 
            
            data = json.loads(request.body)
            origin_pin = data.get("origin")
            dest_pin = data.get("destination")
            weight = Decimal(str(data.get("weight", 0)))

            origin_obj = Pincode.objects.filter(pincode=origin_pin).first()
            dest_obj = Pincode.objects.filter(pincode=dest_pin).first()

            if not origin_obj or not dest_obj:
                return JsonResponse({"success": False, "error": "Pincode database mein nahi mila"}, status=404)

            # Rates Matrix Check
            matrix = RateMatrix.objects.filter(from_zone=origin_obj.zone, to_zone=dest_obj.zone).first()
            if not matrix:
                return JsonResponse({"success": False, "error": f"No rate found: {origin_obj.zone} to {dest_obj.zone}"}, status=404)

            rate_per_kg = Decimal(str(matrix.rate))
            freight = weight * rate_per_kg
            
            # ODA Logic
            oda = Decimal("0")
            if origin_obj.is_oda or dest_obj.is_oda:
                oda = max(Decimal("650"), weight * Decimal("3"))

            total_before_gst = freight + oda + Decimal("50") # 50 is Docket Charge
            gst = total_before_gst * Decimal("0.18")

            return JsonResponse({
                "success": True,
                "freight_charge": float(freight),
                "total_charge": float(total_before_gst),
                "gst": float(gst)
            })
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=500)

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

                # Query aligned with your DB Screenshot (including 'status')
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