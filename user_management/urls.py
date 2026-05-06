# user_management/urls.py - COMPLETE UPDATED FILE
from django.urls import path
from . import views

urlpatterns = [
    # ============================================
    # 🔧 TEST ENDPOINT
    # ============================================
    path('test/', views.test_api, name='test_api'),
    
    # ============================================
    # 🔐 AUTHENTICATION
    # ============================================
    path('admin-login/', views.admin_login, name='admin_login'),
    path('login/', views.user_login, name='user_login'),
    
    # ============================================
    # 👥 USER MANAGEMENT CRUD
    # ============================================
    path('add-user/', views.add_user, name='add_user'),
    path('users/', views.user_list, name='user_list'),
    path('users/<int:id>/', views.user_detail, name='user_detail'),
    path('update-user/<int:id>/', views.update_user, name='update_user'),
    path('delete-user/<int:id>/', views.delete_user, name='delete_user'),
    
    # ============================================
    # 📦 SHIPMENTS & ORDERS
    # ============================================
    path('user-orders/<int:user_id>/', views.user_orders, name='user_orders'),
    path('user-shipments/<int:user_id>/', views.user_shipments, name='user_shipments'),
    path('user-stats/<int:user_id>/', views.user_stats, name='user_stats'),
    path('all-shipments/', views.all_shipments, name='all_shipments'),
    
    # ============================================
    # 💰 RATE & TRACKING
    # ============================================
    path('fcpl-rate-calculate/', views.calculate_fcpl_rate, name='calculate_fcpl_rate'),
    path('pincode/zone/<str:pincode>/', views.get_pincode_zone, name='get_pincode_zone'),
    path('track-shipment/<str:tracking_id>/', views.track_shipment, name='track_shipment'),
    
    # ============================================
    # 📊 DASHBOARD
    # ============================================
    path('dashboard-stats/', views.dashboard_stats, name='dashboard_stats'),
    
    # ============================================
    # 🆕 CLIENT MANAGEMENT APIs
    # ============================================
    path('clients/', views.client_list, name='client_list'),
    path('client/create/', views.create_client, name='create_client'),
    path('client/<str:client_id>/status/', views.update_client_status, name='update_client_status'),
    path('client/<str:client_id>/delete/', views.delete_client, name='delete_client'),
    path('client/<str:client_id>/summary/', views.get_client_order_summary, name='get_client_order_summary'),
    
    # ============================================
    # 💰 CLIENT WALLET & RECHARGE SYSTEM
    # ============================================
    
    # Client Wallet APIs (Client Access)
    path('wallet/balance/', views.get_wallet_balance, name='wallet_balance'),
    path('wallet/recharge-request/', views.create_recharge_request, name='recharge_request'),
    path('wallet/recharge-history/', views.get_recharge_history, name='recharge_history'),
    path('wallet/transactions/', views.get_wallet_transactions, name='wallet_transactions'),
    path('wallet/check-balance/', views.check_balance_before_order, name='check_balance'),
    
    # Admin Recharge APIs (Admin Access Only)
    path('admin/recharge/manual/', views.add_recharge_manual, name='admin_recharge_manual'),
    path('admin/recharges/', views.admin_all_recharges, name='admin_all_recharges'),
]