from django.urls import path
from .views import get_zone
from .views import import_pincode_csv
urlpatterns = [

path("zone/<str:pincode>/",get_zone),
path("import/", import_pincode_csv),



]