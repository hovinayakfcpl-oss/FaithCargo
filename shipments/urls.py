from django.urls import path
from . import views

urlpatterns = [
    path("create-order/", views.create_order),
    path("shipments/", views.shipment_list),
    path("shipment/<int:lr>/", views.shipment_detail),
]