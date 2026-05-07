# pickup/serializers.py - COMPLETE WORKING VERSION
from rest_framework import serializers
from .models import PickupRequest, PickupTask, PickupAssignmentHistory, PickupNotification
from user_management.models import CustomUser


# ============================================
# 📦 STAFF USER SERIALIZER
# ============================================

class StaffUserSerializer(serializers.ModelSerializer):
    """
    Serializer for staff users (for assignment dropdown)
    """
    full_name = serializers.SerializerMethodField()
    active_pickups_count = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'phone', 'company', 'role', 'full_name', 'active_pickups_count']
    
    def get_full_name(self, obj):
        return obj.company or obj.username
    
    def get_active_pickups_count(self, obj):
        from .models import PickupRequest
        return PickupRequest.objects.filter(
            assigned_to=obj,
            status__in=['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT']
        ).count()


# ============================================
# 🚚 PICKUP REQUEST SERIALIZER
# ============================================

class PickupRequestSerializer(serializers.ModelSerializer):
    """
    Serializer for pickup requests with additional fields
    """
    client_name = serializers.SerializerMethodField()
    client_company = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    assigned_to_phone = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    pickup_time_display = serializers.SerializerMethodField()
    
    class Meta:
        model = PickupRequest
        fields = '__all__'
    
    def get_client_name(self, obj):
        return obj.client.username if obj.client else None
    
    def get_client_company(self, obj):
        return obj.client.company if obj.client else None
    
    def get_assigned_to_name(self, obj):
        return obj.assigned_to.username if obj.assigned_to else None
    
    def get_assigned_to_phone(self, obj):
        return obj.assigned_to.phone if obj.assigned_to else None
    
    def get_status_display(self, obj):
        status_map = {
            'PENDING': 'Pending',
            'ASSIGNED': 'Assigned',
            'PICKED_UP': 'Picked Up',
            'IN_TRANSIT': 'In Transit',
            'DELIVERED': 'Delivered',
            'CANCELLED': 'Cancelled'
        }
        return status_map.get(obj.status, obj.status)
    
    def get_pickup_time_display(self, obj):
        time_map = {
            'Morning': 'Morning (9AM - 12PM)',
            'Afternoon': 'Afternoon (12PM - 3PM)',
            'Evening': 'Evening (3PM - 6PM)',
            'Late Evening': 'Late Evening (6PM - 9PM)'
        }
        return time_map.get(obj.pickup_time, obj.pickup_time)


# ============================================
# 📋 PICKUP TASK SERIALIZER
# ============================================

class PickupTaskSerializer(serializers.ModelSerializer):
    """
    Serializer for tasks assigned to staff
    """
    assigned_by_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    pickup_id = serializers.SerializerMethodField()
    pickup_details = serializers.SerializerMethodField()
    task_type_display = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    
    class Meta:
        model = PickupTask
        fields = '__all__'
    
    def get_assigned_by_name(self, obj):
        return obj.assigned_by.username if obj.assigned_by else None
    
    def get_assigned_to_name(self, obj):
        return obj.assigned_to.username if obj.assigned_to else None
    
    def get_pickup_id(self, obj):
        return obj.pickup.pickup_id if obj.pickup else None
    
    def get_pickup_details(self, obj):
        if obj.pickup:
            return {
                'pickup_name': obj.pickup.pickup_name,
                'pickup_address': obj.pickup.pickup_address,
                'pickup_pincode': obj.pickup.pickup_pincode,
                'delivery_name': obj.pickup.delivery_name,
                'delivery_address': obj.pickup.delivery_address,
                'delivery_pincode': obj.pickup.delivery_pincode,
            }
        return None
    
    def get_task_type_display(self, obj):
        type_map = {
            'PAYMENT': '💰 Payment Collection',
            'DOCKET': '📄 Docket Clearance',
            'DELIVERY': '🚚 Delivery Arrangement',
            'FOLLOWUP': '📞 Customer Follow-up',
            'POD': '📸 Proof of Delivery',
            'OTHER': '📝 Other Task'
        }
        return type_map.get(obj.task_type, obj.task_type)
    
    def get_status_display(self, obj):
        status_map = {
            'PENDING': '⏳ Pending',
            'IN_PROGRESS': '🔄 In Progress',
            'COMPLETED': '✅ Completed',
            'REJECTED': '❌ Rejected'
        }
        return status_map.get(obj.status, obj.status)


# ============================================
# 📜 ASSIGNMENT HISTORY SERIALIZER
# ============================================

class PickupAssignmentHistorySerializer(serializers.ModelSerializer):
    """
    Serializer for pickup assignment history
    """
    assigned_to_name = serializers.SerializerMethodField()
    assigned_by_name = serializers.SerializerMethodField()
    pickup_id = serializers.SerializerMethodField()
    
    class Meta:
        model = PickupAssignmentHistory
        fields = '__all__'
    
    def get_assigned_to_name(self, obj):
        return obj.assigned_to.username if obj.assigned_to else None
    
    def get_assigned_by_name(self, obj):
        return obj.assigned_by.username if obj.assigned_by else None
    
    def get_pickup_id(self, obj):
        return obj.pickup.pickup_id if obj.pickup else None


# ============================================
# 🔔 NOTIFICATION SERIALIZER
# ============================================

class PickupNotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for notifications
    """
    notification_type_display = serializers.SerializerMethodField()
    pickup_id = serializers.SerializerMethodField()
    
    class Meta:
        model = PickupNotification
        fields = '__all__'
    
    def get_notification_type_display(self, obj):
        type_map = {
            'ASSIGNMENT': '📋 Pickup Assigned',
            'STATUS_UPDATE': '🔄 Status Updated',
            'TASK': '📝 New Task',
            'TASK_COMPLETED': '✅ Task Completed',
            'REMINDER': '⏰ Reminder'
        }
        return type_map.get(obj.notification_type, obj.notification_type)
    
    def get_pickup_id(self, obj):
        return obj.pickup.pickup_id if obj.pickup else None


# ============================================
# 📊 DASHBOARD STATS SERIALIZER
# ============================================

class PickupDashboardStatsSerializer(serializers.Serializer):
    """
    Serializer for dashboard statistics
    """
    total_pickups = serializers.IntegerField()
    pending_pickups = serializers.IntegerField()
    assigned_pickups = serializers.IntegerField()
    picked_up = serializers.IntegerField()
    in_transit = serializers.IntegerField()
    delivered = serializers.IntegerField()
    cancelled = serializers.IntegerField()
    today_pickups = serializers.IntegerField()
    
    # Staff specific
    my_pickups = serializers.IntegerField(required=False)
    my_tasks = serializers.IntegerField(required=False)
    completed_tasks = serializers.IntegerField(required=False)
    
    # Client specific
    in_progress = serializers.IntegerField(required=False)
    completed = serializers.IntegerField(required=False)


# ============================================
# 📍 PINCODE RESPONSE SERIALIZER
# ============================================

class PincodeResponseSerializer(serializers.Serializer):
    """
    Serializer for pincode API response
    """
    success = serializers.BooleanField()
    city = serializers.CharField()
    state = serializers.CharField()
    pincode = serializers.CharField()


# ============================================
# ✅ ASSIGNMENT REQUEST SERIALIZER
# ============================================

class AssignPickupSerializer(serializers.Serializer):
    """
    Serializer for assigning pickup to staff
    """
    staff_id = serializers.IntegerField(required=True)
    notes = serializers.CharField(required=False, allow_blank=True)


# ============================================
# ✅ TASK REQUEST SERIALIZER
# ============================================

class CreateTaskSerializer(serializers.Serializer):
    """
    Serializer for creating tasks
    """
    task_type = serializers.ChoiceField(choices=['PAYMENT', 'DOCKET', 'DELIVERY', 'FOLLOWUP', 'POD', 'OTHER'])
    title = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, allow_blank=True)


# ============================================
# ✅ STATUS UPDATE SERIALIZER
# ============================================

class UpdateStatusSerializer(serializers.Serializer):
    """
    Serializer for updating pickup status
    """
    status = serializers.ChoiceField(choices=[
        'PENDING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'
    ])
    remarks = serializers.CharField(required=False, allow_blank=True)