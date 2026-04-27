from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from .models import (
    Vendor, 
    VendorRate, 
    VendorPincode, 
    RateHistory, 
    ZoneMaster, 
    B2BRate, 
    VendorServiceRate,
    BulkUploadLog
)


# ============================================
# VENDOR PINCODE INLINE (for VendorRate admin)
# ============================================

class VendorPincodeInline(admin.TabularInline):
    """Inline editor for vendor pincodes"""
    model = VendorPincode
    extra = 1
    fields = ['pincode', 'city', 'state', 'is_oda', 'oda_category', 'oda_charge_per_kg', 'oda_min_charge', 'is_serviceable']
    show_change_link = True
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('vendor')


# ============================================
# VENDOR RATE ADMIN
# ============================================

@admin.register(VendorRate)
class VendorRateAdmin(admin.ModelAdmin):
    """Admin interface for VendorRate model"""
    
    list_display = ['vendor_name', 'vendor_display', 'is_active', 'rates_count', 'charges_preview', 'created_at']
    list_filter = ['is_active', 'vendor_name', 'created_at']
    search_fields = ['vendor_name']
    readonly_fields = ['created_at', 'updated_at', 'updated_by', 'rates_json_preview', 'charges_json_preview']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('vendor_name', 'is_active')
        }),
        ('Rate Matrices', {
            'fields': ('rates', 'delhivery_6cft', 'delhivery_10cft'),
            'classes': ('wide',),
            'description': 'Zone to zone rate matrices. Format: {"from_zone": {"to_zone": rate}}'
        }),
        ('Charges & Settings', {
            'fields': ('charges',),
            'description': 'Additional charges like docket_charge, fsc, gst, min_freight, min_weight, oda_charge, etc.'
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at', 'updated_by'),
            'classes': ('collapse',)
        }),
        ('Preview', {
            'fields': ('rates_json_preview', 'charges_json_preview'),
            'classes': ('collapse',)
        })
    )
    
    inlines = [VendorPincodeInline]
    
    actions = ['activate_vendors', 'deactivate_vendors']
    
    def vendor_display(self, obj):
        """Display vendor with color coding"""
        colors = {
            'DELHIVERY': '#2563eb',
            'GATI': '#16a34a',
            'PD LOGISTICS': '#d97706',
            'RIVIGO': '#8b5cf6',
            'VXPRESS': '#dc2626',
        }
        color = colors.get(obj.vendor_name, '#64748b')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, obj.get_vendor_name_display()
        )
    vendor_display.short_description = 'Vendor'
    
    def rates_count(self, obj):
        """Count total rates in matrix"""
        try:
            count = 0
            for from_zone, to_zones in obj.rates.items():
                count += len(to_zones)
            return count
        except:
            return 0
    rates_count.short_description = 'Total Rates'
    
    def charges_preview(self, obj):
        """Preview charges"""
        charges = obj.charges or {}
        docket = charges.get('docket_charge', 'N/A')
        min_freight = charges.get('min_freight', 'N/A')
        return format_html(
            '<span style="font-size: 11px;">Docket: ₹{}<br/>Min: ₹{}</span>',
            docket, min_freight
        )
    charges_preview.short_description = 'Charges'
    
    def rates_json_preview(self, obj):
        """Pretty print rates JSON"""
        if obj.rates:
            import json
            return format_html('<pre style="max-height: 300px; overflow: auto;">{}</pre>', 
                              json.dumps(obj.rates, indent=2))
        return '-'
    rates_json_preview.short_description = 'Rates Preview'
    
    def charges_json_preview(self, obj):
        """Pretty print charges JSON"""
        if obj.charges:
            import json
            return format_html('<pre style="max-height: 300px; overflow: auto;">{}</pre>', 
                              json.dumps(obj.charges, indent=2))
        return '-'
    charges_json_preview.short_description = 'Charges Preview'
    
    def activate_vendors(self, request, queryset):
        queryset.update(is_active=True)
        self.message_user(request, f"{queryset.count()} vendors activated.")
    activate_vendors.short_description = "Activate selected vendors"
    
    def deactivate_vendors(self, request, queryset):
        queryset.update(is_active=False)
        self.message_user(request, f"{queryset.count()} vendors deactivated.")
    deactivate_vendors.short_description = "Deactivate selected vendors"
    
    def save_model(self, request, obj, form, change):
        obj.updated_by = request.user.username if request.user.is_authenticated else 'admin'
        super().save_model(request, obj, form, change)


# ============================================
# VENDOR PINCODE ADMIN
# ============================================

@admin.register(VendorPincode)
class VendorPincodeAdmin(admin.ModelAdmin):
    """Admin interface for VendorPincode model"""
    
    list_display = ['pincode', 'vendor_link', 'city', 'state', 'oda_status', 'oda_category_badge', 'oda_charge_display', 'is_serviceable']
    list_filter = ['vendor__vendor_name', 'is_oda', 'oda_category', 'is_serviceable']
    search_fields = ['pincode', 'city', 'state']
    readonly_fields = ['created_at', 'updated_at']
    
    list_per_page = 100
    
    fieldsets = (
        ('Pincode Information', {
            'fields': ('vendor', 'pincode', 'city', 'state')
        }),
        ('ODA Settings', {
            'fields': ('is_oda', 'oda_category', 'oda_charge_per_kg', 'oda_min_charge'),
            'description': 'ODA (Out of Delivery Area) charges configuration'
        }),
        ('Serviceability', {
            'fields': ('is_serviceable',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def vendor_link(self, obj):
        """Link to vendor admin"""
        url = reverse('admin:vendors_vendorrate_change', args=[obj.vendor.id])
        return format_html('<a href="{}">{}</a>', url, obj.vendor.vendor_name)
    vendor_link.short_description = 'Vendor'
    vendor_link.admin_order_field = 'vendor__vendor_name'
    
    def oda_status(self, obj):
        """Display ODA status with icon"""
        if obj.is_oda:
            return format_html('<span style="color: #dc2626;">🔴 ODA</span>')
        return format_html('<span style="color: #10b981;">🟢 Non-ODA</span>')
    oda_status.short_description = 'Status'
    
    def oda_category_badge(self, obj):
        """Display ODA category badge"""
        if not obj.is_oda:
            return '-'
        colors = {
            'A': '#10b981',
            'B': '#f59e0b',
            'C': '#ef4444',
            'D': '#8b5cf6',
        }
        color = colors.get(obj.oda_category, '#64748b')
        return format_html(
            '<span style="background: {}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">ODA {}</span>',
            color, obj.oda_category
        )
    oda_category_badge.short_description = 'Category'
    
    def oda_charge_display(self, obj):
        """Display ODA charge"""
        if obj.is_oda:
            return format_html(
                '<span style="font-weight: bold;">₹{}/kg<br/><span style="font-size: 10px;">Min ₹{}</span></span>',
                obj.oda_charge_per_kg, obj.oda_min_charge
            )
        return '-'
    oda_charge_display.short_description = 'ODA Charge'
    
    actions = ['mark_as_oda', 'mark_as_non_oda', 'export_selected']
    
    def mark_as_oda(self, request, queryset):
        queryset.update(is_oda=True)
        self.message_user(request, f"{queryset.count()} pincodes marked as ODA.")
    mark_as_oda.short_description = "Mark selected as ODA"
    
    def mark_as_non_oda(self, request, queryset):
        queryset.update(is_oda=False, oda_category='NONE', oda_charge_per_kg=0, oda_min_charge=0)
        self.message_user(request, f"{queryset.count()} pincodes marked as Non-ODA.")
    mark_as_non_oda.short_description = "Mark selected as Non-ODA"
    
    def export_selected(self, request, queryset):
        """Export selected pincodes to CSV"""
        import csv
        from django.http import HttpResponse
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="pincodes_export.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['pincode', 'city', 'state', 'is_oda', 'oda_category', 'oda_charge_per_kg', 'oda_min_charge'])
        
        for obj in queryset:
            writer.writerow([
                obj.pincode, obj.city, obj.state, 
                obj.is_oda, obj.oda_category, 
                obj.oda_charge_per_kg, obj.oda_min_charge
            ])
        
        return response
    export_selected.short_description = "Export selected to CSV"


# ============================================
# VENDOR ADMIN
# ============================================

@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    """Admin interface for Vendor model"""
    
    list_display = ['name', 'vendor_code', 'contact_person', 'contact_phone', 'vendor_type_badge', 'is_active']
    list_filter = ['is_active', 'vendor_type', 'state']
    search_fields = ['name', 'vendor_code', 'contact_person', 'contact_phone']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Company Information', {
            'fields': ('name', 'vendor_code', 'gstin', 'pan')
        }),
        ('Contact Details', {
            'fields': ('contact_person', 'contact_email', 'contact_phone', 'alternate_phone')
        }),
        ('Address', {
            'fields': ('address', 'city', 'state', 'pincode')
        }),
        ('Service Configuration', {
            'fields': ('vendor_type', 'serviceable_pincodes')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def vendor_type_badge(self, obj):
        """Display vendor type with badge"""
        colors = {
            'surface': '#10b981',
            'air': '#3b82f6',
            'express': '#f59e0b',
            'rail': '#8b5cf6',
            'all': '#64748b',
        }
        color = colors.get(obj.vendor_type, '#64748b')
        return format_html(
            '<span style="background: {}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">{}</span>',
            color, obj.get_vendor_type_display()
        )
    vendor_type_badge.short_description = 'Type'


# ============================================
# RATE HISTORY ADMIN
# ============================================

@admin.register(RateHistory)
class RateHistoryAdmin(admin.ModelAdmin):
    """Admin interface for RateHistory model"""
    
    list_display = ['vendor_link', 'updated_by', 'updated_at', 'has_changes']
    list_filter = ['vendor__vendor_name', 'updated_at']
    search_fields = ['vendor__vendor_name', 'updated_by']
    readonly_fields = ['vendor', 'old_rates', 'new_rates', 'old_charges', 'new_charges', 'updated_by', 'updated_at']
    
    def vendor_link(self, obj):
        url = reverse('admin:vendors_vendorrate_change', args=[obj.vendor.id])
        return format_html('<a href="{}">{}</a>', url, obj.vendor.vendor_name)
    vendor_link.short_description = 'Vendor'
    
    def has_changes(self, obj):
        """Check if rates changed"""
        if obj.old_rates != obj.new_rates:
            return format_html('<span style="color: #f59e0b;">📊 Rates Changed</span>')
        if obj.old_charges != obj.new_charges:
            return format_html('<span style="color: #3b82f6;">💰 Charges Changed</span>')
        return '-'
    has_changes.short_description = 'Changes'


# ============================================
# ZONE MASTER ADMIN
# ============================================

@admin.register(ZoneMaster)
class ZoneMasterAdmin(admin.ModelAdmin):
    """Admin interface for ZoneMaster model"""
    
    list_display = ['zone_code', 'zone_name', 'pincode_count', 'is_active']
    list_filter = ['is_active', 'zone_code']
    search_fields = ['zone_code', 'zone_name']
    
    def pincode_count(self, obj):
        return len(obj.pincodes) if obj.pincodes else 0
    pincode_count.short_description = 'Pincodes'


# ============================================
# B2B RATE ADMIN
# ============================================

@admin.register(B2BRate)
class B2BRateAdmin(admin.ModelAdmin):
    """Admin interface for B2BRate model"""
    
    list_display = ['from_zone', 'to_zone', 'rate_per_kg', 'mode_badge', 'min_freight', 'is_active']
    list_filter = ['mode', 'is_active', 'from_zone', 'to_zone']
    search_fields = ['from_zone', 'to_zone']
    
    def mode_badge(self, obj):
        colors = {
            'surface': '#10b981',
            'air': '#3b82f6',
            'express': '#f59e0b',
            'rail': '#8b5cf6',
        }
        color = colors.get(obj.mode, '#64748b')
        return format_html(
            '<span style="background: {}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">{}</span>',
            color, obj.get_mode_display()
        )
    mode_badge.short_description = 'Mode'


# ============================================
# VENDOR SERVICE RATE ADMIN
# ============================================

@admin.register(VendorServiceRate)
class VendorServiceRateAdmin(admin.ModelAdmin):
    """Admin interface for VendorServiceRate model"""
    
    list_display = ['vendor_link', 'service_type_badge', 'min_weight', 'max_weight', 'is_active']
    list_filter = ['service_type', 'is_active', 'vendor__vendor_name']
    search_fields = ['vendor__vendor_name']
    
    def vendor_link(self, obj):
        url = reverse('admin:vendors_vendorrate_change', args=[obj.vendor.id])
        return format_html('<a href="{}">{}</a>', url, obj.vendor.vendor_name)
    vendor_link.short_description = 'Vendor'
    
    def service_type_badge(self, obj):
        colors = {
            'surface': '#10b981',
            'air': '#3b82f6',
            'express': '#f59e0b',
            'rail': '#8b5cf6',
            'cft_6': '#d97706',
            'cft_10': '#dc2626',
        }
        color = colors.get(obj.service_type, '#64748b')
        return format_html(
            '<span style="background: {}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">{}</span>',
            color, obj.get_service_type_display()
        )
    service_type_badge.short_description = 'Service'


# ============================================
# BULK UPLOAD LOG ADMIN
# ============================================

@admin.register(BulkUploadLog)
class BulkUploadLogAdmin(admin.ModelAdmin):
    """Admin interface for BulkUploadLog model"""
    
    list_display = ['upload_type', 'vendor_link', 'file_name', 'total_records', 'success_records', 'failed_records', 'status_badge', 'created_at']
    list_filter = ['upload_type', 'status', 'created_at']
    search_fields = ['file_name', 'error_message']
    readonly_fields = ['created_at', 'completed_at']
    
    def vendor_link(self, obj):
        if obj.vendor:
            url = reverse('admin:vendors_vendorrate_change', args=[obj.vendor.id])
            return format_html('<a href="{}">{}</a>', url, obj.vendor.vendor_name)
        return '-'
    vendor_link.short_description = 'Vendor'
    
    def status_badge(self, obj):
        colors = {
            'pending': '#f59e0b',
            'processing': '#3b82f6',
            'completed': '#10b981',
            'failed': '#ef4444',
        }
        color = colors.get(obj.status, '#64748b')
        return format_html(
            '<span style="background: {}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">{}</span>',
            color, obj.status.upper()
        )
    status_badge.short_description = 'Status'


# ============================================
# SITE TITLE AND HEADER
# ============================================

admin.site.site_header = "Faith Cargo Logistics Admin"
admin.site.site_title = "Faith Cargo Admin Portal"
admin.site.index_title = "Welcome to Faith Cargo Logistics Management"