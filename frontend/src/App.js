// src/App.js - COMPLETELY FIXED WORKING VERSION
import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Core Components
import Login from "./components/Login";
import UserLogin from "./components/UserLogin";
import AdminDashboard from "./components/AdminDashboard";
import UserDashboard from "./components/UserDashboard";
import ClientDashboard from "./components/ClientDashboard";
import ProtectedRoute from "./components/ProtectedRoute";

// Feature Modules
import FcplRateCalculator from "./components/FcplRateCalculator";
import BaB2bRateCalculator from "./components/BaB2bRateCalculator";
import VendorManage from "./components/VendorManage";
import VendorRates from "./components/VendorRates";
import RateUpdate from "./components/RateUpdate";
import PincodeManagement from "./components/PincodeManagement";

// Order Modules
import CreateOrder from "./components/CreateOrder";
import ShipmentDetails from "./components/ShipmentDetails";
import UserManagement from "./components/UserManagement";

// Pickup Management Modules
import PickupRequest from "./components/PickupRequest";
import MyPickups from "./components/MyPickups";
import PickupManagement from "./components/PickupManagement";
import MyWork from "./components/MyWork";

// Auth Helpers
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import Signup from "./components/Signup";

// 404 Page Component
const NotFoundPage = () => {
  useEffect(() => {
    document.title = "404 - Page Not Found | Faith Cargo";
  }, []);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f5f7fa 0%, #eef2f7 100%)",
      fontFamily: "'Inter', sans-serif",
      textAlign: "center",
      padding: "20px"
    }}>
      <div style={{
        background: "white",
        borderRadius: "24px",
        padding: "60px 40px",
        maxWidth: "500px",
        width: "100%",
        boxShadow: "0 20px 40px rgba(0,0,0,0.1)"
      }}>
        <div style={{
          fontSize: "120px",
          fontWeight: "800",
          background: "linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: "20px"
        }}>404</div>
        <h2 style={{ fontSize: "28px", marginBottom: "16px", color: "#0f172a" }}>Page Not Found</h2>
        <p style={{ color: "#64748b", marginBottom: "30px" }}>
          Oops! The page you're looking for doesn't exist or has been moved.
        </p>
        <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => window.location.href = "/"}
            style={{
              padding: "12px 24px",
              background: "linear-gradient(135deg, #d32f2f, #b71c1c)",
              color: "white",
              border: "none",
              borderRadius: "12px",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            Go to Login
          </button>
          <button
            onClick={() => window.history.back()}
            style={{
              padding: "12px 24px",
              background: "#f1f5f9",
              color: "#0f172a",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [userModules, setUserModules] = useState({});
  const [userRole, setUserRole] = useState(null);
  const [loginType, setLoginType] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication status on app load
    const token = localStorage.getItem("token");
    const clientToken = localStorage.getItem("clientToken");
    const role = localStorage.getItem("userRole");
    const type = localStorage.getItem("loginType");
    const modules = localStorage.getItem("userModules");
    
    console.log("🔐 Auth Check - Token:", token ? "Present" : "Missing");
    console.log("🔐 Auth Check - ClientToken:", clientToken ? "Present" : "Missing");
    console.log("👤 User Role:", role);
    console.log("🔑 Login Type:", type);
    
    setUserRole(role);
    setLoginType(type);
    
    if (modules) {
      try {
        const parsedModules = JSON.parse(modules);
        setUserModules(parsedModules);
        console.log("📦 User Modules Loaded:", Object.keys(parsedModules).filter(key => parsedModules[key] === true));
      } catch (error) {
        console.error("Error parsing user modules:", error);
      }
    }
    
    setLoading(false);
  }, []);

  // Route configuration with permissions (For Staff/Admin)
  const routeConfig = [
    { path: "/fcpl-rate", component: FcplRateCalculator, module: "fcpl_rate" },
    { path: "/ba-b2b-rate", component: BaB2bRateCalculator, module: "ba_b2b" },
    { path: "/ba-b2b-rate-calculator", component: BaB2bRateCalculator, module: "ba_b2b" },
    { path: "/vendor-manage", component: VendorManage, module: "vendor_manage" },
    { path: "/vendor-rate", component: VendorRates, module: "vendor_rates" },
    { path: "/rate-update", component: RateUpdate, module: "rate_update" },
    { path: "/pincode", component: PincodeManagement, module: "pincode" },
    { path: "/user-management", component: UserManagement, module: "user_management" },
    { path: "/create-order", component: CreateOrder, module: "create_order" },
    { path: "/shipment-details", component: ShipmentDetails, module: "shipment_details" },
  ];

  // Client Specific Routes
  const clientRoutes = [
    { path: "/client-dashboard", component: ClientDashboard },
    { path: "/tracking", component: ShipmentDetails },
    { path: "/pickup-request", component: PickupRequest },
    { path: "/my-pickups", component: MyPickups },
  ];

  // Admin Specific Routes
  const adminRoutes = [
    { path: "/admin/pickup-management", component: PickupManagement },
    { path: "/pickup-management", component: PickupManagement },
    { path: "/admin/pickup-request", component: PickupRequest },
  ];

  // Staff Specific Routes
  const staffRoutes = [
    { path: "/my-work", component: MyWork },
    { path: "/staff/my-work", component: MyWork },
  ];

  if (loading) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f5f7fa 0%, #eef2f7 100%)"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: "50px",
            height: "50px",
            border: "3px solid #e2e8f0",
            borderTopColor: "#d32f2f",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            marginBottom: "16px"
          }}></div>
          <p style={{ color: "#64748b" }}>Loading Faith Cargo...</p>
        </div>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes - No authentication required */}
        <Route path="/" element={<Login />} />
        <Route path="/user-login" element={<UserLogin />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />

        {/* Admin Dashboard */}
        <Route path="/admin-dashboard" element={
          <ProtectedRoute allowedRoles={["admin", "Admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        } />

        {/* User Dashboard (Staff) */}
        <Route path="/user-dashboard" element={
          <ProtectedRoute allowedRoles={["user", "User", "staff", "Staff"]}>
            <UserDashboard />
          </ProtectedRoute>
        } />

        {/* Client Dashboard */}
        <Route path="/client-dashboard" element={
          <ProtectedRoute allowedRoles={["client", "Client"]}>
            <ClientDashboard />
          </ProtectedRoute>
        } />

        {/* Module-Based Protected Routes (Staff/Admin) */}
        {routeConfig.map((route) => (
          <Route key={route.path} path={route.path} element={
            <ProtectedRoute requiredModule={route.module} allowedRoles={["admin", "Admin", "user", "User", "staff", "Staff"]}>
              {React.createElement(route.component)}
            </ProtectedRoute>
          } />
        ))}

        {/* Client Specific Routes */}
        {clientRoutes.map((route) => (
          <Route key={route.path} path={route.path} element={
            <ProtectedRoute allowedRoles={["client", "Client"]}>
              {React.createElement(route.component)}
            </ProtectedRoute>
          } />
        ))}

        {/* Admin Specific Routes */}
        {adminRoutes.map((route) => (
          <Route key={route.path} path={route.path} element={
            <ProtectedRoute allowedRoles={["admin", "Admin"]}>
              {React.createElement(route.component)}
            </ProtectedRoute>
          } />
        ))}

        {/* Staff Specific Routes */}
        {staffRoutes.map((route) => (
          <Route key={route.path} path={route.path} element={
            <ProtectedRoute allowedRoles={["user", "User", "staff", "Staff"]}>
              {React.createElement(route.component)}
            </ProtectedRoute>
          } />
        ))}

        {/* Create Order - Accessible by all authenticated users */}
        <Route path="/create-order" element={
          <ProtectedRoute>
            <CreateOrder />
          </ProtectedRoute>
        } />

        {/* Redirect based on role */}
        <Route path="/dashboard" element={
          <Navigate to={
            loginType === "client" ? "/client-dashboard" : 
            (userRole === "admin" || userRole === "Admin") ? "/admin-dashboard" : "/user-dashboard"
          } replace />
        } />

        {/* Logout Route */}
        <Route path="/logout" element={<Navigate to="/" replace />} />

        {/* Legacy Pickup Route Redirect */}
        <Route path="/pickup" element={<Navigate to="/pickup-request" replace />} />

        {/* 404 Fallback */}
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Router>
  );
}

export default App;