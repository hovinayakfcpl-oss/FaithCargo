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
    path("api/vendors/", include("vendors.urls")),  # Changed from vendors/ to api/vendors/
    path("api/pickup/", include("pickup.urls")),    # Changed from pickup/ to api/pickup/
    path("api/pincode/", include("pincode.urls")),
    path("api/signup/", include("signup.urls")),    # Changed from signup/ to api/signup/
    path('api/accounts/', include('accounts.urls')),
    
    # Shipments API
    path("api/shipments/", include("shipments.urls")),
    
    # User Management API - This is the important one!
    path('api/user/', include('user_management.urls')),   # All user APIs under /api/user/
]

# Remove the duplicate line at the bottom