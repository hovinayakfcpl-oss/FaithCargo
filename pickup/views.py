# pickup/views.py - COMPLETE FIXED VERSION
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.utils import timezone
from django.db.models import Q
from .models import PickupRequest, PickupTask, PickupAssignmentHistory, PickupNotification
from .serializers import PickupRequestSerializer, PickupTaskSerializer, StaffUserSerializer
from user_management.models import CustomUser
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


# ============================================
# 🏠 CLIENT PICKUP APIs
# ============================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_pickup_request(request):
    """Client creates a pickup request"""
    try:
        user = request.user
        
        if user.role != 'Client':
            return Response({
                "success": False,
                "error": "Only clients can create pickup requests"
            }, status=status.HTTP_403_FORBIDDEN)
        
        data = request.data
        print("📥 Pickup Request Data:", data)
        
        # Validation
        required_fields = ['pickup_name', 'pickup_phone', 'pickup_address', 'pickup_pincode',
                          'delivery_name', 'delivery_phone', 'delivery_address', 'delivery_pincode',
                          'pickup_date']
        
        for field in required_fields:
            if not data.get(field):
                return Response({
                    "success": False,
                    "error": f"{field} is required"
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create pickup request
        pickup_request = PickupRequest.objects.create(
            client=user,
            pickup_name=data.get('pickup_name'),
            pickup_phone=data.get('pickup_phone'),
            pickup_address=data.get('pickup_address'),
            pickup_pincode=data.get('pickup_pincode'),
            pickup_city=data.get('pickup_city', ''),
            pickup_state=data.get('pickup_state', ''),
            delivery_name=data.get('delivery_name'),
            delivery_phone=data.get('delivery_phone'),
            delivery_address=data.get('delivery_address'),
            delivery_pincode=data.get('delivery_pincode'),
            delivery_city=data.get('delivery_city', ''),
            delivery_state=data.get('delivery_state', ''),
            weight=data.get('weight', 0),
            packages=data.get('packages', 1),
            material=data.get('material', 'General Cargo'),
            special_instructions=data.get('special_instructions', ''),
            pickup_date=data.get('pickup_date'),
            pickup_time=data.get('pickup_time', 'Morning'),
            preferred_time=data.get('preferred_time_slot', ''),
        )
        
        print(f"✅ Pickup request created: {pickup_request.pickup_id}")
        
        # Create notification for admin
        admin_users = CustomUser.objects.filter(role='Admin')
        for admin in admin_users:
            PickupNotification.objects.create(
                user=admin,
                pickup=pickup_request,
                notification_type='ASSIGNMENT',
                title='New Pickup Request',
                message=f'New pickup request {pickup_request.pickup_id} created by {user.company or user.username}'
            )
        
        return Response({
            "success": True,
            "message": "Pickup request created successfully",
            "pickup_id": pickup_request.pickup_id,
            "pickup": PickupRequestSerializer(pickup_request).data
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Error creating pickup: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({
            "success": False,
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_pickups(request):
    """Client gets their own pickup requests"""
    try:
        user = request.user
        
        if user.role != 'Client':
            return Response({
                "success": False,
                "error": "Access denied"
            }, status=status.HTTP_403_FORBIDDEN)
        
        pickups = PickupRequest.objects.filter(client=user).order_by('-created_at')
        serializer = PickupRequestSerializer(pickups, many=True)
        
        return Response({
            "success": True,
            "pickups": serializer.data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error getting my pickups: {str(e)}")
        return Response({
            "success": False,
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_pickup_detail(request, pickup_id):
    """Get single pickup request details"""
    try:
        user = request.user
        
        pickup = PickupRequest.objects.get(pickup_id=pickup_id)
        
        # Check permission
        if user.role == 'Client' and pickup.client != user:
            return Response({
                "success": False,
                "error": "Access denied"
            }, status=status.HTTP_403_FORBIDDEN)
        
        if user.role == 'User' and pickup.assigned_to != user:
            return Response({
                "success": False,
                "error": "Access denied"
            }, status=status.HTTP_403_FORBIDDEN)
        
        serializer = PickupRequestSerializer(pickup)
        
        return Response({
            "success": True,
            "pickup": serializer.data
        }, status=status.HTTP_200_OK)
        
    except PickupRequest.DoesNotExist:
        return Response({
            "success": False,
            "error": "Pickup request not found"
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            "success": False,
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def cancel_pickup_request(request, pickup_id):
    """Client cancels their pickup request"""
    try:
        user = request.user
        
        if user.role != 'Client':
            return Response({
                "success": False,
                "error": "Only clients can cancel pickup requests"
            }, status=status.HTTP_403_FORBIDDEN)
        
        pickup = PickupRequest.objects.get(pickup_id=pickup_id, client=user)
        
        if pickup.status not in ['PENDING', 'ASSIGNED']:
            return Response({
                "success": False,
                "error": f"Cannot cancel pickup with status: {pickup.status}"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        pickup.status = 'CANCELLED'
        pickup.save()
        
        return Response({
            "success": True,
            "message": "Pickup request cancelled successfully"
        }, status=status.HTTP_200_OK)
        
    except PickupRequest.DoesNotExist:
        return Response({
            "success": False,
            "error": "Pickup request not found"
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            "success": False,
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================
# 👑 ADMIN PICKUP MANAGEMENT APIs
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_get_all_pickups(request):
    """Admin gets all pickup requests"""
    try:
        user = request.user
        
        if user.role != 'Admin':
            return Response({
                "success": False,
                "error": "Admin access required"
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get query parameters for filtering
        status_filter = request.GET.get('status', '')
        search = request.GET.get('search', '')
        
        pickups = PickupRequest.objects.all().order_by('-created_at')
        
        if status_filter:
            pickups = pickups.filter(status=status_filter)
        
        if search:
            pickups = pickups.filter(
                Q(pickup_id__icontains=search) |
                Q(pickup_name__icontains=search) |
                Q(delivery_name__icontains=search) |
                Q(client__company__icontains=search)
            )
        
        serializer = PickupRequestSerializer(pickups, many=True)
        
        return Response({
            "success": True,
            "pickups": serializer.data,
            "total": pickups.count()
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error getting all pickups: {str(e)}")
        return Response({
            "success": False,
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_pickup_stats(request):
    """Get pickup statistics for admin dashboard"""
    try:
        user = request.user
        
        if user.role != 'Admin':
            return Response({
                "success": False,
                "error": "Admin access required"
            }, status=status.HTTP_403_FORBIDDEN)
        
        today = datetime.now().date()
        
        stats = {
            'total': PickupRequest.objects.count(),
            'pending': PickupRequest.objects.filter(status='PENDING').count(),
            'assigned': PickupRequest.objects.filter(status='ASSIGNED').count(),
            'picked_up': PickupRequest.objects.filter(status='PICKED_UP').count(),
            'in_transit': PickupRequest.objects.filter(status='IN_TRANSIT').count(),
            'delivered': PickupRequest.objects.filter(status='DELIVERED').count(),
            'cancelled': PickupRequest.objects.filter(status='CANCELLED').count(),
            'today': PickupRequest.objects.filter(pickup_date=today).count(),
        }
        
        return Response({
            "success": True,
            "stats": stats
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            "success": False,
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_available_staff(request):
    """Get list of staff users for assignment"""
    try:
        user = request.user
        
        if user.role != 'Admin':
            return Response({
                "success": False,
                "error": "Admin access required"
            }, status=status.HTTP_403_FORBIDDEN)
        
        staff_users = CustomUser.objects.filter(role='User', is_active=True)
        
        # Get current load for each staff
        staff_data = []
        for staff in staff_users:
            active_pickups = PickupRequest.objects.filter(
                assigned_to=staff,
                status__in=['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT']
            ).count()
            
            staff_data.append({
                "id": staff.id,
                "username": staff.username,
                "email": staff.email,
                "phone": staff.phone or "",
                "company": staff.company or "",
                "active_pickups": active_pickups,
                "available": active_pickups < 5
            })
        
        return Response({
            "success": True,
            "staff": staff_data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            "success": False,
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def assign_pickup_to_staff(request, pickup_id):
    """Admin assigns pickup to staff member"""
    try:
        user = request.user
        
        if user.role != 'Admin':
            return Response({
                "success": False,
                "error": "Admin access required"
            }, status=status.HTTP_403_FORBIDDEN)
        
        with transaction.atomic():
            pickup = PickupRequest.objects.get(id=pickup_id)
            staff_id = request.data.get('staff_id')
            notes = request.data.get('notes', '')
            
            if not staff_id:
                return Response({
                    "success": False,
                    "error": "Staff ID required"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                staff = CustomUser.objects.get(id=staff_id, role='User')
            except CustomUser.DoesNotExist:
                return Response({
                    "success": False,
                    "error": "Staff member not found"
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Update pickup
            pickup.assigned_to = staff
            pickup.status = 'ASSIGNED'
            pickup.assigned_at = timezone.now()
            pickup.save()
            
            # Create history record
            PickupAssignmentHistory.objects.create(
                pickup=pickup,
                assigned_to=staff,
                assigned_by=user,
                notes=notes
            )
            
            # Create notification for staff
            PickupNotification.objects.create(
                user=staff,
                pickup=pickup,
                notification_type='ASSIGNMENT',
                title='New Pickup Assigned',
                message=f'Pickup {pickup.pickup_id} has been assigned to you.\nPickup from: {pickup.pickup_name}\nDelivery to: {pickup.delivery_name}'
            )
            
            # Notify client
            PickupNotification.objects.create(
                user=pickup.client,
                pickup=pickup,
                notification_type='STATUS_UPDATE',
                title='Pickup Assigned',
                message=f'Your pickup request {pickup.pickup_id} has been assigned to staff member {staff.username}'
            )
            
            return Response({
                "success": True,
                "message": f"Pickup {pickup.pickup_id} assigned to {staff.username}",
                "pickup_id": pickup.pickup_id,
                "assigned_to": staff.username
            }, status=status.HTTP_200_OK)
        
    except PickupRequest.DoesNotExist:
        return Response({
            "success": False,
            "error": "Pickup request not found"
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error assigning pickup: {str(e)}")
        return Response({
            "success": False,
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_task_to_staff(request, pickup_id):
    """Admin sends task to assigned staff"""
    try:
        user = request.user
        
        if user.role != 'Admin':
            return Response({
                "success": False,
                "error": "Admin access required"
            }, status=status.HTTP_403_FORBIDDEN)
        
        pickup = PickupRequest.objects.get(id=pickup_id)
        
        if not pickup.assigned_to:
            return Response({
                "success": False,
                "error": "Pickup not assigned to any staff yet. Please assign first."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        task_data = request.data
        task_type = task_data.get('task_type', 'OTHER')
        title = task_data.get('title', 'Task from Admin')
        description = task_data.get('description', '')
        
        task = PickupTask.objects.create(
            pickup=pickup,
            assigned_by=user,
            assigned_to=pickup.assigned_to,
            task_type=task_type,
            title=title,
            description=description
        )
        
        # Create notification
        PickupNotification.objects.create(
            user=pickup.assigned_to,
            pickup=pickup,
            notification_type='TASK',
            title='New Task Assigned',
            message=f'New task for pickup {pickup.pickup_id}: {title}\n\n{description[:200]}'
        )
        
        return Response({
            "success": True,
            "message": "Task sent successfully",
            "task": PickupTaskSerializer(task).data
        }, status=status.HTTP_200_OK)
        
    except PickupRequest.DoesNotExist:
        return Response({
            "success": False,
            "error": "Pickup request not found"
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            "success": False,
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def admin_update_pickup_status(request, pickup_id):
    """Admin updates pickup status"""
    try:
        user = request.user
        
        if user.role != 'Admin':
            return Response({
                "success": False,
                "error": "Admin access required"
            }, status=status.HTTP_403_FORBIDDEN)
        
        pickup = PickupRequest.objects.get(id=pickup_id)
        new_status = request.data.get('status')
        remarks = request.data.get('remarks', '')
        
        if not new_status:
            return Response({
                "success": False,
                "error": "Status required"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        old_status = pickup.status
        pickup.status = new_status
        pickup.remarks = remarks
        
        if new_status == 'PICKED_UP' and not pickup.picked_up_at:
            pickup.picked_up_at = timezone.now()
        elif new_status == 'DELIVERED' and not pickup.delivered_at:
            pickup.delivered_at = timezone.now()
        
        pickup.save()
        
        # Create notifications
        if pickup.client:
            PickupNotification.objects.create(
                user=pickup.client,
                pickup=pickup,
                notification_type='STATUS_UPDATE',
                title='Pickup Status Updated',
                message=f'Your pickup {pickup.pickup_id} status changed from {old_status} to {new_status}'
            )
        
        if pickup.assigned_to:
            PickupNotification.objects.create(
                user=pickup.assigned_to,
                pickup=pickup,
                notification_type='STATUS_UPDATE',
                title='Pickup Status Updated',
                message=f'Pickup {pickup.pickup_id} status changed from {old_status} to {new_status}'
            )
        
        return Response({
            "success": True,
            "message": "Status updated successfully",
            "status": pickup.status
        }, status=status.HTTP_200_OK)
        
    except PickupRequest.DoesNotExist:
        return Response({
            "success": False,
            "error": "Pickup request not found"
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            "success": False,
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================
# 🧑‍💼 STAFF PICKUP APIs
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_assigned_pickups(request):
    """Staff gets their assigned pickups"""
    try:
        user = request.user
        
        if user.role != 'User':
            return Response({
                "success": False,
                "error": "Access denied"
            }, status=status.HTTP_403_FORBIDDEN)
        
        status_filter = request.GET.get('status', '')
        
        pickups = PickupRequest.objects.filter(assigned_to=user).order_by('-created_at')
        
        if status_filter:
            pickups = pickups.filter(status=status_filter)
        
        serializer = PickupRequestSerializer(pickups, many=True)
        
        return Response({
            "success": True,
            "pickups": serializer.data,
            "total": pickups.count(),
            "pending": pickups.filter(status='PENDING').count(),
            "in_progress": pickups.filter(status__in=['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT']).count(),
            "completed": pickups.filter(status='DELIVERED').count()
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            "success": False,
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_tasks(request):
    """Staff gets their assigned tasks"""
    try:
        user = request.user
        
        if user.role != 'User':
            return Response({
                "success": False,
                "error": "Access denied"
            }, status=status.HTTP_403_FORBIDDEN)
        
        status_filter = request.GET.get('status', '')
        
        tasks = PickupTask.objects.filter(assigned_to=user).order_by('-created_at')
        
        if status_filter:
            tasks = tasks.filter(status=status_filter)
        
        serializer = PickupTaskSerializer(tasks, many=True)
        
        return Response({
            "success": True,
            "tasks": serializer.data,
            "total": tasks.count(),
            "pending": tasks.filter(status='PENDING').count(),
            "completed": tasks.filter(status='COMPLETED').count()
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            "success": False,
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def staff_update_pickup_status(request, pickup_id):
    """Staff updates pickup status"""
    try:
        user = request.user
        
        if user.role != 'User':
            return Response({
                "success": False,
                "error": "Access denied"
            }, status=status.HTTP_403_FORBIDDEN)
        
        pickup = PickupRequest.objects.get(id=pickup_id, assigned_to=user)
        new_status = request.data.get('status')
        remarks = request.data.get('remarks', '')
        
        if not new_status:
            return Response({
                "success": False,
                "error": "Status required"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        pickup.status = new_status
        pickup.remarks = remarks
        
        if new_status == 'PICKED_UP' and not pickup.picked_up_at:
            pickup.picked_up_at = timezone.now()
        elif new_status == 'DELIVERED' and not pickup.delivered_at:
            pickup.delivered_at = timezone.now()
        
        pickup.save()
        
        # Notify admin
        admin_users = CustomUser.objects.filter(role='Admin')
        for admin in admin_users:
            PickupNotification.objects.create(
                user=admin,
                pickup=pickup,
                notification_type='STATUS_UPDATE',
                title='Pickup Status Updated by Staff',
                message=f'Pickup {pickup.pickup_id} status updated to {new_status} by {user.username}'
            )
        
        # Notify client
        if pickup.client:
            PickupNotification.objects.create(
                user=pickup.client,
                pickup=pickup,
                notification_type='STATUS_UPDATE',
                title='Pickup Status Updated',
                message=f'Your pickup {pickup.pickup_id} status is now {new_status}'
            )
        
        return Response({
            "success": True,
            "message": "Status updated successfully",
            "status": pickup.status
        }, status=status.HTTP_200_OK)
        
    except PickupRequest.DoesNotExist:
        return Response({
            "success": False,
            "error": "Pickup request not found or not assigned to you"
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            "success": False,
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_task(request, task_id):
    """Staff marks task as completed"""
    try:
        user = request.user
        
        if user.role != 'User':
            return Response({
                "success": False,
                "error": "Access denied"
            }, status=status.HTTP_403_FORBIDDEN)
        
        task = PickupTask.objects.get(id=task_id, assigned_to=user)
        
        if task.status == 'COMPLETED':
            return Response({
                "success": False,
                "error": "Task already completed"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        task.status = 'COMPLETED'
        task.reply = request.data.get('reply', '')
        task.completed_at = timezone.now()
        task.save()
        
        # Create notification for admin
        PickupNotification.objects.create(
            user=task.assigned_by,
            pickup=task.pickup,
            notification_type='TASK_COMPLETED',
            title='Task Completed',
            message=f'Task "{task.title}" has been completed by {user.username}\n\nReply: {task.reply[:200]}'
        )
        
        return Response({
            "success": True,
            "message": "Task marked as completed",
            "task": PickupTaskSerializer(task).data
        }, status=status.HTTP_200_OK)
        
    except PickupTask.DoesNotExist:
        return Response({
            "success": False,
            "error": "Task not found or not assigned to you"
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            "success": False,
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================
# 🔔 NOTIFICATION APIs
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_notifications(request):
    """Get user's notifications"""
    try:
        user = request.user
        limit = int(request.GET.get('limit', 50))
        
        notifications = PickupNotification.objects.filter(user=user).order_by('-created_at')[:limit]
        
        data = []
        for n in notifications:
            data.append({
                "id": n.id,
                "type": n.notification_type,
                "title": n.title,
                "message": n.message,
                "pickup_id": n.pickup.pickup_id if n.pickup else None,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat()
            })
        
        return Response({
            "success": True,
            "notifications": data,
            "unread_count": PickupNotification.objects.filter(user=user, is_read=False).count()
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            "success": False,
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id):
    """Mark notification as read"""
    try:
        notification = PickupNotification.objects.get(id=notification_id, user=request.user)
        notification.is_read = True
        notification.save()
        
        return Response({
            "success": True,
            "message": "Notification marked as read"
        }, status=status.HTTP_200_OK)
        
    except PickupNotification.DoesNotExist:
        return Response({
            "success": False,
            "error": "Notification not found"
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            "success": False,
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_notifications_read(request):
    """Mark all notifications as read"""
    try:
        PickupNotification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        
        return Response({
            "success": True,
            "message": "All notifications marked as read"
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            "success": False,
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_notification(request, notification_id):
    """Delete a notification"""
    try:
        notification = PickupNotification.objects.get(id=notification_id, user=request.user)
        notification.delete()
        
        return Response({
            "success": True,
            "message": "Notification deleted"
        }, status=status.HTTP_200_OK)
        
    except PickupNotification.DoesNotExist:
        return Response({
            "success": False,
            "error": "Notification not found"
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            "success": False,
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================
# 📊 DASHBOARD APIs
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_dashboard_data(request):
    """Get dashboard data based on user role"""
    try:
        user = request.user
        
        if user.role == 'Admin':
            # Admin dashboard data
            total_pickups = PickupRequest.objects.count()
            pending_pickups = PickupRequest.objects.filter(status='PENDING').count()
            assigned_pickups = PickupRequest.objects.filter(status='ASSIGNED').count()
            completed_pickups = PickupRequest.objects.filter(status='DELIVERED').count()
            
            # Today's pickups
            today_pickups = PickupRequest.objects.filter(pickup_date=datetime.now().date()).count()
            
            # Staff performance
            staff_count = CustomUser.objects.filter(role='User', is_active=True).count()
            active_tasks = PickupTask.objects.filter(status='PENDING').count()
            
            return Response({
                "success": True,
                "dashboard": {
                    "total_pickups": total_pickups,
                    "pending_pickups": pending_pickups,
                    "assigned_pickups": assigned_pickups,
                    "completed_pickups": completed_pickups,
                    "today_pickups": today_pickups,
                    "staff_count": staff_count,
                    "active_tasks": active_tasks
                }
            }, status=status.HTTP_200_OK)
            
        elif user.role == 'User':
            # Staff dashboard data
            my_pickups = PickupRequest.objects.filter(assigned_to=user).count()
            pending_pickups = PickupRequest.objects.filter(assigned_to=user, status='ASSIGNED').count()
            my_tasks = PickupTask.objects.filter(assigned_to=user, status='PENDING').count()
            completed_tasks = PickupTask.objects.filter(assigned_to=user, status='COMPLETED').count()
            
            return Response({
                "success": True,
                "dashboard": {
                    "my_pickups": my_pickups,
                    "pending_pickups": pending_pickups,
                    "my_tasks": my_tasks,
                    "completed_tasks": completed_tasks
                }
            }, status=status.HTTP_200_OK)
            
        elif user.role == 'Client':
            # Client dashboard data
            my_pickups = PickupRequest.objects.filter(client=user).count()
            pending_pickups = PickupRequest.objects.filter(client=user, status='PENDING').count()
            in_progress = PickupRequest.objects.filter(client=user, status__in=['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT']).count()
            completed = PickupRequest.objects.filter(client=user, status='DELIVERED').count()
            
            return Response({
                "success": True,
                "dashboard": {
                    "my_pickups": my_pickups,
                    "pending_pickups": pending_pickups,
                    "in_progress": in_progress,
                    "completed": completed
                }
            }, status=status.HTTP_200_OK)
            
        else:
            return Response({
                "success": False,
                "error": "Invalid user role"
            }, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        return Response({
            "success": False,
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================
# 📍 LOCATION APIs
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_pincode_details(request, pincode):
    """Get city and state from pincode"""
    try:
        import requests
        
        response = requests.get(f'https://api.postalpincode.in/pincode/{pincode}', timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            if data and data[0].get('Status') == 'Success':
                post_office = data[0]['PostOffice'][0]
                return Response({
                    "success": True,
                    "city": post_office.get('District', ''),
                    "state": post_office.get('State', ''),
                    "pincode": pincode
                }, status=status.HTTP_200_OK)
        
        return Response({
            "success": False,
            "error": "Pincode not found"
        }, status=status.HTTP_404_NOT_FOUND)
        
    except Exception as e:
        return Response({
            "success": False,
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)