from django.urls import path
from .views import update_vendor_rate, get_vendor_rate

urlpatterns = [
    path("api/update-vendor-rate/<str:vendor_name>", update_vendor_rate),
    path("api/get-vendor-rate/<str:vendor_name>", get_vendor_rate),
]
