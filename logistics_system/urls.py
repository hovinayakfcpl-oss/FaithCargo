# logistics_system/urls.py
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

def home(request):
    return JsonResponse({"message": "Faith Cargo Logistics Backend Running"})

urlpatterns = [
    path("", home, name="home"),
    path("admin/", admin.site.urls),
    
    # API Routes - All APIs under /api/
    path("api/rates/", include("rates.urls")),
    path("api/vendors/", include("vendors.urls")),
    path("api/pickup/", include("pickup.urls")),
    path("api/pincode/", include("pincode.urls")),
    path("api/signup/", include("signup.urls")),
    
    # ✅ FIXED: Accounts URLs directly under /api/ (not /api/accounts/)
    path("api/", include("accounts.urls")),  # This makes /api/auth/client-login/ work
    
    # Shipments API
    path("api/shipments/", include("shipments.urls")),
    
    # User Management API
    path('api/user/', include('user_management.urls')),
]