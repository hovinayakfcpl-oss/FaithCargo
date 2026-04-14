# logistics_system/urls.py
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

def home(request):
    return JsonResponse({"message": "Faith Cargo Logistics Backend Running"})

urlpatterns = [
    path("", home, name="home"),
    path("admin/", admin.site.urls),
    
    # ✅ IMPORTANT: Accounts URLs directly under /api/
    path("api/", include("accounts.urls")),  # This is the key fix!
    
    # Other APIs
    path("api/rates/", include("rates.urls")),
    path("api/vendors/", include("vendors.urls")),
    path("api/pickup/", include("pickup.urls")),
    path("api/pincode/", include("pincode.urls")),
    path("api/signup/", include("signup.urls")),
    path("api/shipments/", include("shipments.urls")),
    path('api/user/', include('user_management.urls')),
]