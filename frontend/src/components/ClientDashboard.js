import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  Calculator, Package, Truck, LogOut, User, 
  TrendingUp, Clock, CheckCircle, AlertCircle,
  Search, FileText, Download, Printer, Eye,
  ChevronRight, Bell, Menu, X, Star, 
  Shield, Zap, Globe, Phone, Mail, MapPin,
  DollarSign, Calendar, Hash, Box, Weight,
  Navigation, Home, BarChart3, Settings,
  HelpCircle, CreditCard, Award, Target,
  Gift, Sparkles, Rocket, BadgeCheck, 
  LineChart, PieChart, Activity, Users,
  Headphones, MessageCircle, ThumbsUp,
  Sun, Moon, Filter, DownloadCloud, RefreshCw,
  Heart, Wallet, PlusCircle, History
} from "lucide-react";
import "./ClientDashboard.css";

function ClientDashboard() {
  const navigate = useNavigate();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [trackingId, setTrackingId] = useState("");
  const [trackingResult, setTrackingResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recentShipments, setRecentShipments] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [rechargeMethod, setRechargeMethod] = useState("UPI");
  const [recharging, setRecharging] = useState(false);
  const [walletData, setWalletData] = useState({
    balance: 0,
    total_recharged: 0,
    total_spent: 0,
    low_balance_warning: null
  });
  const [rechargeHistory, setRechargeHistory] = useState([]);
  const [showRechargeHistory, setShowRechargeHistory] = useState(false);
  const [stats, setStats] = useState({
    totalShipments: 0,
    delivered: 0,
    inTransit: 0,
    pending: 0,
    totalFreight: 0,
    avgDeliveryTime: 0,
    onTimeRate: 98
  });

  const clientName = localStorage.getItem("clientName") || localStorage.getItem("username") || "Client";
  const clientId = localStorage.getItem("clientId");
  const clientEmail = localStorage.getItem("clientEmail") || "client@faithcargo.com";
  const clientCompany = localStorage.getItem("clientCompany") || clientName;

  // Fetch wallet balance on load
  useEffect(() => {
    fetchWalletBalance();
    fetchRechargeHistory();
  }, []);

  const fetchWalletBalance = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://faithcargo.onrender.com/api/user/wallet/balance/`, {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setWalletData({
          balance: data.balance || 0,
          total_recharged: data.total_recharged || 0,
          total_spent: data.total_spent || 0,
          low_balance_warning: data.low_balance_warning
        });
      }
    } catch (error) {
      console.error("Error fetching wallet balance:", error);
    }
  };

  const fetchRechargeHistory = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://faithcargo.onrender.com/api/user/wallet/recharge-history/`, {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setRechargeHistory(data.history || []);
      }
    } catch (error) {
      console.error("Error fetching recharge history:", error);
    }
  };

  const handleRechargeRequest = async () => {
    if (!rechargeAmount || parseFloat(rechargeAmount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    setRecharging(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://faithcargo.onrender.com/api/user/wallet/recharge-request/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: parseFloat(rechargeAmount),
          payment_method: rechargeMethod,
          reference_number: `REF_${Date.now()}`
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`✅ Recharge request submitted!\nAmount: ₹${rechargeAmount}\nStatus: ${data.status}`);
        setShowRechargeModal(false);
        setRechargeAmount("");
        fetchWalletBalance();
        fetchRechargeHistory();
      } else {
        const error = await response.json();
        alert(`❌ Recharge failed: ${error.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Recharge error:", error);
      alert("❌ Network error. Please try again.");
    } finally {
      setRecharging(false);
    }
  };

  // Dark mode effect
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setDarkMode(true);
      document.body.classList.add("dark-mode");
    }
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.body.classList.add("dark-mode");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.remove("dark-mode");
      localStorage.setItem("theme", "light");
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([fetchShipmentStats(), fetchRecentShipments(), fetchWalletBalance()]);
    setTimeout(() => setRefreshing(false), 1000);
  };

  useEffect(() => {
    fetchShipmentStats();
    fetchRecentShipments();
  }, []);

  const fetchShipmentStats = async () => {
    try {
      const response = await fetch(`https://faithcargo.onrender.com/api/shipments/dashboard-stats/?clientId=${clientId}`);
      if (response.ok) {
        const data = await response.json();
        setStats(prev => ({
          ...prev,
          totalShipments: data.total || 0,
          delivered: data.delivered || 0,
          inTransit: data.in_transit || 0,
          pending: data.booked || 0
        }));
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchRecentShipments = async () => {
    try {
      const response = await fetch(`https://faithcargo.onrender.com/api/shipments/client/${clientId}/orders/`);
      if (response.ok) {
        const data = await response.json();
        setRecentShipments(data.slice(0, 5));
      }
    } catch (error) {
      console.error("Error fetching shipments:", error);
    }
  };

  const handleTrackShipment = async () => {
    if (!trackingId.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`https://faithcargo.onrender.com/api/shipments/shipment/${trackingId}`);
      if (response.ok) {
        const data = await response.json();
        setTrackingResult(data);
      } else {
        alert("Shipment not found");
      }
    } catch (error) {
      console.error("Tracking error:", error);
      alert("Error tracking shipment");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  const handleNavigation = (path) => {
    window.location.href = path;
  };

  const modules = [
    {
      id: "rate",
      title: "Rate Calculator",
      description: "Calculate freight rates instantly with zone-based pricing",
      icon: <Calculator size={28} />,
      path: "/ba-b2b-rate-calculator",
      color: "#3b82f6",
      bgColor: "#eff6ff",
      gradient: "linear-gradient(135deg, #3b82f6, #2563eb)",
      features: ["Zone-based rates", "Real-time calculation", "GST included", "Fuel surcharge"]
    },
    {
      id: "order",
      title: "Create Order",
      description: "Book new shipment orders with instant LR generation",
      icon: <Package size={28} />,
      path: "/create-order",
      color: "#10b981",
      bgColor: "#ecfdf5",
      gradient: "linear-gradient(135deg, #10b981, #059669)",
      features: ["Instant LR generation", "Multiple invoices", "E-way bill support", "Auto AWB"]
    },
    {
      id: "shipment",
      title: "Shipment Details",
      description: "Track and manage all your shipments in one place",
      icon: <Truck size={28} />,
      path: "/shipment-details",
      color: "#f59e0b",
      bgColor: "#fffbeb",
      gradient: "linear-gradient(135deg, #f59e0b, #d97706)",
      features: ["Real-time tracking", "Status updates", "Download invoices", "Print docket"]
    }
  ];

  const quickActions = [
    { icon: <Calculator size={18} />, label: "Calculate Rate", path: "/ba-b2b-rate-calculator", color: "#3b82f6" },
    { icon: <Package size={18} />, label: "New Order", path: "/create-order", color: "#10b981" },
    { icon: <Search size={18} />, label: "Track Shipment", path: "/tracking", color: "#8b5cf6" },
    { icon: <Wallet size={18} />, label: "Recharge Wallet", action: "recharge", color: "#f59e0b" }
  ];

  const getStatusBadge = (status) => {
    const statusConfig = {
      delivered: { icon: <CheckCircle size={14} />, color: "#10b981", bg: "#d1fae5", text: "Delivered" },
      in_transit: { icon: <Truck size={14} />, color: "#3b82f6", bg: "#dbeafe", text: "In Transit" },
      booked: { icon: <Clock size={14} />, color: "#f59e0b", bg: "#fef3c7", text: "Booked" },
      picked: { icon: <CheckCircle size={14} />, color: "#8b5cf6", bg: "#ede9fe", text: "Picked" },
      out_for_delivery: { icon: <Truck size={14} />, color: "#ec4898", bg: "#fce7f3", text: "Out for Delivery" }
    };
    const config = statusConfig[status] || statusConfig.booked;
    return (
      <span className="status-badge" style={{ background: config.bg, color: config.color }}>
        {config.icon} {config.text}
      </span>
    );
  };

  return (
    <div className={`client-dashboard ${darkMode ? "dark" : ""}`}>
      {/* Sidebar */}
      <div className={`sidebar ${showMobileMenu ? "mobile-open" : ""}`}>
        <div className="sidebar-header">
          <div className="logo">
            <Shield size={32} className="logo-icon" />
            <div>
              <h2>Faith Cargo</h2>
              <p>Client Portal</p>
            </div>
          </div>
        </div>
        
        <div className="sidebar-user">
          <div className="user-avatar">
            <User size={32} />
          </div>
          <div className="user-info">
            <h4>{clientName}</h4>
            <p>{clientId}</p>
            <span className="premium-badge">
              <BadgeCheck size={12} /> Premium Client
            </span>
          </div>
        </div>

        {/* 🔥 NEW: Wallet Card in Sidebar */}
        <div className="sidebar-wallet">
          <div className="wallet-card">
            <div className="wallet-header">
              <Wallet size={18} />
              <span>Wallet Balance</span>
            </div>
            <div className="wallet-balance">
              ₹{walletData.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="wallet-stats">
              <div className="wallet-stat">
                <span>Total Recharged</span>
                <strong>₹{walletData.total_recharged.toLocaleString()}</strong>
              </div>
              <div className="wallet-stat">
                <span>Total Spent</span>
                <strong>₹{walletData.total_spent.toLocaleString()}</strong>
              </div>
            </div>
            {walletData.low_balance_warning && (
              <div className="wallet-warning">
                <AlertCircle size={14} />
                {walletData.low_balance_warning}
              </div>
            )}
            <div className="wallet-actions">
              <button className="recharge-btn" onClick={() => setShowRechargeModal(true)}>
                <PlusCircle size={16} /> Recharge
              </button>
              <button className="history-btn" onClick={() => setShowRechargeHistory(true)}>
                <History size={16} /> History
              </button>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button className="nav-item active" onClick={() => handleNavigation("/client-dashboard")}>
            <Home size={20} /> Dashboard
          </button>
          <button className="nav-item" onClick={() => handleNavigation("/ba-b2b-rate-calculator")}>
            <Calculator size={20} /> Rate Calculator
          </button>
          <button className="nav-item" onClick={() => handleNavigation("/create-order")}>
            <Package size={20} /> Create Order
          </button>
          <button className="nav-item" onClick={() => handleNavigation("/shipment-details")}>
            <Truck size={20} /> Shipment Details
          </button>
          <button className="nav-item" onClick={() => handleNavigation("/tracking")}>
            <Navigation size={20} /> Track Shipment
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="theme-toggle" onClick={toggleDarkMode}>
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
          </button>
          <button className="nav-item logout" onClick={handleLogout}>
            <LogOut size={20} /> Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Top Header */}
        <header className="top-header">
          <button className="mobile-menu-btn" onClick={() => setShowMobileMenu(!showMobileMenu)}>
            {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          <div className="header-search">
            <Search size={18} />
            <input type="text" placeholder="Search by LR, AWB, or destination..." />
          </div>

          <div className="header-actions">
            <button className="refresh-btn" onClick={refreshData} disabled={refreshing}>
              <RefreshCw size={18} className={refreshing ? "spin" : ""} />
            </button>
            <button className="notification-btn">
              <Bell size={20} />
              <span className="notification-dot"></span>
            </button>
            <div className="header-user">
              <div className="user-details">
                <span className="user-name">{clientName}</span>
                <span className="user-role">Client</span>
              </div>
              <div className="user-avatar-small">
                <User size={18} />
              </div>
            </div>
          </div>
        </header>

        {/* Welcome Banner */}
        <div className="welcome-banner">
          <div className="banner-content">
            <div className="banner-text">
              <h1>
                Welcome back, <span className="highlight">{clientName}</span>!
                <Sparkles size={24} className="sparkle" />
              </h1>
              <p>Your logistics dashboard is ready. Track shipments, calculate rates, and manage orders efficiently.</p>
              <div className="banner-stats-mini">
                <div className="mini-stat">
                  <Activity size={14} />
                  <span>Active Shipments: {stats.inTransit}</span>
                </div>
                <div className="mini-stat">
                  <ThumbsUp size={14} />
                  <span>On-Time Rate: {stats.onTimeRate}%</span>
                </div>
              </div>
            </div>
            <div className="banner-decoration">
              <Rocket size={80} />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card premium-card total">
            <div className="stat-icon-wrapper"><Package size={24} /></div>
            <div className="stat-info">
              <h3>{stats.totalShipments}</h3>
              <p>Total Shipments</p>
              <span className="stat-trend"><TrendingUp size={12} /> +12%</span>
            </div>
          </div>
          <div className="stat-card premium-card delivered">
            <div className="stat-icon-wrapper"><CheckCircle size={24} /></div>
            <div className="stat-info">
              <h3>{stats.delivered}</h3>
              <p>Delivered</p>
              <span className="stat-trend positive"><ThumbsUp size={12} /> Completed</span>
            </div>
          </div>
          <div className="stat-card premium-card transit">
            <div className="stat-icon-wrapper"><Truck size={24} /></div>
            <div className="stat-info">
              <h3>{stats.inTransit}</h3>
              <p>In Transit</p>
              <span className="stat-trend"><Activity size={12} /> Active</span>
            </div>
          </div>
          <div className="stat-card premium-card pending">
            <div className="stat-icon-wrapper"><Clock size={24} /></div>
            <div className="stat-info">
              <h3>{stats.pending}</h3>
              <p>Pending</p>
              <span className="stat-trend"><AlertCircle size={12} /> Awaiting</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions-section">
          <div className="section-header">
            <h2><Zap size={22} /> Quick Actions</h2>
            <p>Frequently used operations</p>
          </div>
          <div className="quick-actions-grid">
            {quickActions.map((action, idx) => (
              <button 
                key={idx}
                className="quick-action-btn"
                onClick={() => action.action === "recharge" ? setShowRechargeModal(true) : handleNavigation(action.path)}
                style={{ borderColor: action.color }}
              >
                <span className="action-icon" style={{ color: action.color }}>{action.icon}</span>
                <span>{action.label}</span>
                <ChevronRight size={14} />
              </button>
            ))}
          </div>
        </div>

        {/* Tracking Section */}
        <div className="tracking-section premium">
          <div className="section-header">
            <div>
              <h2><Navigation size={22} /> Track Your Shipment</h2>
              <p>Enter LR number or AWB to get real-time status</p>
            </div>
            <Gift size={20} className="section-icon" />
          </div>
          <div className="tracking-box premium">
            <input
              type="text"
              placeholder="Enter LR / AWB Number (e.g., FCPL0001)"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleTrackShipment()}
            />
            <button onClick={handleTrackShipment} disabled={loading}>
              {loading ? <div className="spinner-small"></div> : "Track Now"}
            </button>
          </div>

          {trackingResult && (
            <div className="tracking-result premium">
              <div className="tracking-header">
                <h3><BadgeCheck size={18} /> Shipment: {trackingResult.lr}</h3>
                {getStatusBadge(trackingResult.status)}
              </div>
              <div className="tracking-details premium">
                <div className="detail-card">
                  <MapPin size={16} />
                  <div>
                    <label>From</label>
                    <p>{trackingResult.pickupName || "N/A"} - {trackingResult.pickupPincode}</p>
                  </div>
                </div>
                <div className="detail-arrow">→</div>
                <div className="detail-card">
                  <MapPin size={16} />
                  <div>
                    <label>To</label>
                    <p>{trackingResult.deliveryName || "N/A"} - {trackingResult.deliveryPincode}</p>
                  </div>
                </div>
                <div className="detail-card">
                  <Weight size={16} />
                  <div>
                    <label>Weight</label>
                    <p>{trackingResult.weight} kg</p>
                  </div>
                </div>
                <div className="detail-card">
                  <DollarSign size={16} />
                  <div>
                    <label>Freight</label>
                    <p>₹{trackingResult.freightAmount?.toLocaleString() || 0}</p>
                  </div>
                </div>
              </div>
              <div className="tracking-actions">
                <button className="action-btn" onClick={() => handleNavigation("/shipment-details")}>
                  <Eye size={16} /> Full Details
                </button>
                <button className="action-btn">
                  <Download size={16} /> Download Report
                </button>
                <button className="action-btn">
                  <Printer size={16} /> Print
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modules Grid */}
        <div className="modules-section">
          <div className="section-header">
            <div>
              <h2><Star size={22} /> Your Services</h2>
              <p>Access all your logistics tools and features</p>
            </div>
            <button className="view-all" onClick={() => handleNavigation("/shipment-details")}>
              View All Services <ChevronRight size={16} />
            </button>
          </div>
          <div className="modules-grid premium">
            {modules.map((module) => (
              <div 
                key={module.id}
                className="module-card premium"
                onClick={() => handleNavigation(module.path)}
                style={{ borderTopColor: module.color }}
              >
                <div className="module-icon premium" style={{ background: module.bgColor, color: module.color }}>
                  {module.icon}
                </div>
                <h3>{module.title}</h3>
                <p>{module.description}</p>
                <div className="module-features">
                  {module.features.map((feature, idx) => (
                    <span key={idx} className="feature-tag">{feature}</span>
                  ))}
                </div>
                <button className="module-btn" style={{ background: module.gradient }}>
                  Access Now <ChevronRight size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Shipments */}
        <div className="recent-section">
          <div className="section-header">
            <div>
              <h2><Clock size={22} /> Recent Shipments</h2>
              <p>Your latest 5 shipments</p>
            </div>
            <button className="view-all" onClick={() => handleNavigation("/shipment-details")}>
              View All <ChevronRight size={16} />
            </button>
          </div>
          <div className="recent-table-container">
            <table className="recent-table premium">
              <thead>
                <tr><th>LR Number</th><th>Route</th><th>Weight</th><th>Status</th><th>Date</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {recentShipments.length === 0 ? (
                  <tr><td colSpan="6" className="no-data">No shipments yet. Create your first order!</td></tr>
                ) : (
                  recentShipments.map((shipment, idx) => (
                    <tr key={idx}>
                      <td className="lr-cell">{shipment.lr}</td>
                      <td>{shipment.route || `${shipment.pickupPincode} → ${shipment.deliveryPincode}`}</td>
                      <td>{shipment.weight || 0} kg</td>
                      <td>{getStatusBadge(shipment.status)}</td>
                      <td>{new Date(shipment.date).toLocaleDateString()}</td>
                      <td className="action-cell">
                        <button className="action-icon" onClick={() => handleNavigation("/shipment-details")} title="View Details">
                          <Eye size={16} />
                        </button>
                        <button className="action-icon" title="Download Invoice">
                          <Download size={16} />
                        </button>
                        <button className="action-icon" title="Print">
                          <Printer size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Support Section */}
        <div className="support-section">
          <div className="support-card">
            <Headphones size={32} />
            <div>
              <h3>24/7 Customer Support</h3>
              <p>Need help? Our support team is available round the clock</p>
              <div className="support-contact">
                <Phone size={14} /> <span>+91 9818641504</span>
                <Mail size={14} /> <span>care@faithcargo.com</span>
              </div>
            </div>
            <button className="support-btn">Contact Support</button>
          </div>
        </div>

        {/* Footer */}
        <footer className="dashboard-footer">
          <div className="footer-content">
            <div className="footer-logo">
              <Shield size={20} />
              <span>Faith Cargo Logistics</span>
            </div>
            <div className="footer-links">
              <a href="#">About Us</a>
              <a href="#">Support</a>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms & Conditions</a>
            </div>
            <div className="footer-credit">
              <span>© 2024 Faith Cargo. All rights reserved.</span>
              <span>Developed with <Heart size={12} /> by <strong>Devora Technologies</strong></span>
            </div>
          </div>
        </footer>
      </div>

      {/* 🔥 NEW: Recharge Modal */}
      {showRechargeModal && (
        <div className="modal-overlay" onClick={() => setShowRechargeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Wallet size={20} /> Recharge Wallet</h3>
              <button className="modal-close" onClick={() => setShowRechargeModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="current-balance">
                <label>Current Balance</label>
                <div className="balance-amount">₹{walletData.balance.toLocaleString()}</div>
              </div>
              <div className="recharge-input">
                <label>Recharge Amount (₹)</label>
                <div className="amount-input-wrapper">
                  <span className="currency">₹</span>
                  <input
                    type="number"
                    placeholder="Enter amount"
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(e.target.value)}
                    min="100"
                    step="100"
                  />
                </div>
                <div className="suggested-amounts">
                  {[500, 1000, 2000, 5000].map(amt => (
                    <button key={amt} onClick={() => setRechargeAmount(amt)}>₹{amt}</button>
                  ))}
                </div>
              </div>
              <div className="payment-method">
                <label>Payment Method</label>
                <div className="method-options">
                  <button className={`method ${rechargeMethod === 'UPI' ? 'active' : ''}`} onClick={() => setRechargeMethod('UPI')}>
                    <CreditCard size={16} /> UPI
                  </button>
                  <button className={`method ${rechargeMethod === 'CARD' ? 'active' : ''}`} onClick={() => setRechargeMethod('CARD')}>
                    <CreditCard size={16} /> Card
                  </button>
                  <button className={`method ${rechargeMethod === 'BANK' ? 'active' : ''}`} onClick={() => setRechargeMethod('BANK')}>
                    <Bank size={16} /> Bank Transfer
                  </button>
                  <button className={`method ${rechargeMethod === 'CASH' ? 'active' : ''}`} onClick={() => setRechargeMethod('CASH')}>
                    <DollarSign size={16} /> Cash
                  </button>
                </div>
              </div>
              <div className="modal-footer">
                <button className="cancel-btn" onClick={() => setShowRechargeModal(false)}>Cancel</button>
                <button className="recharge-confirm-btn" onClick={handleRechargeRequest} disabled={recharging}>
                  {recharging ? "Processing..." : "Proceed to Recharge"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 NEW: Recharge History Modal */}
      {showRechargeHistory && (
        <div className="modal-overlay" onClick={() => setShowRechargeHistory(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><History size={20} /> Recharge History</h3>
              <button className="modal-close" onClick={() => setShowRechargeHistory(false)}>×</button>
            </div>
            <div className="modal-body">
              {rechargeHistory.length === 0 ? (
                <div className="no-data">No recharge history found</div>
              ) : (
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Status</th>
                      <th>Transaction ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rechargeHistory.map((item, idx) => (
                      <tr key={idx}>
                        <td>{new Date(item.created_at).toLocaleDateString()}</td>
                        <td className="amount">₹{item.amount.toLocaleString()}</td>
                        <td>{item.payment_method}</td>
                        <td>
                          <span className={`status-badge ${item.status === 'COMPLETED' ? 'success' : 'pending'}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="txn-id">{item.transaction_id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Bank icon component
const Bank = ({ size, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="10" width="18" height="14" rx="2" />
    <path d="M3 10L12 3l9 7" />
    <line x1="8" y1="14" x2="8" y2="17" />
    <line x1="12" y1="14" x2="12" y2="17" />
    <line x1="16" y1="14" x2="16" y2="17" />
  </svg>
);

export default ClientDashboard;