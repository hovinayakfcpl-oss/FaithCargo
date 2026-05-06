# shipments/urls.py - COMPLETE WITH WALLET BALANCE CHECK
from django.urls import path
from . import views

urlpatterns = [
    # =====================================================
    # 📦 Orders & Shipments - Core CRUD Operations
    # =====================================================
    
    # Create new order with LR/AWB generation
    path("create-order/", views.create_order, name="create_order"),
    
    # Get all shipments list
    path("", views.shipment_list, name="shipment_list"),
    
    # Get single shipment details by LR or AWB
    path("shipment/<str:lr>/", views.shipment_detail, name="shipment_detail"),
    
    # Update full shipment details
    path("update/<str:lr>/", views.update_shipment, name="update_shipment"),
    
    # Update only status (for quick updates)
    path("update-status/", views.update_shipment_status_only, name="update_status"),
    
    # Delete shipment (cascade deletes invoices)
    path("delete/<str:lr>/", views.delete_shipment, name="delete_shipment"),
    
    # 🆕 Get all orders for a specific client
    # GET /api/shipments/client/<client_id>/orders/
    path("client/<str:client_id>/orders/", views.client_orders, name="client_orders"),
    
    # =====================================================
    # 💰 Freight & Rate Calculation
    # =====================================================
    
    # Calculate freight with ODA, GST, Fuel charges
    path("calculate-freight/", views.calculate_freight, name="calculate_freight"),
    
    # =====================================================
    # 📍 Pincode & Location Management
    # =====================================================
    
    # Add or update pincode location
    path("add-location/", views.add_location, name="add_location"),
    
    # Get all locations (pincodes with zone, ODA status)
    path("get-locations/", views.get_locations, name="get_locations"),
    
    # =====================================================
    # 🤖 JERVICE AI - Intelligent Assistant
    # =====================================================
    
    # Jervice AI chat endpoint
    path("jervice-chat/", views.jervice_intelligent_chat, name="jervice_chat"),
    
    # =====================================================
    # 📊 Dashboard & Analytics
    # =====================================================
    
    # Get dashboard statistics (with optional client filter)
    # GET /api/shipments/dashboard-stats/?clientId=FCPL001
    path("dashboard-stats/", views.dashboard_stats, name="dashboard_stats"),
    
    # =====================================================
    # 📱 Notification API (NEW)
    # =====================================================
    
    # Send SMS/WhatsApp notification
    # POST /api/shipments/send-notification/
    path("send-notification/", views.send_notification_api, name="send_notification"),
    
    # =====================================================
    # 💰 WALLET & RECHARGE SYSTEM (NEW)
    # =====================================================
    
    # Check wallet balance before creating order
    # GET /api/shipments/check-wallet-balance/?clientId=FCPL001&freight_amount=1500
    path("check-wallet-balance/", views.check_wallet_balance, name="check_wallet_balance"),
]

# =====================================================
# 📝 API ENDPOINTS SUMMARY
# =====================================================
"""
COMPLETE API ENDPOINTS LIST:

┌─────────────────────────────────────────────────────────────────────────────┐
│ METHOD │ ENDPOINT                                      │ DESCRIPTION       │
├─────────────────────────────────────────────────────────────────────────────┤
│ POST   │ /api/shipments/create-order/                  │ Create new order with LR/AWB │
│ GET    │ /api/shipments/                               │ Get all shipments list │
│ GET    │ /api/shipments/shipment/<lr>/                 │ Get single shipment details │
│ PUT    │ /api/shipments/update/<lr>/                   │ Update full shipment │
│ POST   │ /api/shipments/update-status/                 │ Update only status │
│ DELETE │ /api/shipments/delete/<lr>/                   │ Delete shipment │
│ GET    │ /api/shipments/client/<client_id>/orders/     │ Get client-specific orders │
│ POST   │ /api/shipments/calculate-freight/             │ Calculate freight with charges │
│ POST   │ /api/shipments/add-location/                  │ Add/update pincode location │
│ GET    │ /api/shipments/get-locations/                 │ Get all locations │
│ POST   │ /api/shipments/jervice-chat/                  │ Jervice AI assistant │
│ GET    │ /api/shipments/dashboard-stats/               │ Dashboard statistics │
│ POST   │ /api/shipments/send-notification/             │ Send SMS/WhatsApp notification │
│ GET    │ /api/shipments/check-wallet-balance/          │ 🆕 Check wallet balance │
└─────────────────────────────────────────────────────────────────────────────┘

📝 REQUEST/RESPONSE EXAMPLES:

1. CREATE ORDER
   POST /api/shipments/create-order/
   Body: {
     "clientId": "FCPL001",
     "freight_amount": 1500,
     "pickupName": "ABC Company",
     "pickupPincode": "110001",
     "deliveryName": "XYZ Customer",
     "deliveryPincode": "400001",
     "weight": 50,
     "total_value": 50000,
     "invoices": [{"invoice_no": "INV001", "invoice_value": 50000}]
   }
   Response: {
     "success": true,
     "lr_number": "FCPL0001",
     "awb": "AWB001234",
     "freight_amount": 1500,
     "balance_remaining": 3500,
     "message": "Order created successfully!"
   }

2. CHECK WALLET BALANCE (NEW)
   GET /api/shipments/check-wallet-balance/?clientId=FCPL001&freight_amount=1500
   Response: {
     "success": true,
     "has_balance": true,
     "current_balance": 5000,
     "required_amount": 1500,
     "shortfall": 0,
     "low_balance_warning": null,
     "message": "Sufficient balance"
   }

3. UPDATE STATUS
   POST /api/shipments/update-status/
   Body: {"lr": "FCPL0001", "status": "delivered"}

4. CALCULATE FREIGHT
   POST /api/shipments/calculate-freight/
   Body: {"origin": "110001", "destination": "400001", "weight": 50}

5. JERVICE AI CHAT
   POST /api/shipments/jervice-chat/
   Body: {"prompt": "Docket FCPL0001 track karo"}

6. GET DASHBOARD STATS
   GET /api/shipments/dashboard-stats/
   Response: {"total": 100, "delivered": 75, "in_transit": 15, "booked": 10}

7. SEND NOTIFICATION
   POST /api/shipments/send-notification/
   Body: {
     "lrNumber": "FCPL0001",
     "awb": "AWB123456",
     "pickupPincode": "110001",
     "deliveryPincode": "400001",
     "weight": 50,
     "totalValue": 50000,
     "pickupContact": "9876543210",
     "deliveryContact": "9876543211",
     "pickupName": "ABC Company",
     "deliveryName": "XYZ Customer"
   }

8. GET CLIENT ORDERS
   GET /api/shipments/client/FCPL001/orders/
   Response: [
     {
       "lr": "FCPL0001",
       "awb": "AWB001234",
       "route": "110001 → 400001",
       "status": "delivered",
       "weight": 50,
       "freight": 1500,
       "date": "2024-01-15 10:30"
     }
   ]

============================================
🔄 COMPLETE FLOW FOR ORDER WITH WALLET:
============================================

1. Client fills order form
   ↓
2. Frontend calls /check-wallet-balance/?clientId=XXX&freight_amount=XXX
   ↓
3. If balance sufficient → Proceed
   ↓
4. Frontend calls /create-order/ with clientId and freight_amount
   ↓
5. Backend:
   - Checks balance again
   - Creates order
   - Deducts amount from wallet
   - Returns new balance
   ↓
6. Frontend shows success with remaining balance
"""