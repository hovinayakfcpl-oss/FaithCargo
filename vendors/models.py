from django.db import models

class VendorRate(models.Model):
    vendor_name = models.CharField(max_length=100, unique=True)
    rates = models.JSONField(default=dict)   # store zone matrix
    charges = models.JSONField(default=dict) # store charges

    def __str__(self):
        return self.vendor_name


class Vendor(models.Model):
    name = models.CharField(max_length=100, unique=True)
    gstin = models.CharField(max_length=20, blank=True, null=True)
    contact_person = models.CharField(max_length=100, blank=True, null=True)
    location = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return self.name
