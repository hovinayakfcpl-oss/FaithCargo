from flask import Flask, jsonify
import psycopg2
from psycopg2.extras import RealDictCursor

app = Flask(__name__)


# 🔌 POSTGRES CONNECTION (Render compatible)
def get_connection():
    return psycopg2.connect(
        dbname="your_db",
        user="your_user",
        password="your_password",
        host="your_host",
        port="5432"
    )


# 📦 SHIPMENT DETAIL (LR BASED)
@app.route("/api/shipment/<int:lr_number>", methods=["GET"])
def get_shipment_detail(lr_number):
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # 🔹 ORDER FETCH
        cursor.execute("""
            SELECT *
            FROM orders
            WHERE lr_number = %s
        """, (lr_number,))

        order = cursor.fetchone()

        if not order:
            return jsonify({"error": "Shipment not found"}), 404

        # 🔹 INVOICES
        cursor.execute("""
            SELECT invoice_no, invoice_value
            FROM invoices
            WHERE order_id = %s
        """, (order["id"],))

        invoices = cursor.fetchall()

        # 🔥 FINAL RESPONSE
        return jsonify({
            "lr": order["lr_number"],
            "awb": order["awb_number"],

            "pickup": {
                "name": order["pickup_name"],
                "address": order["pickup_address"],
                "pincode": order["pickup_pincode"],
                "contact": order["pickup_contact"]
            },

            "delivery": {
                "name": order["delivery_name"],
                "address": order["delivery_address"],
                "pincode": order["delivery_pincode"],
                "contact": order["delivery_contact"]
            },

            "shipment": {
                "material": order["material"],
                "hsn": order["hsn_code"],
                "boxes": order["boxes"],
                "weight": float(order["weight"])
            },

            "billing": {
                "total_value": float(order["total_value"]),
                "eway_bill": order["eway_bill"],
                "insurance": order.get("insurance_type")
            },

            "status": order.get("status", "booked"),
            "invoices": invoices
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


# 📋 ALL SHIPMENTS
@app.route("/api/shipments", methods=["GET"])
def shipment_list():
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

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
                "lr": r["lr_number"],
                "route": f"{r['pickup_pincode']} → {r['delivery_pincode']}",
                "value": float(r["total_value"]),
                "status": r["status"],
                "date": str(r["created_at"])
            }
            for r in rows
        ]

        return jsonify(data)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


# ❤️ HEALTH CHECK (important for Render)
@app.route("/")
def home():
    return jsonify({"message": "API Running ✅"})


# ▶️ RUN
if __name__ == "__main__":
    app.run(debug=True)