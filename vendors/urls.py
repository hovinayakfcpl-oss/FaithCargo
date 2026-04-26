from django.urls import path
from . import views

urlpatterns = [
    # Vendor rate management
    path('vendor-rates/', views.manage_vendor_rate, name='vendor-rates'),
    path('vendor-rates/<str:vendor_name>/', views.manage_vendor_rate, name='vendor-rate-detail'),
    
    # ============================================
    # VENDOR PINCODE MANAGEMENT (NEW)
    # ============================================
    path('vendor-pincodes/<str:vendor_name>/', views.manage_vendor_pincodes, name='vendor-pincodes'),
    path('vendor-pincodes/<str:vendor_name>/<str:pincode>/', views.manage_vendor_pincodes, name='vendor-pincode-detail'),
    path('vendor-pincodes/bulk-upload/<str:vendor_name>/', views.bulk_upload_pincodes, name='bulk-upload-pincodes'),
    
    # Location and ODA
    path('pincode-location/<str:pincode>/', views.get_pincode_location, name='pincode-location'),
    path('check-oda/<str:vendor_name>/<str:pincode>/', views.check_oda_status, name='check-oda'),
    
    # Legacy endpoints
    path('update-vendor-rate/<str:vendor_name>/', views.update_vendor_rate, name='update-vendor-rate'),
    path('get-vendor-rate/<str:vendor_name>/', views.get_vendor_rate, name='get-vendor-rate'),
    
    # Calculator
    path('calculate-all-vendor-rates/', views.calculate_all_vendor_rates, name='calculate-all-vendor-rates'),
    path('compare-vendors/', views.compare_vendors, name='compare-vendors'),
    
    # Bulk operations
    path('bulk-upload-rates/', views.bulk_upload_rates, name='bulk-upload-rates'),
    path('rate-history/', views.get_rate_history, name='rate-history'),
    path('rate-history/<str:vendor_name>/', views.get_rate_history, name='rate-history-vendor'),
    
    # Zone management
    path('zones/', views.manage_zones, name='zones'),
    path('zones/<int:zone_id>/', views.manage_zones, name='zone-detail'),
    
    # B2B rates
    path('b2b-rates/', views.manage_b2b_rates, name='b2b-rates'),
    path('b2b-rates/<int:rate_id>/', views.manage_b2b_rates, name='b2b-rate-detail'),
    
    # Vendor service rates
    path('vendor-service-rates/', views.manage_vendor_service_rates, name='vendor-service-rates'),
    path('vendor-service-rates/<int:service_id>/', views.manage_vendor_service_rates, name='vendor-service-rate-detail'),
]