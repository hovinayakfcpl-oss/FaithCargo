import React from "react";
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
import UserAdd from "./components/UserAdd";

// ✅ NEW MODULES
import CreateOrder from "./components/CreateOrder";
import ShipmentDetails from "./components/ShipmentDetails";

// 🔹 Auth Helpers
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import Signup from "./components/Signup";

function App() {
  return (
    <Router>
      <Routes>

        {/* 🔹 ADMIN LOGIN */}
        <Route path="/" element={<Login />} />

        {/* 🔹 USER LOGIN */}
        <Route path="/user-login" element={<UserLogin />} />

        {/* 🔹 Signup */}
        <Route path="/signup" element={<Signup />} />

        {/* 🔹 Forgot / Reset Password */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />

        {/* 🔥 ADMIN DASHBOARD */}
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

        {/* 🔹 FCPL Rate Calculator */}
        <Route
          path="/fcpl-rate"
          element={
            <ProtectedRoute>
              <FcplRateCalculator />
            </ProtectedRoute>
          }
        />

        {/* 🔹 BA & B2B Rate Calculator */}
        <Route
          path="/ba-b2b-rate"
          element={
            <ProtectedRoute>
              <BaB2bRateCalculator />
            </ProtectedRoute>
          }
        />

        {/* 🔹 Vendor Manage */}
        <Route
          path="/vendor-manage"
          element={
            <ProtectedRoute>
              <VendorManage />
            </ProtectedRoute>
          }
        />

        {/* 🔹 Vendor Rates */}
        <Route
          path="/vendor-rate"
          element={
            <ProtectedRoute>
              <VendorRates />
            </ProtectedRoute>
          }
        />

        {/* 🔹 Rate Update */}
        <Route
          path="/rate-update"
          element={
            <ProtectedRoute>
              <RateUpdate />
            </ProtectedRoute>
          }
        />

        {/* 🔹 Pickup Assign */}
        <Route
          path="/pickup"
          element={
            <ProtectedRoute>
              <PickupAssign />
            </ProtectedRoute>
          }
        />

        {/* 🔹 User Add */}
        <Route
          path="/user-add"
          element={
            <ProtectedRoute>
              <UserAdd />
            </ProtectedRoute>
          }
        />

        {/* 🔹 Pincode Management */}
        <Route
          path="/pincode"
          element={
            <ProtectedRoute>
              <PincodeManagement />
            </ProtectedRoute>
          }
        />

        {/* ✅ NEW ROUTES */}
        <Route
          path="/create-order"
          element={
            <ProtectedRoute>
              <CreateOrder />
            </ProtectedRoute>
          }
        />

        <Route
          path="/shipment-details"
          element={
            <ProtectedRoute>
              <ShipmentDetails />
            </ProtectedRoute>
          }
        />

        {/* 🔥 DEFAULT FALLBACK */}
        <Route path="*" element={<Navigate to="/" />} />

      </Routes>
    </Router>
  );
}

export default App;