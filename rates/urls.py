# rates/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # =====================================================
    # RATE CALCULATORS
    # =====================================================
    path("b2b/calculate/", views.b2b_rate_calculate, name="b2b_rate_calculate"),
    path("fcpl/calculate/", views.fcpl_rate_calculate, name="fcpl_rate_calculate"),
    path("vendor/calculate/", views.vendor_rate_calculate, name="vendor_rate_calculate"),
    
    # =====================================================
    # 🆕 CLIENT RATE CALCULATOR
    # =====================================================
    path("client/calculate/", views.client_rate_calculate, name="client_rate_calculate"),
    
    # =====================================================
    # RATE MATRIX APIs
    # =====================================================
    path("matrix/", views.get_matrix, name="get_matrix"),
    path("matrix/update/", views.update_matrix, name="update_matrix"),
    path("matrix/upload/", views.upload_matrix_excel, name="upload_matrix_excel"),
    
    # =====================================================
    # 🆕 CLIENT RATE MANAGEMENT APIs (Admin only)
    # =====================================================
    path("client/<str:client_id>/", views.get_client_rates, name="get_client_rates"),
    path("client/<str:client_id>/update/", views.update_client_rates, name="update_client_rates"),
]