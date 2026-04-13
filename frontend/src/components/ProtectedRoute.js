import React from "react";
import { Navigate, useLocation } from "react-router-dom";

function ProtectedRoute({ children, requiredModule }) {
  const location = useLocation();

  // Get authentication data from localStorage
  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("userRole");
  const username = localStorage.getItem("username");
  
  // ✅ Superuser check (String or Boolean both handled)
  const isSuperuser = 
    localStorage.getItem("is_superuser") === "true" || 
    localStorage.getItem("is_superuser") === "True" ||
    userRole === "admin";

  // 🔥 Get user modules from localStorage
  let userModules = {};
  try {
    const modulesStr = localStorage.getItem("userModules");
    if (modulesStr) {
      userModules = JSON.parse(modulesStr);
    }
  } catch (error) {
    console.error("Error parsing userModules:", error);
  }

  // 🔹 Token check: अगर लॉगिन नहीं है तो बाहर भेजें
  if (!token || token === "undefined" || token === "null" || token === "") {
    localStorage.clear();
    return <Navigate to="/" replace />;
  }

  // 🔹 Admin/Superuser को हमेशा हर जगह जाने की अनुमति है
  if (isSuperuser) {
    return children;
  }

  // 🔥 ROUTE → MODULE MAP (Only these modules - No Invoice/Reports)
  const routePermissions = {
    "/fcpl-rate": "fcpl_rate",
    "/pickup": "pickup",
    "/vendor-manage": "vendor_manage",
    "/vendor-rate": "vendor_rates",
    "/rate-update": "rate_update",
    "/pincode": "pincode",
    "/user-management": "user_management",
    "/ba-b2b-rate": "ba_b2b",
    "/create-order": "create_order",
    "/shipment-details": "shipment_details",
  };

  const currentPath = location.pathname;

  // 🔹 Dashboard हमेशा एक्सेसिबल रहेंगे
  const publicRoutes = ["/user-dashboard", "/admin-dashboard", "/dashboard"];
  if (publicRoutes.includes(currentPath)) {
    return children;
  }

  // 🔹 Check if requiredModule is passed as prop (priority)
  let requiredPermission = requiredModule;
  
  // If no requiredModule prop, check from route mapping
  if (!requiredPermission) {
    requiredPermission = routePermissions[currentPath];
  }

  // 🔹 If no permission required for this route, allow access
  if (!requiredPermission) {
    console.warn(`No permission defined for route: ${currentPath}`);
    return children;
  }

  // 🔹 Permission check
  const hasPermission = userModules[requiredPermission] === true;

  if (!hasPermission) {
    console.log(`🔒 Access Denied: User "${username}" doesn't have "${requiredPermission}" permission`);
    console.log("Available modules:", Object.keys(userModules).filter(key => userModules[key] === true));
    
    // Redirect to user dashboard
    return <Navigate to="/user-dashboard" replace />;
  }

  console.log(`✅ Access Granted: User "${username}" has "${requiredPermission}" permission`);
  return children;
}

export default ProtectedRoute;