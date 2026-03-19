from django.contrib import admin
from .models import Pincode

class PincodeAdmin(admin.ModelAdmin):
    list_display = ('pincode', 'city', 'state', 'zone', 'is_oda')
    list_filter = ('zone', 'is_oda')
    search_fields = ('pincode', 'city', 'state')

admin.site.register(Pincode, PincodeAdmin)


from .models import RateMatrix, Charges

admin.site.register(RateMatrix)
admin.site.register(Charges)