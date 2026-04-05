from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json
from django.db import connection, transaction


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


@csrf_exempt
def create_order(request):
    if request.method == "POST":
        data = json.loads(request.body)

        try:
            with transaction.atomic():
                cursor = connection.cursor()

                lr, awb = generate_numbers(cursor)

                cursor.execute("""
                    INSERT INTO orders (
                        lr_number, awb_number,
                        pickup_name, pickup_address, pickup_pincode, pickup_contact,
                        delivery_name, delivery_address, delivery_pincode, delivery_contact,
                        material, hsn_code, boxes, weight,
                        total_value, eway_bill
                    )
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    RETURNING id
                """, [
                    lr, awb,
                    data["pickupName"], data["pickupAddress"], data["pickupPincode"], data["pickupContact"],
                    data["deliveryName"], data["deliveryAddress"], data["deliveryPincode"], data["deliveryContact"],
                    data["material"], data["hsn"], data["boxes"], data["weight"],
                    data["totalValue"], data.get("ewayBill")
                ])

                order_id = cursor.fetchone()[0]

                for inv in data["invoices"]:
                    cursor.execute("""
                        INSERT INTO invoices (order_id, invoice_no, invoice_value)
                        VALUES (%s,%s,%s)
                    """, [order_id, inv["invoiceNo"], inv["invoiceValue"]])

                return JsonResponse({
                    "message": "Order Created",
                    "lr_number": lr
                })

        except Exception as e:
            return JsonResponse({"error": str(e)})

def shipment_list(request):
    cursor = connection.cursor()

    cursor.execute("""
        SELECT lr_number, pickup_pincode, delivery_pincode, total_value, created_at
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
            "date": str(r[4])
        })

    return JsonResponse(data, safe=False)

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
        {"invoiceNo": i[0], "invoiceValue": float(i[1])}
        for i in invoices
    ]

    data = {
        "lr": order[1],
        "awb": order[2],

        "pickup": {
            "name": order[3],
            "address": order[4],
            "pincode": order[5],
            "contact": order[6]
        },

        "delivery": {
            "name": order[7],
            "address": order[8],
            "pincode": order[9],
            "contact": order[10]
        },

        "shipment": {
            "material": order[11],
            "hsn": order[12],
            "boxes": order[13],
            "weight": float(order[14])
        },

        "totalValue": float(order[15]),
        "ewayBill": order[16],
        "invoices": invoice_list
    }

    return JsonResponse(data)