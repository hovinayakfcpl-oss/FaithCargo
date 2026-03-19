from django.urls import path
from .views import add_user, user_login, user_list, delete_user

urlpatterns = [
    path('add/', add_user),
    path('login/', user_login),
    path('list/', user_list),   # ✅ correct
    path('delete/<int:id>/', delete_user),
]