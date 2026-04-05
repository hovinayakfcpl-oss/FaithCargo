from django.db import models


# 🔢 COUNTER (LR + AWB)
class Counter(models.Model):
    lr_number = models.BigIntegerField(default=200000)
    awb_number = models.BigIntegerField(default=30000000)

    def __str__(self):
        return "Counter"


# 📍 LOCATION (Pickup + Delivery reusable)
class Location(models.Model):
    TYPE_CHOICES = (
        ("pickup", "Pickup"),
        ("delivery", "Delivery"),
    )

    type = models.CharField(max_length=10, choices=TYPE_CHOICES)

    name = models.CharField(max_length=100)
    contact = models.CharField(max_length=15)
    address = models.TextField()

    pincode = models.CharField(max_length=6)
    city = models.CharField(max_length=50, blank=True, null=True)
    state = models.CharField(max_length=50)

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.pincode})"


# 📦 ORDER
class Order(models.Model):
    lr_number = models.BigIntegerField(unique=True)
    awb_number = models.BigIntegerField()

    # 🔗 RELATION BASED (IMPORTANT UPGRADE)
    pickup = models.ForeignKey(
        Location,
        on_delete=models.SET_NULL,
        null=True,
        related_name="pickup_orders"
    )

    delivery = models.ForeignKey(
        Location,
        on_delete=models.SET_NULL,
        null=True,
        related_name="delivery_orders"
    )

    # 🔄 BACKUP FIELDS (for history safety)
    pickup_name = models.CharField(max_length=100)
    pickup_address = models.TextField()
    pickup_pincode = models.CharField(max_length=10)
    pickup_contact = models.CharField(max_length=15)

    delivery_name = models.CharField(max_length=100)
    delivery_address = models.TextField()
    delivery_pincode = models.CharField(max_length=10)
    delivery_contact = models.CharField(max_length=15)

    # 📦 SHIPMENT
    material = models.CharField(max_length=100)
    hsn_code = models.CharField(max_length=20)
    boxes = models.IntegerField()
    weight = models.FloatField()

    # 💰 BILLING
    total_value = models.FloatField()
    eway_bill = models.CharField(max_length=50, blank=True, null=True)
    insurance_type = models.CharField(
        max_length=20,
        choices=(("owner", "Owner Risk"), ("carrier", "Carrier Risk")),
        default="owner"
    )

    # 📊 STATUS TRACKING (VERY IMPORTANT)
    status = models.CharField(
        max_length=20,
        choices=(
            ("booked", "Booked"),
            ("in_transit", "In Transit"),
            ("out_for_delivery", "Out for Delivery"),
            ("delivered", "Delivered"),
        ),
        default="booked"
    )

    # 📅 TIMESTAMPS
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"LR-{self.lr_number}"


# 🧾 INVOICE
class Invoice(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="invoices")

    invoice_no = models.CharField(max_length=50)
    invoice_value = models.FloatField()

    def __str__(self):
        return self.invoice_no


# 📂 DOCUMENT UPLOAD (NEW 🔥)
class Document(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="documents")

    file = models.FileField(upload_to="documents/")
    doc_type = models.CharField(
        max_length=20,
        choices=(
            ("invoice", "Invoice"),
            ("eway", "E-Way"),
            ("other", "Other"),
        )
    )

    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.doc_type} - {self.order.lr_number}"