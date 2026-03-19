# backend/app/views.py
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Rate

@api_view(['POST'])
def update_rate(request):
    zone = request.data.get("zone")
    per_kg_rate = request.data.get("per_kg_rate")
    docket_charge = request.data.get("docket_charge")
    fuel_charge_percent = request.data.get("fuel_charge_percent")
    min_weight = request.data.get("min_weight")
    oda_charge = request.data.get("oda_charge")
    insurance_percent = request.data.get("insurance_percent")
    appointment_charge = request.data.get("appointment_charge")

    rate, created = Rate.objects.update_or_create(
        zone=zone,
        defaults={
            "per_kg_rate": per_kg_rate,
            "docket_charge": docket_charge,
            "fuel_charge_percent": fuel_charge_percent,
            "min_weight": min_weight,
            "oda_charge": oda_charge,
            "insurance_percent": insurance_percent,
            "appointment_charge": appointment_charge,
        }
    )
    return Response({"message": "Rate updated successfully"})
