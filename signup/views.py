from django.contrib.auth.hashers import make_password
from django.contrib.auth import get_user_model
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

User = get_user_model()   # ✅ Always use custom user model

@api_view(['POST'])
@permission_classes([AllowAny])
def signup(request):
    username = request.data.get("username")
    password = request.data.get("password")
    email = request.data.get("email")   # optional
    contact = request.data.get("contact")  # optional if your CustomUser has this field

    if not username or not password:
        return Response({"error": "All fields required"}, status=400)

    if User.objects.filter(username=username).exists():
        return Response({"error": "Username already exists"}, status=400)

    user = User(
        username=username,
        password=make_password(password),
        email=email
    )
    # अगर तुम्हारे CustomUser में contact field है तो:
    if hasattr(user, "contact") and contact:
        user.contact = contact

    user.save()

    return Response({"message": "User created successfully", "username": user.username}, status=201)
