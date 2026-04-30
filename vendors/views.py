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
# HELPER FUNCTIONS
# ============================================

def get_zone_from_pincode(pincode):
    """Get zone from pincode using first digit mapping"""
    pincode_str = str(pincode).strip()
    first_digit = pincode_str[0] if pincode_str else '1'
    
    zone_map = {
        '1': 'N1', '2': 'N2', '3': 'N3', '4': 'N4',
        '5': 'C1', '6': 'C2',
        '7': 'W1', '8': 'W2',
        '9': 'S1'
    }
    
    if pincode_str.startswith('30'):
        return 'S2'
    elif pincode_str.startswith('31'):
        return 'S3'
    elif pincode_str.startswith('32'):
        return 'S4'
    elif pincode_str.startswith('10'):
        return 'E1'
    elif pincode_str.startswith('11'):
        return 'E2'
    elif pincode_str.startswith('12'):
        return 'NE1'
    elif pincode_str.startswith('13'):
        return 'NE2'
    elif pincode_str.startswith('14'):
        return 'NE3'
    
    # W3 zone mapping for pincodes starting with 38, 39
    if pincode_str.startswith('38') or pincode_str.startswith('39'):
        return 'W3'
    
    return zone_map.get(first_digit, 'N1')


def is_pincode_serviceable_for_vendor(vendor, pincode):
    """
    Check if pincode is serviceable for a vendor
    FIXED: All pincodes are serviceable for PD Logistics and related vendors
    """
    pincode_str = str(pincode).strip()
    vendor_name = vendor.vendor_name
    
    # SHIPSHOPY BLUE DART - serviceable only if in database with is_serviceable=True
    if vendor_name == 'SHIPSHOPY BLUE DART':
        pincode_obj = VendorPincode.objects.filter(
            vendor=vendor, 
            pincode=pincode_str,
            is_serviceable=True
        ).first()
        logger.info(f"Blue Dart serviceable check for {pincode_str}: {pincode_obj is not None}")
        return pincode_obj is not None
    
    # PD LOGISTICS - ALWAYS serviceable (all pincodes)
    if vendor_name == 'PD LOGISTICS':
        return True
    
    # SHIPSHOPY DELIVERY - uses PD LOGISTICS, always serviceable
    if vendor_name == 'SHIPSHOPY DELIVERY':
        return True
    
    # TRUCX variants - use PD LOGISTICS, always serviceable
    if vendor_name in ['TRUCX DLH Lite', 'TRUCX DLH Dense', 'TRUCX DLH Cargo']:
        return True
    
    # SHIVANI VX - uses VXPRESS, always serviceable
    if vendor_name == 'SHIVANI VX':
        return True
    
    # VXPRESS - always serviceable
    if vendor_name == 'VXPRESS':
        return True
    
    # RIVIGO - always serviceable
    if vendor_name == 'RIVIGO':
        return True
    
    # All other vendors (DELHIVERY, GATI) - Always serviceable
    return True


def check_oda_for_vendor(vendor, pincode):
    """
    Check if pincode is ODA for a vendor
    FIXED: ODA only applies if pincode is marked as ODA in database with is_oda=True
    """
    pincode_str = str(pincode).strip()
    vendor_name = vendor.vendor_name
    
    # First check if pincode is serviceable
    if not is_pincode_serviceable_for_vendor(vendor, pincode):
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
    
    # SHIPSHOPY BLUE DART - never ODA (only serviceable)
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
    
    # PD LOGISTICS - check if pincode is ODA in database
    if vendor_name == 'PD LOGISTICS':
        pincode_obj = VendorPincode.objects.filter(
            vendor=vendor, 
            pincode=pincode_str,
            is_oda=True
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
    
    # SHIPSHOPY DELIVERY - uses PD LOGISTICS pincodes (ODA applies same as PD)
    if vendor_name == 'SHIPSHOPY DELIVERY':
        pd_vendor = VendorRate.objects.filter(vendor_name='PD LOGISTICS').first()
        if pd_vendor:
            pincode_obj = VendorPincode.objects.filter(
                vendor=pd_vendor, 
                pincode=pincode_str,
                is_oda=True
            ).first()
            if pincode_obj and pincode_obj.is_oda:
                logger.info(f"✅ SHIPSHOPY DELIVERY: {pincode_str} is ODA via PD LOGISTICS")
                return {
                    'is_oda': True,
                    'is_serviceable': True,
                    'charge_per_kg': float(pincode_obj.oda_charge_per_kg),
                    'min_charge': float(pincode_obj.oda_min_charge),
                    'category': pincode_obj.oda_category,
                    'city': pincode_obj.city or '',
                    'state': pincode_obj.state or ''
                }
        logger.info(f"❌ SHIPSHOPY DELIVERY: {pincode_str} is NOT ODA")
        return {
            'is_oda': False,
            'is_serviceable': True,
            'charge_per_kg': 0,
            'min_charge': 0,
            'category': None,
            'city': '',
            'state': ''
        }
    
    # TRUCX variants - use PD LOGISTICS pincodes
    if vendor_name in ['TRUCX DLH Lite', 'TRUCX DLH Dense', 'TRUCX DLH Cargo']:
        pd_vendor = VendorRate.objects.filter(vendor_name='PD LOGISTICS').first()
        if pd_vendor:
            pincode_obj = VendorPincode.objects.filter(
                vendor=pd_vendor, 
                pincode=pincode_str,
                is_oda=True
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
            vendor=vendor, 
            pincode=pincode_str,
            is_oda=True
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
                vendor=vxpress_vendor, 
                pincode=pincode_str,
                is_oda=True
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
            vendor=vendor, 
            pincode=pincode_str,
            is_oda=True
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
    
    # For all other vendors - No ODA (DELHIVERY, GATI)
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
    
    # Check if vendor is serviceable
    if oda_info and not oda_info.get('is_serviceable', True):
        logger.info(f"Vendor {vendor.vendor_name} not serviceable for this pincode")
        return None
    
    rate_per_kg = 0
    display_cft_type = None
    
    vendor_name = vendor.vendor_name
    is_blue_dart = vendor_name == 'SHIPSHOPY BLUE DART'
    is_pd = vendor_name == 'PD LOGISTICS'
    is_rivigo = vendor_name == 'RIVIGO'
    is_trucx = vendor_name in ['TRUCX DLH Lite', 'TRUCX DLH Dense', 'TRUCX DLH Cargo']
    is_shipshopy_delivery = vendor_name == 'SHIPSHOPY DELIVERY'
    is_shivani_vx = vendor_name == 'SHIVANI VX'
    is_vxpress = vendor_name == 'VXPRESS'
    is_delhivery = vendor_name == 'DELHIVERY'
    is_gati = vendor_name == 'GATI'
    
    # Get appropriate rates
    if is_pd:
        # PD Logistics - ONLY CFT rates
        if cft_type == '6cft':
            rates = vendor.delhivery_6cft or {}
            rate_per_kg = rates.get(from_zone, {}).get(to_zone, 0)
            display_cft_type = '6 CFT'
        elif cft_type == '10cft':
            rates = vendor.delhivery_10cft or {}
            rate_per_kg = rates.get(from_zone, {}).get(to_zone, 0)
            display_cft_type = '10 CFT'
        else:
            # PD Logistics does NOT use standard rates
            logger.info(f"PD Logistics: skipping standard rate calculation")
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
    
    elif is_delhivery:
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
            logger.warning(f"No rate found for {vendor_name} {cft_type} from {from_zone} to {to_zone}")
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
    
    # Get divisor
    divisor = charges.get('divisor', 5000)
    
    # Calculate volumetric weight
    volumetric_weight = volume_cft * (divisor / 10) if volume_cft > 0 else 0
    effective_weight = max(weight, volumetric_weight, min_weight)
    
    # Calculate base freight
    base_freight = effective_weight * rate_per_kg
    
    # Fuel surcharge
    fsc_amount = base_freight * (fsc_percent / 100)
    
    # ODA charges - ONLY if is_oda is True from database
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
        logger.info(f"✅ ODA APPLIED for {vendor_name}: ₹{oda_charge} ({oda_category})")
    else:
        logger.info(f"❌ NO ODA for {vendor_name}")
    
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
    """Complete vendor rate management - MANUAL RESPONSE"""
    
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
            import traceback
            print(f"ERROR in manage_vendor_rate GET: {traceback.format_exc()}")
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
                        return Response({
                            'success': True,
                            'data': serializer.data
                        })
                    except VendorPincode.DoesNotExist:
                        return Response({
                            'success': False,
                            'error': f'Pincode {pincode} not found for {vendor_name}'
                        }, status=404)
                else:
                    pincodes = VendorPincode.objects.filter(vendor=vendor)
                    
                    if pincodes.count() == 0:
                        return Response({
                            'success': True,
                            'vendor': vendor_name,
                            'count': 0,
                            'data': [],
                            'message': f'No pincodes found for {vendor_name}'
                        })
                    
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
                return Response({
                    'success': False,
                    'error': f'Vendor "{vendor_name}" not found',
                    'available_vendors': list(VendorRate.objects.filter(is_active=True).values_list('vendor_name', flat=True))
                }, status=404)
            except Exception as e:
                logger.error(f"Error in manage_vendor_pincodes GET: {str(e)}")
                return Response({
                    'success': False,
                    'error': str(e)
                }, status=500)
        else:
            all_pincodes = VendorPincode.objects.all().select_related('vendor')
            serializer = VendorPincodeSerializer(all_pincodes, many=True)
            return Response({
                'success': True,
                'count': all_pincodes.count(),
                'data': serializer.data
            })
    
    elif request.method == "POST":
        try:
            vendor = VendorRate.objects.get(vendor_name=vendor_name)
            data = request.data
            data['vendor'] = vendor.id
            
            serializer = VendorPincodeSerializer(data=data)
            if serializer.is_valid():
                serializer.save()
                return Response({
                    'success': True,
                    'data': serializer.data
                }, status=201)
            return Response({
                'success': False,
                'errors': serializer.errors
            }, status=400)
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
                return Response({
                    'success': True,
                    'data': serializer.data
                })
            return Response({
                'success': False,
                'errors': serializer.errors
            }, status=400)
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
                'success': True,
                'pincode': pincode_str,
                'vendor': vendor_name,
                'is_oda': False,
                'is_serviceable': False,
                'oda_category': None,
                'oda_charge_per_kg': 0,
                'oda_min_charge': 0,
                'message': f'Pincode {pincode_str} is not serviceable for {vendor_name}'
            })
        
        oda_info = check_oda_for_vendor(vendor, pincode_str)
        
        return Response({
            'success': True,
            'pincode': pincode_str,
            'vendor': vendor_name,
            'is_oda': oda_info.get('is_oda', False),
            'is_serviceable': oda_info.get('is_serviceable', True),
            'oda_category': oda_info.get('category'),
            'oda_charge_per_kg': oda_info.get('charge_per_kg', 0),
            'oda_min_charge': oda_info.get('min_charge', 0),
            'city': oda_info.get('city', ''),
            'state': oda_info.get('state', '')
        })
            
    except VendorRate.DoesNotExist:
        logger.error(f"Vendor not found: {vendor_name}")
        return Response({
            'success': False,
            'error': f'Vendor "{vendor_name}" not found'
        }, status=404)
    except Exception as e:
        logger.error(f"Error in check_oda_status: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)


# ============================================
# CHECK ODA FOR MULTIPLE VENDORS
# ============================================

@api_view(["GET"])
def check_oda_all_vendors(request):
    """Check ODA status for a pincode across all vendors"""
    pincode = request.GET.get('pincode', '').strip()
    
    if not pincode or len(pincode) != 6:
        return Response({
            'success': False,
            'error': 'Invalid pincode format. Please provide a 6-digit pincode.'
        }, status=400)
    
    try:
        vendors = VendorRate.objects.filter(is_active=True)
        results = {}
        
        for vendor in vendors:
            if not is_pincode_serviceable_for_vendor(vendor, pincode):
                results[vendor.vendor_name] = {
                    'is_oda': False,
                    'is_serviceable': False,
                    'oda_category': None,
                    'oda_charge_per_kg': 0,
                    'oda_min_charge': 0
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
        
        return Response({
            'success': True,
            'pincode': pincode,
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
        
        category_stats = {}
        for category in ['A', 'B', 'C', 'D']:
            count = VendorPincode.objects.filter(
                vendor=vendor, 
                is_oda=True, 
                oda_category=category
            ).count()
            if count > 0:
                rate_info = {'A': 2, 'B': 4, 'C': 7, 'D': 10}
                category_stats[category] = {
                    'count': count,
                    'charge_per_kg': rate_info[category],
                    'min_charge': rate_info[category] * 100
                }
        
        return Response({
            'success': True,
            'vendor': vendor_name,
            'total_pincodes': total_pincodes,
            'oda_pincodes': oda_pincodes,
            'non_oda_pincodes': total_pincodes - oda_pincodes,
            'serviceable_pincodes': serviceable_pincodes,
            'category_stats': category_stats
        })
        
    except VendorRate.DoesNotExist:
        return Response({
            'success': False,
            'error': f'Vendor "{vendor_name}" not found'
        }, status=404)
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=400)


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
            
            if is_oda and oda_category in ['A', 'B', 'C', 'D']:
                category_rates = {'A': 2, 'B': 4, 'C': 7, 'D': 10}
                if oda_charge == 0:
                    oda_charge = category_rates[oda_category]
                if oda_min == 0:
                    oda_min = oda_charge * 100
                oda_categories_used[oda_category] += 1
            
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


# ============================================
# DOWNLOAD PINCODE TEMPLATE
# ============================================

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


# ============================================
# VENDOR RATE CALCULATOR
# ============================================

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
        
        volume_cft = (length * width * height) / (30.48 * 30.48 * 30.48) if length and width and height else 0
        
        from_zone = get_zone_from_pincode(origin_pincode)
        to_zone = get_zone_from_pincode(destination_pincode)
        
        logger.info(f"Calculating rates: {origin_pincode}({from_zone}) → {destination_pincode}({to_zone}), Weight: {weight}kg")
        
        vendors = VendorRate.objects.filter(is_active=True)
        results = []
        
        for vendor in vendors:
            # Check serviceability
            if not is_pincode_serviceable_for_vendor(vendor, destination_pincode):
                logger.info(f"Skipping {vendor.vendor_name} - not serviceable for {destination_pincode}")
                continue
            
            # Get ODA info
            oda_info = check_oda_for_vendor(vendor, destination_pincode)
            
            vendor_name = vendor.vendor_name
            
            # PD LOGISTICS - only 6CFT and 10CFT, NO Standard
            if vendor_name == 'PD LOGISTICS':
                # 6 CFT
                rate_6cft = calculate_vendor_freight(vendor, from_zone, to_zone, weight, volume_cft, '6cft', oda_info)
                if rate_6cft and rate_6cft.get('rate_per_kg', 0) > 0:
                    results.append(rate_6cft)
                
                # 10 CFT
                rate_10cft = calculate_vendor_freight(vendor, from_zone, to_zone, weight, volume_cft, '10cft', oda_info)
                if rate_10cft and rate_10cft.get('rate_per_kg', 0) > 0:
                    results.append(rate_10cft)
            
            # RIVIGO - has both CFT and Standard
            elif vendor_name == 'RIVIGO':
                # 6 CFT
                rate_6cft = calculate_vendor_freight(vendor, from_zone, to_zone, weight, volume_cft, '6cft', oda_info)
                if rate_6cft and rate_6cft.get('rate_per_kg', 0) > 0:
                    results.append(rate_6cft)
                
                # 10 CFT
                rate_10cft = calculate_vendor_freight(vendor, from_zone, to_zone, weight, volume_cft, '10cft', oda_info)
                if rate_10cft and rate_10cft.get('rate_per_kg', 0) > 0:
                    results.append(rate_10cft)
                
                # Standard
                rate_standard = calculate_vendor_freight(vendor, from_zone, to_zone, weight, volume_cft, 'standard', oda_info)
                if rate_standard and rate_standard.get('rate_per_kg', 0) > 0:
                    results.append(rate_standard)
            
            # Other vendors - standard rates only
            else:
                rate = calculate_vendor_freight(vendor, from_zone, to_zone, weight, volume_cft, 'standard', oda_info)
                if rate and rate.get('rate_per_kg', 0) > 0:
                    results.append(rate)
        
        results.sort(key=lambda x: x.get('total_freight', 999999))
        
        return Response({
            'success': True,
            'origin_pincode': origin_pincode,
            'destination_pincode': destination_pincode,
            'from_zone': from_zone,
            'to_zone': to_zone,
            'weight': weight,
            'vendor_rates': results,
            'best_vendor': results[0]['vendor_name'] if results else None,
            'best_rate': results[0]['total_freight'] if results else 0,
            'calculated_at': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error in calculate_all_vendor_rates: {str(e)}")
        return Response({"error": str(e)}, status=400)


# ============================================
# OTHER ENDPOINTS (keep as is)
# ============================================

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
        
        volume_cft = (length * width * height) / (30.48 * 30.48 * 30.48)
        
        from_zone = get_zone_from_pincode(origin_pincode)
        to_zone = get_zone_from_pincode(destination_pincode)
        
        vendors = VendorRate.objects.filter(is_active=True)
        comparison = []
        
        for vendor in vendors:
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
        'message': 'API is working!',
        'timestamp': datetime.now().isoformat(),
        'vendors_count': VendorRate.objects.count(),
        'pincodes_count': VendorPincode.objects.count()
    })


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