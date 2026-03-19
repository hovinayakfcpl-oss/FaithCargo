import React from "react";
import { useNavigate } from "react-router-dom";
import "./UserDashboard.css";

function UserDashboard() {
  const navigate = useNavigate();

  const userName = localStorage.getItem("userName");

  // 🔥 Modules from login
  const modules = JSON.parse(localStorage.getItem("userModules") || "{}");

  return (
    <div className="dashboard-container">
      
      {/* 🔹 SIDEBAR */}
      <div className="sidebar">
        <h2>Welcome 👋</h2>
        <p>{userName}</p>

        {modules.fcpl_rate && (
          <button onClick={() => navigate("/fcpl-rate")}>
            FCPL Rate Calculator
          </button>
        )}

        {modules.ba_b2b && (
          <button onClick={() => navigate("/ba-b2b-rate")}>
            BA & B2B Rate
          </button>
        )}

        {modules.pickup && (
          <button onClick={() => navigate("/pickup")}>
            Pickup Request
          </button>
        )}

        {modules.vendor_manage && (
          <button onClick={() => navigate("/vendor-manage")}>
            Vendor Manage
          </button>
        )}

        {modules.vendor_rates && (
          <button onClick={() => navigate("/vendor-rate")}>
            Vendor Rates
          </button>
        )}

        {modules.rate_update && (
          <button onClick={() => navigate("/rate-update")}>
            Rate Update
          </button>
        )}

        {modules.pincode && (
          <button onClick={() => navigate("/pincode")}>
            Pincode Management
          </button>
        )}

        {modules.user_management && (
          <button onClick={() => navigate("/user-add")}>
            User Management
          </button>
        )}

        <button
          className="logout-btn"
          onClick={() => {
            localStorage.clear();
            navigate("/");
          }}
        >
          Logout
        </button>
      </div>

      {/* 🔹 MAIN CONTENT */}
      <div className="main-content">
        <h1>Dashboard</h1>
        <p>Select a module from the sidebar 👈</p>
      </div>
    </div>
  );
}

export default UserDashboard;