import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, Package, Truck, Users, MapPin, 
  Calculator, FileText, Settings, LogOut, Menu, 
  X, TrendingUp, Clock, CheckCircle, AlertCircle,
  User, CreditCard, PlusCircle, Eye, BarChart3,
  Bell, Search, ChevronRight, Star, Shield
} from "lucide-react";
import "./AdminDashboard.css";
import "../styles/theme.css";
import bgImage from "../assets/truck-bg.jpg";
import logo from "../assets/logo.png";

function AdminDashboard() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notifications, setNotifications] = useState(3);
  const [adminName, setAdminName] = useState("Admin");

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const storedName = localStorage.getItem("adminName");
    if (storedName) setAdminName(storedName);
    return () => clearInterval(timer);
  }, []);

  // Logout function
  const logout = () => {
    localStorage.clear();
    navigate("/");
  };

  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Navigate helper
  const goTo = (path) => {
    navigate(path);
    setSidebarOpen(false);
  };

  // Dashboard stats
  const stats = [
    { label: "Total Shipments", value: "1,284", change: "+12%", icon: Package, color: "#4361ee" },
    { label: "Active Pickups", value: "48", change: "+5%", icon: Truck, color: "#f59e0b" },
    { label: "Delivered Today", value: "156", change: "+18%", icon: CheckCircle, color: "#10b981" },
    { label: "Pending Orders", value: "23", change: "-3%", icon: Clock, color: "#ef4444" }
  ];

  // Dashboard Cards with icons
  const dashboardCards = [
    { title: "Create Order", desc: "Create new shipment order", link: "/create-order", icon: PlusCircle, color: "#4361ee", badge: "New" },
    { title: "Shipment Details", desc: "View and track shipments", link: "/shipment-details", icon: Eye, color: "#3b82f6", badge: "Live" },
    { title: "FCPL Rate Calculator", desc: "Calculate shipment rates", link: "/fcpl-rate", icon: Calculator, color: "#8b5cf6" },
    { title: "Pickup Request", desc: "Manage pickup requests", link: "/pickup", icon: Truck, color: "#f59e0b", badge: "Urgent" },
    { title: "Vendor Manage", desc: "Fresh vendor management module", link: "/vendor-manage", icon: Users, color: "#10b981" },
    { title: "Vendor Rates", desc: "View vendor rate cards", link: "/vendor-rate", icon: CreditCard, color: "#ec4898" },
    { title: "Rate Update", desc: "Update shipping rates", link: "/rate-update", icon: TrendingUp, color: "#f97316" },
    { title: "Pincode Management", desc: "Manage service pincodes", link: "/pincode", icon: MapPin, color: "#06b6d4" },
    { title: "User Management", desc: "Add and manage users", link: "/user-add", icon: Users, color: "#6366f1" },
    { title: "BA & B2B Rate", desc: "Calculate BA & B2B shipment rates", link: "/ba-b2b-rate", icon: Calculator, color: "#14b8a6" }
  ];

  // Recent activities
  const recentActivities = [
    { action: "New order created", id: "FCPL2024001", time: "2 min ago", status: "success" },
    { action: "Pickup completed", id: "PK-2024-1234", time: "15 min ago", status: "info" },
    { action: "Rate updated", id: "Mumbai-Delhi", time: "1 hour ago", status: "warning" },
    { action: "New vendor added", id: "Vendor #458", time: "3 hours ago", status: "success" }
  ];

  return (
    <div className="admin-dashboard-new">
      {/* Overlay for mobile */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}

      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <button className="menu-toggle" onClick={toggleSidebar}>
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="logo-area">
            <img src={logo} alt="Faith Cargo" className="header-logo" />
            <div className="logo-text">
              <h1>Faith Cargo</h1>
              <span>Admin Dashboard</span>
            </div>
          </div>
        </div>

        <div className="header-right">
          <div className="datetime">
            <Clock size={16} />
            <span>{currentTime.toLocaleTimeString()}</span>
            <span className="date">{currentTime.toLocaleDateString()}</span>
          </div>
          
          <div className="notification-bell">
            <Bell size={20} />
            {notifications > 0 && <span className="notification-badge">{notifications}</span>}
          </div>
          
          <div className="admin-profile">
            <div className="profile-avatar">
              <User size={18} />
            </div>
            <div className="profile-info">
              <span className="profile-name">{adminName}</span>
              <span className="profile-role">Administrator</span>
            </div>
            <button className="logout-button" onClick={logout}>
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Shield size={28} color="#d32f2f" />
            <span>FCPL Portal</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-item active" onClick={() => goTo("/admin")}>
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
            </div>
          </div>

          <div className="nav-section">
            <div className="nav-label">Orders</div>
            <div className="nav-item" onClick={() => goTo("/create-order")}>
              <PlusCircle size={20} />
              <span>Create Order</span>
            </div>
            <div className="nav-item" onClick={() => goTo("/shipment-details")}>
              <Package size={20} />
              <span>Shipment Details</span>
            </div>
            <div className="nav-item" onClick={() => goTo("/pickup")}>
              <Truck size={20} />
              <span>Pickup Request</span>
            </div>
          </div>

          <div className="nav-section">
            <div className="nav-label">Rates & Pricing</div>
            <div className="nav-item" onClick={() => goTo("/fcpl-rate")}>
              <Calculator size={20} />
              <span>FCPL Rate Calculator</span>
            </div>
            <div className="nav-item" onClick={() => goTo("/ba-b2b-rate")}>
              <BarChart3 size={20} />
              <span>BA & B2B Rate</span>
            </div>
            <div className="nav-item" onClick={() => goTo("/rate-update")}>
              <TrendingUp size={20} />
              <span>Rate Update</span>
            </div>
          </div>

          <div className="nav-section">
            <div className="nav-label">Management</div>
            <div className="nav-item" onClick={() => goTo("/vendor-manage")}>
              <Users size={20} />
              <span>Vendor Manage</span>
            </div>
            <div className="nav-item" onClick={() => goTo("/vendor-rate")}>
              <CreditCard size={20} />
              <span>Vendor Rates</span>
            </div>
            <div className="nav-item" onClick={() => goTo("/pincode")}>
              <MapPin size={20} />
              <span>Pincode Management</span>
            </div>
            <div className="nav-item" onClick={() => goTo("/user-add")}>
              <User size={20} />
              <span>User Management</span>
            </div>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="system-status">
            <div className="status-dot"></div>
            <span>System Online</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Welcome Banner */}
        <div className="welcome-banner">
          <div className="welcome-content">
            <h2>Welcome back, {adminName}!</h2>
            <p>Here's what's happening with your logistics today.</p>
          </div>
          <div className="quick-stats">
            <div className="quick-stat">
              <Star size={18} />
              <span>Premium Service</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            const isPositive = stat.change.startsWith("+");
            return (
              <div key={index} className="stat-card" style={{ borderLeftColor: stat.color }}>
                <div className="stat-header">
                  <div className="stat-icon" style={{ background: `${stat.color}15`, color: stat.color }}>
                    <Icon size={24} />
                  </div>
                  <div className={`stat-change ${isPositive ? "positive" : "negative"}`}>
                    {stat.change}
                  </div>
                </div>
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            );
          })}
        </div>

        {/* Main Grid */}
        <div className="dashboard-grid">
          {/* Cards Section */}
          <div className="cards-section">
            <div className="section-header">
              <h3>Quick Access Modules</h3>
              <span className="section-badge">10 Modules</span>
            </div>
            <div className="card-grid">
              {dashboardCards.map((card, index) => {
                const Icon = card.icon;
                return (
                  <div
                    key={index}
                    className="dashboard-card"
                    onClick={() => goTo(card.link)}
                  >
                    <div className="card-icon" style={{ background: `${card.color}15`, color: card.color }}>
                      <Icon size={24} />
                    </div>
                    <div className="card-content">
                      <h4>{card.title}</h4>
                      <p>{card.desc}</p>
                    </div>
                    {card.badge && (
                      <div className={`card-badge ${card.badge === "New" ? "new" : "urgent"}`}>
                        {card.badge}
                      </div>
                    )}
                    <ChevronRight size={16} className="card-arrow" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Activity Sidebar */}
          <div className="activity-section">
            <div className="section-header">
              <h3>Recent Activity</h3>
              <button className="view-all">View All</button>
            </div>
            <div className="activity-list">
              {recentActivities.map((activity, index) => (
                <div key={index} className="activity-item">
                  <div className={`activity-icon ${activity.status}`}>
                    {activity.status === "success" && <CheckCircle size={14} />}
                    {activity.status === "info" && <Clock size={14} />}
                    {activity.status === "warning" && <AlertCircle size={14} />}
                  </div>
                  <div className="activity-details">
                    <div className="activity-action">{activity.action}</div>
                    <div className="activity-id">{activity.id}</div>
                  </div>
                  <div className="activity-time">{activity.time}</div>
                </div>
              ))}
            </div>

            {/* Quick Tip */}
            <div className="quick-tip">
              <div className="tip-icon">💡</div>
              <div className="tip-content">
                <strong>Pro Tip:</strong> Use voice commands with Jervice AI for faster tracking
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;