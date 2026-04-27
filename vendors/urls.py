from django.urls import path
from . import views

urlpatterns = [
    # ============================================
    # VENDOR RATE MANAGEMENT
    # ============================================
    path('vendor-rates/', views.manage_vendor_rate, name='vendor-rates'),
    path('vendor-rates/<str:vendor_name>/', views.manage_vendor_rate, name='vendor-rate-detail'),
    
    # ============================================
    # VENDOR PINCODE MANAGEMENT
    # ============================================
    path('vendor-pincodes/<str:vendor_name>/', views.manage_vendor_pincodes, name='vendor-pincodes'),
    path('vendor-pincodes/<str:vendor_name>/<str:pincode>/', views.manage_vendor_pincodes, name='vendor-pincode-detail'),
    path('vendor-pincodes/bulk-upload/<str:vendor_name>/', views.bulk_upload_pincodes, name='bulk-upload-pincodes'),
    
    # ============================================
    # LOCATION AND ODA CHECK (UPDATED)
    # ============================================
    path('pincode-location/<str:pincode>/', views.get_pincode_location, name='pincode-location'),
    path('check-oda/<str:vendor_name>/<str:pincode>/', views.check_oda_status, name='check-oda'),
    path('check-oda-all/', views.check_oda_all_vendors, name='check-oda-all'),  # ✅ NEW
    path('vendor-pincode-stats/<str:vendor_name>/', views.get_vendor_pincode_stats, name='vendor-pincode-stats'),  # ✅ NEW
    
    # ============================================
    # CALCULATOR AND COMPARISON
    # ============================================
    path('calculate-all-vendor-rates/', views.calculate_all_vendor_rates, name='calculate-all-vendor-rates'),
    path('compare-vendors/', views.compare_vendors, name='compare-vendors'),
    
    # ============================================
    # BULK OPERATIONS
    # ============================================
    path('bulk-upload-rates/', views.bulk_upload_rates, name='bulk-upload-rates'),
    path('rate-history/', views.get_rate_history, name='rate-history'),
    path('rate-history/<str:vendor_name>/', views.get_rate_history, name='rate-history-vendor'),
    
    # ============================================
    # LEGACY ENDPOINTS (Backward Compatibility)
    # ============================================
    path('update-vendor-rate/<str:vendor_name>/', views.update_vendor_rate, name='update-vendor-rate'),
    path('get-vendor-rate/<str:vendor_name>/', views.get_vendor_rate, name='get-vendor-rate'),
    
    # ============================================
    # ZONE MANAGEMENT
    # ============================================
    path('zones/', views.manage_zones, name='zones'),
    path('zones/<int:zone_id>/', views.manage_zones, name='zone-detail'),
    
    # ============================================
    # B2B RATES
    # ============================================
    path('b2b-rates/', views.manage_b2b_rates, name='b2b-rates'),
    path('b2b-rates/<int:rate_id>/', views.manage_b2b_rates, name='b2b-rate-detail'),
    
    # ============================================
    # VENDOR SERVICE RATES
    # ============================================
    path('vendor-service-rates/', views.manage_vendor_service_rates, name='vendor-service-rates'),
    path('vendor-service-rates/<int:service_id>/', views.manage_vendor_service_rates, name='vendor-service-rate-detail'),
]