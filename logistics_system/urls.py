# logistics_system/urls.py
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

def home(request):
    return JsonResponse({"message": "Faith Cargo Logistics Backend Running | Developed by Devora"})

def test_api(request):
    return JsonResponse({"status": "success", "message": "API is working! | Devora Technologies"})

urlpatterns = [
    path("", home, name="home"),
    path("test/", test_api, name="test_api"),
    path("admin/", admin.site.urls),
    
    # =====================================================
    # 🔥 MAIN APIs - FIXED
    # =====================================================
    path("api/accounts/", include("accounts.urls")),
    path("api/user/", include("user_management.urls")),
    path("api/shipments/", include("shipments.urls")),
    path("api/rates/", include("rates.urls")),
    
    # =====================================================
    # 🚚 VENDOR APIs - Full CRUD + Calculator + Compare
    # =====================================================
    path("api/vendors/", include("vendors.urls")),
    
    path("api/pickup/", include("pickup.urls")),
    path("api/pincode/", include("pincode.urls")),
    path("api/signup/", include("signup.urls")),
]