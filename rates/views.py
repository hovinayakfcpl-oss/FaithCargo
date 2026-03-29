from rest_framework.decorators import api_view
from rest_framework.response import Response
from decimal import Decimal
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse

from vendors.models import VendorRate
from pincode.models import Pincode
from .models import RateCard, RateMatrix

import json


# =====================================================
# FCPL RATE CALCULATOR
# =====================================================

@api_view(['POST'])
def fcpl_rate_calculate(request):
    try:
        origin = request.data.get('origin')
        destination = request.data.get('destination')
        payment_mode = request.data.get('paymentMode')

        weight = Decimal(str(request.data.get('weight', 0)))
        invoice_value = Decimal(str(request.data.get('invoiceValue', 0)))

        insurance = request.data.get('insurance', False)
        appointment = request.data.get('appointment', False)

        dimensions = request.data.get('dimensions', [])

        origin_obj = Pincode.objects.filter(pincode=str(origin).strip()).first()
        dest_obj = Pincode.objects.filter(pincode=str(destination).strip()).first()

        if not origin_obj or not dest_obj:
            return Response({"error": "Invalid Pincode"}, status=404)

        zone = dest_obj.zone
        is_oda = bool(dest_obj.is_oda)

        volumetric_weight = Decimal("0")

        for dim in dimensions:
            l = Decimal(str(dim.get("length", 0)))
            w = Decimal(str(dim.get("width", 0)))
            h = Decimal(str(dim.get("height", 0)))
            qty = Decimal(str(dim.get("qty", 1)))

            volumetric_weight += (l * w * h * qty) / Decimal("5000")

        chargeable_weight = max(weight, volumetric_weight)

        rate = RateCard.objects.get(
            rate_type="fcpl",
            zone=zone,
            payment_mode=payment_mode
        )

        base_charge = chargeable_weight * rate.per_kg_rate

        docket = rate.docket_charge
        fuel = base_charge * (rate.fuel_charge / Decimal("100"))

        oda_charge = Decimal("0")
        if is_oda:
            oda_charge = rate.oda_charge  # FCPL fixed ODA

        insurance_charge = Decimal("0")
        if insurance and invoice_value > 0:
            insurance_charge = invoice_value * (rate.insurance_percent / Decimal("100"))

        appointment_charge = Decimal("0")
        if appointment:
            appointment_charge = rate.appointment_charge

        total = base_charge + docket + fuel + oda_charge + insurance_charge + appointment_charge

        return Response({
            "zone": zone,
            "chargeable_weight": float(round(chargeable_weight, 2)),

            "freight_charge": float(round(base_charge, 2)),
            "docket_charge": float(round(docket, 2)),
            "fuel_charge": float(round(fuel, 2)),

            "oda_charge": float(round(oda_charge, 2)),
            "is_oda": is_oda,

            "insurance_charge": float(round(insurance_charge, 2)),
            "appointment_charge": float(round(appointment_charge, 2)),

            "total_charge": float(round(total, 2))
        })

    except Exception as e:
        return Response({"error": str(e)}, status=400)


# =====================================================
# BA / B2B RATE CALCULATOR
# =====================================================

@api_view(['POST'])
def b2b_rate_calculate(request):
    try:
        origin = request.data.get('origin')
        destination = request.data.get('destination')

        weight = Decimal(str(request.data.get('weight', 0)))
        invoice_value = Decimal(str(request.data.get('invoiceValue', 0)))

        insurance = request.data.get('insurance', False)
        appointment = request.data.get('appointment', False)
        dimensions = request.data.get('dimensions', [])

        origin_obj = Pincode.objects.filter(pincode=str(origin).strip()).first()
        dest_obj = Pincode.objects.filter(pincode=str(destination).strip()).first()

        if not origin_obj or not dest_obj:
            return Response({"error": "Invalid Pincode"}, status=404)

        from_zone = origin_obj.zone
        to_zone = dest_obj.zone

        is_oda = bool(dest_obj.is_oda)

        # Weight
        volumetric_weight = Decimal("0")
        for dim in dimensions:
            l = Decimal(str(dim.get("length", 0)))
            w = Decimal(str(dim.get("width", 0)))
            h = Decimal(str(dim.get("height", 0)))
            qty = Decimal(str(dim.get("qty", 1)))

            volumetric_weight += (l * w * h * qty) / Decimal("5000")

        chargeable_weight = max(weight, volumetric_weight)

        matrix = RateMatrix.objects.get(from_zone=from_zone, to_zone=to_zone)
        rate_per_kg = Decimal(str(matrix.rate))

        freight = chargeable_weight * rate_per_kg

        docket = Decimal("50")
        fuel = freight * Decimal("0.15")

        # 🔥 FINAL ODA FIX
        oda_charge = Decimal("0")
        if is_oda:
            per_kg_charge = chargeable_weight * Decimal("3")
            oda_charge = max(Decimal("650"), per_kg_charge)

        insurance_charge = Decimal("0")
        if insurance and invoice_value > 0:
            insurance_charge = invoice_value * Decimal("0.02")

        appointment_charge = Decimal("0")
        if appointment:
            appointment_charge = Decimal("100")

        total = freight + docket + fuel + oda_charge + insurance_charge + appointment_charge

        return Response({
            "from_zone": from_zone,
            "to_zone": to_zone,

            "chargeable_weight": float(round(chargeable_weight, 2)),
            "rate_per_kg": float(rate_per_kg),

            "freight_charge": float(round(freight, 2)),
            "docket_charge": float(round(docket, 2)),
            "fuel_charge": float(round(fuel, 2)),

            "oda": is_oda,
            "oda_charge": float(round(oda_charge, 2)),


            "insurance_charge": float(round(insurance_charge, 2)),
            "appointment_charge": float(round(appointment_charge, 2)),

            "total_charge": float(round(total, 2))
        })

    except Exception as e:
        return Response({"error": str(e)}, status=400)


# =====================================================
# VENDOR RATE CALCULATOR
# =====================================================

@api_view(['POST'])
def vendor_rate_calculate(request):
    try:
        vendor_id = request.data.get('vendor')
        zone = request.data.get('zone')
        weight = Decimal(str(request.data.get('weight', 0)))

        rate = VendorRate.objects.get(vendor_id=vendor_id, zone=zone)

        total = rate.rate * weight + rate.fuel_charge + rate.docket_charge

        return Response({
            "vendor": rate.vendor.name,
            "zone": zone,
            "weight": float(weight),
            "total": float(total)
        })

    except Exception as e:
        return Response({"error": str(e)}, status=400)


# =====================================================
# MATRIX GET
# =====================================================

def get_matrix(request):
    matrix = RateMatrix.objects.all()
    data = []

    for r in matrix:
        data.append({
            "from_zone": r.from_zone,
            "to_zone": r.to_zone,
            "rate": float(r.rate)
        })

    return JsonResponse(data, safe=False)


# =====================================================
# MATRIX UPDATE
# =====================================================

@csrf_exempt
def update_matrix(request):
    if request.method == "POST":
        data = json.loads(request.body)

        for item in data:
            RateMatrix.objects.update_or_create(
                from_zone=item["from_zone"],
                to_zone=item["to_zone"],
                defaults={"rate": Decimal(str(item["rate"]))}
            )

        return JsonResponse({"status": "Rates updated successfully"})

    return JsonResponse({"error": "Invalid request"})


# =====================================================
# EXCEL UPLOAD
# =====================================================

@csrf_exempt
def upload_matrix_excel(request):
    if request.method == "POST":
        from .excel_upload import upload_rate_excel

        file = request.FILES['file']
        upload_rate_excel(file)

        return JsonResponse({"message": "Excel Uploaded Successfully"})