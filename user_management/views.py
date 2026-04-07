from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import CustomUser

# ✅ ADD USER API
@api_view(['POST'])
def add_user(request):
    data = request.data
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return Response({"error": "Username & Password required"}, status=400)

    if CustomUser.objects.filter(username=username).exists():
        return Response({"error": "Username already exists"}, status=400)

    # Database में सभी permissions के साथ यूजर बनाना
    user = CustomUser.objects.create(
        username=username,
        password=password,
        fcpl_rate=data.get("fcpl_rate", False),
        pickup=data.get("pickup", False),
        vendor_manage=data.get("vendor_manage", False),
        vendor_rates=data.get("vendor_rates", False),
        rate_update=data.get("rate_update", False),
        pincode=data.get("pincode", False),
        user_management=data.get("user_management", False),
        ba_b2b=data.get("ba_b2b", False),
        
        # 🔥 NEW MODULES SAVED TO DB
        create_order=data.get("create_order", False),
        shipment_details=data.get("shipment_details", False),
    )

    return Response({"status": "User created successfully", "id": user.id})


# ✅ USER LOGIN API
@api_view(['POST'])
def user_login(request):
    username = request.data.get("username")
    password = request.data.get("password")

    try:
        user = CustomUser.objects.get(username=username, password=password)

        # लॉगिन के बाद ये पूरा 'modules' ऑब्जेक्ट लोकल स्टोरेज में सेव होना चाहिए
        return Response({
            "status": "success",
            "username": user.username,
            "modules": {
                "fcpl_rate": user.fcpl_rate,
                "pickup": user.pickup,
                "vendor_manage": user.vendor_manage,
                "vendor_rates": user.vendor_rates,
                "rate_update": user.rate_update,
                "pincode": user.pincode,
                "user_management": user.user_management,
                "ba_b2b": user.ba_b2b,
                
                # 🔥 NEW MODULES INCLUDED IN RESPONSE
                "create_order": user.create_order,
                "shipment_details": user.shipment_details,
            }
        })

    except CustomUser.DoesNotExist:
        return Response({"error": "Invalid username or password"}, status=400)


# ✅ USER LIST API
@api_view(['GET'])
def user_list(request):
    # ID और Username की लिस्ट भेजना
    users = CustomUser.objects.all().values("id", "username")
    return Response(list(users))


# ✅ DELETE USER API
@api_view(['DELETE'])
def delete_user(request, id):
    try:
        user = CustomUser.objects.get(id=id)
        user.delete()
        return Response({"status": "User deleted"})
    except CustomUser.DoesNotExist:
        return Response({"error": "User not found"}, status=404)