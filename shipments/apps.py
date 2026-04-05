from django.apps import AppConfig


# 📦 FULL SHIPMENT DETAIL (LR WISE)
@app.route("/shipment/<int:lr_number>", methods=["GET"])
def get_shipment_detail(lr_number):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # 🔹 Order Fetch
        cursor.execute("""
            SELECT 
                id, lr_number, awb_number,
                pickup_name, pickup_address, pickup_pincode, pickup_contact,
                delivery_name, delivery_address, delivery_pincode, delivery_contact,
                material, hsn_code, boxes, weight,
                total_value, eway_bill
            FROM orders
            WHERE lr_number = :1
        """, (lr_number,))

        order = cursor.fetchone()

        if not order:
            return jsonify({"error": "Shipment not found"})

        order_id = order[0]

        # 🔹 Invoice Fetch
        cursor.execute("""
            SELECT invoice_no, invoice_value
            FROM invoices
            WHERE order_id = :1
        """, (order_id,))

        invoices = []
        for inv in cursor.fetchall():
            invoices.append({
                "invoiceNo": inv[0],
                "invoiceValue": inv[1]
            })

        # 🔥 FINAL RESPONSE
        response = {
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
                "weight": order[14]
            },

            "totalValue": order[15],
            "ewayBill": order[16],
            "invoices": invoices
        }

        return jsonify(response)

    except Exception as e:
        return jsonify({"error": str(e)})

    finally:
        cursor.close()
        conn.close()