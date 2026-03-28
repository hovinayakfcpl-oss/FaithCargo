from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Pincode
import csv
import io

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt



@api_view(['GET'])
def get_zone(request, pincode):

    try:

        pin = Pincode.objects.get(pincode=pincode)

        return Response({
            "pincode": pincode,
            "zone": pin.zone,
            "oda": pin.is_oda
        })

    except Pincode.DoesNotExist:

        return Response({"error":"Invalid Pincode"})
    
@csrf_exempt
def import_pincode_csv(request):

    if request.method != "POST":
        return JsonResponse({"error": "POST request required"})

    file = request.FILES.get("file")

    if not file:
        return JsonResponse({"error": "CSV file missing"})

    decoded = file.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(decoded))

    imported = 0
    updated = 0

    for row in reader:

        pincode = (
            row.get("pincode")
            or row.get("pin")
            or row.get("postal_code")
        )

        city = row.get("city") or row.get("district")
        state = row.get("state")
        zone = row.get("zone") or row.get("region")
        oda = row.get("oda") or row.get("is_oda")

        if not pincode:
            continue

        obj, created = Pincode.objects.update_or_create(

            pincode=pincode,

            defaults={
                "city": city,
                "state": state,
                "zone": zone,
                # 🔥 FIXED
                "is_oda": True if str(oda).strip().lower() in ["yes", "true", "1", "oda"] else False
            }

        )

        if created:
            imported += 1
        else:
            updated += 1

    return JsonResponse({

        "status": "success",
        "imported": imported,
        "updated": updated

    })
@csrf_exempt
def delete_pincode(request):

    import json

    data = json.loads(request.body)

    pincode = data.get("pincode")

    Pincode.objects.filter(pincode=pincode).delete()

    return JsonResponse({"status":"deleted"})


@csrf_exempt
def update_pincode(request):

    import json

    data = json.loads(request.body)

    pincode = data.get("pincode")

    Pincode.objects.filter(pincode=pincode).update(

        zone=data.get("zone"),
        is_oda=data.get("is_oda")

    )

    return JsonResponse({"status":"updated"})