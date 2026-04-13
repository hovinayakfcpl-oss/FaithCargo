# user_management/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # Test endpoint
    path('test/', views.test_api, name='test_api'),
    
    # User Management APIs
    path('users/', views.user_list, name='user_list'),
    path('users/<int:id>/', views.user_detail, name='user_detail'),
    path('add-user/', views.add_user, name='add_user'),
    path('update-user/<int:id>/', views.update_user, name='update_user'),
    path('delete-user/<int:id>/', views.delete_user, name='delete_user'),
    path('login/', views.user_login, name='user_login'),
    
    # Shipment APIs
    path('user-orders/<int:user_id>/', views.user_orders, name='user_orders'),
    path('user-shipments/<int:user_id>/', views.user_shipments, name='user_shipments'),
    path('user-stats/<int:user_id>/', views.user_stats, name='user_stats'),
    path('all-shipments/', views.all_shipments, name='all_shipments'),
    
    # Rate & Tracking APIs (for Jervice AI)
    path('fcpl-rate-calculate/', views.calculate_fcpl_rate, name='calculate_fcpl_rate'),
    path('pincode/zone/<str:pincode>/', views.get_pincode_zone, name='get_pincode_zone'),
    path('track-shipment/<str:tracking_id>/', views.track_shipment, name='track_shipment'),
    
    # Dashboard APIs
    path('dashboard-stats/', views.dashboard_stats, name='dashboard_stats'),
]