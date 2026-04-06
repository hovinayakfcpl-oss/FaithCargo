from django.urls import path
from . import views

urlpatterns = [
    # 📦 Orders & Shipments
    path("create-order/", views.create_order, name="create_order"),
    path("shipments/", views.shipment_list, name="shipment_list"),
    path("shipment/<int:lr>/", views.shipment_detail, name="shipment_detail"),

    # 💰 Freight Calculation (Iske bina Check Freight button nahi chalega)
    path("calculate-freight/", views.calculate_freight, name="calculate_freight"),

    
    path("get-locations/", views.get_locations, name="get_locations"),
]