from django.contrib import admin
from .models import PickupRequest, PickupTask, PickupAssignmentHistory, PickupNotification

@admin.register(PickupRequest)
class PickupRequestAdmin(admin.ModelAdmin):
    list_display = ['pickup_id', 'client', 'pickup_name', 'delivery_name', 'status', 'assigned_to', 'created_at']
    list_filter = ['status', 'pickup_time', 'created_at']
    search_fields = ['pickup_id', 'pickup_name', 'delivery_name', 'pickup_phone', 'delivery_phone']
    readonly_fields = ['pickup_id', 'created_at', 'updated_at']
    fieldsets = (
        ('Pickup Info', {'fields': ('pickup_id', 'client', 'status', 'assigned_to')}),
        ('Pickup Address', {'fields': ('pickup_name', 'pickup_phone', 'pickup_address', 'pickup_pincode', 'pickup_city', 'pickup_state')}),
        ('Delivery Address', {'fields': ('delivery_name', 'delivery_phone', 'delivery_address', 'delivery_pincode', 'delivery_city', 'delivery_state')}),
        ('Shipment Details', {'fields': ('weight', 'packages', 'material', 'special_instructions')}),
        ('Schedule', {'fields': ('pickup_date', 'pickup_time', 'preferred_time')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at', 'assigned_at', 'picked_up_at', 'delivered_at')}),
    )


@admin.register(PickupTask)
class PickupTaskAdmin(admin.ModelAdmin):
    list_display = ['id', 'pickup', 'title', 'task_type', 'status', 'assigned_to', 'created_at']
    list_filter = ['status', 'task_type', 'created_at']
    search_fields = ['title', 'description', 'pickup__pickup_id']


@admin.register(PickupAssignmentHistory)
class PickupAssignmentHistoryAdmin(admin.ModelAdmin):
    list_display = ['pickup', 'assigned_to', 'assigned_by', 'assigned_at']
    list_filter = ['assigned_at']


@admin.register(PickupNotification)
class PickupNotificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'notification_type', 'title', 'is_read', 'created_at']
    list_filter = ['notification_type', 'is_read', 'created_at']