from django.db import models

# Create your models here.
from django.db import models

class Counter(models.Model):
    lr_number = models.BigIntegerField(default=200000)
    awb_number = models.BigIntegerField(default=30000000)

    def __str__(self):
        return "Counter"


class Order(models.Model):
    lr_number = models.BigIntegerField(unique=True)
    awb_number = models.BigIntegerField()

    pickup_name = models.CharField(max_length=100)
    pickup_address = models.TextField()
    pickup_pincode = models.CharField(max_length=10)
    pickup_contact = models.CharField(max_length=15)

    delivery_name = models.CharField(max_length=100)
    delivery_address = models.TextField()
    delivery_pincode = models.CharField(max_length=10)
    delivery_contact = models.CharField(max_length=15)

    material = models.CharField(max_length=100)
    hsn_code = models.CharField(max_length=20)
    boxes = models.IntegerField()
    weight = models.FloatField()

    total_value = models.FloatField()
    eway_bill = models.CharField(max_length=50, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return str(self.lr_number)


class Invoice(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="invoices")
    invoice_no = models.CharField(max_length=50)
    invoice_value = models.FloatField()

    def __str__(self):
        return self.invoice_no