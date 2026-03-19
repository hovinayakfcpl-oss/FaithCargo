from django.urls import path
from . import views   # ✅ यह missing था

urlpatterns = [
    path("signup/", views.signup, name="signup"),
    path("login/", views.login, name="login"),
    path("forgot-password/", views.forgot_password, name="forgot_password"),
    path("simple-login/", views.simple_login),
    path("reset-password/<int:uid>/<str:token>/", views.reset_password, name="reset_password"),
]