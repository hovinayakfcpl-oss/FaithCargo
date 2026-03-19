# utils/calculator.py

# utils/calculator.py

# utils/calculator.py


# utils/calculator.py

from pincode.models import Pincode, RateMatrix, Charges
from rates.models import RateCard

def is_oda(pincode):
    """
    Check if given pincode is ODA (Out of Delivery Area).
    For now, assume Pincode model has a boolean field 'is_oda'.
    """
    return Pincode.objects.filter(pincode=pincode, is_oda=True).exists()


def get_zone(pincode):
    return Pincode.objects.filter(pincode=pincode).values_list('zone', flat=True).first()

def get_base_rate(from_zone, to_zone):
    return RateMatrix.objects.filter(from_zone=from_zone, to_zone=to_zone).values_list('rate', flat=True).first()

def get_ratecard(zone, rate_type='fcpl', payment_mode='Prepaid', weight=0):
    return RateCard.objects.filter(
        zone=zone,
        rate_type=rate_type,
        payment_mode=payment_mode,
        weight_min__lte=weight,
        weight_max__gte=weight
    ).first()

def calculate_charges(origin_pincode, dest_pincode, weight, invoice_value, insurance=False, appointment=False):
    from_zone = get_zone(origin_pincode)
    to_zone = get_zone(dest_pincode)

    base_rate = get_base_rate(from_zone, to_zone)
    weight_charge = weight * base_rate

    ratecard = get_ratecard(from_zone, 'fcpl', 'Prepaid', weight)
    docket_charge = ratecard.docket_charge
    fuel_charge = (ratecard.fuel_charge / 100) * weight_charge
    oda_charge = ratecard.oda_charge if is_oda(dest_pincode) else 0
    insurance_charge = (ratecard.insurance_percent / 100) * invoice_value if insurance else 0
    appointment_charge = ratecard.appointment_charge if appointment else 0
    pickup_charge = 50  # fixed pickup charge

    subtotal = weight_charge + docket_charge + fuel_charge + oda_charge + insurance_charge + appointment_charge + pickup_charge
    gst = subtotal * 0.18
    total = subtotal + gst

    return {
        "zone": f"{from_zone}-{to_zone}",
        "weight_charge": weight_charge,
        "docket_charge": docket_charge,
        "fuel_charge": fuel_charge,
        "oda_charge": oda_charge,
        "insurance_charge": insurance_charge,
        "appointment_charge": appointment_charge,
        "pickup_charge": pickup_charge,
        "gst": gst,
        "total": total
    }



def get_zone(pincode):
    return Pincode.objects.filter(pincode=pincode).values_list('zone', flat=True).first()

def get_base_rate(from_zone, to_zone):
    return RateMatrix.objects.filter(from_zone=from_zone, to_zone=to_zone).values_list('rate', flat=True).first()

def get_ratecard(zone, rate_type='fcpl', payment_mode='Prepaid', weight=0):
    return RateCard.objects.filter(
        zone=zone,
        rate_type=rate_type,
        payment_mode=payment_mode,
        weight_min__lte=weight,
        weight_max__gte=weight
    ).first()

def calculate_charges(origin_pincode, dest_pincode, weight, invoice_value, insurance=False, appointment=False):
    from_zone = get_zone(origin_pincode)
    to_zone = get_zone(dest_pincode)

    base_rate = get_base_rate(from_zone, to_zone)
    weight_charge = weight * base_rate

    ratecard = get_ratecard(from_zone, 'fcpl', 'Prepaid', weight)
    docket_charge = ratecard.docket_charge
    fuel_charge = (ratecard.fuel_charge / 100) * weight_charge
    oda_charge = ratecard.oda_charge if is_oda (dest_pincode) else 0
    insurance_charge = (ratecard.insurance_percent / 100) * invoice_value if insurance else 0
    appointment_charge = ratecard.appointment_charge if appointment else 0
    pickup_charge = 50  # fixed pickup charge

    subtotal = weight_charge + docket_charge + fuel_charge + oda_charge + insurance_charge + appointment_charge + pickup_charge
    gst = subtotal * 0.18
    total = subtotal + gst

    return {
        "zone": f"{from_zone}-{to_zone}",
        "weight_charge": weight_charge,
        "docket_charge": docket_charge,
        "fuel_charge": fuel_charge,
        "oda_charge": oda_charge,
        "insurance_charge": insurance_charge,
        "appointment_charge": appointment_charge,
        "pickup_charge": pickup_charge,
        "gst": gst,
        "total": total
    }
