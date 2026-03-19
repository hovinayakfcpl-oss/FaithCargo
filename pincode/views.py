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

    csv_file = request.FILES.get("file")

    if not csv_file:
        return JsonResponse({"error": "CSV file not uploaded"})

    decoded_file = csv_file.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(decoded_file))

    count = 0

    for row in reader:

        # smart column mapping
        pincode = row.get("pincode") or row.get("pin") or row.get("postal_code")
        city = row.get("city") or row.get("district") or row.get("town")
        state = row.get("state") or row.get("province")
        oda = row.get("is_oda") or row.get("oda") or row.get("oda_flag")
        zone = row.get("zone") or row.get("region")

        if not pincode:
            continue

        Pincode.objects.update_or_create(

            pincode=pincode,

            defaults={
                "city": city,
                "state": state,
                "is_oda": True if str(oda).lower() == "oda" else False,
                "zone": zone
            }
        )

        count += 1

    return JsonResponse({
        "status": "success",
        "imported": count
    })


csrf_exempt
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
                "is_oda": True if str(oda).lower() in ["yes","oda","true"] else False
            }

        )

        if created:
            imported += 1
        else:
            updated += 1

    return JsonResponse({

        "status":"success",
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