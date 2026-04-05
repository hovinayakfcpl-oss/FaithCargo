from flask import Flask, jsonify
import cx_Oracle  # ya psycopg2 / mysql depending on DB

app = Flask(__name__)


# 🔌 DB CONNECTION
def get_connection():
    return cx_Oracle.connect("user/password@localhost:1521/XE")


# 📦 SHIPMENT DETAIL (ADVANCED)
@app.route("/shipment/<int:lr_number>", methods=["GET"])
def get_shipment_detail(lr_number):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # 🔹 ORDER FETCH
        cursor.execute("""
            SELECT 
                id, lr_number, awb_number,
                pickup_name, pickup_address, pickup_pincode, pickup_contact,
                delivery_name, delivery_address, delivery_pincode, delivery_contact,
                material, hsn_code, boxes, weight,
                total_value, eway_bill, status, insurance_type
            FROM orders
            WHERE lr_number = :1
        """, (lr_number,))

        order = cursor.fetchone()

        if not order:
            return jsonify({"error": "Shipment not found"}), 404

        order_id = order[0]

        # 🔹 INVOICE FETCH
        cursor.execute("""
            SELECT invoice_no, invoice_value
            FROM invoices
            WHERE order_id = :1
        """, (order_id,))

        invoices = [
            {
                "invoice_no": i[0],
                "invoice_value": float(i[1])
            }
            for i in cursor.fetchall()
        ]

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
                "weight": float(order[14])
            },

            "billing": {
                "total_value": float(order[15]),
                "eway_bill": order[16],
                "insurance": order[18]
            },

            "status": order[17],

            "invoices": invoices
        }

        return jsonify(response)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


# 📋 ALL SHIPMENTS LIST
@app.route("/shipments", methods=["GET"])
def shipment_list():
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT lr_number, pickup_pincode, delivery_pincode, total_value, status, created_at
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

        return jsonify(data)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


# ▶️ RUN
if __name__ == "__main__":
    app.run(debug=True)