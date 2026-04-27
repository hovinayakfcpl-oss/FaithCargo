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
# HELPER FUNCTIONS (IMPROVED)
# ============================================

def get_zone_from_pincode(pincode):
    """Get zone from pincode - FIXED JSON query"""
    pincode_str = str(pincode).strip()
    
    try:
        # Check in ZoneMaster - loop through since JSON field
        all_zones = ZoneMaster.objects.all()
        for zone in all_zones:
            pincodes_list = zone.pincodes if isinstance(zone.pincodes, list) else []
            if pincode_str in pincodes_list:
                return zone.zone_code
        
        # Default zone mapping based on first digit (17 zones)
        first_digit = pincode_str[0] if pincode_str else '1'
        second_digit = pincode_str[1] if len(pincode_str) > 1 else '0'
        
        # Complete zone mapping for 17 zones
        zone_map = {
            '1': 'N1', '2': 'N2', '3': 'N3', '4': 'N4',
            '5': 'C1', '6': 'C2',
            '7': 'W1', '8': 'W2',
            '9': 'S1', '30': 'S2', '31': 'S3', '32': 'S4',
            '10': 'E1', '11': 'E2',
            '12': 'NE1', '13': 'NE2', '14': 'NE3'
        }
        
        key = second_digit if first_digit == '3' else first_digit
        return zone_map.get(str(key), 'N1')
    except Exception as e:
        logger.error(f"Error getting zone for {pincode_str}: {e}")
        return 'N1'


def is_pincode_serviceable_for_vendor(vendor, pincode):
    """
    Check if pincode is serviceable for a vendor
    - For SHIPSHOPY BLUE DART: Only serviceable if pincode exists in VendorPincode with is_serviceable=True
    - For PD LOGISTICS: Serviceable only for ODA pincodes
    - For other vendors: Always serviceable (no restriction)
    """
    pincode_str = str(pincode).strip()
    vendor_name = vendor.vendor_name
    
    # SHIPSHOPY BLUE DART - Only serviceable if pincode in database
    if vendor_name == 'SHIPSHOPY BLUE DART':
        pincode_obj = VendorPincode.objects.filter(
            vendor=vendor, 
            pincode=pincode_str,
            is_serviceable=True
        ).first()
        return pincode_obj is not None
    
    # PD LOGISTICS - Only serviceable for ODA pincodes
    elif vendor_name == 'PD LOGISTICS':
        pincode_obj = VendorPincode.objects.filter(
            vendor=vendor, 
            pincode=pincode_str,
            is_oda=True
        ).first()
        return pincode_obj is not None
    
    # All other vendors - Always serviceable
    else:
        return True


def check_oda_for_vendor(vendor, pincode):
    """Check if pincode is ODA for a vendor - ENHANCED with serviceability check"""
    pincode_str = str(pincode).strip()
    vendor_name = vendor.vendor_name
    
    # First check if pincode is serviceable for this vendor
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
    
    try:
        # Check specific pincode in database
        pincode_obj = VendorPincode.objects.filter(
            vendor=vendor, 
            pincode=pincode_str
        ).first()
        
        if pincode_obj and pincode_obj.is_oda:
            logger.info(f"ODA found for {vendor.vendor_name} - {pincode_str}: Category {pincode_obj.oda_category}, Charge: ₹{pincode_obj.oda_charge_per_kg}/kg, Min: ₹{pincode_obj.oda_min_charge}")
            return {
                'is_oda': True,
                'is_serviceable': True,
                'charge_per_kg': float(pincode_obj.oda_charge_per_kg),
                'min_charge': float(pincode_obj.oda_min_charge),
                'category': pincode_obj.oda_category,
                'city': pincode_obj.city or '',
                'state': pincode_obj.state or ''
            }
        
        # For SHIPSHOPY BLUE DART - serviceable but no ODA
        if vendor_name == 'SHIPSHOPY BLUE DART' and pincode_obj and pincode_obj.is_serviceable:
            logger.info(f"Serviceable (non-ODA) for {vendor_name} - {pincode_str}")
            return {
                'is_oda': False,
                'is_serviceable': True,
                'charge_per_kg': 0,
                'min_charge': 0,
                'category': None,
                'city': pincode_obj.city or '',
                'state': pincode_obj.state or ''
            }
        
        # Check vendor's default ODA charge from charges JSON
        charges = vendor.charges or {}
        default_oda_charge = float(charges.get('oda_charge', 0))
        
        if default_oda_charge > 0:
            logger.info(f"Default ODA for {vendor.vendor_name}: ₹{default_oda_charge}/kg")
            return {
                'is_oda': True,
                'is_serviceable': True,
                'charge_per_kg': default_oda_charge,
                'min_charge': default_oda_charge * 100,
                'category': 'DEFAULT',
                'city': '',
                'state': ''
            }
            
    except Exception as e:
        logger.error(f"Error checking ODA for {vendor.vendor_name}, {pincode_str}: {e}")
    
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
    """Calculate freight for a single vendor with CFT and ODA support - IMPROVED"""
    
    # Check if vendor is serviceable for this route
    if oda_info and not oda_info.get('is_serviceable', True):
        logger.info(f"Vendor {vendor.vendor_name} not serviceable for this pincode")
        return None
    
    rate_per_kg = 0
    display_cft_type = None
    
    # Get rates based on vendor name
    vendor_name = vendor.vendor_name
    
    # SHIPSHOPY vendors handling
    if vendor_name == 'SHIPSHOPY BLUE DART':
        # Blue Dart rates
        rates = vendor.rates or {}
        rate_per_kg = rates.get(from_zone, {}).get(to_zone, 0)
        display_cft_type = 'Standard'
        
    elif vendor_name == 'SHIPSHOPY DELIVERY':
        # Delhivery B2B-6 rates
        rates = vendor.rates or {}
        rate_per_kg = rates.get(from_zone, {}).get(to_zone, 0)
        display_cft_type = 'Standard'
        
    elif vendor_name == 'DELHIVERY':
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
    elif vendor_name == 'PD LOGISTICS':
        # PD LOGISTICS uses 6CFT and 10CFT rates
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
        fallback_rates = {
            'DELHIVERY': 28, 'GATI': 25, 'PD LOGISTICS': 22,
            'RIVIGO': 24, 'VXPRESS': 20,
            'SHIPSHOPY BLUE DART': 25, 'SHIPSHOPY DELIVERY': 22
        }
        rate_per_kg = fallback_rates.get(vendor_name, 22)
        logger.info(f"Using fallback rate for {vendor_name}: ₹{rate_per_kg}/kg")
    
    # Get charges with defaults
    charges = vendor.charges or {}
    docket_charge = float(charges.get('docket_charge', 100))
    fsc_percent = float(str(charges.get('fsc', '10%')).replace('%', ''))
    gst_percent = float(str(charges.get('gst', '18%')).replace('%', ''))
    fov_charge = float(charges.get('fov', 75))
    min_freight = float(charges.get('min_freight', 350))
    min_weight = float(charges.get('min_weight', 20))
    
    # Get vendor-specific divisor
    divisor = charges.get('divisor', 5000)
    
    # Calculate volumetric weight based on divisor
    volumetric_weight = volume_cft * (divisor / 10) if volume_cft > 0 else 0
    effective_weight = max(weight, volumetric_weight, min_weight)
    
    # Calculate base freight
    base_freight = effective_weight * rate_per_kg
    
    # Fuel surcharge
    fsc_amount = base_freight * (fsc_percent / 100)
    
    # ODA charges
    oda_charge = 0
    oda_applicable = False
    oda_category = None
    
    if oda_info and oda_info.get('is_oda'):
        oda_applicable = True
        oda_category = oda_info.get('category')
        oda_charge_per_kg = oda_info.get('charge_per_kg', 0)
        oda_min = oda_info.get('min_charge', 0)
        oda_calc = effective_weight * oda_charge_per_kg
        oda_charge = max(oda_calc, oda_min)
        logger.info(f"ODA Charge for {vendor_name}: ₹{oda_charge} ({oda_category})")
    
    # GST (applied on base + FSC + docket + ODA)
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
    """Complete vendor rate management - GET, POST, PUT, DELETE"""
    
    if request.method == "GET":
        if vendor_name:
            try:
                obj = VendorRate.objects.get(vendor_name=vendor_name)
                serializer = VendorRateSerializer(obj)
                return Response(serializer.data)
            except VendorRate.DoesNotExist:
                return Response({"error": "Vendor not found"}, status=404)
        else:
            all_vendors = VendorRate.objects.all()
            serializer = VendorRateSerializer(all_vendors, many=True)
            return Response(serializer.data)
    
    elif request.method == "POST":
        try:
            data = request.data
            serializer = VendorRateSerializer(data=data)
            if serializer.is_valid():
                serializer.save(updated_by=request.user.username if request.user.is_authenticated else 'admin')
                return Response(serializer.data, status=201)
            return Response(serializer.errors, status=400)
        except Exception as e:
            return Response({"error": str(e)}, status=400)
    
    elif request.method == "PUT":
        try:
            obj = VendorRate.objects.get(vendor_name=vendor_name)
            data = request.data
            
            # Save old data for history
            old_rates = obj.rates
            old_charges = obj.charges
            
            # Update fields
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
            
            # Save to history
            RateHistory.objects.create(
                vendor=obj,
                old_rates=old_rates,
                new_rates=obj.rates,
                old_charges=old_charges,
                new_charges=obj.charges,
                updated_by=obj.updated_by
            )
            
            serializer = VendorRateSerializer(obj)
            return Response(serializer.data)
        except VendorRate.DoesNotExist:
            return Response({"error": "Vendor not found"}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=400)
    
    elif request.method == "DELETE":
        try:
            obj = VendorRate.objects.get(vendor_name=vendor_name)
            obj.delete()
            return Response({"message": f"{vendor_name} deleted successfully"})
        except VendorRate.DoesNotExist:
            return Response({"error": "Vendor not found"}, status=404)


# ============================================
# VENDOR PINCODE MANAGEMENT
# ============================================

@api_view(["GET", "POST", "PUT", "DELETE"])
def manage_vendor_pincodes(request, vendor_name=None, pincode=None):
    """Manage vendor pincodes - GET, POST, PUT, DELETE"""
    
    if request.method == "GET":
        if vendor_name:
            try:
                # Case-insensitive vendor lookup
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
                    
                    # If no pincodes, return empty list
                    if pincodes.count() == 0:
                        return Response({
                            'success': True,
                            'vendor': vendor_name,
                            'count': 0,
                            'data': [],
                            'message': f'No pincodes found for {vendor_name}'
                        })
                    
                    # Add pagination for large datasets
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
        
        # Check serviceability first
        if not is_pincode_serviceable_for_vendor(vendor, pincode_str):
            logger.info(f"Pincode {pincode_str} NOT serviceable for {vendor_name}")
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
        
        pincode_obj = VendorPincode.objects.filter(vendor=vendor, pincode=pincode_str).first()
        
        if pincode_obj and pincode_obj.is_oda:
            logger.info(f"ODA check: {vendor_name} - {pincode_str} = YES (Category {pincode_obj.oda_category}, Charge: ₹{pincode_obj.oda_charge_per_kg}/kg, Min: ₹{pincode_obj.oda_min_charge})")
            return Response({
                'success': True,
                'pincode': pincode_str,
                'vendor': vendor_name,
                'is_oda': True,
                'is_serviceable': True,
                'oda_category': pincode_obj.oda_category,
                'oda_charge_per_kg': float(pincode_obj.oda_charge_per_kg),
                'oda_min_charge': float(pincode_obj.oda_min_charge),
                'city': pincode_obj.city or '',
                'state': pincode_obj.state or ''
            })
        else:
            logger.info(f"ODA check: {vendor_name} - {pincode_str} = NO")
            
            # Check vendor's default ODA
            charges = vendor.charges or {}
            default_oda = float(charges.get('oda_charge', 0))
            
            return Response({
                'success': True,
                'pincode': pincode_str,
                'vendor': vendor_name,
                'is_oda': default_oda > 0,
                'is_serviceable': True,
                'oda_category': 'DEFAULT' if default_oda > 0 else None,
                'oda_charge_per_kg': default_oda,
                'oda_min_charge': default_oda * 100 if default_oda > 0 else 0,
                'city': pincode_obj.city if pincode_obj else '',
                'state': pincode_obj.state if pincode_obj else ''
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
            # Check serviceability first
            if not is_pincode_serviceable_for_vendor(vendor, pincode):
                results[vendor.vendor_name] = {
                    'is_oda': False,
                    'is_serviceable': False,
                    'oda_category': None,
                    'oda_charge_per_kg': 0,
                    'oda_min_charge': 0,
                    'message': 'Not serviceable'
                }
                continue
            
            pincode_obj = VendorPincode.objects.filter(vendor=vendor, pincode=pincode).first()
            
            if pincode_obj and pincode_obj.is_oda:
                results[vendor.vendor_name] = {
                    'is_oda': True,
                    'is_serviceable': True,
                    'oda_category': pincode_obj.oda_category,
                    'oda_charge_per_kg': float(pincode_obj.oda_charge_per_kg),
                    'oda_min_charge': float(pincode_obj.oda_min_charge),
                    'city': pincode_obj.city or '',
                    'state': pincode_obj.state or ''
                }
            else:
                # Check vendor's default ODA
                charges = vendor.charges or {}
                default_oda = float(charges.get('oda_charge', 0))
                
                results[vendor.vendor_name] = {
                    'is_oda': default_oda > 0,
                    'is_serviceable': True,
                    'oda_category': 'DEFAULT' if default_oda > 0 else None,
                    'oda_charge_per_kg': default_oda,
                    'oda_min_charge': default_oda * 100 if default_oda > 0 else 0,
                    'city': '',
                    'state': ''
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
        
        # Category-wise breakdown
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
    """
    Bulk upload pincodes for a vendor with ODA categories support
    Accepts JSON format: {"pincodes": [...], "replace_existing": true/false}
    """
    try:
        vendor = VendorRate.objects.get(vendor_name__iexact=vendor_name)
        pincodes_data = request.data.get('pincodes', [])
        replace_existing = request.data.get('replace_existing', False)
        
        if not pincodes_data:
            return Response({
                "success": False,
                "error": "No pincodes data provided. Please provide a list of pincodes."
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
            
            # Validate pincode
            if not pincode_str or len(pincode_str) != 6:
                errors.append(f"Invalid pincode: {pincode_str}")
                continue
            
            if not pincode_str.isdigit():
                errors.append(f"Pincode must contain only digits: {pincode_str}")
                continue
            
            # Get ODA category and validate
            oda_category = pincode_data.get('oda_category', '').upper()
            is_oda = pincode_data.get('is_oda', False)
            
            # Handle boolean conversion from string
            if isinstance(is_oda, str):
                is_oda = is_oda.lower() in ['true', '1', 'yes', 'y']
            
            # Set charges based on category if not provided
            oda_charge = float(pincode_data.get('oda_charge_per_kg', 0))
            oda_min = float(pincode_data.get('oda_min_charge', 0))
            
            # Auto-set charges based on category if not provided
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
            "error": f'Vendor "{vendor_name}" not found. Available vendors: {list(VendorRate.objects.filter(is_active=True).values_list("vendor_name", flat=True))}'
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
        
        # Create CSV content
        import csv
        from django.http import HttpResponse
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{vendor_name}_pincodes_template.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['pincode', 'city', 'state', 'is_oda', 'oda_category', 'oda_charge_per_kg', 'oda_min_charge', 'is_serviceable'])
        
        # Add sample rows based on vendor
        if 'BLUE DART' in vendor_name:
            samples = [
                ['212217', 'Allahabad', 'Uttar Pradesh', 'FALSE', '', '0', '0', 'TRUE'],
                ['122502', 'Gurgaon', 'Haryana', 'FALSE', '', '0', '0', 'TRUE'],
                ['110001', 'New Delhi', 'Delhi', 'FALSE', '', '0', '0', 'TRUE'],
            ]
        elif vendor_name == 'PD LOGISTICS':
            samples = [
                ['212217', 'Allahabad', 'Uttar Pradesh', 'TRUE', 'B', '4', '400', 'TRUE'],
                ['122502', 'Gurgaon', 'Haryana', 'TRUE', 'A', '2', '200', 'TRUE'],
                ['110001', 'New Delhi', 'Delhi', 'FALSE', '', '0', '0', 'TRUE'],
            ]
        elif 'DELIVERY' in vendor_name:
            samples = [
                ['212217', 'Allahabad', 'Uttar Pradesh', 'TRUE', 'B', '3', '500', 'TRUE'],
                ['122502', 'Gurgaon', 'Haryana', 'TRUE', 'A', '3', '500', 'TRUE'],
                ['110001', 'New Delhi', 'Delhi', 'FALSE', '', '0', '0', 'TRUE'],
            ]
        else:
            samples = [
                ['212217', 'Allahabad', 'Uttar Pradesh', 'TRUE', 'B', '4', '400', 'TRUE'],
                ['122502', 'Gurgaon', 'Haryana', 'TRUE', 'A', '2', '200', 'TRUE'],
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
        invoice_value = float(data.get('invoice_value', 0))
        mode = data.get('mode', 'Prepaid')
        
        # Validate pincodes
        if len(origin_pincode) != 6 or len(destination_pincode) != 6:
            return Response({"error": "Invalid pincode format"}, status=400)
        
        if weight <= 0:
            return Response({"error": "Weight must be greater than 0"}, status=400)
        
        # Calculate volume in CFT
        volume_cft = (length * width * height) / (30.48 * 30.48 * 30.48) if length and width and height else 0
        
        # Get zones from pincode
        from_zone = get_zone_from_pincode(origin_pincode)
        to_zone = get_zone_from_pincode(destination_pincode)
        
        logger.info(f"Calculating rates: {origin_pincode}({from_zone}) → {destination_pincode}({to_zone}), Weight: {weight}kg, Volume: {volume_cft} CFT")
        
        # Get all active vendors
        vendors = VendorRate.objects.filter(is_active=True)
        
        results = []
        for vendor in vendors:
            vendor_name = vendor.vendor_name
            
            # Check if pincode is serviceable first
            if not is_pincode_serviceable_for_vendor(vendor, destination_pincode):
                logger.info(f"Vendor {vendor_name} not serviceable for pincode {destination_pincode}")
                continue
            
            # Check ODA for destination
            oda_info = check_oda_for_vendor(vendor, destination_pincode)
            
            if oda_info.get('is_oda'):
                logger.info(f"ODA Applied for {vendor_name}: Category {oda_info.get('category')}, Charge: ₹{oda_info.get('charge_per_kg')}/kg, Min: ₹{oda_info.get('min_charge')}")
            
            # Calculate rates based on vendor type
            if vendor_name == 'DELHIVERY':
                # 6 CFT Rate
                rate_6cft = calculate_vendor_freight(vendor, from_zone, to_zone, weight, volume_cft, '6cft', oda_info)
                if rate_6cft and rate_6cft.get('rate_per_kg', 0) > 0:
                    results.append(rate_6cft)
                
                # 10 CFT Rate
                rate_10cft = calculate_vendor_freight(vendor, from_zone, to_zone, weight, volume_cft, '10cft', oda_info)
                if rate_10cft and rate_10cft.get('rate_per_kg', 0) > 0:
                    results.append(rate_10cft)
                
                # Standard Rate
                rate_standard = calculate_vendor_freight(vendor, from_zone, to_zone, weight, volume_cft, 'standard', oda_info)
                if rate_standard and rate_standard.get('rate_per_kg', 0) > 0:
                    results.append(rate_standard)
                    
            elif vendor_name in ['SHIPSHOPY BLUE DART', 'SHIPSHOPY DELIVERY', 'PD LOGISTICS']:
                # For PD LOGISTICS and Shipshopy vendors - 6CFT and 10CFT rates
                if vendor_name == 'PD LOGISTICS':
                    # 6 CFT Rate
                    rate_6cft = calculate_vendor_freight(vendor, from_zone, to_zone, weight, volume_cft, '6cft', oda_info)
                    if rate_6cft and rate_6cft.get('rate_per_kg', 0) > 0:
                        results.append(rate_6cft)
                    
                    # 10 CFT Rate
                    rate_10cft = calculate_vendor_freight(vendor, from_zone, to_zone, weight, volume_cft, '10cft', oda_info)
                    if rate_10cft and rate_10cft.get('rate_per_kg', 0) > 0:
                        results.append(rate_10cft)
                else:
                    # Shipshopy vendors - standard rate only
                    rate = calculate_vendor_freight(vendor, from_zone, to_zone, weight, volume_cft, 'standard', oda_info)
                    if rate and rate.get('rate_per_kg', 0) > 0:
                        results.append(rate)
                    
            else:
                # Other vendors - standard rate only
                rate = calculate_vendor_freight(vendor, from_zone, to_zone, weight, volume_cft, 'standard', oda_info)
                if rate and rate.get('rate_per_kg', 0) > 0:
                    results.append(rate)
        
        # Sort by total freight
        results.sort(key=lambda x: x.get('total_freight', 999999))
        
        # Calculate charged weight with divisor
        charged_weight = weight
        for vendor in vendors:
            charges = vendor.charges or {}
            divisor = charges.get('divisor', 5000)
            if divisor and volume_cft > 0:
                volumetric_weight = volume_cft * (divisor / 10)
                charged_weight = max(weight, volumetric_weight)
            break
        
        return Response({
            'success': True,
            'origin_pincode': origin_pincode,
            'destination_pincode': destination_pincode,
            'from_zone': from_zone,
            'to_zone': to_zone,
            'weight': weight,
            'charged_weight': round(charged_weight, 2),
            'volume_cft': round(volume_cft, 2),
            'vendor_rates': results,
            'best_vendor': results[0]['vendor_name'] if results else None,
            'best_cft_type': results[0].get('cft_type') if results else None,
            'best_rate': results[0]['total_freight'] if results else 0,
            'calculated_at': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error in calculate_all_vendor_rates: {str(e)}")
        return Response({"error": str(e)}, status=400)


# ============================================
# REMAINING FUNCTIONS (unchanged from previous)
# ============================================

@api_view(["POST"])
def compare_vendors(request):
    """Compare rates across multiple vendors for same route"""
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
            oda_info = check_oda_for_vendor(vendor, destination_pincode)
            rate_info = calculate_vendor_freight(vendor, from_zone, to_zone, weight, volume_cft, 'standard', oda_info)
            if rate_info:
                comparison.append({
                    'vendor': vendor.vendor_name,
                    'rate_per_kg': rate_info['rate_per_kg'],
                    'oda_applicable': rate_info['oda_applicable'],
                    'oda_charge': rate_info['oda_charge'],
                    'total_freight': rate_info['total_freight'],
                    'breakdown': rate_info
                })
        
        comparison.sort(key=lambda x: x['total_freight'])
        
        return Response({
            'origin': origin_pincode,
            'destination': destination_pincode,
            'weight': weight,
            'charged_weight': round(weight, 2),
            'comparison': comparison,
            'recommended': comparison[0] if comparison else None
        })
        
    except Exception as e:
        return Response({"error": str(e)}, status=400)


@api_view(["GET"])
def test_api(request):
    """Simple test endpoint to check if API is working"""
    return Response({
        'success': True,
        'message': 'API is working!',
        'timestamp': datetime.now().isoformat(),
        'vendors_count': VendorRate.objects.count(),
        'pincodes_count': VendorPincode.objects.count()
    })


@api_view(["POST"])
def update_vendor_rate(request, vendor_name):
    """Legacy function - use manage_vendor_rate with PUT instead"""
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
    """Get specific vendor rates"""
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
    """Bulk upload rates for a vendor"""
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
    """Get rate change history for a vendor"""
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
    """Manage zones - CRUD operations"""
    
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
    """Manage B2B rates"""
    
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
    """Manage vendor service-specific rates"""
    
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
    """Get location details for a pincode"""
    pincode_str = str(pincode).strip()
    
    try:
        # First check in our database
        pincode_obj = VendorPincode.objects.filter(pincode=pincode_str).first()
        if pincode_obj and pincode_obj.city and pincode_obj.state:
            return Response({
                'success': True,
                'pincode': pincode_str,
                'city': pincode_obj.city,
                'state': pincode_obj.state,
                'source': 'database'
            })
        
        # Fallback to external API
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