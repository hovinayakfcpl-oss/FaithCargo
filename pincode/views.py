from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Pincode
import csv
import io

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt


# =====================================================
# GET ZONE + ODA
# =====================================================
@api_view(['GET'])
def get_zone(request, pincode):
    try:
        pin = Pincode.objects.get(pincode=str(pincode).strip())

        return Response({
            "pincode": pin.pincode,
            "zone": pin.zone,
            "oda": pin.is_oda   # ✅ direct boolean
        })

    except Pincode.DoesNotExist:
        return Response({"error": "Invalid Pincode"}, status=404)


# =====================================================
# IMPORT PINCODE CSV
# =====================================================
@csrf_exempt
def import_pincode_csv(request):

    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=400)

    file = request.FILES.get("file")

    if not file:
        return JsonResponse({"error": "CSV file missing"}, status=400)

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

        if not pincode:
            continue

        pincode = str(pincode).strip()

        city = (row.get("city") or row.get("district") or "").strip()
        state = (row.get("state") or "").strip()
        zone = (row.get("zone") or row.get("region") or "").strip()

        oda = row.get("oda") or row.get("is_oda")

        # ✅ SAFE BOOLEAN CONVERSION
        is_oda = str(oda).strip().lower() in ["yes", "true", "1"]

        obj, created = Pincode.objects.update_or_create(
            pincode=pincode,
            defaults={
                "city": city,
                "state": state,
                "zone": zone,
                "is_oda": is_oda
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


# =====================================================
# DELETE PINCODE
# =====================================================
@csrf_exempt
def delete_pincode(request):
    import json

    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=400)

    data = json.loads(request.body)
    pincode = str(data.get("pincode")).strip()

    deleted, _ = Pincode.objects.filter(pincode=pincode).delete()

    if deleted == 0:
        return JsonResponse({"error": "Pincode not found"}, status=404)

    return JsonResponse({"status": "deleted"})


# =====================================================
# UPDATE PINCODE
# =====================================================
@csrf_exempt
def update_pincode(request):
    import json

    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=400)

    data = json.loads(request.body)

    pincode = str(data.get("pincode")).strip()
    zone = data.get("zone")
    oda = data.get("is_oda")

    # ✅ SAFE BOOLEAN CONVERSION
    is_oda = str(oda).strip().lower() in ["true", "1", "yes"]

    updated = Pincode.objects.filter(pincode=pincode).update(
        zone=zone,
        is_oda=is_oda
    )

    if updated == 0:
        return JsonResponse({"error": "Pincode not found"}, status=404)

    return JsonResponse({"status": "updated"})