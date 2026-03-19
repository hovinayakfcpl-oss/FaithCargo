from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PickupRequestViewSet, list_pickups, assign_pickup

router = DefaultRouter()
router.register(r'pickup', PickupRequestViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('pickup/list/', list_pickups),
    path('pickup/assign/', assign_pickup),
]
