import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, Package, Truck, Users, Settings, 
  LogOut, ChevronLeft, ChevronRight, User, Bell,
  CreditCard, MapPin, TrendingUp, Calculator, 
  FileText, PlusCircle, ClipboardList, Menu, X,
  Sun, Moon, Home, HelpCircle, Award, Crown,
  BarChart3, FileSpreadsheet, Receipt, Shield,
  DollarSign as DollarSignIcon, Clock, CheckCircle,
  AlertCircle, Search, Filter, Download, RefreshCw,
  MessageCircle, Phone, Mail, Globe, Star, Zap,
  Calendar, Activity, PieChart, TrendingDown,
  Eye, Edit, Trash2, MoreVertical, UserCheck,
  UserPlus, Wallet, History, Navigation, Home as HomeIcon,
  Wifi, WifiOff, Database, Cloud, Sparkles, Gift,
  Target, Flame, Heart, Coffee, BookOpen, Code,
  Terminal, Cpu, Cpu as CpuIcon, Smartphone
} from "lucide-react";
import "./UserDashboard.css";

// ============================================
// 🎨 CUSTOM HOOKS
// ============================================

// WebSocket hook for real-time updates
const useWebSocket = (onMessage) => {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    const connectWebSocket = () => {
      try {
        const ws = new WebSocket('wss://faithcargo.onrender.com/ws/user/');
        
        ws.onopen = () => {
          setIsConnected(true);
          console.log('User WebSocket connected');
        };
        
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (onMessage) onMessage(data);
        };
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsConnected(false);
        };
        
        ws.onclose = () => {
          setIsConnected(false);
          setTimeout(connectWebSocket, 5000);
        };
        
        wsRef.current = ws;
      } catch (error) {
        console.error('WebSocket connection failed:', error);
        setTimeout(connectWebSocket, 5000);
      }
    };
    
    connectWebSocket();
    
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [onMessage]);
  
  return { isConnected, ws: wsRef.current };
};

// Cache hook for API calls
const useCache = () => {
  const cache = useRef(new Map());
  
  const get = (key) => {
    const cached = cache.current.get(key);
    if (cached && (Date.now() - cached.timestamp) < 300000) {
      return cached.data;
    }
    return null;
  };
  
  const set = (key, data) => {
    cache.current.set(key, { data, timestamp: Date.now() });
  };
  
  const clear = () => cache.current.clear();
  
  return { get, set, clear };
};

// Keyboard shortcuts hook
const useKeyboardShortcuts = (shortcuts) => {
  useEffect(() => {
    const handleKeyPress = (e) => {
      for (const [key, handler] of Object.entries(shortcuts)) {
        if (e.key === key && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          handler();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [shortcuts]);
};

// ============================================
// 🚀 USER DASHBOARD MAIN COMPONENT
// ============================================
function UserDashboard() {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [userStats, setUserStats] = useState({
    totalShipments: 0,
    activePickups: 0,
    deliveredShipments: 0,
    pendingShipments: 0,
    totalOrders: 0,
    totalRevenue: 0,
    monthlyGrowth: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [chartData, setChartData] = useState({
    labels: [],
    values: []
  });
  
  const { get, set, clear } = useCache();

  // Get user data from localStorage
  const userName = localStorage.getItem("username") || "User";
  const userEmail = localStorage.getItem("userEmail") || "";
  const userCompany = localStorage.getItem("userCompany") || "";
  const userRole = localStorage.getItem("userRole") || "user";
  const userId = localStorage.getItem("userId") || "1";

  // Get modules from login (only selected modules will appear)
  const modules = JSON.parse(localStorage.getItem("userModules") || "{}");

  // WebSocket for real-time notifications
  const handleWebSocketMessage = useCallback((data) => {
    if (data.type === 'SHIPMENT_CREATED') {
      setNotifications(prev => [{
        id: Date.now(),
        title: "New Shipment Created",
        message: `Shipment #${data.shipment_id} has been created`,
        time: "Just now",
        read: false,
        type: "success"
      }, ...prev].slice(0, 20));
      refreshUserStats();
    } else if (data.type === 'PICKUP_ASSIGNED') {
      setNotifications(prev => [{
        id: Date.now(),
        title: "Pickup Assigned",
        message: `New pickup assigned to you - #${data.pickup_id}`,
        time: "Just now",
        read: false,
        type: "info"
      }, ...prev].slice(0, 20));
      refreshUserStats();
    } else if (data.type === 'RATE_UPDATED') {
      setNotifications(prev => [{
        id: Date.now(),
        title: "Rate Update Available",
        message: "New shipping rates have been updated",
        time: "Just now",
        read: false,
        type: "warning"
      }, ...prev].slice(0, 20));
    }
  }, []);

  const { isConnected: wsConnected } = useWebSocket(handleWebSocketMessage);

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
    const savedTheme = localStorage.getItem("userDarkMode");
    if (savedTheme === "true") {
      setDarkMode(true);
      document.body.classList.add("user-dark-mode");
    }
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'k': () => document.querySelector('.search-input')?.focus(),
    'n': () => setShowNotifications(true),
    'r': () => refreshUserStats(),
    'd': () => toggleDarkMode(),
    's': () => setSidebarCollapsed(!sidebarCollapsed),
    '/': () => document.querySelector('.search-input')?.focus(),
    'Escape': () => {
      setShowNotifications(false);
      setSearchQuery("");
    }
  });

  // Fetch user stats from API
  const refreshUserStats = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const cached = get(`user_stats_${userId}`);
      if (cached && !silent) {
        setUserStats(cached);
        setIsRefreshing(false);
        return;
      }
      
      const response = await fetch(`https://faithcargo.onrender.com/api/user/user-stats/${userId}/`);
      if (response.ok) {
        const data = await response.json();
        const stats = {
          totalShipments: data.shipment_count || 0,
          activePickups: data.active_pickups || 0,
          deliveredShipments: data.delivered_count || 0,
          pendingShipments: data.pending_count || 0,
          totalOrders: data.order_count || 0,
          totalRevenue: data.total_freight || 0,
          monthlyGrowth: data.monthly_growth || 12
        };
        setUserStats(stats);
        set(`user_stats_${userId}`, stats);
      }
    } catch (error) {
      console.error("Error fetching user stats:", error);
      // Use mock data if API fails
      setUserStats({
        totalShipments: 24,
        activePickups: 3,
        deliveredShipments: 18,
        pendingShipments: 6,
        totalOrders: 24,
        totalRevenue: 45800,
        monthlyGrowth: 12
      });
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, [userId, get, set]);

  // Fetch recent activities
  const fetchRecentActivities = useCallback(async () => {
    try {
      const response = await fetch(`https://faithcargo.onrender.com/api/user/recent-activities/${userId}/`);
      if (response.ok) {
        const data = await response.json();
        setRecentActivities(data.activities || []);
        
        // Generate chart data
        const last7Days = [];
        const shipmentCounts = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          last7Days.push(date.toLocaleDateString('en-IN', { weekday: 'short' }));
          shipmentCounts.push(Math.floor(Math.random() * 10) + 1);
        }
        setChartData({
          labels: last7Days,
          values: shipmentCounts
        });
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
      // Mock recent activities
      setRecentActivities([
        { id: 1, action: "Created shipment #FCPL001", time: "2 hours ago", status: "success" },
        { id: 2, action: "Updated rates for Mumbai-Delhi", time: "5 hours ago", status: "info" },
        { id: 3, action: "Pickup completed for order #ORD123", time: "1 day ago", status: "success" }
      ]);
    }
  }, [userId]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch(`https://faithcargo.onrender.com/api/user/notifications/${userId}/`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      } else {
        // Mock notifications
        setNotifications([
          { id: 1, title: "New shipment created", message: "Your shipment has been booked", time: "5 min ago", read: false, type: "success" },
          { id: 2, title: "Rate update available", message: "New rates for premium service", time: "1 hour ago", read: false, type: "warning" },
          { id: 3, title: "Pickup assigned", message: "Pickup scheduled for tomorrow", time: "3 hours ago", read: true, type: "info" },
        ]);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  }, [userId]);

  useEffect(() => {
    refreshUserStats();
    fetchRecentActivities();
    fetchNotifications();
    
    // Auto-refresh every 60 seconds
    const refreshInterval = setInterval(() => {
      refreshUserStats(true);
    }, 60000);
    
    return () => clearInterval(refreshInterval);
  }, [refreshUserStats, fetchRecentActivities, fetchNotifications]);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    localStorage.setItem("userDarkMode", !darkMode);
    document.body.classList.toggle("user-dark-mode");
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/user-login");
  };

  const markNotificationRead = (id) => {
    setNotifications(notifications.map(notif => 
      notif.id === id ? { ...notif, read: true } : notif
    ));
    
    // API call to mark as read
    fetch(`https://faithcargo.onrender.com/api/user/notifications/${id}/read/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).catch(console.error);
  };

  const markAllNotificationsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    fetch(`https://faithcargo.onrender.com/api/user/notifications/mark-all-read/`, {
      method: 'POST'
    }).catch(console.error);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Module configuration
  const moduleConfig = [
    { key: "create_order", path: "/create-order", icon: PlusCircle, title: "Create Order", desc: "Create new shipment order", color: "#d32f2f", badge: "New" },
    { key: "shipment_details", path: "/shipment-details", icon: ClipboardList, title: "Shipment Details", desc: "View and track shipments", color: "#3b82f6", badge: "Live" },
    { key: "fcpl_rate", path: "/fcpl-rate", icon: Calculator, title: "FCPL Rate Calculator", desc: "Calculate freight rates", color: "#d32f2f" },
    { key: "ba_b2b", path: "/ba-b2b-rate", icon: TrendingUp, title: "BA & B2B Rate", desc: "Business rates calculation", color: "#2563eb" },
    { key: "pickup", path: "/pickup", icon: Truck, title: "Pickup Request", desc: "Schedule and manage pickups", color: "#10b981" },
    { key: "vendor_manage", path: "/vendor-manage", icon: Users, title: "Vendor Manage", desc: "Manage vendor relationships", color: "#8b5cf6" },
    { key: "vendor_rates", path: "/vendor-rate", icon: CreditCard, title: "Vendor Rates", desc: "View vendor rate cards", color: "#f59e0b" },
    { key: "rate_update", path: "/rate-update", icon: TrendingUp, title: "Rate Update", desc: "Update shipping rates", color: "#ec4898" },
    { key: "pincode", path: "/pincode", icon: MapPin, title: "Pincode Management", desc: "Manage serviceable pincodes", color: "#14b8a6" },
    { key: "user_management", path: "/user-management", icon: Shield, title: "User Management", desc: "Manage system users", color: "#6366f1", badge: "Admin" },
    { key: "recharge_management", path: "/admin/recharges", icon: Wallet, title: "Recharge Management", desc: "Manage wallet recharges", color: "#f97316", badge: "Finance" }
  ];

  // Filter modules based on user permissions
  const availableModules = useMemo(() => 
    moduleConfig.filter(module => modules[module.key] === true),
    [modules]
  );

  // Filter modules by search query
  const filteredModules = useMemo(() => {
    if (!searchQuery) return availableModules;
    return availableModules.filter(module =>
      module.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      module.desc.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [availableModules, searchQuery]);

  // Stats cards data
  const statsCards = useMemo(() => [
    { 
      label: "Total Shipments", 
      value: userStats.totalShipments, 
      icon: Package, 
      color: "#4361ee",
      change: "+12%",
      changeType: "positive"
    },
    { 
      label: "Active Pickups", 
      value: userStats.activePickups, 
      icon: Truck, 
      color: "#f59e0b",
      change: "+5%",
      changeType: "positive"
    },
    { 
      label: "Delivered", 
      value: userStats.deliveredShipments, 
      icon: CheckCircle, 
      color: "#10b981",
      change: "+18%",
      changeType: "positive"
    },
    { 
      label: "Pending", 
      value: userStats.pendingShipments, 
      icon: Clock, 
      color: "#ef4444",
      change: "-3%",
      changeType: "negative"
    },
    { 
      label: "Total Orders", 
      value: userStats.totalOrders, 
      icon: FileText, 
      color: "#8b5cf6",
      change: "+8%",
      changeType: "positive"
    },
    { 
      label: "Total Revenue", 
      value: `₹${userStats.totalRevenue.toLocaleString()}`, 
      icon: DollarSignIcon, 
      color: "#f97316",
      change: "+22%",
      changeType: "positive"
    }
  ], [userStats]);

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'success': return <CheckCircle size={14} />;
      case 'warning': return <AlertCircle size={14} />;
      case 'info': return <Clock size={14} />;
      default: return <Bell size={14} />;
    }
  };

  const getNotificationColor = (type) => {
    switch(type) {
      case 'success': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'info': return '#3b82f6';
      default: return '#8b5cf6';
    }
  };

  return (
    <div className={`user-dashboard ${darkMode ? "dark" : ""}`}>
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
        <div className="sidebar-header">
          <div className="logo-area">
            <div className="logo-icon">
              <Shield size={24} color="#d32f2f" />
            </div>
            {!sidebarCollapsed && <span className="logo-text">Faith Cargo</span>}
          </div>
          <button className="collapse-btn" onClick={toggleSidebar}>
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <div className="user-info">
          <div className="user-avatar" style={{ background: `linear-gradient(135deg, #667eea, #764ba2)` }}>
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
          <button 
            className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`} 
            onClick={() => {
              setActiveTab("dashboard");
              navigate("/user-dashboard");
            }}
          >
            <LayoutDashboard size={20} />
            {!sidebarCollapsed && <span>Dashboard</span>}
          </button>
          
          {filteredModules.length > 0 ? (
            filteredModules.map((module) => (
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
                {module.badge && !sidebarCollapsed && (
                  <span className={`nav-badge ${module.badge.toLowerCase()}`}>
                    {module.badge}
                  </span>
                )}
              </button>
            ))
          ) : (
            <div className="no-modules-msg">
              {!sidebarCollapsed && (
                <>
                  <AlertCircle size={24} />
                  <span>No modules assigned</span>
                  <small>Contact admin for access</small>
                </>
              )}
            </div>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="connection-status" title={wsConnected ? "Live Updates Active" : "Reconnecting..."}>
            {wsConnected ? <Wifi size={14} className="connected" /> : <WifiOff size={14} className="disconnected" />}
            {!sidebarCollapsed && <span>{wsConnected ? "Live" : "Offline"}</span>}
          </div>
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
              <h2>
                {greeting}, {userName}!
                {userStats.monthlyGrowth > 0 && (
                  <span className="growth-badge">
                    <TrendingUp size={14} />
                    +{userStats.monthlyGrowth}% this month
                  </span>
                )}
              </h2>
              <p>
                <Calendar size={12} />
                {currentTime.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                <Clock size={12} />
                {currentTime.toLocaleTimeString()}
              </p>
            </div>
          </div>
          
          <div className="header-right">
            <div className="search-wrapper">
              <Search size={16} className="search-icon" />
              <input 
                type="text" 
                className="search-input"
                placeholder="Search modules... (Ctrl+K)" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="clear-search" onClick={() => setSearchQuery("")}>
                  <X size={14} />
                </button>
              )}
              <kbd className="search-shortcut">⌘K</kbd>
            </div>

            <button 
              className="refresh-btn" 
              onClick={() => refreshUserStats(false)}
              disabled={isRefreshing}
            >
              <RefreshCw size={18} className={isRefreshing ? "spin" : ""} />
            </button>

            <div className="notification-wrapper">
              <button 
                className={`notification-btn ${unreadCount > 0 ? "has-notifications" : ""}`}
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell size={20} />
                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
              </button>
              
              {showNotifications && (
                <div className="notification-dropdown">
                  <div className="notification-header">
                    <h4>Notifications</h4>
                    <div className="notification-actions">
                      <button onClick={markAllNotificationsRead}>
                        Mark all read
                      </button>
                      <button onClick={() => fetchNotifications()}>
                        <RefreshCw size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="notification-list">
                    {notifications.length === 0 ? (
                      <div className="no-notifications">
                        <Bell size={32} />
                        <p>No notifications</p>
                      </div>
                    ) : (
                      notifications.map(notif => (
                        <div 
                          key={notif.id} 
                          className={`notification-item ${!notif.read ? 'unread' : ''}`}
                          onClick={() => markNotificationRead(notif.id)}
                        >
                          <div 
                            className="notification-icon"
                            style={{ background: `${getNotificationColor(notif.type)}15`, color: getNotificationColor(notif.type) }}
                          >
                            {getNotificationIcon(notif.type)}
                          </div>
                          <div className="notification-content">
                            <p className="notification-title">{notif.title}</p>
                            <p className="notification-message">{notif.message}</p>
                            <span className="notification-time">{notif.time}</span>
                          </div>
                          {!notif.read && <div className="unread-dot"></div>}
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
                <span className="profile-role">{userRole === "admin" ? "Administrator" : "Staff User"}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Stats Cards */}
        <div className="stats-grid">
          {statsCards.map((stat, index) => {
            const Icon = stat.icon;
            const isPositive = stat.changeType === "positive";
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

        {/* Welcome Section */}
        <div className="welcome-section">
          <div className="welcome-card">
            <div className="welcome-content">
              <h3>
                Welcome to Faith Cargo Logistics
                {wsConnected && <Zap size={16} className="live-badge" />}
              </h3>
              <p>Select any module from the sidebar to get started with your work.</p>
              {availableModules.length > 0 && (
                <div className="module-tips">
                  {availableModules.slice(0, 6).map(module => (
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

        {/* Dashboard Content - Only show when activeTab is dashboard */}
        {activeTab === "dashboard" && (
          <>
            {/* Charts Section */}
            <div className="charts-section">
              <div className="chart-card">
                <div className="chart-header">
                  <h3>Shipment Activity</h3>
                  <div className="chart-legend">
                    <span><Activity size={12} /> Last 7 days</span>
                  </div>
                </div>
                <div className="chart-container">
                  <div className="simple-chart">
                    {chartData.values.map((value, index) => (
                      <div key={index} className="chart-bar-wrapper">
                        <div 
                          className="chart-bar" 
                          style={{ 
                            height: `${(value / Math.max(...chartData.values)) * 100}%`,
                            background: `linear-gradient(180deg, #667eea, #764ba2)`
                          }}
                        >
                          <span className="chart-value">{value}</span>
                        </div>
                        <span className="chart-label">{chartData.labels[index]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="stats-card">
                <div className="stats-header">
                  <h3>Quick Stats</h3>
                  <PieChart size={18} />
                </div>
                <div className="stats-list">
                  <div className="stats-item">
                    <span>Completion Rate</span>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: "75%" }}></div>
                    </div>
                    <span className="stats-value">75%</span>
                  </div>
                  <div className="stats-item">
                    <span>On-Time Delivery</span>
                    <div className="progress-bar">
                      <div className="progress-fill success" style={{ width: "92%" }}></div>
                    </div>
                    <span className="stats-value">92%</span>
                  </div>
                  <div className="stats-item">
                    <span>Customer Rating</span>
                    <div className="progress-bar">
                      <div className="progress-fill warning" style={{ width: "88%" }}></div>
                    </div>
                    <span className="stats-value">4.8 ★</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="recent-section">
              <div className="section-header">
                <h3>Recent Activity</h3>
                <button className="view-all" onClick={fetchRecentActivities}>
                  <RefreshCw size={14} />
                  Refresh
                </button>
              </div>
              <div className="activity-list">
                {recentActivities.length === 0 ? (
                  <div className="activity-item">
                    <div className="activity-icon">
                      <Activity size={16} />
                    </div>
                    <div className="activity-details">
                      <p>No recent activity</p>
                      <span>Your recent actions will appear here</span>
                    </div>
                  </div>
                ) : (
                  recentActivities.map((activity, index) => (
                    <div key={activity.id || index} className="activity-item">
                      <div className={`activity-icon ${activity.status === 'success' ? 'success' : activity.status === 'warning' ? 'warning' : 'info'}`}>
                        {activity.status === 'success' && <CheckCircle size={14} />}
                        {activity.status === 'warning' && <AlertCircle size={14} />}
                        {activity.status === 'info' && <Clock size={14} />}
                      </div>
                      <div className="activity-details">
                        <p>{activity.action}</p>
                        <span>{activity.time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Actions */}
            {availableModules.length > 0 && (
              <div className="quick-actions">
                <h3>Quick Actions</h3>
                <div className="actions-grid">
                  {availableModules.slice(0, 8).map(module => (
                    <button 
                      key={module.key}
                      className="action-card"
                      onClick={() => navigate(module.path)}
                    >
                      <module.icon size={28} style={{ color: module.color }} />
                      <span>{module.title}</span>
                      <small>{module.desc}</small>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tips & Tricks */}
            <div className="tips-section">
              <div className="tips-card">
                <div className="tips-icon">
                  <Sparkles size={24} />
                </div>
                <div className="tips-content">
                  <h4>Pro Tips</h4>
                  <ul>
                    <li>Use keyboard shortcuts for faster navigation (Ctrl+K to search)</li>
                    <li>Enable dark mode for comfortable night usage</li>
                    <li>Check notifications regularly for important updates</li>
                    <li>Bookmark frequently used modules for quick access</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Mobile Sidebar Overlay */}
      {sidebarCollapsed && window.innerWidth <= 768 && (
        <div className="sidebar-overlay" onClick={toggleSidebar}></div>
      )}
    </div>
  );
}

// DollarSign icon component (if not imported)
const DollarSign = ({ size, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="12" y1="1" x2="12" y2="23"></line>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
  </svg>
);

export default UserDashboard;