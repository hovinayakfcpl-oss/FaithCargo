from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

def home(request):
    return JsonResponse({"message": "Faith Cargo Logistics Backend Running"})

urlpatterns = [
    path("", home, name="home"),
    path("admin/", admin.site.urls),
  
    path("api/rates/", include("rates.urls")),
    path("vendors/", include("vendors.urls")),
    path("pickup/", include("pickup.urls")),
    path("pincode/", include("pincode.urls")),
    path("signup/", include("signup.urls")),
    path('accounts/', include('accounts.urls')),
    
    # ✅ API endpoints - Shipments fix kiya gaya hai
    path("api/pincode/", include("pincode.urls")),
    path('api/user/', include('user_management.urls')),
    
    # Yahan "shipments/" add kiya hai taaki /api/shipments/ logic kaam kare
    path("api/shipments/", include("shipments.urls")), 
]