# pickup/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # Client APIs
    path('create/', views.create_pickup_request, name='create_pickup'),
    path('my-pickups/', views.get_my_pickups, name='my_pickups'),
    path('detail/<str:pickup_id>/', views.get_pickup_detail, name='pickup_detail'),
    path('cancel/<str:pickup_id>/', views.cancel_pickup_request, name='cancel_pickup'),
    
    # Admin APIs
    path('admin/all/', views.admin_get_all_pickups, name='admin_all_pickups'),
    path('admin/stats/', views.get_pickup_stats, name='pickup_stats'),
    path('admin/staff/', views.get_available_staff, name='available_staff'),
    path('admin/assign/<int:pickup_id>/', views.assign_pickup_to_staff, name='assign_pickup'),
    path('admin/send-task/<int:pickup_id>/', views.send_task_to_staff, name='send_task'),
    path('admin/update-status/<int:pickup_id>/', views.admin_update_pickup_status, name='admin_update_status'),
    
    # Staff APIs
    path('staff/my-pickups/', views.get_my_assigned_pickups, name='my_assigned_pickups'),
    path('staff/my-tasks/', views.get_my_tasks, name='my_tasks'),
    path('staff/update-status/<int:pickup_id>/', views.staff_update_pickup_status, name='staff_update_status'),
    path('staff/complete-task/<int:task_id>/', views.complete_task, name='complete_task'),
    
    # Notification APIs
    path('notifications/', views.get_my_notifications, name='notifications'),
    path('notifications/read/<int:notification_id>/', views.mark_notification_read, name='mark_read'),
    path('notifications/read-all/', views.mark_all_notifications_read, name='mark_all_read'),
    path('notifications/delete/<int:notification_id>/', views.delete_notification, name='delete_notification'),
    
    # Dashboard API
    path('dashboard/', views.get_dashboard_data, name='dashboard_data'),
    
    # Location API
    path('pincode/<str:pincode>/', views.get_pincode_details, name='pincode_details'),
]