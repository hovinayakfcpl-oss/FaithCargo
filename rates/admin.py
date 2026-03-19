from django.contrib import admin

# Register your models here.

from .models import RateCard, Rate

@admin.register(RateCard)
class RateCardAdmin(admin.ModelAdmin):
    list_display = (
        "zone", "payment_mode", "per_kg_rate",
        "oda_charge", "insurance_percent", "appointment_charge",
        "weight_min", "weight_max"
    )
    list_filter = ("zone", "payment_mode")
    search_fields = ("zone", "payment_mode")

@admin.register(Rate)
class RateAdmin(admin.ModelAdmin):
    list_display = ("vendor", "rate")
    search_fields = ("vendor__name",)
