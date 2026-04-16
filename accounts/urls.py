# accounts/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # =====================================================
    # 🔐 AUTHENTICATION APIs
    # =====================================================
    path("signup/", views.signup, name="signup"),
    path("login/", views.login, name="login"),
    path("forgot-password/", views.forgot_password, name="forgot_password"),
    path("reset-password/<int:uid>/<str:token>/", views.reset_password, name="reset_password"),
    path("change-password/", views.change_password, name="change_password"),
    path("logout/", views.logout, name="logout"),
    path("me/", views.get_current_user, name="get_current_user"),
    
    # =====================================================
    # 🆕 CLIENT AUTHENTICATION APIs
    # =====================================================
    # 🔥 Frontend calls: /api/accounts/client-login/
    path("client-login/", views.client_login, name="client_login"),
    path("client/<str:client_id>/", views.get_client_details, name="get_client_details"),
    
    # =====================================================
    # 🆕 CLIENT RATES APIs
    # =====================================================
    path("rates/client/<str:client_id>/", views.get_client_rates, name="get_client_rates"),
    path("rates/client/<str:client_id>/update/", views.update_client_rates, name="update_client_rates"),
    
    # =====================================================
    # 🆕 USER MANAGEMENT APIs (Admin only)
    # =====================================================
    path("users/clients/", views.get_all_clients, name="get_all_clients"),
    path("users/client/create/", views.create_client, name="create_client"),
    path("users/client/<str:client_id>/status/", views.update_client_status, name="update_client_status"),
    path("users/client/<str:client_id>/delete/", views.delete_client, name="delete_client"),
    path("clients/public/", views.get_all_clients_public, name="get_all_clients_public"),
    path("users/client/<str:client_id>/summary/", views.get_client_order_summary, name="get_client_order_summary"),
]