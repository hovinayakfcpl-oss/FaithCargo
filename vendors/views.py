from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import VendorRate

@api_view(["POST"])
def update_vendor_rate(request, vendor_name):
    try:
        data = request.data
        obj, created = VendorRate.objects.update_or_create(
            vendor_name=vendor_name,
            defaults={"rates": data}
        )
        return Response({"message": "Rates updated", "vendor": vendor_name}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(["GET"])
def get_vendor_rate(request, vendor_name):
    try:
        obj = VendorRate.objects.get(vendor_name=vendor_name)
        return Response({"vendor": vendor_name, "rates": obj.rates, "charges": obj.charges})
    except VendorRate.DoesNotExist:
        return Response({"error": "Vendor not found"}, status=status.HTTP_404_NOT_FOUND)
