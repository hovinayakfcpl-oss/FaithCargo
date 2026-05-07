from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import datetime

class PickupRequest(models.Model):
    """
    Pickup Request Model
    """
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('ASSIGNED', 'Assigned'),
        ('PICKED_UP', 'Picked Up'),
        ('IN_TRANSIT', 'In Transit'),
        ('DELIVERED', 'Delivered'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    TIME_SLOT_CHOICES = [
        ('Morning', 'Morning (9AM - 12PM)'),
        ('Afternoon', 'Afternoon (12PM - 3PM)'),
        ('Evening', 'Evening (3PM - 6PM)'),
        ('Late Evening', 'Late Evening (6PM - 9PM)'),
    ]
    
    MATERIAL_CHOICES = [
        ('General Cargo', 'General Cargo'),
        ('Electronics', 'Electronics'),
        ('Furniture', 'Furniture'),
        ('Documents', 'Documents'),
        ('Automobile Parts', 'Automobile Parts'),
        ('Fragile Items', 'Fragile Items'),
        ('Perishable Goods', 'Perishable Goods'),
        ('Industrial Equipment', 'Industrial Equipment'),
    ]
    
    # Auto-generated Pickup ID (e.g., PICK-2024-00001)
    pickup_id = models.CharField(max_length=20, unique=True, editable=False)
    
    # Client who created the request
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='pickup_requests'
    )
    
    # Pickup Details
    pickup_name = models.CharField(max_length=200)
    pickup_phone = models.CharField(max_length=15)
    pickup_address = models.TextField()
    pickup_pincode = models.CharField(max_length=6)
    pickup_city = models.CharField(max_length=100, blank=True)
    pickup_state = models.CharField(max_length=100, blank=True)
    
    # Delivery Details
    delivery_name = models.CharField(max_length=200)
    delivery_phone = models.CharField(max_length=15)
    delivery_address = models.TextField()
    delivery_pincode = models.CharField(max_length=6)
    delivery_city = models.CharField(max_length=100, blank=True)
    delivery_state = models.CharField(max_length=100, blank=True)
    
    # Shipment Details
    weight = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    packages = models.IntegerField(default=1)
    material = models.CharField(max_length=50, choices=MATERIAL_CHOICES, default='General Cargo')
    special_instructions = models.TextField(blank=True)
    
    # Schedule Details
    pickup_date = models.DateField()
    pickup_time = models.CharField(max_length=20, choices=TIME_SLOT_CHOICES, default='Morning')
    preferred_time = models.CharField(max_length=50, blank=True)
    
    # Status and Assignment
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='assigned_pickups'
    )
    remarks = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    assigned_at = models.DateTimeField(null=True, blank=True)
    picked_up_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    
    def save(self, *args, **kwargs):
        if not self.pickup_id:
            # Generate unique pickup ID: PICK-2024-00001
            year = datetime.now().year
            last_request = PickupRequest.objects.filter(
                pickup_id__startswith=f'PICK-{year}'
            ).order_by('-id').first()
            
            if last_request:
                try:
                    last_num = int(last_request.pickup_id.split('-')[-1])
                    new_num = last_num + 1
                except (ValueError, IndexError):
                    new_num = 1
            else:
                new_num = 1
            
            self.pickup_id = f'PICK-{year}-{new_num:05d}'
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.pickup_id} - {self.pickup_name} → {self.delivery_name}"
    
    class Meta:
        db_table = 'pickup_requests'
        ordering = ['-created_at']


class PickupTask(models.Model):
    """
    Tasks assigned by admin to staff
    """
    TASK_TYPE_CHOICES = [
        ('PAYMENT', 'Payment Collection'),
        ('DOCKET', 'Docket Clearance'),
        ('DELIVERY', 'Delivery Arrangement'),
        ('FOLLOWUP', 'Customer Follow-up'),
        ('POD', 'Proof of Delivery'),
        ('OTHER', 'Other Task'),
    ]
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('REJECTED', 'Rejected'),
    ]
    
    pickup = models.ForeignKey(PickupRequest, on_delete=models.CASCADE, related_name='tasks')
    assigned_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_tasks')
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='my_tasks', null=True, blank=True)
    
    task_type = models.CharField(max_length=20, choices=TASK_TYPE_CHOICES, default='OTHER')
    title = models.CharField(max_length=200)
    description = models.TextField()
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    reply = models.TextField(blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Task for {self.pickup.pickup_id} - {self.title}"
    
    class Meta:
        db_table = 'pickup_tasks'
        ordering = ['-created_at']


class PickupAssignmentHistory(models.Model):
    """
    Track assignment history
    """
    pickup = models.ForeignKey(PickupRequest, on_delete=models.CASCADE, related_name='assignment_history')
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='assigned_history')
    assigned_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='assigned_by_history')
    assigned_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)
    
    def __str__(self):
        return f"{self.pickup.pickup_id} assigned to {self.assigned_to.username}"
    
    class Meta:
        db_table = 'pickup_assignment_history'
        ordering = ['-assigned_at']


class PickupNotification(models.Model):
    """
    Notifications for staff and clients
    """
    NOTIFICATION_TYPES = [
        ('ASSIGNMENT', 'Pickup Assigned'),
        ('STATUS_UPDATE', 'Status Updated'),
        ('TASK', 'New Task'),
        ('TASK_COMPLETED', 'Task Completed'),
        ('REMINDER', 'Reminder'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='pickup_notifications')
    pickup = models.ForeignKey(PickupRequest, on_delete=models.CASCADE, null=True, blank=True, related_name='notifications')
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.notification_type} for {self.user.username}"
    
    class Meta:
        db_table = 'pickup_notifications'
        ordering = ['-created_at']