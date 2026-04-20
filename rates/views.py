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
            except Exception as e:
                print(f"Error getting client rate: {e}")
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
# 🆕 GET RATE MATRIX (MASTER)
# =====================================================
@api_view(['GET'])
@permission_classes([AllowAny])
def get_rate_matrix(request):
    """
    Get all zone rates from master RateMatrix
    """
    try:
        matrix = RateMatrix.objects.filter(is_active=True)
        data = []
        
        for r in matrix:
            data.append({
                "id": r.id,
                "from_zone": r.from_zone,
                "to_zone": r.to_zone,
                "rate": float(r.rate),
                "is_active": r.is_active
            })
        
        print(f"✅ Rate Matrix API called - returning {len(data)} records")
        return JsonResponse(data, safe=False)
        
    except Exception as e:
        print(f"❌ Error in get_rate_matrix: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)


# =====================================================
# 🆕 UPDATE RATE MATRIX (MASTER)
# =====================================================
@csrf_exempt
def update_rate_matrix(request):
    """
    Update master rate matrix
    """
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            print(f"📊 Updating rate matrix with {len(data)} records")
            
            for item in data:
                RateMatrix.objects.update_or_create(
                    from_zone=item["from_zone"],
                    to_zone=item["to_zone"],
                    defaults={"rate": Decimal(str(item["rate"]))}
                )
            
            return JsonResponse({"status": "success", "message": "Rates updated successfully"})
        except Exception as e:
            print(f"❌ Error updating rate matrix: {str(e)}")
            return JsonResponse({"error": str(e)}, status=500)
    
    return JsonResponse({"error": "Invalid request"}, status=400)


# =====================================================
# 🆕 CLIENT RATE CALCULATOR
# =====================================================
@api_view(['POST'])
@permission_classes([AllowAny])
def client_rate_calculate(request):
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

        try:
            client_user = User.objects.get(client_id=client_id, role='Client')
        except User.DoesNotExist:
            return Response({"error": "Client not found"}, status=404)

        origin_obj = Pincode.objects.filter(pincode=origin).first()
        dest_obj = Pincode.objects.filter(pincode=destination).first()

        if not origin_obj or not dest_obj:
            return Response({"error": "Invalid Pincode"}, status=404)

        from_zone = origin_obj.zone
        to_zone = dest_obj.zone

        is_oda = False
        if origin_obj.is_oda or dest_obj.is_oda:
            is_oda = True

        volumetric_weight = Decimal("0")
        for dim in dimensions:
            l = Decimal(str(dim.get("length", 0)))
            w = Decimal(str(dim.get("width", 0)))
            h = Decimal(str(dim.get("height", 0)))
            qty = Decimal(str(dim.get("qty", 1)))
            volumetric_weight += (l * w * h * qty) / Decimal("5000")

        chargeable_weight = max(weight, volumetric_weight)

        policy = ClientRatePolicy.objects.filter(client=client_user).first()
        
        if booking_mode == 'air':
            base_rate = policy.air_rate_per_kg if policy else Decimal("45")
        elif booking_mode == 'express':
            base_rate = policy.express_rate_per_kg if policy else Decimal("25")
        else:
            base_rate = policy.surface_rate_per_kg if policy else Decimal("18")

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

        oda_charge = Decimal("0")
        if is_oda:
            per_kg_charge = chargeable_weight * Decimal("3")
            oda_charge = max(Decimal("650"), per_kg_charge)

        insurance_charge = Decimal("0")
        if insurance and invoice_value > 0:
            insurance_charge = invoice_value * (insurance_percent / Decimal("100"))

        express_charge = Decimal("0")
        if booking_mode == 'express':
            express_charge = chargeable_weight * express_extra

        cod_charge_applied = cod_charge

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
    try:
        client_user = User.objects.get(client_id=client_id, role='Client')
    except User.DoesNotExist:
        return Response({"error": "Client not found"}, status=404)

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

    policy = ClientRatePolicy.objects.filter(client=client_user).first()
    policy_data = policy.to_dict() if policy else None

    return Response({
        "success": True,
        "zone_rates": zone_rates_data,
        "policy": policy_data
    }, status=200)


# =====================================================
# 🆕 UPDATE CLIENT RATES API - FINAL WORKING VERSION
# =====================================================
@api_view(['POST', 'PUT'])
def update_client_rates(request, client_id):
    """
    Update client-specific rates (Admin only)
    """
    import traceback
    
    print("=" * 60)
    print("🔔 UPDATE CLIENT RATES API CALLED")
    print(f"Client ID: {client_id}")
    print("=" * 60)
    
    try:
        # Find client
        try:
            client_user = User.objects.get(client_id=client_id, role='Client')
            print(f"✅ Client found: {client_user.username} (ID: {client_user.id})")
        except User.DoesNotExist:
            return Response({
                "success": False,
                "error": f"Client '{client_id}' not found"
            }, status=404)
        
        data = request.data
        
        # Update zone rates
        if 'zone_rates' in data and data['zone_rates']:
            print(f"📊 Updating {len(data['zone_rates'])} zone rates")
            
            # Delete existing rates for this client
            deleted_count = ClientRateMatrix.objects.filter(client=client_user).delete()
            print(f"🗑️ Deleted {deleted_count[0]} existing rates")
            
            # Create new rates
            created_count = 0
            
            for rate in data['zone_rates']:
                from_zone = rate.get('from_zone')
                to_zone = rate.get('to_zone')
                rate_value = rate.get('rate')
                
                if not from_zone or not to_zone:
                    continue
                
                if rate_value is None or rate_value == '':
                    continue
                
                try:
                    ClientRateMatrix.objects.create(
                        client=client_user,
                        from_zone=from_zone,
                        to_zone=to_zone,
                        rate=Decimal(str(rate_value)),
                        is_active=True
                    )
                    created_count += 1
                    print(f"   ✅ Created: {from_zone} → {to_zone} = {rate_value}")
                except Exception as e:
                    print(f"   ❌ Error: {str(e)}")
            
            print(f"✅ Created {created_count} new rates")
        
        # Update policy (optional)
        if 'policy' in data and data['policy']:
            try:
                print(f"📊 Updating policy for client: {client_id}")
                policy, created = ClientRatePolicy.objects.get_or_create(client=client_user)
                policy.is_custom = True
                
                policy_data = data['policy']
                for key, value in policy_data.items():
                    if hasattr(policy, key) and value is not None:
                        try:
                            setattr(policy, key, Decimal(str(value)))
                            print(f"   ✅ {key} = {value}")
                        except:
                            setattr(policy, key, value)
                
                policy.save()
                print(f"✅ Policy updated")
            except Exception as e:
                print(f"⚠️ Policy update skipped: {str(e)}")
        
        return Response({
            "success": True,
            "message": f"Rates updated successfully for {client_user.client_id}"
        }, status=200)
        
    except Exception as e:
        print(f"❌ Error updating client rates: {str(e)}")
        traceback.print_exc()
        return Response({
            "success": False,
            "error": str(e)
        }, status=500)


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
# LEGACY APIs
# =====================================================
def get_matrix(request):
    return get_rate_matrix(request)


@csrf_exempt
def update_matrix(request):
    return update_rate_matrix(request)


@csrf_exempt
def upload_matrix_excel(request):
    if request.method == "POST":
        from .excel_upload import upload_rate_excel

        file = request.FILES['file']
        upload_rate_excel(file)

        return JsonResponse({"message": "Excel Uploaded Successfully"})


# =====================================================
# RATE POLICY APIs
# =====================================================
@api_view(['GET'])
@permission_classes([AllowAny])
def get_rate_policy(request):
    try:
        policy = MasterRatePolicy.objects.first()
        if policy:
            return Response({
                "success": True,
                "policy": {
                    "surface_rate_per_kg": float(policy.surface_rate_per_kg),
                    "express_rate_per_kg": float(policy.express_rate_per_kg),
                    "air_rate_per_kg": float(policy.air_rate_per_kg),
                    "rail_rate_per_kg": float(policy.rail_rate_per_kg),
                    "minFreight": float(policy.min_freight),
                    "docketCharge": float(policy.docket_charge),
                    "fuelPercent": float(policy.fuel_percent),
                    "fovCharge": float(policy.fov_charge),
                    "odaCharge": float(policy.oda_charge),
                    "codCharge": float(policy.cod_charge),
                    "codPercent": float(policy.cod_percent),
                    "fragileCharge": float(policy.fragile_charge),
                    "appointmentCharge": float(policy.appointment_charge),
                    "handlingCharge": float(policy.handling_charge),
                    "insurancePercent": float(policy.insurance_percent),
                    "expressExtra": float(policy.express_extra),
                    "gstPercent": float(policy.gst_percent),
                    "cft": float(policy.cft)
                }
            })
        else:
            return Response({
                "success": True,
                "policy": {
                    "surface_rate_per_kg": 18,
                    "express_rate_per_kg": 25,
                    "air_rate_per_kg": 45,
                    "rail_rate_per_kg": 15,
                    "minFreight": 650,
                    "docketCharge": 100,
                    "fuelPercent": 10,
                    "fovCharge": 75,
                    "odaCharge": 3,
                    "codCharge": 150,
                    "codPercent": 2.5,
                    "fragileCharge": 250,
                    "appointmentCharge": 1500,
                    "handlingCharge": 2,
                    "insurancePercent": 2,
                    "expressExtra": 5,
                    "gstPercent": 18,
                    "cft": 4500
                }
            })
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(['POST'])
def update_rate_policy(request):
    try:
        data = request.data
        policy, created = MasterRatePolicy.objects.get_or_create(id=1)
        
        policy.surface_rate_per_kg = Decimal(str(data.get('surface_rate_per_kg', 18)))
        policy.express_rate_per_kg = Decimal(str(data.get('express_rate_per_kg', 25)))
        policy.air_rate_per_kg = Decimal(str(data.get('air_rate_per_kg', 45)))
        policy.rail_rate_per_kg = Decimal(str(data.get('rail_rate_per_kg', 15)))
        policy.min_freight = Decimal(str(data.get('minFreight', 650)))
        policy.docket_charge = Decimal(str(data.get('docketCharge', 100)))
        policy.fuel_percent = Decimal(str(data.get('fuelPercent', 10)))
        policy.fov_charge = Decimal(str(data.get('fovCharge', 75)))
        policy.oda_charge = Decimal(str(data.get('odaCharge', 3)))
        policy.cod_charge = Decimal(str(data.get('codCharge', 150)))
        policy.cod_percent = Decimal(str(data.get('codPercent', 2.5)))
        policy.fragile_charge = Decimal(str(data.get('fragileCharge', 250)))
        policy.appointment_charge = Decimal(str(data.get('appointmentCharge', 1500)))
        policy.handling_charge = Decimal(str(data.get('handlingCharge', 2)))
        policy.insurance_percent = Decimal(str(data.get('insurancePercent', 2)))
        policy.express_extra = Decimal(str(data.get('expressExtra', 5)))
        policy.gst_percent = Decimal(str(data.get('gstPercent', 18)))
        policy.cft = Decimal(str(data.get('cft', 4500)))
        
        policy.save()
        
        return Response({"success": True, "message": "Rate policy updated successfully"})
        
    except Exception as e:
        return Response({"error": str(e)}, status=500)