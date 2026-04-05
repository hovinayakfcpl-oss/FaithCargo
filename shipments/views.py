from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json
from django.db import connection, transaction
from .models import Location


# 🔢 LR + AWB GENERATOR (LOCK SAFE)
def generate_numbers(cursor):
    cursor.execute("SELECT lr_number, awb_number FROM counters WHERE id=1 FOR UPDATE")
    row = cursor.fetchone()

    new_lr = row[0] + 1
    new_awb = row[1] + 1

    cursor.execute(
        "UPDATE counters SET lr_number=%s, awb_number=%s WHERE id=1",
        [new_lr, new_awb]
    )

    return new_lr, new_awb


# 📍 ADD LOCATION (PICKUP / DELIVERY)
@csrf_exempt
def add_location(request):
    if request.method == "POST":
        data = json.loads(request.body)

        loc = Location.objects.create(
            type=data["type"],
            name=data["name"],
            contact=data["contact"],
            address=data["address"],
            pincode=data["pincode"],
            state=data["state"]
        )

        return JsonResponse({
            "id": loc.id,
            "name": loc.name,
            "pincode": loc.pincode,
            "type": loc.type
        })


# 📍 GET LOCATIONS (DROPDOWN)
def get_locations(request):
    locs = Location.objects.filter(is_active=True).order_by("-id")

    data = [{
        "id": l.id,
        "name": l.name,
        "pincode": l.pincode,
        "type": l.type
    } for l in locs]

    return JsonResponse(data, safe=False)


# 📦 CREATE ORDER (ADVANCED)
@csrf_exempt
def create_order(request):
    if request.method == "POST":
        data = json.loads(request.body)

        try:
            with transaction.atomic():
                cursor = connection.cursor()

                lr, awb = generate_numbers(cursor)

                # 📍 FETCH LOCATION (optional)
                pickup_id = data.get("pickup_id")
                delivery_id = data.get("delivery_id")

                pickup = Location.objects.filter(id=pickup_id).first()
                delivery = Location.objects.filter(id=delivery_id).first()

                # 🛡️ VALIDATION
                if float(data["total_value"]) >= 50000 and not data.get("eway_bill"):
                    return JsonResponse({"error": "E-way bill required above 50k"})

                cursor.execute("""
                    INSERT INTO orders (
                        lr_number, awb_number,
                        pickup_id, delivery_id,
                        pickup_name, pickup_address, pickup_pincode, pickup_contact,
                        delivery_name, delivery_address, delivery_pincode, delivery_contact,
                        material, hsn_code, boxes, weight,
                        total_value, eway_bill, insurance_type, status
                    )
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    RETURNING id
                """, [
                    lr, awb,
                    pickup_id, delivery_id,

                    pickup.name if pickup else data["pickupName"],
                    pickup.address if pickup else data["pickupAddress"],
                    pickup.pincode if pickup else data["pickupPincode"],
                    pickup.contact if pickup else data["pickupContact"],

                    delivery.name if delivery else data["deliveryName"],
                    delivery.address if delivery else data["deliveryAddress"],
                    delivery.pincode if delivery else data["deliveryPincode"],
                    delivery.contact if delivery else data["deliveryContact"],

                    data["material"],
                    data["hsn"],
                    data["boxes"],
                    data["weight"],

                    data["total_value"],
                    data.get("eway_bill"),
                    data.get("insurance_type", "owner"),
                    "booked"
                ])

                order_id = cursor.fetchone()[0]

                # 🧾 SAVE INVOICES
                for inv in data.get("invoices", []):
                    cursor.execute("""
                        INSERT INTO invoices (order_id, invoice_no, invoice_value)
                        VALUES (%s,%s,%s)
                    """, [
                        order_id,
                        inv["invoice_no"],
                        inv["invoice_value"]
                    ])

                return JsonResponse({
                    "message": "Order Created",
                    "lr_number": lr,
                    "awb": awb
                })

        except Exception as e:
            return JsonResponse({"error": str(e)})


# 📋 LIST ALL SHIPMENTS
def shipment_list(request):
    cursor = connection.cursor()

    cursor.execute("""
        SELECT lr_number, pickup_pincode, delivery_pincode, total_value, status, created_at
        FROM orders
        ORDER BY id DESC
    """)

    rows = cursor.fetchall()

    data = []
    for r in rows:
        data.append({
            "lr": r[0],
            "route": f"{r[1]} → {r[2]}",
            "value": float(r[3]),
            "status": r[4],
            "date": str(r[5])
        })

    return JsonResponse(data, safe=False)


# 🔍 SINGLE SHIPMENT DETAIL
def shipment_detail(request, lr):
    cursor = connection.cursor()

    cursor.execute("SELECT * FROM orders WHERE lr_number=%s", [lr])
    order = cursor.fetchone()

    if not order:
        return JsonResponse({"error": "Not found"})

    order_id = order[0]

    cursor.execute("SELECT invoice_no, invoice_value FROM invoices WHERE order_id=%s", [order_id])
    invoices = cursor.fetchall()

    invoice_list = [
        {"invoice_no": i[0], "invoice_value": float(i[1])}
        for i in invoices
    ]

    data = {
        "lr": order[1],
        "awb": order[2],

        "pickup": {
            "name": order[5],
            "address": order[6],
            "pincode": order[7],
            "contact": order[8]
        },

        "delivery": {
            "name": order[9],
            "address": order[10],
            "pincode": order[11],
            "contact": order[12]
        },

        "shipment": {
            "material": order[13],
            "hsn": order[14],
            "boxes": order[15],
            "weight": float(order[16])
        },

        "billing": {
            "total_value": float(order[17]),
            "eway_bill": order[18],
            "insurance": order[19]
        },

        "status": order[20],
        "invoices": invoice_list
    }

    return JsonResponse(data)