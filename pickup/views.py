from django.shortcuts import render

# Create your views here.
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import viewsets

from .models import PickupRequest
from .serializers import PickupRequestSerializer
from vendors.models import Vendor


class PickupRequestViewSet(viewsets.ModelViewSet):
    queryset = PickupRequest.objects.all()
    serializer_class = PickupRequestSerializer
    permission_classes = [IsAuthenticated]


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_pickups(request):
    pickups = PickupRequest.objects.all()
    return Response(PickupRequestSerializer(pickups, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def assign_pickup(request):
    pickup_id = request.data.get('pickup_id')
    vendor_id = request.data.get('vendor_id')

    pickup = PickupRequest.objects.get(id=pickup_id)
    vendor = Vendor.objects.get(id=vendor_id)

    pickup.assigned_vendor = vendor
    pickup.save()

    return Response(PickupRequestSerializer(pickup).data)
