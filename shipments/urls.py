from django.urls import path
from . import views

urlpatterns = [
    # =====================================================
    # 📦 Orders & Shipments - Core CRUD Operations
    # =====================================================
    
    # Create new order with LR/AWB generation
    # POST /api/shipments/create-order/
    path("create-order/", views.create_order, name="create_order"),
    
    # Get all shipments list
    # GET /api/shipments/
    path("", views.shipment_list, name="shipment_list"),
    
    # Get single shipment details by LR or AWB
    # GET /api/shipments/shipment/FCPL0001/
    path("shipment/<str:lr>/", views.shipment_detail, name="shipment_detail"),
    
    # Update full shipment details
    # PUT /api/shipments/update/FCPL0001/
    path("update/<str:lr>/", views.update_shipment, name="update_shipment"),
    
    # Update only status (for quick updates)
    # POST /api/shipments/update-status/
    path("update-status/", views.update_shipment_status_only, name="update_status"),
    
    # Delete shipment (cascade deletes invoices)
    # DELETE /api/shipments/delete/FCPL0001/
    path("delete/<str:lr>/", views.delete_shipment, name="delete_shipment"),
    
    # =====================================================
    # 💰 Freight & Rate Calculation
    # =====================================================
    
    # Calculate freight with ODA, GST, Fuel charges
    # POST /api/shipments/calculate-freight/
    path("calculate-freight/", views.calculate_freight, name="calculate_freight"),
    
    # =====================================================
    # 📍 Pincode & Location Management
    # =====================================================
    
    # Add or update pincode location
    # POST /api/shipments/add-location/
    path("add-location/", views.add_location, name="add_location"),
    
    # Get all locations (pincodes with zone, ODA status)
    # GET /api/shipments/get-locations/
    path("get-locations/", views.get_locations, name="get_locations"),
    
    # =====================================================
    # 🤖 JERVICE AI - Intelligent Assistant
    # =====================================================
    
    # Jervice AI chat endpoint - Hindi + Bigg Boss Voice
    # POST /api/shipments/jervice-chat/
    # Supports: Tracking, Status Update, Rate Check, Pincode Check, Help
    path("jervice-chat/", views.jervice_intelligent_chat, name="jervice_chat"),
    
    # =====================================================
    # 📊 Dashboard & Analytics
    # =====================================================
    
    # Get dashboard statistics (total, delivered, in_transit, booked)
    # GET /api/shipments/dashboard-stats/
    path("dashboard-stats/", views.dashboard_stats, name="dashboard_stats"),
]

# =====================================================
# 📝 API ENDPOINTS SUMMARY
# =====================================================
"""
COMPLETE API ENDPOINTS LIST:

┌─────────────────────────────────────────────────────────────────┐
│ METHOD │ ENDPOINT                              │ DESCRIPTION   │
├─────────────────────────────────────────────────────────────────┤
│ POST   │ /api/shipments/create-order/          │ Create new order with LR/AWB │
│ GET    │ /api/shipments/                       │ Get all shipments list │
│ GET    │ /api/shipments/shipment/<lr>/         │ Get single shipment details │
│ PUT    │ /api/shipments/update/<lr>/           │ Update full shipment │
│ POST   │ /api/shipments/update-status/         │ Update only status │
│ DELETE │ /api/shipments/delete/<lr>/           │ Delete shipment │
│ POST   │ /api/shipments/calculate-freight/     │ Calculate freight with charges │
│ POST   │ /api/shipments/add-location/          │ Add/update pincode location │
│ GET    │ /api/shipments/get-locations/         │ Get all locations │
│ POST   │ /api/shipments/jervice-chat/          │ Jervice AI assistant │
│ GET    │ /api/shipments/dashboard-stats/       │ Dashboard statistics │
└─────────────────────────────────────────────────────────────────┘

📝 REQUEST/REPONSE EXAMPLES:

1. CREATE ORDER
   POST /api/shipments/create-order/
   Body: {
     "pickupName": "ABC Company",
     "pickupPincode": "110001",
     "deliveryName": "XYZ Customer",
     "deliveryPincode": "400001",
     "weight": 50,
     "total_value": 50000,
     "invoices": [{"invoice_no": "INV001", "invoice_value": 50000}]
   }

2. UPDATE STATUS
   POST /api/shipments/update-status/
   Body: {"lr": "FCPL0001", "status": "delivered"}

3. CALCULATE FREIGHT
   POST /api/shipments/calculate-freight/
   Body: {"origin": "110001", "destination": "400001", "weight": 50}

4. JERVICE AI CHAT
   POST /api/shipments/jervice-chat/
   Body: {"prompt": "Docket FCPL0001 track karo"}

5. GET DASHBOARD STATS
   GET /api/shipments/dashboard-stats/
   Response: {"total": 100, "delivered": 75, "in_transit": 15, "booked": 10}
"""