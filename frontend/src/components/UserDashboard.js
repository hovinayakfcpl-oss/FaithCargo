import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, Package, Truck, Users, Settings, 
  LogOut, ChevronLeft, ChevronRight, User, Bell,
  CreditCard, MapPin, TrendingUp, Calculator, 
  FileText, PlusCircle, ClipboardList, Menu, X,
  Sun, Moon, Home, HelpCircle, Award, Crown,
  BarChart3, FileSpreadsheet, Receipt, Shield,
  DollarSign as DollarSignIcon
} from "lucide-react";
import "./UserDashboard.css";

function UserDashboard() {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [userStats, setUserStats] = useState({
    totalShipments: 0,
    activePickups: 0,
    totalOrders: 0,
    totalRevenue: 0
  });

  // Get user data from localStorage
  const userName = localStorage.getItem("username") || "User";
  const userEmail = localStorage.getItem("userEmail") || "";
  const userCompany = localStorage.getItem("userCompany") || "";
  const userRole = localStorage.getItem("userRole") || "user";
  const userId = localStorage.getItem("userId") || "1";

  // Get modules from login (only selected modules will appear)
  const modules = JSON.parse(localStorage.getItem("userModules") || "{}");

  // Update time and greeting
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 17) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
    
    return () => clearInterval(timer);
  }, []);

  // Load dark mode preference
  useEffect(() => {
    const savedTheme = localStorage.getItem("darkMode");
    if (savedTheme === "true") {
      setDarkMode(true);
      document.body.classList.add("dark-mode");
    }
  }, []);

  // Fetch user stats from API
  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        const response = await fetch(`https://faithcargo.onrender.com/api/user/user-stats/${userId}/`);
        if (response.ok) {
          const data = await response.json();
          setUserStats({
            totalShipments: data.shipment_count || 0,
            activePickups: Math.floor(Math.random() * 10), // Placeholder
            totalOrders: data.order_count || 0,
            totalRevenue: data.total_freight || 0
          });
        }
      } catch (error) {
        console.error("Error fetching user stats:", error);
      }
    };
    
    fetchUserStats();
  }, [userId]);

  // Mock notifications (replace with API call)
  useEffect(() => {
    const mockNotifications = [
      { id: 1, title: "New shipment created", time: "5 min ago", read: false },
      { id: 2, title: "Rate update available", time: "1 hour ago", read: false },
      { id: 3, title: "Pickup assigned to you", time: "3 hours ago", read: true },
    ];
    setNotifications(mockNotifications);
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    localStorage.setItem("darkMode", !darkMode);
    document.body.classList.toggle("dark-mode");
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/user-login");
  };

  const markNotificationRead = (id) => {
    setNotifications(notifications.map(notif => 
      notif.id === id ? { ...notif, read: true } : notif
    ));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Module configuration - ONLY THESE MODULES (No Invoice/Reports)
  const moduleConfig = [
    { key: "fcpl_rate", path: "/fcpl-rate", icon: Calculator, title: "FCPL Rate Calculator", desc: "Calculate freight rates", color: "#d32f2f" },
    { key: "ba_b2b", path: "/ba-b2b-rate", icon: TrendingUp, title: "BA & B2B Rate", desc: "Business rates", color: "#2563eb" },
    { key: "pickup", path: "/pickup", icon: Truck, title: "Pickup Request", desc: "Manage pickups", color: "#10b981" },
    { key: "vendor_manage", path: "/vendor-manage", icon: Users, title: "Vendor Manage", desc: "Manage vendors", color: "#8b5cf6" },
    { key: "vendor_rates", path: "/vendor-rate", icon: CreditCard, title: "Vendor Rates", desc: "View vendor rates", color: "#f59e0b" },
    { key: "rate_update", path: "/rate-update", icon: TrendingUp, title: "Rate Update", desc: "Update rates", color: "#ec4898" },
    { key: "pincode", path: "/pincode", icon: MapPin, title: "Pincode Management", desc: "Manage pincodes", color: "#14b8a6" },
    { key: "user_management", path: "/user-management", icon: Shield, title: "User Management", desc: "Manage users", color: "#6366f1" },
    { key: "create_order", path: "/create-order", icon: PlusCircle, title: "Create Order", desc: "Create new order", color: "#d32f2f" },
    { key: "shipment_details", path: "/shipment-details", icon: ClipboardList, title: "Shipment Details", desc: "View shipments", color: "#3b82f6" },
  ];

  // Filter modules based on user permissions from login
  const availableModules = moduleConfig.filter(module => modules[module.key] === true);

  // Debug: Log available modules
  console.log("User Modules from Login:", modules);
  console.log("Available Modules for User:", availableModules);

  return (
    <div className={`user-dashboard ${darkMode ? "dark" : ""}`}>
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
        <div className="sidebar-header">
          <div className="logo-area">
            <div className="logo-icon">FC</div>
            {!sidebarCollapsed && <span className="logo-text">Faith Cargo</span>}
          </div>
          <button className="collapse-btn" onClick={toggleSidebar}>
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <div className="user-info">
          <div className="user-avatar">
            {userName.charAt(0).toUpperCase()}
          </div>
          {!sidebarCollapsed && (
            <div className="user-details">
              <h4>{userName}</h4>
              <p>{userCompany || "Staff User"}</p>
              {userEmail && <small>{userEmail}</small>}
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          <button className="nav-item active" onClick={() => navigate("/user-dashboard")}>
            <LayoutDashboard size={20} />
            {!sidebarCollapsed && <span>Dashboard</span>}
          </button>
          
          {availableModules.length > 0 ? (
            availableModules.map((module) => (
              <button 
                key={module.key}
                className="nav-item"
                onClick={() => navigate(module.path)}
              >
                <module.icon size={20} style={{ color: module.color }} />
                {!sidebarCollapsed && (
                  <div className="nav-text">
                    <span>{module.title}</span>
                    <small>{module.desc}</small>
                  </div>
                )}
              </button>
            ))
          ) : (
            <div className="no-modules-msg">
              {!sidebarCollapsed && <span>No modules assigned</span>}
            </div>
          )}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item" onClick={toggleDarkMode}>
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            {!sidebarCollapsed && <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>}
          </button>
          <button className="nav-item logout" onClick={handleLogout}>
            <LogOut size={20} />
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Top Header */}
        <header className="top-header">
          <div className="header-left">
            <button className="mobile-menu-btn" onClick={toggleSidebar}>
              <Menu size={24} />
            </button>
            <div className="greeting">
              <h2>{greeting}, {userName}!</h2>
              <p>{currentTime.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
          
          <div className="header-right">
            <div className="notification-wrapper">
              <button 
                className="notification-btn"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell size={20} />
                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
              </button>
              
              {showNotifications && (
                <div className="notification-dropdown">
                  <div className="notification-header">
                    <h4>Notifications</h4>
                    <button onClick={() => setNotifications(notifications.map(n => ({ ...n, read: true })))}>
                      Mark all read
                    </button>
                  </div>
                  <div className="notification-list">
                    {notifications.length === 0 ? (
                      <p className="no-notifications">No notifications</p>
                    ) : (
                      notifications.map(notif => (
                        <div 
                          key={notif.id} 
                          className={`notification-item ${!notif.read ? 'unread' : ''}`}
                          onClick={() => markNotificationRead(notif.id)}
                        >
                          <div className="notification-content">
                            <p>{notif.title}</p>
                            <span>{notif.time}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="user-profile">
              <div className="profile-avatar">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="profile-info">
                <span className="profile-name">{userName}</span>
                <span className="profile-role">User</span>
              </div>
            </div>
          </div>
        </header>

        {/* Stats Cards - Show real data from API */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue">
              <Package size={24} />
            </div>
            <div className="stat-info">
              <h3>{userStats.totalShipments}</h3>
              <p>Total Shipments</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">
              <Truck size={24} />
            </div>
            <div className="stat-info">
              <h3>{userStats.activePickups}</h3>
              <p>Active Pickups</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon orange">
              <FileText size={24} />
            </div>
            <div className="stat-info">
              <h3>{userStats.totalOrders}</h3>
              <p>Total Orders</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple">
              <DollarSignIcon size={24} />
            </div>
            <div className="stat-info">
              <h3>₹{userStats.totalRevenue.toLocaleString()}</h3>
              <p>Total Revenue</p>
            </div>
          </div>
        </div>

        {/* Welcome Section */}
        <div className="welcome-section">
          <div className="welcome-card">
            <div className="welcome-content">
              <h3>Welcome to Faith Cargo Logistics</h3>
              <p>Select any module from the sidebar to get started with your work.</p>
              {availableModules.length > 0 && (
                <div className="module-tips">
                  {availableModules.slice(0, 4).map(module => (
                    <span key={module.key} className="tip-badge">
                      <module.icon size={14} />
                      {module.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="welcome-icon">
              <Award size={80} />
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="recent-section">
          <div className="section-header">
            <h3>Recent Activity</h3>
            <button className="view-all">View All</button>
          </div>
          <div className="activity-list">
            <div className="activity-item">
              <div className="activity-icon">
                <Package size={16} />
              </div>
              <div className="activity-details">
                <p>No recent activity</p>
                <span>Your recent actions will appear here</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions - Only show assigned modules */}
        {availableModules.length > 0 && (
          <div className="quick-actions">
            <h3>Quick Actions</h3>
            <div className="actions-grid">
              {availableModules.slice(0, 6).map(module => (
                <button 
                  key={module.key}
                  className="action-card"
                  onClick={() => navigate(module.path)}
                >
                  <module.icon size={24} style={{ color: module.color }} />
                  <span>{module.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// DollarSign icon component
const DollarSign = ({ size, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="12" y1="1" x2="12" y2="23"></line>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
  </svg>
);

export default UserDashboard;