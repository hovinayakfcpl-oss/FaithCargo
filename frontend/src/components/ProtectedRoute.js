import React from "react";
import { Navigate, useLocation } from "react-router-dom";

function ProtectedRoute({ children }) {
  const location = useLocation();

  const token = localStorage.getItem("token");
  
  // ✅ Superuser check (String or Boolean both handled)
  const isSuperuser = 
    localStorage.getItem("is_superuser") === "true" || 
    localStorage.getItem("is_superuser") === "True";

  // 🔥 FIX HERE: 'permissions' की जगह 'userModules' का इस्तेमाल करें
  // क्योंकि आपने UserLogin.js में इसी नाम से सेव किया है
  const userModules = JSON.parse(localStorage.getItem("userModules") || "{}");

  // 🔹 Token check: अगर लॉगिन नहीं है तो बाहर भेजें
  if (!token || token === "undefined" || token === "null") {
    return <Navigate to="/" replace />;
  }

  // 🔹 Admin/Superuser को हमेशा हर जगह जाने की अनुमति है
  if (isSuperuser) {
    return children;
  }

  // 🔥 ROUTE → MODULE MAP (मैपिंग एकदम सही है)
  const routePermissions = {
    "/fcpl-rate": "fcpl_rate",
    "/pickup": "pickup",
    "/vendor-manage": "vendor_manage",
    "/vendor-rate": "vendor_rates",
    "/rate-update": "rate_update",
    "/pincode": "pincode",
    "/user-add": "user_management",
    "/ba-b2b-rate": "ba_b2b",
    "/create-order": "create_order",
    "/shipment-details": "shipment_details",
  };

  const currentPath = location.pathname;

  // 🔹 Dashboard हमेशा एक्सेसिबल रहेंगे
  if (currentPath === "/user-dashboard" || currentPath === "/admin-dashboard") {
    return children;
  }

  // 🔹 परमिशन चेक करें
  const requiredPermission = routePermissions[currentPath];

  // अगर रास्ता (Path) सुरक्षित है और यूजर के पास उसकी परमिशन नहीं है
  if (requiredPermission && !userModules[requiredPermission]) {
    alert(`Access Denied ❌: You don't have access to ${requiredPermission.replace('_', ' ')}`);
    return <Navigate to="/user-dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;