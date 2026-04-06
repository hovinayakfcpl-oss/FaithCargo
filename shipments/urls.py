from django.urls import path
from . import views

urlpatterns = [
    # 📦 Orders & Shipments
    # Address: /api/shipments/create-order/
    path("create-order/", views.create_order, name="create_order"),

    # Address: /api/shipments/ (Ye list dikhayega)
    path("", views.shipment_list, name="shipment_list"),

    # Address: /api/shipments/shipment/FCPL0001/
    # <str:lr> use kiya hai kyunki FCPL format string hota hai
    path("shipment/<str:lr>/", views.shipment_detail, name="shipment_detail"),

    # 💰 Freight Calculation
    # Address: /api/shipments/calculate-freight/
    path("calculate-freight/", views.calculate_freight, name="calculate_freight"),

    # 📍 Locations
    path("add-location/", views.add_location, name="add_location"),
    path("get-locations/", views.get_locations, name="get_locations"),
    
    # 🗑️ Delete
    path("delete/<str:lr>/", views.delete_shipment, name="delete_shipment"),
]