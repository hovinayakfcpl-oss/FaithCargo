import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// 🔹 Core Components
import Login from "./components/Login";
import UserLogin from "./components/UserLogin";
import AdminDashboard from "./components/AdminDashboard";
import UserDashboard from "./components/UserDashboard";
import ProtectedRoute from "./components/ProtectedRoute";

// 🔹 Feature Modules
import FcplRateCalculator from "./components/FcplRateCalculator";
import BaB2bRateCalculator from "./components/BaB2bRateCalculator";
import VendorManage from "./components/VendorManage";
import VendorRates from "./components/VendorRates";
import RateUpdate from "./components/RateUpdate";
import PickupAssign from "./components/PickupAssign";
import PincodeManagement from "./components/PincodeManagement";

// ✅ NEW MODULES
import CreateOrder from "./components/CreateOrder";
import ShipmentDetails from "./components/ShipmentDetails";
import UserManagement from "./components/UserManagement";

// 🔹 Auth Helpers
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import Signup from "./components/Signup";

function App() {
  const [userModules, setUserModules] = useState({});
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    // Check authentication status on app load
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("userRole");
    const modules = localStorage.getItem("userModules");
    
    setUserRole(role);
    
    if (modules) {
      try {
        setUserModules(JSON.parse(modules));
      } catch (error) {
        console.error("Error parsing user modules:", error);
      }
    }
  }, []);

  // Route configuration with permissions
  const routeConfig = [
    { path: "/fcpl-rate", component: FcplRateCalculator, module: "fcpl_rate", title: "FCPL Rate Calculator" },
    { path: "/ba-b2b-rate", component: BaB2bRateCalculator, module: "ba_b2b", title: "BA & B2B Rate Calculator" },
    { path: "/vendor-manage", component: VendorManage, module: "vendor_manage", title: "Vendor Management" },
    { path: "/vendor-rate", component: VendorRates, module: "vendor_rates", title: "Vendor Rates" },
    { path: "/rate-update", component: RateUpdate, module: "rate_update", title: "Rate Update" },
    { path: "/pickup", component: PickupAssign, module: "pickup", title: "Pickup Assignment" },
    { path: "/pincode", component: PincodeManagement, module: "pincode", title: "Pincode Management" },
    { path: "/user-management", component: UserManagement, module: "user_management", title: "User Management" },
    { path: "/create-order", component: CreateOrder, module: "create_order", title: "Create Order" },
    { path: "/shipment-details", component: ShipmentDetails, module: "shipment_details", title: "Shipment Details" },
  ];

  return (
    <Router>
      <Routes>
        {/* 🔹 PUBLIC ROUTES - No authentication required */}
        <Route path="/" element={<Login />} />
        <Route path="/user-login" element={<UserLogin />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />

        {/* 🔥 ADMIN DASHBOARD - Full Access */}
        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* 🔹 USER DASHBOARD */}
        <Route
          path="/user-dashboard"
          element={
            <ProtectedRoute>
              <UserDashboard />
            </ProtectedRoute>
          }
        />

        {/* 🔹 DYNAMIC MODULE-BASED PROTECTED ROUTES */}
        {routeConfig.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={
              <ProtectedRoute requiredModule={route.module}>
                {React.createElement(route.component)}
              </ProtectedRoute>
            }
          />
        ))}

        {/* 🔹 Redirect based on authentication and role */}
        <Route
          path="/dashboard"
          element={
            <Navigate 
              to={userRole === "admin" ? "/admin-dashboard" : "/user-dashboard"} 
              replace 
            />
          }
        />

        {/* 🔥 DEFAULT FALLBACK - 404 Page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;