from django.urls import path
from .views import get_zone
from .views import import_pincode_csv, update_pincode
urlpatterns = [
    path("zone/<str:pincode>/", get_zone),
    path("import/", import_pincode_csv),

    # 🔥 ADD THIS
    path("update/", update_pincode),
]