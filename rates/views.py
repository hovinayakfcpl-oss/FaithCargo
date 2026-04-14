# rates/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from decimal import Decimal
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.contrib.auth import get_user_model

from vendors.models import VendorRate
from pincode.models import Pincode
from .models import RateCard, RateMatrix, ClientRateMatrix, ClientRatePolicy, MasterRatePolicy

import json

User = get_user_model()


# =====================================================
# FCPL RATE CALCULATOR
# =====================================================
@api_view(['POST'])
@permission_classes([AllowAny])
def fcpl_rate_calculate(request):
    try:
        origin = str(request.data.get('origin')).replace(",", "").strip()
        destination = str(request.data.get('destination')).replace(",", "").strip()
        payment_mode = request.data.get('paymentMode')

        weight = Decimal(str(request.data.get('weight', 0)))
        invoice_value = Decimal(str(request.data.get('invoiceValue', 0)))

        insurance = request.data.get('insurance', False)
        appointment = request.data.get('appointment', False)
        dimensions = request.data.get('dimensions', [])

        origin_obj = Pincode.objects.filter(pincode=origin).first()
        dest_obj = Pincode.objects.filter(pincode=destination).first()

        if not origin_obj or not dest_obj:
            return Response({"error": "Invalid Pincode"}, status=404)

        zone = dest_obj.zone

        # ODA check
        is_oda = False
        if origin_obj.is_oda or dest_obj.is_oda:
            is_oda = True

        # Weight calculation
        volumetric_weight = Decimal("0")
        total_qty = 0

        for dim in dimensions:
            l = Decimal(str(dim.get("length", 0)))
            w = Decimal(str(dim.get("width", 0)))
            h = Decimal(str(dim.get("height", 0)))
            qty = Decimal(str(dim.get("qty", 1)))

            volumetric_weight += (l * w * h * qty) / Decimal("5000")
            total_qty += qty

        chargeable_weight = max(weight, volumetric_weight)

        # Get rate
        rate = RateCard.objects.get(
            rate_type="fcpl",
            zone=zone,
            payment_mode=payment_mode
        )

        base_charge = chargeable_weight * rate.per_kg_rate
        docket = rate.docket_charge
        fuel = base_charge * (rate.fuel_charge / Decimal("100"))

        # ODA charge
        oda_charge = Decimal("0")
        if is_oda:
            per_kg = chargeable_weight * Decimal("3")
            oda_charge = max(Decimal("650"), per_kg)

        # Insurance
        insurance_charge = Decimal("0")
        if insurance and invoice_value > 0:
            insurance_charge = invoice_value * (rate.insurance_percent / Decimal("100"))

        # Appointment
        appointment_charge = Decimal("0")
        if appointment:
            appointment_charge = rate.appointment_charge

        # Total
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
# B2B RATE CALCULATOR (with Client Support)
# =====================================================
@api_view(['POST'])
@permission_classes([AllowAny])
def b2b_rate_calculate(request):
    try:
        origin = str(request.data.get('origin')).replace(",", "").strip()
        destination = str(request.data.get('destination')).replace(",", "").strip()
        client_id = request.data.get('clientId', None)

        weight = Decimal(str(request.data.get('weight', 0)))
        invoice_value = Decimal(str(request.data.get('invoiceValue', 0)))

        insurance = request.data.get('insurance', False)
        appointment = request.data.get('appointment', False)
        dimensions = request.data.get('dimensions', [])
        booking_mode = request.data.get('booking_mode', 'surface')

        origin_obj = Pincode.objects.filter(pincode=origin).first()
        dest_obj = Pincode.objects.filter(pincode=destination).first()

        if not origin_obj or not dest_obj:
            return Response({"error": "Invalid Pincode"}, status=404)

        from_zone = origin_obj.zone
        to_zone = dest_obj.zone

        # ODA check
        is_oda = False
        if origin_obj and origin_obj.is_oda:
            is_oda = True
        elif dest_obj and dest_obj.is_oda:
            is_oda = True

        # Weight calculation
        volumetric_weight = Decimal("0")
        for dim in dimensions:
            l = Decimal(str(dim.get("length", 0)))
            w = Decimal(str(dim.get("width", 0)))
            h = Decimal(str(dim.get("height", 0)))
            qty = Decimal(str(dim.get("qty", 1)))
            volumetric_weight += (l * w * h * qty) / Decimal("5000")

        chargeable_weight = max(weight, volumetric_weight)

        # Get rate - check if client has custom rates
        rate_per_kg = Decimal("18")
        client_user = None
        
        if client_id:
            try:
                client_user = User.objects.get(client_id=client_id, role='Client')
                # Check client-specific rate matrix
                client_rate = ClientRateMatrix.objects.filter(
                    client=client_user, 
                    from_zone=from_zone, 
                    to_zone=to_zone, 
                    is_active=True
                ).first()
                
                if client_rate:
                    if booking_mode == 'air' and client_rate.air_rate:
                        rate_per_kg = client_rate.air_rate
                    elif booking_mode == 'express' and client_rate.express_rate:
                        rate_per_kg = client_rate.express_rate
                    else:
                        rate_per_kg = client_rate.rate
                else:
                    # Use master rate matrix
                    matrix = RateMatrix.objects.get(from_zone=from_zone, to_zone=to_zone)
                    rate_per_kg = Decimal(str(matrix.rate))
            except:
                matrix = RateMatrix.objects.get(from_zone=from_zone, to_zone=to_zone)
                rate_per_kg = Decimal(str(matrix.rate))
        else:
            matrix = RateMatrix.objects.get(from_zone=from_zone, to_zone=to_zone)
            rate_per_kg = Decimal(str(matrix.rate))

        freight = chargeable_weight * rate_per_kg
        
        # Get policy (client-specific or master)
        policy = None
        if client_user:
            policy = ClientRatePolicy.objects.filter(client=client_user).first()
        
        if policy and policy.is_custom:
            docket = policy.docket_charge
            fuel = freight * (policy.fuel_percent / Decimal("100"))
            gst_percent = policy.gst_percent
            min_freight = policy.min_freight
            cod_charge = policy.cod_charge
            fragile_charge = policy.fragile_charge
            appointment_charge = policy.appointment_charge if appointment else Decimal("0")
            insurance_percent = policy.insurance_percent
            express_extra = policy.express_extra
        else:
            docket = Decimal("50")
            fuel = freight * Decimal("0.15")
            gst_percent = Decimal("18")
            min_freight = Decimal("650")
            cod_charge = Decimal("150")
            fragile_charge = Decimal("250")
            appointment_charge = Decimal("1500") if appointment else Decimal("0")
            insurance_percent = Decimal("2")
            express_extra = Decimal("5")

        # ODA charge
        oda_charge = Decimal("0")
        if is_oda:
            per_kg_charge = chargeable_weight * Decimal("3")
            oda_charge = max(Decimal("650"), per_kg_charge)

        # Insurance
        insurance_charge = Decimal("0")
        if insurance and invoice_value > 0:
            insurance_charge = invoice_value * (insurance_percent / Decimal("100"))

        # Express extra
        express_charge = Decimal("0")
        if booking_mode == 'express':
            express_charge = chargeable_weight * express_extra

        # Total
        total = freight + docket + fuel + oda_charge + insurance_charge + appointment_charge + express_charge
        
        if total < min_freight:
            total = min_freight

        gst = total * (gst_percent / Decimal("100"))

        return Response({
            "from_zone": from_zone,
            "to_zone": to_zone,
            "chargeable_weight": float(round(chargeable_weight, 2)),
            "rate_per_kg": float(rate_per_kg),
            "freight_charge": float(round(freight, 2)),
            "docket_charge": float(round(docket, 2)),
            "fuel_charge": float(round(fuel, 2)),
            "oda_charge": float(round(oda_charge, 2)),
            "is_oda": is_oda,
            "insurance_charge": float(round(insurance_charge, 2)),
            "appointment_charge": float(round(appointment_charge, 2)),
            "express_charge": float(round(express_charge, 2)),
            "gst": float(round(gst, 2)),
            "total_charge": float(round(total, 2)),
            "has_custom_rates": policy.is_custom if policy else False
        })

    except Exception as e:
        return Response({"error": str(e)}, status=400)


# =====================================================
# 🆕 CLIENT RATE CALCULATOR (Dedicated for Clients)
# =====================================================
@api_view(['POST'])
@permission_classes([AllowAny])
def client_rate_calculate(request):
    """
    Calculate freight for specific client with their custom rates
    """
    try:
        client_id = request.data.get('clientId')
        origin = str(request.data.get('origin')).replace(",", "").strip()
        destination = str(request.data.get('destination')).replace(",", "").strip()
        weight = Decimal(str(request.data.get('weight', 0)))
        invoice_value = Decimal(str(request.data.get('invoiceValue', 0)))
        insurance = request.data.get('insurance', False)
        appointment = request.data.get('appointment', False)
        dimensions = request.data.get('dimensions', [])
        booking_mode = request.data.get('booking_mode', 'surface')
        payment_mode = request.data.get('paymentMode', 'Prepaid')

        # Get client
        try:
            client_user = User.objects.get(client_id=client_id, role='Client')
        except User.DoesNotExist:
            return Response({"error": "Client not found"}, status=404)

        # Get pincode details
        origin_obj = Pincode.objects.filter(pincode=origin).first()
        dest_obj = Pincode.objects.filter(pincode=destination).first()

        if not origin_obj or not dest_obj:
            return Response({"error": "Invalid Pincode"}, status=404)

        from_zone = origin_obj.zone
        to_zone = dest_obj.zone

        # ODA check
        is_oda = False
        if origin_obj.is_oda or dest_obj.is_oda:
            is_oda = True

        # Weight calculation
        volumetric_weight = Decimal("0")
        for dim in dimensions:
            l = Decimal(str(dim.get("length", 0)))
            w = Decimal(str(dim.get("width", 0)))
            h = Decimal(str(dim.get("height", 0)))
            qty = Decimal(str(dim.get("qty", 1)))
            volumetric_weight += (l * w * h * qty) / Decimal("5000")

        chargeable_weight = max(weight, volumetric_weight)

        # Get client policy
        policy = ClientRatePolicy.objects.filter(client=client_user).first()
        
        # Get base rate
        if booking_mode == 'air':
            base_rate = policy.air_rate_per_kg if policy else Decimal("45")
        elif booking_mode == 'express':
            base_rate = policy.express_rate_per_kg if policy else Decimal("25")
        else:
            base_rate = policy.surface_rate_per_kg if policy else Decimal("18")

        # Check client-specific zone rate
        client_rate = ClientRateMatrix.objects.filter(
            client=client_user, from_zone=from_zone, to_zone=to_zone, is_active=True
        ).first()

        if client_rate:
            if booking_mode == 'air' and client_rate.air_rate:
                rate_per_kg = client_rate.air_rate
            elif booking_mode == 'express' and client_rate.express_rate:
                rate_per_kg = client_rate.express_rate
            else:
                rate_per_kg = client_rate.rate
        else:
            rate_per_kg = base_rate

        freight = chargeable_weight * rate_per_kg

        # Get policy values
        if policy and policy.is_custom:
            docket = policy.docket_charge
            fuel = freight * (policy.fuel_percent / Decimal("100"))
            gst_percent = policy.gst_percent
            min_freight = policy.min_freight
            cod_charge = policy.cod_charge if payment_mode in ['COD', 'ToPay'] else Decimal("0")
            fragile_charge = policy.fragile_charge
            appointment_charge = policy.appointment_charge if appointment else Decimal("0")
            insurance_percent = policy.insurance_percent
            express_extra = policy.express_extra
        else:
            docket = Decimal("100")
            fuel = freight * Decimal("0.10")
            gst_percent = Decimal("18")
            min_freight = Decimal("650")
            cod_charge = Decimal("150") if payment_mode in ['COD', 'ToPay'] else Decimal("0")
            fragile_charge = Decimal("250")
            appointment_charge = Decimal("1500") if appointment else Decimal("0")
            insurance_percent = Decimal("2")
            express_extra = Decimal("5")

        # ODA charge
        oda_charge = Decimal("0")
        if is_oda:
            per_kg_charge = chargeable_weight * Decimal("3")
            oda_charge = max(Decimal("650"), per_kg_charge)

        # Insurance
        insurance_charge = Decimal("0")
        if insurance and invoice_value > 0:
            insurance_charge = invoice_value * (insurance_percent / Decimal("100"))

        # Express extra
        express_charge = Decimal("0")
        if booking_mode == 'express':
            express_charge = chargeable_weight * express_extra

        # COD charge
        cod_charge_applied = cod_charge

        # Total
        total = freight + docket + fuel + oda_charge + insurance_charge + appointment_charge + express_charge + cod_charge_applied
        
        if total < min_freight:
            total = min_freight

        gst = total * (gst_percent / Decimal("100"))

        return Response({
            "success": True,
            "from_zone": from_zone,
            "to_zone": to_zone,
            "chargeable_weight": float(round(chargeable_weight, 2)),
            "rate_per_kg": float(rate_per_kg),
            "freight_charge": float(round(freight, 2)),
            "docket_charge": float(round(docket, 2)),
            "fuel_charge": float(round(fuel, 2)),
            "oda_charge": float(round(oda_charge, 2)),
            "is_oda": is_oda,
            "insurance_charge": float(round(insurance_charge, 2)),
            "appointment_charge": float(round(appointment_charge, 2)),
            "express_charge": float(round(express_charge, 2)),
            "cod_charge": float(round(cod_charge_applied, 2)),
            "gst": float(round(gst, 2)),
            "total_charge": float(round(total, 2)),
            "has_custom_rates": policy.is_custom if policy else False
        })

    except Exception as e:
        return Response({"error": str(e)}, status=400)


# =====================================================
# 🆕 GET CLIENT RATES API
# =====================================================
@api_view(['GET'])
@permission_classes([AllowAny])
def get_client_rates(request, client_id):
    """
    Get all rates for a specific client
    """
    try:
        client_user = User.objects.get(client_id=client_id, role='Client')
    except User.DoesNotExist:
        return Response({"error": "Client not found"}, status=404)

    # Get zone rates
    zone_rates = ClientRateMatrix.objects.filter(client=client_user, is_active=True)
    zone_rates_data = []
    for rate in zone_rates:
        zone_rates_data.append({
            "id": rate.id,
            "from_zone": rate.from_zone,
            "to_zone": rate.to_zone,
            "rate": float(rate.rate),
            "surface_rate": float(rate.surface_rate) if rate.surface_rate else None,
            "express_rate": float(rate.express_rate) if rate.express_rate else None,
            "air_rate": float(rate.air_rate) if rate.air_rate else None
        })

    # Get policy
    policy = ClientRatePolicy.objects.filter(client=client_user).first()
    policy_data = policy.to_dict() if policy else None

    return Response({
        "success": True,
        "zone_rates": zone_rates_data,
        "policy": policy_data
    }, status=200)


# =====================================================
# 🆕 UPDATE CLIENT RATES API (Admin only)
# =====================================================
@api_view(['POST', 'PUT'])
def update_client_rates(request, client_id):
    """
    Update client-specific rates (Admin only)
    """
    try:
        client_user = User.objects.get(client_id=client_id, role='Client')
    except User.DoesNotExist:
        return Response({"error": "Client not found"}, status=404)

    data = request.data

    # Update zone rates
    if 'zone_rates' in data:
        # Delete existing
        ClientRateMatrix.objects.filter(client=client_user).delete()
        
        # Create new
        for rate in data['zone_rates']:
            ClientRateMatrix.objects.create(
                client=client_user,
                from_zone=rate.get('from_zone'),
                to_zone=rate.get('to_zone'),
                rate=Decimal(str(rate.get('rate', 0))),
                surface_rate=Decimal(str(rate.get('surface_rate', 0))) if rate.get('surface_rate') else None,
                express_rate=Decimal(str(rate.get('express_rate', 0))) if rate.get('express_rate') else None,
                air_rate=Decimal(str(rate.get('air_rate', 0))) if rate.get('air_rate') else None
            )

    # Update policy
    if 'policy' in data:
        policy, created = ClientRatePolicy.objects.get_or_create(client=client_user)
        policy.is_custom = True
        
        policy_data = data['policy']
        for key, value in policy_data.items():
            if hasattr(policy, key):
                setattr(policy, key, Decimal(str(value)))
        
        policy.save()

    return Response({
        "success": True,
        "message": f"Rates updated for {client_user.client_id}"
    }, status=200)


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