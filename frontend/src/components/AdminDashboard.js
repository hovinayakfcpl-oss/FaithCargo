import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";
import "../styles/theme.css";
import bgImage from "../assets/truck-bg.jpg";
import logo from "../assets/logo.png";

function AdminDashboard() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 🔹 Logout
  const logout = () => {
    localStorage.clear();
    navigate("/");
  };

  // 🔹 Sidebar toggle
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // 🔹 Navigate helper
  const goTo = (path) => {
    navigate(path);
    setSidebarOpen(false); // mobile close
  };

  // 🔹 Dashboard Cards
  const dashboardCards = [
    { title: "FCPL Rate Calculator", desc: "Calculate shipment rates", link: "/fcpl-rate" },
    { title: "Pickup Request", desc: "Manage pickup requests", link: "/pickup" },
    { title: "Vendor Manage", desc: "Fresh vendor management module", link: "/vendor-manage" },
    { title: "Vendor Rates", desc: "View vendor rate cards", link: "/vendor-rate" },
    { title: "Rate Update", desc: "Update shipping rates", link: "/rate-update" },
    { title: "Pincode Management", desc: "Manage service pincodes", link: "/pincode" },
    { title: "User Management", desc: "Add and manage users", link: "/user-add" },
    { title: "BA & B2B Rate Calculator", desc: "Calculate BA & B2B shipment rates", link: "/ba-b2b-rate" } // ✅ नया option
  ];

  return (
    <div
      className="admin-dashboard"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        minHeight: "100vh",
      }}
    >
      {/* 🔹 HEADER */}
      <header className="header">
        <div className="menu-icon" onClick={toggleSidebar}>☰</div>
        <div className="logo-section">
          <img src={logo} alt="Faith Cargo Logo" className="logo"/>
          <h1>Faith Cargo Pvt Ltd - Admin Dashboard</h1>
        </div>
        <div className="header-right">
          <span className="profile">Admin</span>
          <button className="logout-btn" onClick={logout}>Logout</button>
        </div>
      </header>

      {/* 🔹 SIDEBAR */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <ul>
          <li onClick={() => goTo("/fcpl-rate")}>📦 FCPL Rate Calculator</li>
          <li onClick={() => goTo("/pickup")}>🚚 Pickup Request</li>
          <li onClick={() => goTo("/vendor-manage")}>🏢 Vendor Manage</li>
          <li onClick={() => goTo("/vendor-rate")}>💰 Vendor Rates</li>
          <li onClick={() => goTo("/rate-update")}>🔄 Rate Update</li>
          <li onClick={() => goTo("/pincode")}>📍 Pincode Management</li>
          <li onClick={() => goTo("/user-add")}>👤 User Management</li>
          <li onClick={() => goTo("/ba-b2b-rate")}>📊 BA & B2B Rate Calculator</li> {/* ✅ नया option */}
        </ul>
      </aside>

      {/* 🔹 MAIN CONTENT */}
      <main className="content">
        <h2 className="dashboard-title">Dashboard Modules</h2>
        <div className="card-grid">
          {dashboardCards.map((card, index) => (
            <div
              key={index}
              className="dashboard-card"
              onClick={() => goTo(card.link)}
            >
              <h3>{card.title}</h3>
              <p>{card.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* 🔹 FOOTER */}
      <footer className="footer">
        © 2026 Faith Cargo Pvt Ltd. All rights reserved.
      </footer>
    </div>
  );
}

export default AdminDashboard;
