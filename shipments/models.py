from django.db import models
from datetime import datetime

# =====================================================
# 🔢 COUNTER (LR + AWB Generator)
# =====================================================
class Counter(models.Model):
    id = models.IntegerField(primary_key=True, default=1)
    lr_number = models.BigIntegerField(default=200000)
    awb_number = models.BigIntegerField(default=30000000)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Counter - LR: {self.lr_number}, AWB: {self.awb_number}"

    class Meta:
        db_table = 'counters'


# =====================================================
# 📍 LOCATION (Pickup + Delivery reusable)
# =====================================================
class Location(models.Model):
    TYPE_CHOICES = (
        ("pickup", "Pickup"),
        ("delivery", "Delivery"),
    )

    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    name = models.CharField(max_length=200)
    contact = models.CharField(max_length=15)
    address = models.TextField()
    pincode = models.CharField(max_length=6)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    gstin = models.CharField(max_length=20, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.pincode}) - {self.type}"

    class Meta:
        db_table = 'locations'
        indexes = [
            models.Index(fields=['pincode']),
            models.Index(fields=['type']),
        ]


# =====================================================
# 📦 ORDER (Main Shipment Model)
# =====================================================
class Order(models.Model):
    # Status Choices
    STATUS_CHOICES = (
        ("booked", "📝 Booked"),
        ("picked", "🚚 Picked Up"),
        ("in_transit", "🚛 In Transit"),
        ("out_for_delivery", "📦 Out for Delivery"),
        ("delivered", "✅ Delivered"),
        ("cancelled", "❌ Cancelled"),
        ("hold", "⏸️ On Hold"),
        ("dispatched", "✈️ Dispatched"),
    )

    # Booking Mode Choices
    MODE_CHOICES = (
        ("surface", "Surface Transport"),
        ("air", "Air Express"),
        ("rail", "Rail Cargo"),
        ("express", "Speed Post"),
    )

    # Insurance Choices
    INSURANCE_CHOICES = (
        ("owner", "Owner's Risk"),
        ("carrier", "Carrier's Risk"),
        ("none", "No Insurance"),
    )

    # ========== IDENTIFICATION ==========
    lr_number = models.BigIntegerField(unique=True)
    awb_number = models.BigIntegerField(unique=True, null=True, blank=True)

    # ========== FOREIGN KEYS (Location Models) ==========
    pickup = models.ForeignKey(
        Location,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pickup_orders"
    )
    delivery = models.ForeignKey(
        Location,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="delivery_orders"
    )

    # ========== BACKUP FIELDS (for history safety & quick access) ==========
    # Pickup Details
    pickup_name = models.CharField(max_length=200)
    pickup_address = models.TextField()
    pickup_pincode = models.CharField(max_length=6)
    pickup_contact = models.CharField(max_length=15)
    pickup_gstin = models.CharField(max_length=20, blank=True, null=True)
    pickup_city = models.CharField(max_length=100, blank=True, null=True)
    pickup_state = models.CharField(max_length=100, blank=True, null=True)

    # Delivery Details
    delivery_name = models.CharField(max_length=200)
    delivery_address = models.TextField()
    delivery_pincode = models.CharField(max_length=6)
    delivery_contact = models.CharField(max_length=15)
    delivery_gstin = models.CharField(max_length=20, blank=True, null=True)
    delivery_city = models.CharField(max_length=100, blank=True, null=True)
    delivery_state = models.CharField(max_length=100, blank=True, null=True)

    # ========== SHIPMENT DETAILS ==========
    material = models.CharField(max_length=200, default="General Cargo")
    hsn_code = models.CharField(max_length=20, default="1234")
    boxes = models.IntegerField(default=0)
    weight = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    actual_weight = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    volumetric_weight = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Dimensions (JSON field for multiple boxes)
    dimensions = models.JSONField(default=list, blank=True, help_text="List of box dimensions")

    # ========== BILLING & FINANCIAL ==========
    total_value = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    eway_bill = models.CharField(max_length=20, blank=True, null=True)
    insurance_type = models.CharField(
        max_length=20,
        choices=INSURANCE_CHOICES,
        default="owner"
    )
    
    # Freight Details
    freight_charge = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    fuel_charge = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    docket_charge = models.DecimalField(max_digits=10, decimal_places=2, default=100)
    oda_charge = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    gst = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    grand_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # ========== STATUS & TRACKING ==========
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="booked"
    )
    booking_mode = models.CharField(
        max_length=20,
        choices=MODE_CHOICES,
        default="surface"
    )
    
    # Tracking Location
    current_location = models.CharField(max_length=200, blank=True, null=True)
    tracking_history = models.JSONField(default=list, blank=True, help_text="List of status updates with timestamps")

    # ========== TIMESTAMPS ==========
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expected_delivery_date = models.DateField(blank=True, null=True)
    delivered_at = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"LR-{self.lr_number} - {self.status}"

    def save(self, *args, **kwargs):
        # Auto-calculate grand total if not provided
        if self.grand_total == 0 and self.weight > 0:
            self.grand_total = self.freight_charge + self.fuel_charge + self.docket_charge + self.oda_charge + self.gst
            if self.grand_total < 650:
                self.grand_total = 650
        
        # Update delivered_at when status changes to delivered
        if self.status == 'delivered' and not self.delivered_at:
            self.delivered_at = datetime.now()
        
        # Add to tracking history
        if self.tracking_history:
            history = self.tracking_history
        else:
            history = []
        
        history.append({
            'status': self.status,
            'timestamp': datetime.now().isoformat(),
            'location': self.current_location or 'N/A'
        })
        self.tracking_history = history[-20:]  # Keep last 20 updates
        
        super().save(*args, **kwargs)

    class Meta:
        db_table = 'orders'
        indexes = [
            models.Index(fields=['lr_number']),
            models.Index(fields=['awb_number']),
            models.Index(fields=['status']),
            models.Index(fields=['pickup_pincode']),
            models.Index(fields=['delivery_pincode']),
            models.Index(fields=['created_at']),
        ]
        ordering = ['-created_at']

from datetime import date

class Invoice(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="invoices")
    invoice_no = models.CharField(max_length=50)
    invoice_value = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    invoice_date = models.DateField(default=date.today)  # ✅ This will work now
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.invoice_no} - ₹{self.invoice_value}"

    class Meta:
        db_table = 'invoices'
        ordering = ['-created_at']


# =====================================================
# 📂 DOCUMENT UPLOAD
# =====================================================
class Document(models.Model):
    DOC_TYPE_CHOICES = (
        ("invoice", "Invoice"),
        ("eway", "E-Way Bill"),
        ("pod", "Proof of Delivery"),
        ("other", "Other"),
    )

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="documents")
    file = models.FileField(upload_to="documents/%Y/%m/%d/")
    doc_type = models.CharField(max_length=20, choices=DOC_TYPE_CHOICES)
    file_name = models.CharField(max_length=255, blank=True)
    file_size = models.IntegerField(default=0, help_text="File size in bytes")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.doc_type} - {self.order.lr_number}"

    class Meta:
        db_table = 'documents'
        ordering = ['-uploaded_at']


# =====================================================
# 🚚 TRACKING HISTORY (Separate for detailed tracking)
# =====================================================
class TrackingHistory(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="tracking_entries")
    status = models.CharField(max_length=20)
    location = models.CharField(max_length=200, blank=True, null=True)
    remarks = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.order.lr_number} - {self.status} at {self.created_at}"

    class Meta:
        db_table = 'tracking_history'
        ordering = ['-created_at']


# =====================================================
# 💰 RATE MATRIX (For dynamic rate calculation)
# =====================================================
class RateMatrix(models.Model):
    from_zone = models.CharField(max_length=50)
    to_zone = models.CharField(max_length=50)
    rate = models.DecimalField(max_digits=10, decimal_places=2)
    min_weight = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    max_weight = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.from_zone} → {self.to_zone}: ₹{self.rate}/kg"

    class Meta:
        db_table = 'rate_matrix'
        unique_together = ['from_zone', 'to_zone']


# =====================================================
# 📊 DASHBOARD STATS CACHE (Optional)
# =====================================================
class DashboardStats(models.Model):
    total_shipments = models.IntegerField(default=0)
    delivered_today = models.IntegerField(default=0)
    in_transit = models.IntegerField(default=0)
    pending_pickup = models.IntegerField(default=0)
    total_revenue = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Stats updated at {self.updated_at}"

    class Meta:
        db_table = 'dashboard_stats'
        verbose_name_plural = "Dashboard Stats"