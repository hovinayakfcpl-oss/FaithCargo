from django.urls import path
from . import views
from .views import CustomTokenObtainPairView
urlpatterns = [
    path("api/calculate-rate", views.calculate_rate, name="calculate_rate"),
    path("login/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair")

]
