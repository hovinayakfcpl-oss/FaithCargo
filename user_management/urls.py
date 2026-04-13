# urls.py
from django.urls import path
from . import views

urlpatterns = [
    # User Management
    path('api/users/', views.user_list, name='user_list'),
    path('api/users/<int:id>/', views.user_detail, name='user_detail'),
    path('api/add-user/', views.add_user, name='add_user'),
    path('api/update-user/<int:id>/', views.update_user, name='update_user'),
    path('api/delete-user/<int:id>/', views.delete_user, name='delete_user'),
    path('api/login/', views.user_login, name='user_login'),
    
    # User Stats & Shipments
    path('api/user-orders/<int:user_id>/', views.user_orders, name='user_orders'),
    path('api/user-shipments/<int:user_id>/', views.user_shipments, name='user_shipments'),
    path('api/user-stats/<int:user_id>/', views.user_stats, name='user_stats'),
    path('api/all-shipments/', views.all_shipments, name='all_shipments'),
    
    # Billing
    path('api/user-bill/<int:user_id>/', views.user_bill, name='user_bill'),
    
    # Dashboard
    path('api/dashboard-stats/', views.dashboard_stats, name='dashboard_stats'),
]