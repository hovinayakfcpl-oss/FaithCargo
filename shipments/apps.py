from django.http import JsonResponse
from django.db import connection


# 📦 SHIPMENT DETAIL (LR BASED)
def shipment_detail(request, lr_number):
    cursor = connection.cursor()

    try:
        # 🔹 ORDER FETCH
        cursor.execute("""
            SELECT *
            FROM orders
            WHERE lr_number = %s
        """, [lr_number])

        order = cursor.fetchone()

        if not order:
            return JsonResponse({"error": "Shipment not found"}, status=404)

        order_id = order[0]

        # 🔹 INVOICES
        cursor.execute("""
            SELECT invoice_no, invoice_value
            FROM invoices
            WHERE order_id = %s
        """, [order_id])

        invoices = [
            {
                "invoice_no": i[0],
                "invoice_value": float(i[1])
            }
            for i in cursor.fetchall()
        ]

        # 🔥 FINAL RESPONSE
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

            "billing": {
                "total_value": float(order[15]),
                "eway_bill": order[16],
                "insurance": order[18] if len(order) > 18 else None
            },

            "status": order[17] if len(order) > 17 else "booked",
            "invoices": invoices
        }

        return JsonResponse(data)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

    finally:
        cursor.close()


# 📋 ALL SHIPMENTS
def shipment_list(request):
    cursor = connection.cursor()

    try:
        cursor.execute("""
            SELECT lr_number, pickup_pincode, delivery_pincode,
                   total_value, status, created_at
            FROM orders
            ORDER BY id DESC
        """)

        rows = cursor.fetchall()

        data = [
            {
                "lr": r[0],
                "route": f"{r[1]} → {r[2]}",
                "value": float(r[3]),
                "status": r[4],
                "date": str(r[5])
            }
            for r in rows
        ]

        return JsonResponse(data, safe=False)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

    finally:
        cursor.close()


# ❤️ HEALTH CHECK
def home(request):
    return JsonResponse({"message": "API Running ✅"})