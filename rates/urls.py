from django.urls import path
from . import views

urlpatterns = [
    path("b2b/calculate/", views.b2b_rate_calculate),
    path("fcpl/calculate/", views.fcpl_rate_calculate),
    path("vendor/calculate/", views.vendor_rate_calculate),
    path("matrix/", views.get_matrix),
    path("matrix/update/", views.update_matrix),
]
