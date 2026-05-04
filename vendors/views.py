from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.core.paginator import Paginator
from .models import VendorRate, Vendor, RateHistory, ZoneMaster, B2BRate, VendorServiceRate, VendorPincode
from .serializers import (
    VendorRateSerializer, VendorSerializer, RateHistorySerializer,
    ZoneMasterSerializer, B2BRateSerializer, VendorServiceRateSerializer,
    VendorRateCalculatorSerializer, BulkRateUploadSerializer, VendorComparisonSerializer,
    VendorPincodeSerializer
)
import json
import logging
from datetime import datetime

# Setup logging
logger = logging.getLogger(__name__)

# ============================================
# SIMPLIFIED ZONE MAPPING - BASED ON FIRST 3 PINCODE DIGITS
# UPDATED: East zone 700-859 (including Bihar), South split into S1 and S2
# ============================================

def get_client_zone_from_pincode(pincode):
    """
    Get CLIENT's bill zone from pincode using FIRST 3 DIGITS
    Returns: Delhi NCR, NORTH 2, NORTH 3, Central, W1, W2, East, South S1, South S2, NE1, NE2, NE3
    """
    pincode_str = str(pincode).strip()
    
    # Get first 3 digits
    prefix = pincode_str[:3] if len(pincode_str) >= 3 else pincode_str
    
    # ========================================
    # ZONE N1 - Delhi NCR (110, 122, 201)
    # ========================================
    if prefix in ['110', '122', '201']:
        return 'Delhi NCR'
    
    # ========================================
    # ZONE N3 - Jammu & Kashmir (18xxxx, 19xxxx)
    # ========================================
    if prefix in ['180', '181', '182', '183', '184', '185', '186', '187', '188', '189',
                  '190', '191', '192', '193', '194', '195', '196', '197', '198', '199']:
        return 'NORTH 3'
    
    # ========================================
    # NORTHEAST ZONES - CHECK FIRST (Before East)
    # ========================================
    if prefix in ['780', '781', '782', '783', '784', '785', '786', '787', '788', '789',
                  '790', '791', '792', '793', '794', '795', '796', '797', '798', '799']:
        if prefix == '781':
            return 'NE1'
        elif prefix in ['796', '797', '798']:
            return 'NE3'
        else:
            return 'NE2'
    
    # ========================================
    # ZONE N2 - NORTH 2 (Punjab, Chandigarh, Uttarakhand, Himachal, Haryana outskirts)
    # ========================================
    if prefix in ['140', '141', '142', '143', '144', '145', '146', '147', '148', '149',
                  '150', '151', '152', '153', '154', '155', '156', '157', '158', '159',
                  '160', '161', '162', '163', '164', '165', '166', '167', '168', '169',
                  '170', '171', '172', '173', '174', '175', '176', '177', '178', '179',
                  '240', '241', '242', '243', '244', '245', '246', '247', '248', '249',
                  '250', '251', '252', '253', '254', '255', '256', '257', '258', '259',
                  '260', '261', '262', '263', '264', '265', '266', '267', '268', '269']:
        return 'NORTH 2'
    
    # ========================================
    # ZONE Central - Madhya Pradesh (45xxxx to 49xxxx)
    # ========================================
    if prefix in ['450', '451', '452', '453', '454', '455', '456', '457', '458', '459',
                  '460', '461', '462', '463', '464', '465', '466', '467', '468', '469',
                  '470', '471', '472', '473', '474', '475', '476', '477', '478', '479',
                  '480', '481', '482', '483', '484', '485', '486', '487', '488', '489',
                  '490', '491', '492', '493', '494', '495', '496', '497', '498', '499']:
        return 'Central'
    
    # ========================================
    # ZONE W1 - Maharashtra (40xxxx to 44xxxx)
    # ========================================
    if prefix in ['400', '401', '402', '403', '404', '405', '406', '407', '408', '409',
                  '410', '411', '412', '413', '414', '415', '416', '417', '418', '419',
                  '420', '421', '422', '423', '424', '425', '426', '427', '428', '429',
                  '430', '431', '432', '433', '434', '435', '436', '437', '438', '439',
                  '440', '441', '442', '443', '444', '445', '446', '447', '448', '449']:
        return 'W1'
    
    # ========================================
    # ZONE W2 - Gujarat (36xxxx to 39xxxx)
    # ========================================
    if prefix in ['360', '361', '362', '363', '364', '365', '366', '367', '368', '369',
                  '370', '371', '372', '373', '374', '375', '376', '377', '378', '379',
                  '380', '381', '382', '383', '384', '385', '386', '387', '388', '389',
                  '390', '391', '392', '393', '394', '395', '396', '397', '398', '399']:
        return 'W2'
    
    # ========================================
    # SOUTH ZONES - SPLIT INTO S1 AND S2
    # S2 - Kerala (64xxxx to 69xxxx)
    # S1 - Rest of South India (50xxxx to 63xxxx)
    # ========================================
    south_prefixes = [str(i) for i in range(50, 70)]
    if prefix in south_prefixes:
        prefix_num = int(prefix)
        if prefix_num >= 640 and prefix_num <= 699:
            return 'South S2'  # Kerala
        else:
            return 'South S1'  # AP, TN, KA, TS, Pondicherry
    
    # ========================================
    # ZONE East - (70xxxx to 85xxxx) - Including Bihar (800-855)
    # ========================================
    east_prefixes = [str(i) for i in range(70, 86)]
    if prefix in east_prefixes:
        return 'East'
    
    # ========================================
    # DEFAULT - NORTH 2 for any other pincode
    # ========================================
    return 'NORTH 2'


def get_vendor_zone_from_client_zone(client_zone, vendor_name):
    """
    Convert client's bill zone to vendor's internal zone name
    """
    vendor_upper = vendor_name.upper()
    
    # Check if it's Kerala (South S2)
    is_kerala = (client_zone == 'South S2')
    base_client_zone = 'South' if is_kerala else client_zone
    
    # Base mapping with NE3 support
    base_mapping = {
        'Delhi NCR': 'N1',
        'NORTH 2': 'N2',
        'NORTH 3': 'N3',
        'Central': 'C1',
        'W1': 'W1',
        'W2': 'W2',
        'East': 'E1',
        'South': 'S2' if is_kerala else 'S1',
        'South S1': 'S1',
        'South S2': 'S2',
        'NE1': 'NE1',
        'NE2': 'NE2',
        'NE3': 'NE2',
    }
    
    # VXPRESS mapping
    vxpress_mapping = {
        'Delhi NCR': 'North1',
        'NORTH 2': 'North2',
        'NORTH 3': 'North3',
        'Central': 'Mah1',
        'W1': 'Guj1',
        'W2': 'Mah1',
        'East': 'East1',
        'South': 'South1',
        'South S1': 'South1',
        'South S2': 'South1',
        'NE1': 'East1',
        'NE2': 'East1',
        'NE3': 'East1',
    }
    
    # SHIVANI VX mapping
    shivani_mapping = {
        'Delhi NCR': 'North1',
        'NORTH 2': 'North2',
        'NORTH 3': 'North3',
        'Central': 'Central1',
        'W1': 'Guj1',
        'W2': 'Mah1',
        'East': 'East1',
        'South': 'South1',
        'South S1': 'South1',
        'South S2': 'S2',
        'NE1': 'NE',
        'NE2': 'NE',
        'NE3': 'NE',
    }
    
    # DTDC mapping
    dtdc_mapping = {
        'Delhi NCR': 'N1',
        'NORTH 2': 'N2',
        'NORTH 3': 'N3',
        'Central': 'C1',
        'W1': 'W1',
        'W2': 'W2',
        'East': 'E1',
        'South': 'S1',
        'South S1': 'S1',
        'South S2': 'S1',
        'NE1': 'E3',
        'NE2': 'E3',
        'NE3': 'E3',
    }
    
    # DELHIVERY mapping (NE zones map to E1)
    delhivery_mapping = {
        'Delhi NCR': 'N1',
        'NORTH 2': 'N2',
        'NORTH 3': 'N3',
        'Central': 'C1',
        'W1': 'W1',
        'W2': 'W2',
        'East': 'E1',
        'South': 'S1',
        'South S1': 'S1',
        'South S2': 'S1',
        'NE1': 'E1',
        'NE2': 'E1',
        'NE3': 'E1',
    }
    
    # PD Logistics mapping (supports NE3)
    pd_mapping = {
        'Delhi NCR': 'N1',
        'NORTH 2': 'N2',
        'NORTH 3': 'N3',
        'Central': 'C1',
        'W1': 'W1',
        'W2': 'W2',
        'East': 'E1',
        'South': 'S1',
        'South S1': 'S1',
        'South S2': 'S2',
        'NE1': 'NE1',
        'NE2': 'NE2',
        'NE3': 'NE3',
    }
    
    # ========================================
    # DTDC
    # ========================================
    if 'DTDC' in vendor_upper:
        return dtdc_mapping.get(client_zone, dtdc_mapping.get(base_client_zone, 'N1'))
    
    # ========================================
    # TRUCX DLH Lite
    # ========================================
    if 'TRUCX DLH LITE' in vendor_upper:
        return base_mapping.get(client_zone, base_mapping.get(base_client_zone, 'N1'))
    
    # ========================================
    # TRUCX DLH Dense / Cargo
    # ========================================
    elif 'TRUCX DLH DENSE' in vendor_upper or 'TRUCX DLH CARGO' in vendor_upper:
        return base_mapping.get(client_zone, base_mapping.get(base_client_zone, 'N1'))
    
    # ========================================
    # PD LOGISTICS
    # ========================================
    elif 'PD LOGISTICS' in vendor_upper:
        return pd_mapping.get(client_zone, pd_mapping.get(base_client_zone, 'N1'))
    
    # ========================================
    # RIVIGO
    # ========================================
    elif 'RIVIGO' in vendor_upper:
        if client_zone == 'NE3':
            return 'NE2'
        return base_mapping.get(client_zone, base_mapping.get(base_client_zone, 'N1'))
    
    # ========================================
    # GATI
    # ========================================
    elif 'GATI' in vendor_upper:
        return base_mapping.get(client_zone, base_mapping.get(base_client_zone, 'N1'))
    
    # ========================================
    # VXPRESS
    # ========================================
    elif 'VXPRESS' in vendor_upper:
        return vxpress_mapping.get(client_zone, vxpress_mapping.get(base_client_zone, 'North1'))
    
    # ========================================
    # SHIVANI VX
    # ========================================
    elif 'SHIVANI VX' in vendor_upper:
        return shivani_mapping.get(client_zone, shivani_mapping.get(base_client_zone, 'North1'))
    
    # ========================================
    # SHIPSHOPY BLUE DART
    # ========================================
    elif 'SHIPSHOPY BLUE DART' in vendor_upper:
        return base_mapping.get(client_zone, base_mapping.get(base_client_zone, 'N1'))
    
    # ========================================
    # SHIPSHOPY DELIVERY
    # ========================================
    elif 'SHIPSHOPY DELIVERY' in vendor_upper:
        return base_mapping.get(client_zone, base_mapping.get(base_client_zone, 'N1'))
    
    # ========================================
    # DELHIVERY
    # ========================================
    elif 'DELHIVERY' in vendor_upper:
        return delhivery_mapping.get(client_zone, delhivery_mapping.get(base_client_zone, 'N1'))
    
    # ========================================
    # DEFAULT
    # ========================================
    else:
        return base_mapping.get(client_zone, base_mapping.get(base_client_zone, 'N1'))


def get_vendor_specific_zone(pincode, vendor_name):
    """
    Get vendor-specific zone for a pincode using FIRST 3 DIGITS
    This is the main function to use for rate calculation
    """
    client_zone = get_client_zone_from_pincode(pincode)
    vendor_zone = get_vendor_zone_from_client_zone(client_zone, vendor_name)
    logger.info(f"📍 Pincode {pincode} (prefix: {pincode[:3]}) → Client: {client_zone} → {vendor_name} Zone: {vendor_zone}")
    return vendor_zone


def is_pincode_serviceable_for_vendor(vendor, pincode):
    """Check if pincode is serviceable for a vendor"""
    pincode_str = str(pincode).strip()
    vendor_name = vendor.vendor_name
    
    # SHIPSHOPY BLUE DART - serviceable only if in database
    if vendor_name == 'SHIPSHOPY BLUE DART':
        pincode_obj = VendorPincode.objects.filter(
            vendor=vendor, 
            pincode=pincode_str,
            is_serviceable=True
        ).first()
        return pincode_obj is not None
    
    # DTDC - serviceable only if in database (like Blue Dart)
    if vendor_name == 'DTDC':
        pincode_obj = VendorPincode.objects.filter(
            vendor=vendor, 
            pincode=pincode_str,
            is_serviceable=True
        ).first()
        return pincode_obj is not None
    
    # All other vendors - always serviceable
    return True


def check_oda_for_vendor(vendor, pincode):
    """Check if pincode is ODA for a vendor"""
    pincode_str = str(pincode).strip()
    vendor_name = vendor.vendor_name
    
    # Check serviceability first
    if not is_pincode_serviceable_for_vendor(vendor, pincode_str):
        return {
            'is_oda': False,
            'is_serviceable': False,
            'charge_per_kg': 0,
            'min_charge': 0,
            'category': None,
        }
    
    # SHIPSHOPY BLUE DART - never ODA
    if vendor_name == 'SHIPSHOPY BLUE DART':
        return {
            'is_oda': False,
            'is_serviceable': True,
            'charge_per_kg': 0,
            'min_charge': 0,
            'category': None,
        }
    
    # Check ODA from database
    pincode_obj = VendorPincode.objects.filter(
        vendor=vendor, 
        pincode=pincode_str,
        is_oda=True
    ).first()
    
    if pincode_obj and pincode_obj.is_oda:
        return {
            'is_oda': True,
            'is_serviceable': True,
            'charge_per_kg': float(pincode_obj.oda_charge_per_kg),
            'min_charge': float(pincode_obj.oda_min_charge),
            'category': pincode_obj.oda_category,
        }
    
    # For PD Logistics, TRUCX, SHIPSHOPY DELIVERY - check PD Logistics ODA
    if vendor_name in ['PD LOGISTICS', 'TRUCX DLH Lite', 'TRUCX DLH Dense', 'TRUCX DLH Cargo', 'SHIPSHOPY DELIVERY']:
        pd_vendor = VendorRate.objects.filter(vendor_name='PD LOGISTICS').first()
        if pd_vendor:
            pd_pincode = VendorPincode.objects.filter(
                vendor=pd_vendor, 
                pincode=pincode_str,
                is_oda=True
            ).first()
            if pd_pincode:
                return {
                    'is_oda': True,
                    'is_serviceable': True,
                    'charge_per_kg': float(pd_pincode.oda_charge_per_kg),
                    'min_charge': float(pd_pincode.oda_min_charge),
                    'category': pd_pincode.oda_category,
                }
    
    # For DTDC - check DTDC ODA from its own pincodes
    if vendor_name == 'DTDC':
        dtdc_pincode = VendorPincode.objects.filter(
            vendor=vendor,
            pincode=pincode_str,
            is_oda=True
        ).first()
        if dtdc_pincode:
            return {
                'is_oda': True,
                'is_serviceable': True,
                'charge_per_kg': float(dtdc_pincode.oda_charge_per_kg),
                'min_charge': float(dtdc_pincode.oda_min_charge),
                'category': dtdc_pincode.oda_category,
            }
    
    # No ODA
    return {
        'is_oda': False,
        'is_serviceable': True,
        'charge_per_kg': 0,
        'min_charge': 0,
        'category': None,
    }


def calculate_vendor_freight(vendor, from_zone, to_zone, weight, volume_cft, cft_type='standard', oda_info=None):
    """Calculate freight for a single vendor"""
    
    if oda_info and not oda_info.get('is_serviceable', True):
        return None
    
    rate_per_kg = 0
    display_cft_type = None
    vendor_name = vendor.vendor_name
    
    # Get rates based on vendor type and CFT type
    if cft_type in ['6cft', '10cft']:
        if cft_type == '6cft':
            rates = vendor.delhivery_6cft or {}
            display_cft_type = '6 CFT'
        else:
            rates = vendor.delhivery_10cft or {}
            display_cft_type = '10 CFT'
        rate_per_kg = rates.get(from_zone, {}).get(to_zone, 0)
    else:
        rates = vendor.rates or {}
        rate_per_kg = rates.get(from_zone, {}).get(to_zone, 0)
        display_cft_type = 'Standard'
    
    # Skip if no rate found
    if rate_per_kg == 0:
        return None
    
    # Get charges
    charges = vendor.charges or {}
    docket_charge = float(charges.get('docket_charge', 100))
    fsc_percent = float(str(charges.get('fsc', '10%')).replace('%', ''))
    gst_percent = float(str(charges.get('gst', '18%')).replace('%', ''))
    min_freight = float(charges.get('min_freight', 350))
    min_weight = float(charges.get('min_weight', 20))
    divisor = charges.get('divisor', 5000)
    
    # Calculate volumetric weight
    volumetric_weight = volume_cft * (divisor / 10) if volume_cft > 0 else 0
    effective_weight = max(weight, volumetric_weight, min_weight)
    
    # Base freight
    base_freight = effective_weight * rate_per_kg
    fsc_amount = base_freight * (fsc_percent / 100)
    
    # ODA charges
    oda_charge = 0
    oda_applicable = False
    oda_category = None
    
    if oda_info and oda_info.get('is_oda') == True:
        oda_applicable = True
        oda_category = oda_info.get('category')
        oda_charge_per_kg = oda_info.get('charge_per_kg', 0)
        oda_min = oda_info.get('min_charge', 500)
        oda_calc = effective_weight * oda_charge_per_kg
        oda_charge = max(oda_calc, oda_min)
    
    # GST
    gst_amount = (base_freight + fsc_amount + docket_charge + oda_charge) * (gst_percent / 100)
    
    # Total
    total_freight = base_freight + fsc_amount + docket_charge + gst_amount + oda_charge
    total_freight = max(total_freight, min_freight)
    
    return {
        'vendor_id': vendor.id,
        'vendor_name': vendor_name,
        'from_zone': from_zone,
        'to_zone': to_zone,
        'rate_per_kg': round(rate_per_kg, 2),
        'cft_type': display_cft_type,
        'effective_weight': round(effective_weight, 2),
        'base_freight': round(base_freight, 2),
        'docket_charge': round(docket_charge, 2),
        'fsc_percent': fsc_percent,
        'fsc_amount': round(fsc_amount, 2),
        'gst_percent': gst_percent,
        'gst_amount': round(gst_amount, 2),
        'oda_charge': round(oda_charge, 2),
        'oda_applicable': oda_applicable,
        'oda_category': oda_category,
        'min_freight': round(min_freight, 2),
        'total_freight': round(total_freight, 2)
    }


# ============================================
# API ENDPOINTS
# ============================================

@api_view(["GET", "POST", "PUT", "DELETE"])
def manage_vendor_rate(request, vendor_name=None):
    """Complete vendor rate management"""
    
    if request.method == "GET":
        try:
            if vendor_name:
                obj = VendorRate.objects.get(vendor_name=vendor_name)
                return Response({
                    "id": obj.id,
                    "vendor_name": obj.vendor_name,
                    "rates": obj.rates if obj.rates else {},
                    "delhivery_6cft": obj.delhivery_6cft if obj.delhivery_6cft else {},
                    "delhivery_10cft": obj.delhivery_10cft if obj.delhivery_10cft else {},
                    "charges": obj.charges if obj.charges else {},
                    "is_active": obj.is_active,
                })
            else:
                all_vendors = VendorRate.objects.all().order_by('vendor_name')
                response_data = []
                for obj in all_vendors:
                    response_data.append({
                        "id": obj.id,
                        "vendor_name": obj.vendor_name,
                        "rates": obj.rates if obj.rates else {},
                        "delhivery_6cft": obj.delhivery_6cft if obj.delhivery_6cft else {},
                        "delhivery_10cft": obj.delhivery_10cft if obj.delhivery_10cft else {},
                        "charges": obj.charges if obj.charges else {},
                        "is_active": obj.is_active,
                    })
                return Response(response_data)
        except Exception as e:
            return Response({"error": str(e)}, status=500)
    
    elif request.method == "POST":
        try:
            data = request.data
            vendor_name = data.get('vendor_name')
            if not vendor_name:
                return Response({"error": "vendor_name is required"}, status=400)
            
            obj, created = VendorRate.objects.update_or_create(
                vendor_name=vendor_name,
                defaults={
                    "rates": data.get('rates', {}),
                    "delhivery_6cft": data.get('delhivery_6cft', {}),
                    "delhivery_10cft": data.get('delhivery_10cft', {}),
                    "charges": data.get('charges', {}),
                    "is_active": data.get('is_active', True),
                }
            )
            return Response({"message": f"{vendor_name} {'created' if created else 'updated'} successfully"}, status=201)
        except Exception as e:
            return Response({"error": str(e)}, status=400)
    
    elif request.method == "PUT":
        try:
            obj = VendorRate.objects.get(vendor_name=vendor_name)
            data = request.data
            
            if 'rates' in data:
                obj.rates = data['rates']
            if 'charges' in data:
                obj.charges = data['charges']
            if 'delhivery_6cft' in data:
                obj.delhivery_6cft = data['delhivery_6cft']
            if 'delhivery_10cft' in data:
                obj.delhivery_10cft = data['delhivery_10cft']
            if 'is_active' in data:
                obj.is_active = data['is_active']
            
            obj.save()
            return Response({"message": f"{vendor_name} updated successfully"})
        except VendorRate.DoesNotExist:
            return Response({"error": f"Vendor '{vendor_name}' not found"}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=400)
    
    elif request.method == "DELETE":
        try:
            obj = VendorRate.objects.get(vendor_name=vendor_name)
            obj.delete()
            return Response({"message": f"{vendor_name} deleted successfully"})
        except VendorRate.DoesNotExist:
            return Response({"error": f"Vendor '{vendor_name}' not found"}, status=404)


@api_view(["GET"])
def check_oda_status(request, vendor_name, pincode):
    """Check if a pincode is ODA for a specific vendor"""
    try:
        vendor = VendorRate.objects.get(vendor_name__iexact=vendor_name)
        oda_info = check_oda_for_vendor(vendor, pincode)
        
        return Response({
            'success': True,
            'pincode': pincode,
            'vendor': vendor_name,
            'is_oda': oda_info.get('is_oda', False),
            'is_serviceable': oda_info.get('is_serviceable', True),
            'oda_category': oda_info.get('category'),
            'oda_charge_per_kg': oda_info.get('charge_per_kg', 0),
            'oda_min_charge': oda_info.get('min_charge', 0)
        })
    except VendorRate.DoesNotExist:
        return Response({"error": "Vendor not found"}, status=404)


@api_view(["POST"])
def calculate_all_vendor_rates(request):
    """Calculate rates for all vendors based on pincode, weight, dimensions"""
    try:
        data = request.data
        origin_pincode = str(data.get('origin_pincode', '')).strip()
        destination_pincode = str(data.get('destination_pincode', '')).strip()
        weight = float(data.get('weight', 0))
        length = float(data.get('length', 0))
        width = float(data.get('width', 0))
        height = float(data.get('height', 0))
        
        if len(origin_pincode) != 6 or len(destination_pincode) != 6:
            return Response({"error": "Invalid pincode format"}, status=400)
        
        if weight <= 0:
            return Response({"error": "Weight must be greater than 0"}, status=400)
        
        # Calculate volume in CFT
        volume_cft = (length * width * height) / (30.48 * 30.48 * 30.48) if length and width and height else 0
        
        vendors = VendorRate.objects.filter(is_active=True)
        results = []
        
        for vendor in vendors:
            # Get vendor-specific zones using FIRST 3 DIGITS
            from_zone = get_vendor_specific_zone(origin_pincode, vendor.vendor_name)
            to_zone = get_vendor_specific_zone(destination_pincode, vendor.vendor_name)
            
            logger.info(f"Calculating {vendor.vendor_name}: {origin_pincode[:3]}...({from_zone}) → {destination_pincode[:3]}...({to_zone})")
            
            # Check serviceability
            if not is_pincode_serviceable_for_vendor(vendor, destination_pincode):
                continue
            
            # Get ODA info
            oda_info = check_oda_for_vendor(vendor, destination_pincode)
            vendor_name = vendor.vendor_name
            
            # PD LOGISTICS - only 6CFT and 10CFT
            if vendor_name == 'PD LOGISTICS':
                rate_6cft = calculate_vendor_freight(vendor, from_zone, to_zone, weight, volume_cft, '6cft', oda_info)
                if rate_6cft:
                    results.append(rate_6cft)
                
                rate_10cft = calculate_vendor_freight(vendor, from_zone, to_zone, weight, volume_cft, '10cft', oda_info)
                if rate_10cft:
                    results.append(rate_10cft)
            
            # RIVIGO - has both CFT and Standard
            elif vendor_name == 'RIVIGO':
                rate_6cft = calculate_vendor_freight(vendor, from_zone, to_zone, weight, volume_cft, '6cft', oda_info)
                if rate_6cft:
                    results.append(rate_6cft)
                
                rate_10cft = calculate_vendor_freight(vendor, from_zone, to_zone, weight, volume_cft, '10cft', oda_info)
                if rate_10cft:
                    results.append(rate_10cft)
                
                rate_std = calculate_vendor_freight(vendor, from_zone, to_zone, weight, volume_cft, 'standard', oda_info)
                if rate_std:
                    results.append(rate_std)
            
            # DTDC - standard rates only (with serviceable pincodes)
            elif vendor_name == 'DTDC':
                rate = calculate_vendor_freight(vendor, from_zone, to_zone, weight, volume_cft, 'standard', oda_info)
                if rate:
                    results.append(rate)
            
            # Other vendors - standard rates only
            else:
                rate = calculate_vendor_freight(vendor, from_zone, to_zone, weight, volume_cft, 'standard', oda_info)
                if rate:
                    results.append(rate)
        
        # Sort by total freight
        results.sort(key=lambda x: x.get('total_freight', 999999))
        
        return Response({
            'success': True,
            'origin_pincode': origin_pincode,
            'destination_pincode': destination_pincode,
            'weight': weight,
            'vendor_rates': results,
            'best_vendor': results[0]['vendor_name'] if results else None,
            'best_rate': results[0]['total_freight'] if results else 0,
            'calculated_at': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error in calculate_all_vendor_rates: {str(e)}")
        return Response({"error": str(e)}, status=400)


@api_view(["POST"])
def bulk_upload_pincodes(request, vendor_name):
    """Bulk upload pincodes for a vendor"""
    try:
        vendor = VendorRate.objects.get(vendor_name__iexact=vendor_name)
        pincodes_data = request.data.get('pincodes', [])
        replace_existing = request.data.get('replace_existing', False)
        
        if not pincodes_data:
            return Response({
                "success": False,
                "error": "No pincodes data provided."
            }, status=400)
        
        if replace_existing:
            deleted_count = VendorPincode.objects.filter(vendor=vendor).count()
            VendorPincode.objects.filter(vendor=vendor).delete()
            logger.info(f"Deleted {deleted_count} existing pincodes for {vendor_name}")
        
        created_count = 0
        updated_count = 0
        errors = []
        oda_categories_used = {'A': 0, 'B': 0, 'C': 0, 'D': 0}
        
        for pincode_data in pincodes_data:
            pincode_str = str(pincode_data.get('pincode', '')).strip()
            
            if not pincode_str or len(pincode_str) != 6 or not pincode_str.isdigit():
                errors.append(f"Invalid pincode: {pincode_str}")
                continue
            
            oda_category = pincode_data.get('oda_category', '').upper()
            is_oda = pincode_data.get('is_oda', False)
            
            if isinstance(is_oda, str):
                is_oda = is_oda.lower() in ['true', '1', 'yes', 'y']
            
            oda_charge = float(pincode_data.get('oda_charge_per_kg', 0))
            oda_min = float(pincode_data.get('oda_min_charge', 0))
            
            # Set default ODA charges based on category if not provided
            if is_oda and oda_category in ['A', 'B', 'C', 'D']:
                category_rates = {'A': 2, 'B': 4, 'C': 7, 'D': 10}
                if oda_charge == 0:
                    oda_charge = category_rates[oda_category]
                if oda_min == 0:
                    oda_min = oda_charge * 100
                oda_categories_used[oda_category] += 1
            
            # For DTDC, set default ODA min charge if not provided
            if vendor.vendor_name == 'DTDC' and is_oda and oda_min == 0:
                oda_min = 500
            
            try:
                obj, created = VendorPincode.objects.update_or_create(
                    vendor=vendor,
                    pincode=pincode_str,
                    defaults={
                        'city': pincode_data.get('city', ''),
                        'state': pincode_data.get('state', ''),
                        'is_oda': is_oda,
                        'oda_category': oda_category if is_oda else '',
                        'oda_charge_per_kg': oda_charge,
                        'oda_min_charge': oda_min,
                        'is_serviceable': pincode_data.get('is_serviceable', True)
                    }
                )
                if created:
                    created_count += 1
                else:
                    updated_count += 1
            except Exception as e:
                errors.append(f"Error for pincode {pincode_str}: {str(e)}")
        
        return Response({
            'success': True,
            'message': f'Pincodes uploaded successfully for {vendor_name}',
            'vendor': vendor_name,
            'created': created_count,
            'updated': updated_count,
            'total': len(pincodes_data),
            'errors': errors if errors else None,
            'oda_categories_used': oda_categories_used
        })
        
    except VendorRate.DoesNotExist:
        return Response({
            "success": False,
            "error": f'Vendor "{vendor_name}" not found.'
        }, status=404)
    except Exception as e:
        logger.error(f"Error in bulk_upload_pincodes: {str(e)}")
        return Response({
            "success": False,
            "error": str(e)
        }, status=400)


@api_view(["GET"])
def download_pincode_template(request, vendor_name):
    """Download CSV template for pincode upload"""
    try:
        vendor = VendorRate.objects.get(vendor_name__iexact=vendor_name)
        
        import csv
        from django.http import HttpResponse
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{vendor_name}_pincodes_template.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['pincode', 'city', 'state', 'is_oda', 'oda_category', 'oda_charge_per_kg', 'oda_min_charge', 'is_serviceable'])
        
        if 'BLUE DART' in vendor_name:
            samples = [
                ['212217', 'Allahabad', 'Uttar Pradesh', 'FALSE', '', '0', '0', 'TRUE'],
                ['122502', 'Gurgaon', 'Haryana', 'FALSE', '', '0', '0', 'TRUE'],
                ['110001', 'New Delhi', 'Delhi', 'FALSE', '', '0', '0', 'TRUE'],
            ]
        elif vendor_name == 'DTDC':
            samples = [
                ['212217', 'Allahabad', 'Uttar Pradesh', 'TRUE', 'B', '4', '500', 'TRUE'],
                ['122502', 'Gurgaon', 'Haryana', 'TRUE', 'A', '2', '500', 'TRUE'],
                ['110001', 'New Delhi', 'Delhi', 'FALSE', '', '0', '0', 'TRUE'],
            ]
        else:
            samples = [
                ['212217', 'Allahabad', 'Uttar Pradesh', 'TRUE', 'B', '4', '500', 'TRUE'],
                ['122502', 'Gurgaon', 'Haryana', 'TRUE', 'A', '2', '500', 'TRUE'],
                ['110001', 'New Delhi', 'Delhi', 'FALSE', '', '0', '0', 'TRUE'],
            ]
        
        for sample in samples:
            writer.writerow(sample)
        
        return response
        
    except VendorRate.DoesNotExist:
        return Response({"error": "Vendor not found"}, status=404)


@api_view(["POST"])
def compare_vendors(request):
    """Compare rates across multiple vendors"""
    try:
        data = request.data
        origin_pincode = data.get('origin_pincode')
        destination_pincode = data.get('destination_pincode')
        weight = float(data.get('weight', 0))
        length = float(data.get('length', 0))
        width = float(data.get('width', 0))
        height = float(data.get('height', 0))
        
        volume_cft = (length * width * height) / (30.48 * 30.48 * 30.48) if length and width and height else 0
        
        vendors = VendorRate.objects.filter(is_active=True)
        comparison = []
        
        for vendor in vendors:
            from_zone = get_vendor_specific_zone(origin_pincode, vendor.vendor_name)
            to_zone = get_vendor_specific_zone(destination_pincode, vendor.vendor_name)
            
            if not is_pincode_serviceable_for_vendor(vendor, destination_pincode):
                continue
            
            oda_info = check_oda_for_vendor(vendor, destination_pincode)
            rate_info = calculate_vendor_freight(vendor, from_zone, to_zone, weight, volume_cft, 'standard', oda_info)
            if rate_info:
                comparison.append({
                    'vendor': vendor.vendor_name,
                    'rate_per_kg': rate_info['rate_per_kg'],
                    'oda_applicable': rate_info['oda_applicable'],
                    'oda_charge': rate_info['oda_charge'],
                    'total_freight': rate_info['total_freight']
                })
        
        comparison.sort(key=lambda x: x['total_freight'])
        
        return Response({
            'origin': origin_pincode,
            'destination': destination_pincode,
            'weight': weight,
            'comparison': comparison,
            'recommended': comparison[0] if comparison else None
        })
        
    except Exception as e:
        return Response({"error": str(e)}, status=400)


@api_view(["GET"])
def test_api(request):
    return Response({
        'success': True,
        'message': 'API is working with FIRST 3 DIGITS pincode mapping!',
        'timestamp': datetime.now().isoformat(),
        'vendors_count': VendorRate.objects.count(),
        'pincodes_count': VendorPincode.objects.count()
    })


@api_view(["GET"])
def get_zone_for_pincode(request, pincode):
    """Get client zone and vendor-specific zones for a pincode using FIRST 3 DIGITS"""
    pincode_str = str(pincode).strip()
    
    if len(pincode_str) != 6:
        return Response({'error': 'Invalid pincode format'}, status=400)
    
    client_zone = get_client_zone_from_pincode(pincode_str)
    
    vendor_zones = {}
    vendors = VendorRate.objects.filter(is_active=True)
    
    for vendor in vendors:
        vendor_zones[vendor.vendor_name] = get_vendor_specific_zone(pincode_str, vendor.vendor_name)
    
    return Response({
        'success': True,
        'pincode': pincode_str,
        'prefix': pincode_str[:3],
        'client_zone': client_zone,
        'vendor_zones': vendor_zones
    })


@api_view(["GET"])
def get_vendor_rate(request, vendor_name):
    try:
        obj = VendorRate.objects.get(vendor_name=vendor_name)
        return Response({
            "vendor": vendor_name,
            "rates": obj.rates,
            "charges": obj.charges,
            "delhivery_6cft": obj.delhivery_6cft,
            "delhivery_10cft": obj.delhivery_10cft
        })
    except VendorRate.DoesNotExist:
        return Response({"error": "Vendor not found"}, status=404)


@api_view(["POST"])
def update_vendor_rate(request, vendor_name):
    try:
        data = request.data
        obj, created = VendorRate.objects.update_or_create(
            vendor_name=vendor_name,
            defaults={"rates": data.get('rates', {}), "charges": data.get('charges', {})}
        )
        return Response({"message": "Rates updated", "vendor": vendor_name}, status=200)
    except Exception as e:
        return Response({"error": str(e)}, status=400)


@api_view(["POST"])
def bulk_upload_rates(request):
    try:
        data = request.data
        vendor_name = data.get('vendor_name')
        rates_data = data.get('rates_data', {})
        replace_existing = data.get('replace_existing', False)
        
        vendor, created = VendorRate.objects.get_or_create(
            vendor_name=vendor_name,
            defaults={'rates': {}, 'charges': {}}
        )
        
        if replace_existing:
            vendor.rates = rates_data
        else:
            for from_zone, to_zones in rates_data.items():
                if from_zone not in vendor.rates:
                    vendor.rates[from_zone] = {}
                for to_zone, rate in to_zones.items():
                    vendor.rates[from_zone][to_zone] = rate
        
        vendor.save()
        
        return Response({
            'message': f'Rates uploaded successfully for {vendor_name}',
            'vendor': vendor_name,
            'zones_updated': len(rates_data.keys())
        })
        
    except Exception as e:
        return Response({"error": str(e)}, status=400)


@api_view(["GET"])
def get_rate_history(request, vendor_name=None):
    try:
        if vendor_name:
            vendor = VendorRate.objects.get(vendor_name=vendor_name)
            history = RateHistory.objects.filter(vendor=vendor).order_by('-updated_at')
        else:
            history = RateHistory.objects.all().order_by('-updated_at')
        
        serializer = RateHistorySerializer(history, many=True)
        return Response(serializer.data)
        
    except VendorRate.DoesNotExist:
        return Response({"error": "Vendor not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)


@api_view(["GET"])
def get_pincode_location(request, pincode):
    pincode_str = str(pincode).strip()
    
    try:
        pincode_obj = VendorPincode.objects.filter(pincode=pincode_str).first()
        if pincode_obj and pincode_obj.city and pincode_obj.state:
            return Response({
                'success': True,
                'pincode': pincode_str,
                'city': pincode_obj.city,
                'state': pincode_obj.state,
                'client_zone': get_client_zone_from_pincode(pincode_str),
                'source': 'database'
            })
        
        import requests
        response = requests.get(f'https://api.postalpincode.in/pincode/{pincode_str}', timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            if data and data[0].get('Status') == 'Success':
                post_office = data[0]['PostOffice'][0]
                return Response({
                    'success': True,
                    'pincode': pincode_str,
                    'city': post_office.get('District', ''),
                    'state': post_office.get('State', ''),
                    'client_zone': get_client_zone_from_pincode(pincode_str),
                    'country': post_office.get('Country', ''),
                    'block': post_office.get('Block', ''),
                    'source': 'api'
                })
        
        return Response({
            'success': False,
            'error': f'Location not found for pincode {pincode_str}'
        }, status=404)
        
    except Exception as e:
        return Response({"error": str(e)}, status=400)


# ============================================
# ZONE MANAGEMENT ENDPOINTS
# ============================================

@api_view(["GET", "POST", "PUT", "DELETE"])
def manage_zones(request, zone_id=None):
    if request.method == "GET":
        if zone_id:
            try:
                zone = ZoneMaster.objects.get(id=zone_id)
                serializer = ZoneMasterSerializer(zone)
                return Response(serializer.data)
            except ZoneMaster.DoesNotExist:
                return Response({"error": "Zone not found"}, status=404)
        else:
            zones = ZoneMaster.objects.all()
            serializer = ZoneMasterSerializer(zones, many=True)
            return Response(serializer.data)
    
    elif request.method == "POST":
        serializer = ZoneMasterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)
    
    elif request.method == "PUT":
        try:
            zone = ZoneMaster.objects.get(id=zone_id)
            serializer = ZoneMasterSerializer(zone, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=400)
        except ZoneMaster.DoesNotExist:
            return Response({"error": "Zone not found"}, status=404)
    
    elif request.method == "DELETE":
        try:
            zone = ZoneMaster.objects.get(id=zone_id)
            zone.delete()
            return Response({"message": "Zone deleted successfully"})
        except ZoneMaster.DoesNotExist:
            return Response({"error": "Zone not found"}, status=404)


@api_view(["GET", "POST", "PUT", "DELETE"])
def manage_b2b_rates(request, rate_id=None):
    if request.method == "GET":
        if rate_id:
            try:
                rate = B2BRate.objects.get(id=rate_id)
                serializer = B2BRateSerializer(rate)
                return Response(serializer.data)
            except B2BRate.DoesNotExist:
                return Response({"error": "Rate not found"}, status=404)
        else:
            rates = B2BRate.objects.filter(is_active=True)
            serializer = B2BRateSerializer(rates, many=True)
            return Response(serializer.data)
    
    elif request.method == "POST":
        serializer = B2BRateSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)
    
    elif request.method == "PUT":
        try:
            rate = B2BRate.objects.get(id=rate_id)
            serializer = B2BRateSerializer(rate, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=400)
        except B2BRate.DoesNotExist:
            return Response({"error": "Rate not found"}, status=404)
    
    elif request.method == "DELETE":
        try:
            rate = B2BRate.objects.get(id=rate_id)
            rate.delete()
            return Response({"message": "Rate deleted successfully"})
        except B2BRate.DoesNotExist:
            return Response({"error": "Rate not found"}, status=404)


@api_view(["GET", "POST", "PUT", "DELETE"])
def manage_vendor_service_rates(request, service_id=None):
    if request.method == "GET":
        if service_id:
            try:
                service = VendorServiceRate.objects.get(id=service_id)
                serializer = VendorServiceRateSerializer(service)
                return Response(serializer.data)
            except VendorServiceRate.DoesNotExist:
                return Response({"error": "Service not found"}, status=404)
        else:
            services = VendorServiceRate.objects.filter(is_active=True)
            serializer = VendorServiceRateSerializer(services, many=True)
            return Response(serializer.data)
    
    elif request.method == "POST":
        serializer = VendorServiceRateSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)
    
    elif request.method == "PUT":
        try:
            service = VendorServiceRate.objects.get(id=service_id)
            serializer = VendorServiceRateSerializer(service, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=400)
        except VendorServiceRate.DoesNotExist:
            return Response({"error": "Service not found"}, status=404)
    
    elif request.method == "DELETE":
        try:
            service = VendorServiceRate.objects.get(id=service_id)
            service.delete()
            return Response({"message": "Service rate deleted successfully"})
        except VendorServiceRate.DoesNotExist:
            return Response({"error": "Service not found"}, status=404)


# ============================================
# VENDOR PINCODE MANAGEMENT (CRUD Operations)
# ============================================

@api_view(["GET", "POST", "PUT", "DELETE"])
def manage_vendor_pincodes(request, vendor_name=None, pincode=None):
    """Complete CRUD operations for vendor pincodes"""
    
    # GET - Retrieve pincode(s)
    if request.method == "GET":
        try:
            if vendor_name:
                vendor = VendorRate.objects.get(vendor_name__iexact=vendor_name)
                
                if pincode:
                    # Get single pincode
                    pincode_obj = VendorPincode.objects.get(vendor=vendor, pincode=pincode)
                    return Response({
                        'success': True,
                        'pincode': pincode_obj.pincode,
                        'city': pincode_obj.city,
                        'state': pincode_obj.state,
                        'is_oda': pincode_obj.is_oda,
                        'oda_category': pincode_obj.oda_category,
                        'oda_charge_per_kg': pincode_obj.oda_charge_per_kg,
                        'oda_min_charge': pincode_obj.oda_min_charge,
                        'is_serviceable': pincode_obj.is_serviceable,
                    })
                else:
                    # Get all pincodes for vendor
                    pincodes = VendorPincode.objects.filter(vendor=vendor)
                    data = []
                    for obj in pincodes:
                        data.append({
                            'pincode': obj.pincode,
                            'city': obj.city,
                            'state': obj.state,
                            'is_oda': obj.is_oda,
                            'oda_category': obj.oda_category,
                            'oda_charge_per_kg': obj.oda_charge_per_kg,
                            'oda_min_charge': obj.oda_min_charge,
                            'is_serviceable': obj.is_serviceable,
                        })
                    return Response({
                        'success': True,
                        'vendor': vendor_name,
                        'count': len(data),
                        'data': data
                    })
            else:
                # Get all pincodes from all vendors
                all_pincodes = VendorPincode.objects.all().select_related('vendor')
                data = []
                for obj in all_pincodes:
                    data.append({
                        'vendor': obj.vendor.vendor_name,
                        'pincode': obj.pincode,
                        'city': obj.city,
                        'state': obj.state,
                        'is_oda': obj.is_oda,
                        'oda_category': obj.oda_category,
                    })
                return Response({
                    'success': True,
                    'count': len(data),
                    'data': data
                })
        except VendorRate.DoesNotExist:
            return Response({'error': f'Vendor "{vendor_name}" not found'}, status=404)
        except VendorPincode.DoesNotExist:
            return Response({'error': f'Pincode {pincode} not found'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=500)
    
    # POST - Create new pincode
    elif request.method == "POST":
        try:
            vendor = VendorRate.objects.get(vendor_name__iexact=vendor_name)
            data = request.data
            
            pincode_obj, created = VendorPincode.objects.update_or_create(
                vendor=vendor,
                pincode=data.get('pincode'),
                defaults={
                    'city': data.get('city', ''),
                    'state': data.get('state', ''),
                    'is_oda': data.get('is_oda', False),
                    'oda_category': data.get('oda_category', ''),
                    'oda_charge_per_kg': data.get('oda_charge_per_kg', 0),
                    'oda_min_charge': data.get('oda_min_charge', 500),
                    'is_serviceable': data.get('is_serviceable', True),
                }
            )
            return Response({
                'success': True,
                'message': f'Pincode {data.get("pincode")} {"created" if created else "updated"}',
                'pincode': pincode_obj.pincode
            }, status=201)
        except VendorRate.DoesNotExist:
            return Response({'error': 'Vendor not found'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=400)
    
    # PUT - Update existing pincode
    elif request.method == "PUT":
        try:
            vendor = VendorRate.objects.get(vendor_name__iexact=vendor_name)
            pincode_obj = VendorPincode.objects.get(vendor=vendor, pincode=pincode)
            data = request.data
            
            if 'city' in data:
                pincode_obj.city = data['city']
            if 'state' in data:
                pincode_obj.state = data['state']
            if 'is_oda' in data:
                pincode_obj.is_oda = data['is_oda']
            if 'oda_category' in data:
                pincode_obj.oda_category = data['oda_category']
            if 'oda_charge_per_kg' in data:
                pincode_obj.oda_charge_per_kg = data['oda_charge_per_kg']
            if 'oda_min_charge' in data:
                pincode_obj.oda_min_charge = data['oda_min_charge']
            if 'is_serviceable' in data:
                pincode_obj.is_serviceable = data['is_serviceable']
            
            pincode_obj.save()
            return Response({
                'success': True,
                'message': f'Pincode {pincode} updated successfully'
            })
        except VendorRate.DoesNotExist:
            return Response({'error': 'Vendor not found'}, status=404)
        except VendorPincode.DoesNotExist:
            return Response({'error': 'Pincode not found'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=400)
    
    # DELETE - Remove pincode
    elif request.method == "DELETE":
        try:
            vendor = VendorRate.objects.get(vendor_name__iexact=vendor_name)
            pincode_obj = VendorPincode.objects.get(vendor=vendor, pincode=pincode)
            pincode_obj.delete()
            return Response({
                'success': True,
                'message': f'Pincode {pincode} deleted successfully'
            })
        except VendorRate.DoesNotExist:
            return Response({'error': 'Vendor not found'}, status=404)
        except VendorPincode.DoesNotExist:
            return Response({'error': 'Pincode not found'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=400)


# ============================================
# CHECK ODA FOR ALL VENDORS (Single Pincode)
# ============================================

@api_view(["GET"])
def check_oda_all_vendors(request):
    """Check ODA status for a pincode across all active vendors"""
    
    pincode = request.GET.get('pincode', '').strip()
    
    if not pincode or len(pincode) != 6 or not pincode.isdigit():
        return Response({
            'success': False,
            'error': 'Invalid pincode format. Please provide a 6-digit pincode.'
        }, status=400)
    
    try:
        vendors = VendorRate.objects.filter(is_active=True)
        results = {}
        
        for vendor in vendors:
            try:
                # Check serviceability first
                if not is_pincode_serviceable_for_vendor(vendor, pincode):
                    results[vendor.vendor_name] = {
                        'is_oda': False,
                        'is_serviceable': False,
                        'oda_category': None,
                        'oda_charge_per_kg': 0,
                        'oda_min_charge': 0,
                    }
                    continue
                
                # Get ODA info
                oda_info = check_oda_for_vendor(vendor, pincode)
                
                results[vendor.vendor_name] = {
                    'is_oda': oda_info.get('is_oda', False),
                    'is_serviceable': oda_info.get('is_serviceable', True),
                    'oda_category': oda_info.get('category'),
                    'oda_charge_per_kg': oda_info.get('charge_per_kg', 0),
                    'oda_min_charge': oda_info.get('min_charge', 500),
                }
                
            except Exception as e:
                logger.error(f"Error checking ODA for {vendor.vendor_name}: {str(e)}")
                results[vendor.vendor_name] = {
                    'is_oda': False,
                    'is_serviceable': False,
                    'oda_category': None,
                    'oda_charge_per_kg': 0,
                    'oda_min_charge': 0,
                    'error': str(e)
                }
        
        # Count ODA and Non-ODA vendors
        oda_count = sum(1 for v in results.values() if v.get('is_oda') == True)
        serviceable_count = sum(1 for v in results.values() if v.get('is_serviceable') == True)
        
        return Response({
            'success': True,
            'pincode': pincode,
            'total_vendors': len(results),
            'serviceable_vendors': serviceable_count,
            'oda_vendors': oda_count,
            'non_oda_vendors': serviceable_count - oda_count,
            'results': results
        })
        
    except Exception as e:
        logger.error(f"Error in check_oda_all_vendors: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)


# ============================================
# GET VENDOR PINCODE STATISTICS
# ============================================

@api_view(["GET"])
def get_vendor_pincode_stats(request, vendor_name):
    """Get pincode statistics for a vendor"""
    try:
        vendor = VendorRate.objects.get(vendor_name__iexact=vendor_name)
        
        total_pincodes = VendorPincode.objects.filter(vendor=vendor).count()
        oda_pincodes = VendorPincode.objects.filter(vendor=vendor, is_oda=True).count()
        serviceable_pincodes = VendorPincode.objects.filter(vendor=vendor, is_serviceable=True).count()
        non_serviceable_pincodes = total_pincodes - serviceable_pincodes
        
        # Category wise statistics
        category_stats = {}
        for category in ['A', 'B', 'C', 'D']:
            count = VendorPincode.objects.filter(
                vendor=vendor, 
                is_oda=True, 
                oda_category=category
            ).count()
            if count > 0:
                category_rates = {'A': 2, 'B': 4, 'C': 7, 'D': 10}
                category_stats[category] = {
                    'count': count,
                    'charge_per_kg': category_rates.get(category, 4),
                    'min_charge': category_rates.get(category, 4) * 100
                }
        
        # Recent pincodes (last 10)
        recent_pincodes = VendorPincode.objects.filter(vendor=vendor).order_by('-id')[:10]
        recent_list = []
        for obj in recent_pincodes:
            recent_list.append({
                'pincode': obj.pincode,
                'city': obj.city,
                'state': obj.state,
                'is_oda': obj.is_oda,
                'oda_category': obj.oda_category,
            })
        
        return Response({
            'success': True,
            'vendor': vendor_name,
            'total_pincodes': total_pincodes,
            'oda_pincodes': oda_pincodes,
            'non_oda_pincodes': total_pincodes - oda_pincodes,
            'serviceable_pincodes': serviceable_pincodes,
            'non_serviceable_pincodes': non_serviceable_pincodes,
            'category_stats': category_stats,
            'recent_pincodes': recent_list
        })
        
    except VendorRate.DoesNotExist:
        return Response({
            'success': False,
            'error': f'Vendor "{vendor_name}" not found'
        }, status=404)
    except Exception as e:
        logger.error(f"Error in get_vendor_pincode_stats: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)