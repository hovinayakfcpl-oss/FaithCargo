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
# CLIENT ZONE MAPPING (Based on your image)
# ============================================

def get_client_zone_from_pincode(pincode):
    """
    Get CLIENT's bill zone from pincode based on your region mapping
    Returns: Delhi NCR, NORTH 2, NORTH 3, Central, W1, W2, East, South, NE1, NE2, NE3
    """
    pincode_str = str(pincode).strip()
    
    # Delhi NCR - New Delhi, Gurgaon, Noida, Ghaziabad, Faridabad
    if pincode_str.startswith('110') or pincode_str.startswith('122') or \
       pincode_str.startswith('201') or pincode_str.startswith('1100') or \
       pincode_str in ['110001', '110002', '110003', '110019', '110020', '110025',
                       '122001', '122002', '122003', '122004', '122005', '122006',
                       '122007', '122008', '122009', '122010', '122015', '122016',
                       '122017', '122018', '122019', '122050', '122051', '122052',
                       '122053', '122054', '122055', '122056', '122057', '122058',
                       '122059', '122060', '201301', '201302', '201303', '201304',
                       '201305', '201306', '201307', '201308', '201309', '201310',
                       '110086', '110096']:
        return 'Delhi NCR'
    
    # NORTH 3 - Srinagar specific
    srinagar_pincodes = ['190001', '190002', '190003', '190004', '190005', '190006', 
                         '190007', '190008', '190009', '190010', '190011', '190012', 
                         '190013', '190014', '190015']
    if pincode_str in srinagar_pincodes:
        return 'NORTH 3'
    
    # Central - Madhya Pradesh & Chhattisgarh
    if pincode_str.startswith('45') or pincode_str.startswith('46') or pincode_str.startswith('47') or \
       pincode_str.startswith('48') or pincode_str.startswith('49'):
        return 'Central'
    
    # W1 - Gujarat & Daman & Diu
    if pincode_str.startswith('36') or pincode_str.startswith('37') or pincode_str.startswith('38') or \
       pincode_str.startswith('39') or pincode_str.startswith('396') or pincode_str.startswith('362'):
        return 'W1'
    
    # W2 - Maharashtra & Goa
    if pincode_str.startswith('40') or pincode_str.startswith('41') or pincode_str.startswith('42') or \
       pincode_str.startswith('43') or pincode_str.startswith('44') or pincode_str.startswith('403'):
        return 'W2'
    
    # South - Karnataka, AP, Pondicherry, Kerala, Tamil Nadu
    if pincode_str.startswith('50') or pincode_str.startswith('51') or pincode_str.startswith('52') or \
       pincode_str.startswith('53') or pincode_str.startswith('54') or pincode_str.startswith('55') or \
       pincode_str.startswith('56') or pincode_str.startswith('57') or pincode_str.startswith('58') or \
       pincode_str.startswith('59') or pincode_str.startswith('60') or pincode_str.startswith('61') or \
       pincode_str.startswith('62') or pincode_str.startswith('63') or pincode_str.startswith('64') or \
       pincode_str.startswith('65') or pincode_str.startswith('66') or pincode_str.startswith('67') or \
       pincode_str.startswith('68') or pincode_str.startswith('69'):
        return 'South'
    
    # East & Northeast
    if pincode_str.startswith('70') or pincode_str.startswith('71') or pincode_str.startswith('72') or \
       pincode_str.startswith('73') or pincode_str.startswith('74') or pincode_str.startswith('75') or \
       pincode_str.startswith('76') or pincode_str.startswith('77') or pincode_str.startswith('78') or \
       pincode_str.startswith('79') or pincode_str.startswith('80') or pincode_str.startswith('81') or \
       pincode_str.startswith('82') or pincode_str.startswith('83'):
        
        # Northeast Zones
        if pincode_str.startswith('78') or pincode_str.startswith('79'):
            # NE1 - Guwahati, Sikkim
            if pincode_str.startswith('781') or pincode_str.startswith('737'):
                return 'NE1'
            # NE2 - Assam (other), Manipur, Meghalaya, Tripura, Arunachal
            elif pincode_str.startswith('782') or pincode_str.startswith('783') or pincode_str.startswith('784') or \
                 pincode_str.startswith('785') or pincode_str.startswith('786') or pincode_str.startswith('787') or \
                 pincode_str.startswith('788') or pincode_str.startswith('789'):
                return 'NE2'
            # NE3 - Mizoram, Nagaland
            elif pincode_str.startswith('796') or pincode_str.startswith('797') or pincode_str.startswith('798'):
                return 'NE3'
        return 'East'
    
    # Default NORTH 2
    return 'NORTH 2'


def get_vendor_zone_from_client_zone(client_zone, vendor_name):
    """
    Convert client's bill zone to vendor's internal zone name
    UPDATED: VXPRESS and SHIVANI VX use standard database zone names
    """
    vendor_upper = vendor_name.upper()
    
    # Base mapping for standard zones
    base_mapping = {
        'Delhi NCR': 'N1',
        'NORTH 2': 'N2',
        'NORTH 3': 'N3',
        'Central': 'C1',
        'W1': 'W1',
        'W2': 'W2',
        'East': 'E1',
        'South': 'S1',
        'NE1': 'NE1',
        'NE2': 'NE2',
        'NE3': 'NE3'
    }
    
    # ========================================
    # GATI - NE3 maps to E1
    # ========================================
    if 'GATI' in vendor_upper:
        if client_zone == 'NE3':
            return 'E1'
        return base_mapping.get(client_zone, 'N1')
    
    # ========================================
    # PD LOGISTICS (17 zones - supports all NE)
    # ========================================
    elif 'PD LOGISTICS' in vendor_upper:
        return base_mapping.get(client_zone, 'N1')
    
    # ========================================
    # RIVIGO - NE3 maps to NE2
    # ========================================
    elif 'RIVIGO' in vendor_upper:
        if client_zone == 'NE3':
            return 'NE2'
        return base_mapping.get(client_zone, 'N1')
    
    # ========================================
    # TRUCX DLH Lite - NE3 maps to NE2
    # ========================================
    elif 'TRUCX DLH LITE' in vendor_upper:
        if client_zone == 'NE3':
            return 'NE2'
        return base_mapping.get(client_zone, 'N1')
    
    # ========================================
    # TRUCX DLH Dense / Cargo (16 zones)
    # ========================================
    elif 'TRUCX DLH DENSE' in vendor_upper or 'TRUCX DLH CARGO' in vendor_upper:
        return base_mapping.get(client_zone, 'N1')
    
    # ========================================
    # VXPRESS - Uses standard database zone names (N1, N2, C1, etc.)
    # ========================================
    elif 'VXPRESS' in vendor_upper:
        return base_mapping.get(client_zone, 'N1')
    
    # ========================================
    # SHIVANI VX - Uses standard database zone names
    # Special zones: GOA, KERALA
    # ========================================
    elif 'SHIVANI VX' in vendor_upper:
        if client_zone == 'W2':
            return 'W2'  # For Goa
        if client_zone == 'South':
            return 'S1'  # For Kerala
        return base_mapping.get(client_zone, 'N1')
    
    # ========================================
    # SHIPSHOPY BLUE DART (16 zones)
    # ========================================
    elif 'SHIPSHOPY BLUE DART' in vendor_upper:
        return base_mapping.get(client_zone, 'N1')
    
    # ========================================
    # SHIPSHOPY DELIVERY (16 zones)
    # ========================================
    elif 'SHIPSHOPY DELIVERY' in vendor_upper:
        return base_mapping.get(client_zone, 'N1')
    
    # ========================================
    # DELHIVERY - NE zones map to E1
    # ========================================
    elif 'DELHIVERY' in vendor_upper:
        if client_zone in ['NE1', 'NE2', 'NE3']:
            return 'E1'
        return base_mapping.get(client_zone, 'N1')
    
    # Default mapping
    else:
        return base_mapping.get(client_zone, 'N1')


def get_zone_from_pincode(pincode):
    """Backward compatibility function"""
    return get_client_zone_from_pincode(pincode)


def get_vendor_specific_zone(pincode, vendor_name):
    """Get vendor-specific zone for a pincode"""
    client_zone = get_client_zone_from_pincode(pincode)
    vendor_zone = get_vendor_zone_from_client_zone(client_zone, vendor_name)
    logger.info(f"Pincode {pincode} → Client Zone: {client_zone} → Vendor {vendor_name} Zone: {vendor_zone}")
    return vendor_zone


def is_pincode_serviceable_for_vendor(vendor, pincode):
    """Check if pincode is serviceable for a vendor"""
    pincode_str = str(pincode).strip()
    vendor_name = vendor.vendor_name
    
    # SHIPSHOPY BLUE DART - serviceable only if in database
    if vendor_name == 'SHIPSHOPY BLUE DART':
        pincode_obj = VendorPincode.objects.filter(
            vendor=vendor, pincode=pincode_str, is_serviceable=True
        ).first()
        logger.info(f"Blue Dart serviceable check for {pincode_str}: {pincode_obj is not None}")
        return pincode_obj is not None
    
    # All other vendors - always serviceable
    return True


def check_oda_for_vendor(vendor, pincode):
    """Check if pincode is ODA for a vendor"""
    pincode_str = str(pincode).strip()
    vendor_name = vendor.vendor_name
    
    # First check if pincode is serviceable
    if not is_pincode_serviceable_for_vendor(vendor, pincode_str):
        logger.info(f"Pincode {pincode_str} NOT serviceable for {vendor_name}")
        return {
            'is_oda': False,
            'is_serviceable': False,
            'charge_per_kg': 0,
            'min_charge': 0,
            'category': None,
            'city': '',
            'state': ''
        }
    
    # SHIPSHOPY BLUE DART - never ODA
    if vendor_name == 'SHIPSHOPY BLUE DART':
        return {
            'is_oda': False,
            'is_serviceable': True,
            'charge_per_kg': 0,
            'min_charge': 0,
            'category': None,
            'city': '',
            'state': ''
        }
    
    # PD LOGISTICS
    if vendor_name == 'PD LOGISTICS':
        pincode_obj = VendorPincode.objects.filter(
            vendor=vendor, pincode=pincode_str, is_oda=True
        ).first()
        if pincode_obj and pincode_obj.is_oda:
            logger.info(f"✅ PD LOGISTICS: {pincode_str} is ODA (Category: {pincode_obj.oda_category})")
            return {
                'is_oda': True,
                'is_serviceable': True,
                'charge_per_kg': float(pincode_obj.oda_charge_per_kg),
                'min_charge': float(pincode_obj.oda_min_charge),
                'category': pincode_obj.oda_category,
                'city': pincode_obj.city or '',
                'state': pincode_obj.state or ''
            }
        logger.info(f"❌ PD LOGISTICS: {pincode_str} is NOT ODA")
        return {
            'is_oda': False,
            'is_serviceable': True,
            'charge_per_kg': 0,
            'min_charge': 0,
            'category': None,
            'city': '',
            'state': ''
        }
    
    # SHIPSHOPY DELIVERY & TRUCX variants - use PD LOGISTICS pincodes
    if vendor_name in ['SHIPSHOPY DELIVERY', 'TRUCX DLH Lite', 'TRUCX DLH Dense', 'TRUCX DLH Cargo']:
        pd_vendor = VendorRate.objects.filter(vendor_name='PD LOGISTICS').first()
        if pd_vendor:
            pincode_obj = VendorPincode.objects.filter(
                vendor=pd_vendor, pincode=pincode_str, is_oda=True
            ).first()
            if pincode_obj and pincode_obj.is_oda:
                logger.info(f"✅ {vendor_name}: {pincode_str} is ODA via PD LOGISTICS")
                return {
                    'is_oda': True,
                    'is_serviceable': True,
                    'charge_per_kg': float(pincode_obj.oda_charge_per_kg),
                    'min_charge': float(pincode_obj.oda_min_charge),
                    'category': pincode_obj.oda_category,
                    'city': pincode_obj.city or '',
                    'state': pincode_obj.state or ''
                }
        logger.info(f"❌ {vendor_name}: {pincode_str} is NOT ODA")
        return {
            'is_oda': False,
            'is_serviceable': True,
            'charge_per_kg': 0,
            'min_charge': 0,
            'category': None,
            'city': '',
            'state': ''
        }
    
    # VXPRESS - check its own ODA pincodes
    if vendor_name == 'VXPRESS':
        pincode_obj = VendorPincode.objects.filter(
            vendor=vendor, pincode=pincode_str, is_oda=True
        ).first()
        if pincode_obj and pincode_obj.is_oda:
            logger.info(f"✅ VXPRESS: {pincode_str} is ODA")
            return {
                'is_oda': True,
                'is_serviceable': True,
                'charge_per_kg': float(pincode_obj.oda_charge_per_kg),
                'min_charge': float(pincode_obj.oda_min_charge),
                'category': pincode_obj.oda_category,
                'city': pincode_obj.city or '',
                'state': pincode_obj.state or ''
            }
        logger.info(f"❌ VXPRESS: {pincode_str} is NOT ODA")
        return {
            'is_oda': False,
            'is_serviceable': True,
            'charge_per_kg': 0,
            'min_charge': 0,
            'category': None,
            'city': '',
            'state': ''
        }
    
    # SHIVANI VX - uses VXPRESS pincodes
    if vendor_name == 'SHIVANI VX':
        vxpress_vendor = VendorRate.objects.filter(vendor_name='VXPRESS').first()
        if vxpress_vendor:
            pincode_obj = VendorPincode.objects.filter(
                vendor=vxpress_vendor, pincode=pincode_str, is_oda=True
            ).first()
            if pincode_obj and pincode_obj.is_oda:
                logger.info(f"✅ SHIVANI VX: {pincode_str} is ODA via VXPRESS")
                return {
                    'is_oda': True,
                    'is_serviceable': True,
                    'charge_per_kg': float(pincode_obj.oda_charge_per_kg),
                    'min_charge': float(pincode_obj.oda_min_charge),
                    'category': pincode_obj.oda_category,
                    'city': pincode_obj.city or '',
                    'state': pincode_obj.state or ''
                }
        logger.info(f"❌ SHIVANI VX: {pincode_str} is NOT ODA")
        return {
            'is_oda': False,
            'is_serviceable': True,
            'charge_per_kg': 0,
            'min_charge': 0,
            'category': None,
            'city': '',
            'state': ''
        }
    
    # RIVIGO - check its own ODA pincodes
    if vendor_name == 'RIVIGO':
        pincode_obj = VendorPincode.objects.filter(
            vendor=vendor, pincode=pincode_str, is_oda=True
        ).first()
        if pincode_obj and pincode_obj.is_oda:
            logger.info(f"✅ RIVIGO: {pincode_str} is ODA")
            return {
                'is_oda': True,
                'is_serviceable': True,
                'charge_per_kg': float(pincode_obj.oda_charge_per_kg),
                'min_charge': float(pincode_obj.oda_min_charge),
                'category': pincode_obj.oda_category,
                'city': pincode_obj.city or '',
                'state': pincode_obj.state or ''
            }
        logger.info(f"❌ RIVIGO: {pincode_str} is NOT ODA")
        return {
            'is_oda': False,
            'is_serviceable': True,
            'charge_per_kg': 0,
            'min_charge': 0,
            'category': None,
            'city': '',
            'state': ''
        }
    
    # All other vendors - No ODA
    return {
        'is_oda': False,
        'is_serviceable': True,
        'charge_per_kg': 0,
        'min_charge': 0,
        'category': None,
        'city': '',
        'state': ''
    }


def calculate_vendor_freight(vendor, from_zone, to_zone, weight, volume_cft, cft_type='standard', oda_info=None):
    """Calculate freight for a single vendor"""
    
    if oda_info and not oda_info.get('is_serviceable', True):
        logger.info(f"Vendor {vendor.vendor_name} not serviceable")
        return None
    
    rate_per_kg = 0
    display_cft_type = None
    vendor_name = vendor.vendor_name
    
    is_pd = vendor_name == 'PD LOGISTICS'
    is_rivigo = vendor_name == 'RIVIGO'
    is_delhivery = vendor_name == 'DELHIVERY'
    
    # Get appropriate rates
    if is_pd:
        if cft_type == '6cft':
            rates = vendor.delhivery_6cft or {}
            rate_per_kg = rates.get(from_zone, {}).get(to_zone, 0)
            display_cft_type = '6 CFT'
        elif cft_type == '10cft':
            rates = vendor.delhivery_10cft or {}
            rate_per_kg = rates.get(from_zone, {}).get(to_zone, 0)
            display_cft_type = '10 CFT'
        else:
            return None
    
    elif is_rivigo:
        if cft_type == '6cft':
            rates = vendor.delhivery_6cft or {}
            rate_per_kg = rates.get(from_zone, {}).get(to_zone, 0)
            display_cft_type = '6 CFT'
        elif cft_type == '10cft':
            rates = vendor.delhivery_10cft or {}
            rate_per_kg = rates.get(from_zone, {}).get(to_zone, 0)
            display_cft_type = '10 CFT'
        else:
            rates = vendor.rates or {}
            rate_per_kg = rates.get(from_zone, {}).get(to_zone, 0)
            display_cft_type = 'Standard'
    
    else:
        rates = vendor.rates or {}
        rate_per_kg = rates.get(from_zone, {}).get(to_zone, 0)
        display_cft_type = 'Standard'
    
    # Fallback rates if no rate found
    if rate_per_kg == 0:
        if is_pd:
            logger.warning(f"No rate found for {vendor_name} {cft_type}")
            return None
        fallback_rates = {
            'DELHIVERY': 28, 'GATI': 25,
            'TRUCX DLH Lite': 22, 'TRUCX DLH Dense': 22, 'TRUCX DLH Cargo': 22,
            'SHIPSHOPY BLUE DART': 25, 'SHIPSHOPY DELIVERY': 22,
            'VXPRESS': 20, 'SHIVANI VX': 20, 'RIVIGO': 24
        }
        rate_per_kg = fallback_rates.get(vendor_name, 22)
        logger.info(f"Using fallback rate for {vendor_name}: ₹{rate_per_kg}/kg")
    
    # Get charges
    charges = vendor.charges or {}
    docket_charge = float(charges.get('docket_charge', 100))
    fsc_percent = float(str(charges.get('fsc', '10%')).replace('%', ''))
    gst_percent = float(str(charges.get('gst', '18%')).replace('%', ''))
    fov_charge = float(charges.get('fov', 75))
    min_freight = float(charges.get('min_freight', 350))
    min_weight = float(charges.get('min_weight', 20))
    divisor = charges.get('divisor', 5000)
    
    # Calculate volumetric weight
    volumetric_weight = volume_cft * (divisor / 10) if volume_cft > 0 else 0
    effective_weight = max(weight, volumetric_weight, min_weight)
    
    # Calculate freight
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
        logger.info(f"✅ ODA APPLIED for {vendor_name}: ₹{oda_charge}")
    
    # GST
    gst_amount = (base_freight + fsc_amount + docket_charge + oda_charge) * (gst_percent / 100)
    
    # Total freight
    total_freight = base_freight + fsc_amount + docket_charge + gst_amount + fov_charge + oda_charge
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
        'fov_charge': round(fov_charge, 2),
        'oda_charge': round(oda_charge, 2),
        'oda_applicable': oda_applicable,
        'oda_category': oda_category,
        'min_freight': round(min_freight, 2),
        'total_freight': round(total_freight, 2)
    }


# ============================================
# VENDOR RATE MANAGEMENT
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
                    "created_at": obj.created_at.isoformat() if obj.created_at else None,
                    "updated_at": obj.updated_at.isoformat() if obj.updated_at else None,
                    "updated_by": obj.updated_by,
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
        except VendorRate.DoesNotExist:
            return Response({"error": f"Vendor '{vendor_name}' not found"}, status=404)
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
                    "updated_by": request.user.username if request.user.is_authenticated else 'admin'
                }
            )
            return Response({
                "message": f"{vendor_name} {'created' if created else 'updated'} successfully",
                "id": obj.id
            }, status=201)
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
            
            obj.updated_by = request.user.username if request.user.is_authenticated else 'admin'
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
        except Exception as e:
            return Response({"error": str(e)}, status=400)


# ============================================
# VENDOR PINCODE MANAGEMENT
# ============================================

@api_view(["GET", "POST", "PUT", "DELETE"])
def manage_vendor_pincodes(request, vendor_name=None, pincode=None):
    """Manage vendor pincodes"""
    
    if request.method == "GET":
        if vendor_name:
            try:
                vendor = VendorRate.objects.get(vendor_name__iexact=vendor_name)
                
                if pincode:
                    try:
                        pincode_obj = VendorPincode.objects.get(vendor=vendor, pincode=pincode)
                        serializer = VendorPincodeSerializer(pincode_obj)
                        return Response({'success': True, 'data': serializer.data})
                    except VendorPincode.DoesNotExist:
                        return Response({'success': False, 'error': f'Pincode {pincode} not found'}, status=404)
                else:
                    pincodes = VendorPincode.objects.filter(vendor=vendor)
                    paginator = Paginator(pincodes, 1000)
                    page = request.GET.get('page', 1)
                    pincodes_page = paginator.get_page(page)
                    serializer = VendorPincodeSerializer(pincodes_page, many=True)
                    return Response({
                        'success': True,
                        'vendor': vendor_name,
                        'total_count': pincodes.count(),
                        'page': int(page),
                        'total_pages': paginator.num_pages,
                        'count': len(serializer.data),
                        'data': serializer.data
                    })
            except VendorRate.DoesNotExist:
                return Response({'success': False, 'error': f'Vendor "{vendor_name}" not found'}, status=404)
            except Exception as e:
                return Response({'success': False, 'error': str(e)}, status=500)
        else:
            all_pincodes = VendorPincode.objects.all().select_related('vendor')
            serializer = VendorPincodeSerializer(all_pincodes, many=True)
            return Response({'success': True, 'count': all_pincodes.count(), 'data': serializer.data})
    
    elif request.method == "POST":
        try:
            vendor = VendorRate.objects.get(vendor_name=vendor_name)
            data = request.data
            data['vendor'] = vendor.id
            serializer = VendorPincodeSerializer(data=data)
            if serializer.is_valid():
                serializer.save()
                return Response({'success': True, 'data': serializer.data}, status=201)
            return Response({'success': False, 'errors': serializer.errors}, status=400)
        except VendorRate.DoesNotExist:
            return Response({"error": "Vendor not found"}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=400)
    
    elif request.method == "PUT":
        try:
            vendor = VendorRate.objects.get(vendor_name=vendor_name)
            pincode_obj = VendorPincode.objects.get(vendor=vendor, pincode=pincode)
            serializer = VendorPincodeSerializer(pincode_obj, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response({'success': True, 'data': serializer.data})
            return Response({'success': False, 'errors': serializer.errors}, status=400)
        except VendorRate.DoesNotExist:
            return Response({"error": "Vendor not found"}, status=404)
        except VendorPincode.DoesNotExist:
            return Response({"error": "Pincode not found"}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=400)
    
    elif request.method == "DELETE":
        try:
            vendor = VendorRate.objects.get(vendor_name=vendor_name)
            pincode_obj = VendorPincode.objects.get(vendor=vendor, pincode=pincode)
            pincode_obj.delete()
            return Response({"message": f"Pincode {pincode} deleted successfully"})
        except VendorRate.DoesNotExist:
            return Response({"error": "Vendor not found"}, status=404)
        except VendorPincode.DoesNotExist:
            return Response({"error": "Pincode not found"}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=400)


# ============================================
# CHECK ODA FOR PINCODE
# ============================================

@api_view(["GET"])
def check_oda_status(request, vendor_name, pincode):
    """Check if a pincode is ODA for a specific vendor"""
    pincode_str = str(pincode).strip()
    
    try:
        vendor = VendorRate.objects.get(vendor_name__iexact=vendor_name)
        
        if not is_pincode_serviceable_for_vendor(vendor, pincode_str):
            return Response({
                'success': True, 'pincode': pincode_str, 'vendor': vendor_name,
                'is_oda': False, 'is_serviceable': False,
                'oda_category': None, 'oda_charge_per_kg': 0, 'oda_min_charge': 0
            })
        
        oda_info = check_oda_for_vendor(vendor, pincode_str)
        
        return Response({
            'success': True, 'pincode': pincode_str, 'vendor': vendor_name,
            'is_oda': oda_info.get('is_oda', False),
            'is_serviceable': oda_info.get('is_serviceable', True),
            'oda_category': oda_info.get('category'),
            'oda_charge_per_kg': oda_info.get('charge_per_kg', 0),
            'oda_min_charge': oda_info.get('min_charge', 0),
            'city': oda_info.get('city', ''), 'state': oda_info.get('state', '')
        })
    except VendorRate.DoesNotExist:
        return Response({'success': False, 'error': f'Vendor "{vendor_name}" not found'}, status=404)
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


# ============================================
# BULK PINCODE UPLOAD
# ============================================

@api_view(["POST"])
def bulk_upload_pincodes(request, vendor_name):
    """Bulk upload pincodes for a vendor"""
    try:
        vendor = VendorRate.objects.get(vendor_name__iexact=vendor_name)
        pincodes_data = request.data.get('pincodes', [])
        replace_existing = request.data.get('replace_existing', False)
        
        if not pincodes_data:
            return Response({"success": False, "error": "No pincodes data provided."}, status=400)
        
        if replace_existing:
            VendorPincode.objects.filter(vendor=vendor).delete()
        
        created_count = 0
        updated_count = 0
        errors = []
        
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
            'message': f'Pincodes uploaded successfully',
            'vendor': vendor_name,
            'created': created_count,
            'updated': updated_count,
            'total': len(pincodes_data),
            'errors': errors if errors else None
        })
    except VendorRate.DoesNotExist:
        return Response({"success": False, "error": f'Vendor "{vendor_name}" not found.'}, status=404)
    except Exception as e:
        return Response({"success": False, "error": str(e)}, status=400)


# ============================================
# VENDOR RATE CALCULATOR
# ============================================

@api_view(["POST"])
def calculate_all_vendor_rates(request):
    """Calculate rates for all vendors"""
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
        
        volume_cft = (length * width * height) / (30.48 ** 3) if length and width and height else 0
        
        vendors = VendorRate.objects.filter(is_active=True)
        results = []
        
        for vendor in vendors:
            from_zone = get_vendor_specific_zone(origin_pincode, vendor.vendor_name)
            to_zone = get_vendor_specific_zone(destination_pincode, vendor.vendor_name)
            
            if not is_pincode_serviceable_for_vendor(vendor, destination_pincode):
                continue
            
            oda_info = check_oda_for_vendor(vendor, destination_pincode)
            vendor_name = vendor.vendor_name
            
            if vendor_name == 'PD LOGISTICS':
                rate_6cft = calculate_vendor_freight(vendor, from_zone, to_zone, weight, volume_cft, '6cft', oda_info)
                if rate_6cft and rate_6cft.get('rate_per_kg', 0) > 0:
                    results.append(rate_6cft)
                
                rate_10cft = calculate_vendor_freight(vendor, from_zone, to_zone, weight, volume_cft, '10cft', oda_info)
                if rate_10cft and rate_10cft.get('rate_per_kg', 0) > 0:
                    results.append(rate_10cft)
            
            elif vendor_name == 'RIVIGO':
                rate_6cft = calculate_vendor_freight(vendor, from_zone, to_zone, weight, volume_cft, '6cft', oda_info)
                if rate_6cft and rate_6cft.get('rate_per_kg', 0) > 0:
                    results.append(rate_6cft)
                
                rate_10cft = calculate_vendor_freight(vendor, from_zone, to_zone, weight, volume_cft, '10cft', oda_info)
                if rate_10cft and rate_10cft.get('rate_per_kg', 0) > 0:
                    results.append(rate_10cft)
                
                rate_standard = calculate_vendor_freight(vendor, from_zone, to_zone, weight, volume_cft, 'standard', oda_info)
                if rate_standard and rate_standard.get('rate_per_kg', 0) > 0:
                    results.append(rate_standard)
            
            else:
                rate = calculate_vendor_freight(vendor, from_zone, to_zone, weight, volume_cft, 'standard', oda_info)
                if rate and rate.get('rate_per_kg', 0) > 0:
                    results.append(rate)
        
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
        logger.error(f"Error: {str(e)}")
        return Response({"error": str(e)}, status=400)


# ============================================
# OTHER ENDPOINTS
# ============================================

@api_view(["GET"])
def test_api(request):
    return Response({
        'success': True,
        'message': 'API is working!',
        'timestamp': datetime.now().isoformat(),
        'vendors_count': VendorRate.objects.count(),
        'pincodes_count': VendorPincode.objects.count()
    })


@api_view(["GET"])
def get_zone_for_pincode(request, pincode):
    """Get client zone and vendor-specific zones for a pincode"""
    pincode_str = str(pincode).strip()
    
    if len(pincode_str) != 6:
        return Response({'success': False, 'error': 'Invalid pincode format'}, status=400)
    
    client_zone = get_client_zone_from_pincode(pincode_str)
    
    vendor_zones = {}
    for vendor in VendorRate.objects.filter(is_active=True):
        vendor_zones[vendor.vendor_name] = get_vendor_zone_from_client_zone(client_zone, vendor.vendor_name)
    
    return Response({
        'success': True,
        'pincode': pincode_str,
        'client_zone': client_zone,
        'vendor_zones': vendor_zones
    })


@api_view(["GET"])
def get_pincode_location(request, pincode):
    """Get location details for a pincode"""
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
                    'source': 'api'
                })
        
        return Response({'success': False, 'error': f'Location not found'}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)


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


@api_view(["GET"])
def check_oda_all_vendors(request):
    """Check ODA status for a pincode across all vendors"""
    pincode = request.GET.get('pincode', '').strip()
    
    if not pincode or len(pincode) != 6:
        return Response({'success': False, 'error': 'Invalid pincode'}, status=400)
    
    try:
        vendors = VendorRate.objects.filter(is_active=True)
        results = {}
        
        for vendor in vendors:
            if not is_pincode_serviceable_for_vendor(vendor, pincode):
                results[vendor.vendor_name] = {
                    'is_oda': False, 'is_serviceable': False,
                    'oda_category': None, 'oda_charge_per_kg': 0, 'oda_min_charge': 0
                }
            else:
                oda_info = check_oda_for_vendor(vendor, pincode)
                results[vendor.vendor_name] = {
                    'is_oda': oda_info.get('is_oda', False),
                    'is_serviceable': oda_info.get('is_serviceable', True),
                    'oda_category': oda_info.get('category'),
                    'oda_charge_per_kg': oda_info.get('charge_per_kg', 0),
                    'oda_min_charge': oda_info.get('min_charge', 0)
                }
        
        return Response({'success': True, 'pincode': pincode, 'results': results})
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(["GET"])
def get_vendor_pincode_stats(request, vendor_name):
    """Get pincode statistics for a vendor"""
    try:
        vendor = VendorRate.objects.get(vendor_name__iexact=vendor_name)
        
        total_pincodes = VendorPincode.objects.filter(vendor=vendor).count()
        oda_pincodes = VendorPincode.objects.filter(vendor=vendor, is_oda=True).count()
        serviceable_pincodes = VendorPincode.objects.filter(vendor=vendor, is_serviceable=True).count()
        
        return Response({
            'success': True,
            'vendor': vendor_name,
            'total_pincodes': total_pincodes,
            'oda_pincodes': oda_pincodes,
            'serviceable_pincodes': serviceable_pincodes
        })
    except VendorRate.DoesNotExist:
        return Response({'success': False, 'error': f'Vendor "{vendor_name}" not found'}, status=404)
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=400)