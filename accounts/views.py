from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


# =====================================================
# 🔹 SIGNUP
# =====================================================
@api_view(['POST'])
@permission_classes([AllowAny])
def signup(request):
    username = request.data.get("username")
    password = request.data.get("password")
    email = request.data.get("email")

    if not username or not password:
        return Response({
            "status": "error",
            "message": "Username and password required"
        }, status=400)

    if User.objects.filter(username=username).exists():
        return Response({
            "status": "error",
            "message": "Username already exists"
        }, status=400)

    user = User.objects.create_user(
        username=username,
        password=password,
        email=email
    )

    return Response({
        "status": "success",
        "message": "User created successfully",
        "username": user.username
    }, status=201)


# =====================================================
# 🔥 LOGIN (JWT - FINAL)
# =====================================================
@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    username = request.data.get("username")
    password = request.data.get("password")

    # 🔍 Debug
    print("LOGIN DATA:", request.data)

    if not username or not password:
        return Response({
            "status": "error",
            "message": "Username & password required"
        }, status=400)

    user = authenticate(username=username, password=password)

    if user is not None:
        refresh = RefreshToken.for_user(user)

        return Response({
            "status": "success",
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "username": user.username,
            "is_superuser": user.is_superuser,
            "is_staff": user.is_staff,
        }, status=200)

    return Response({
        "status": "error",
        "message": "Invalid credentials"
    }, status=400)


# =====================================================
# 🔹 FORGOT PASSWORD
# =====================================================
@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    email = request.data.get("email")

    if not email:
        return Response({"error": "Email required"}, status=400)

    try:
        user = User.objects.get(email=email)

        token = default_token_generator.make_token(user)
        reset_link = f"http://localhost:3000/reset-password/{user.pk}/{token}"

        subject = "Faith Cargo - Password Reset"

        html_content = render_to_string(
            "accounts/password_reset_email.html",
            {
                "username": user.username,
                "reset_link": reset_link,
            }
        )

        msg = EmailMultiAlternatives(
            subject,
            f"Reset link: {reset_link}",
            "no-reply@faithcargo.com",
            [email]
        )

        msg.attach_alternative(html_content, "text/html")
        msg.send()

        return Response({"message": "Password reset link sent"}, status=200)

    except User.DoesNotExist:
        return Response({"error": "Email not found"}, status=404)


# =====================================================
# 🔹 RESET PASSWORD
# =====================================================
@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request, uid, token):
    new_password = request.data.get("password")

    if not new_password:
        return Response({"error": "New password required"}, status=400)

    try:
        user = User.objects.get(pk=uid)

        if default_token_generator.check_token(user, token):
            user.set_password(new_password)
            user.save()
            return Response({"message": "Password reset successful"}, status=200)

        return Response({"error": "Invalid or expired token"}, status=400)

    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)