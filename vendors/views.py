from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from .models import VendorRate, Vendor, RateHistory, ZoneMaster, B2BRate, VendorServiceRate
from .serializers import (
    VendorRateSerializer, VendorSerializer, RateHistorySerializer,
    ZoneMasterSerializer, B2BRateSerializer, VendorServiceRateSerializer,
    VendorRateCalculatorSerializer, BulkRateUploadSerializer, VendorComparisonSerializer
)
import json
from datetime import datetime

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
        # Create new vendor rate
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
        # Update existing vendor rate
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
# OLD FUNCTIONS (kept for backward compatibility)
# ============================================

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


# ============================================
# VENDOR RATE CALCULATOR - COMPARE ALL VENDORS
# ============================================

@api_view(["POST"])
def calculate_all_vendor_rates(request):
    """Calculate rates for all vendors based on pincode, weight, dimensions"""
    try:
        data = request.data
        origin_pincode = data.get('origin_pincode')
        destination_pincode = data.get('destination_pincode')
        weight = float(data.get('weight', 0))
        length = float(data.get('length', 0))
        width = float(data.get('width', 0))
        height = float(data.get('height', 0))
        
        # Calculate volumetric weight (CFT to kg conversion)
        volume_cft = (length * width * height) / (30.48 * 30.48 * 30.48)
        volumetric_weight = volume_cft * 10  # Approx 10 kg per CFT
        charged_weight = max(weight, volumetric_weight)
        
        # Get zones from pincode
        from_zone = get_zone_from_pincode(origin_pincode)
        to_zone = get_zone_from_pincode(destination_pincode)
        
        # Get all active vendors
        vendors = VendorRate.objects.filter(is_active=True)
        
        results = []
        for vendor in vendors:
            rate_info = calculate_vendor_freight(vendor, from_zone, to_zone, charged_weight, volume_cft)
            results.append(rate_info)
        
        # Sort by total freight
        results.sort(key=lambda x: x.get('total_freight', 999999))
        
        return Response({
            'origin_pincode': origin_pincode,
            'destination_pincode': destination_pincode,
            'from_zone': from_zone,
            'to_zone': to_zone,
            'weight': weight,
            'volumetric_weight': round(volumetric_weight, 2),
            'charged_weight': round(charged_weight, 2),
            'volume_cft': round(volume_cft, 2),
            'vendor_rates': results,
            'best_vendor': results[0]['vendor_name'] if results else None,
            'best_rate': results[0]['total_freight'] if results else 0,
            'calculated_at': datetime.now().isoformat()
        })
        
    except Exception as e:
        return Response({"error": str(e)}, status=400)


def get_zone_from_pincode(pincode):
    """Get zone from pincode"""
    try:
        zone_obj = ZoneMaster.objects.filter(pincodes__contains=[str(pincode)]).first()
        if zone_obj:
            return zone_obj.zone_code
        
        # Default zone mapping based on first digit
        first_digit = str(pincode)[0]
        zone_map = {
            '1': 'N1', '2': 'N2', '3': 'N3',
            '4': 'C1', '5': 'W1', '6': 'W2',
            '7': 'S1', '8': 'S2', '9': 'E1',
            '0': 'NE1'
        }
        return zone_map.get(first_digit, 'NE2')
    except:
        return 'N1'


def calculate_vendor_freight(vendor, from_zone, to_zone, weight, volume_cft):
    """Calculate freight for a single vendor"""
    
    rate_per_kg = 0
    total_freight = 0
    cft_type = None
    
    # Delhivery special handling for CFT
    if vendor.vendor_name == 'DELHIVERY':
        if volume_cft <= 6:
            cft_type = '6cft'
            rate_per_kg = vendor.delhivery_6cft.get(from_zone, {}).get(to_zone, 0)
        else:
            cft_type = '10cft'
            rate_per_kg = vendor.delhivery_10cft.get(from_zone, {}).get(to_zone, 0)
    
    # If no CFT rate found, use standard rates
    if rate_per_kg == 0:
        rate_per_kg = vendor.rates.get(from_zone, {}).get(to_zone, 0)
    
    # Calculate base freight
    base_freight = weight * rate_per_kg
    
    # Get charges
    charges = vendor.charges
    docket_charge = float(charges.get('docket_charge', 100))
    fsc_percent = float(str(charges.get('fsc', '10%')).replace('%', ''))
    fsc_amount = base_freight * (fsc_percent / 100)
    gst_percent = float(str(charges.get('gst', '18%')).replace('%', ''))
    gst_amount = base_freight * (gst_percent / 100)
    fov_charge = float(charges.get('fov', 75))
    min_freight = float(charges.get('min_freight', 650))
    
    total_freight = base_freight + fsc_amount + gst_amount + docket_charge + fov_charge
    total_freight = max(total_freight, min_freight)
    
    return {
        'vendor_id': vendor.id,
        'vendor_name': vendor.vendor_name,
        'from_zone': from_zone,
        'to_zone': to_zone,
        'rate_per_kg': round(rate_per_kg, 2),
        'cft_type': cft_type,
        'base_freight': round(base_freight, 2),
        'docket_charge': docket_charge,
        'fsc_percent': fsc_percent,
        'fsc_amount': round(fsc_amount, 2),
        'gst_percent': gst_percent,
        'gst_amount': round(gst_amount, 2),
        'fov_charge': fov_charge,
        'min_freight': min_freight,
        'total_freight': round(total_freight, 2)
    }


# ============================================
# VENDOR COMPARISON
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
        volumetric_weight = volume_cft * 10
        charged_weight = max(weight, volumetric_weight)
        
        from_zone = get_zone_from_pincode(origin_pincode)
        to_zone = get_zone_from_pincode(destination_pincode)
        
        vendors = VendorRate.objects.filter(is_active=True)
        
        comparison = []
        for vendor in vendors:
            rate_info = calculate_vendor_freight(vendor, from_zone, to_zone, charged_weight, volume_cft)
            comparison.append({
                'vendor': vendor.vendor_name,
                'rate_per_kg': rate_info['rate_per_kg'],
                'total_freight': rate_info['total_freight'],
                'breakdown': rate_info
            })
        
        comparison.sort(key=lambda x: x['total_freight'])
        
        return Response({
            'origin': origin_pincode,
            'destination': destination_pincode,
            'weight': weight,
            'charged_weight': round(charged_weight, 2),
            'comparison': comparison,
            'recommended': comparison[0] if comparison else None
        })
        
    except Exception as e:
        return Response({"error": str(e)}, status=400)


# ============================================
# BULK RATE UPLOAD
# ============================================

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
            # Merge with existing
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


# ============================================
# RATE HISTORY
# ============================================

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


# ============================================
# ZONE MANAGEMENT
# ============================================

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


# ============================================
# B2B RATE MANAGEMENT
# ============================================

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


# ============================================
# VENDOR SERVICE RATES
# ============================================

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