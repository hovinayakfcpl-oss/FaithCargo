import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Calculator, Package, Truck, LogOut, User, 
  TrendingUp, Clock, CheckCircle, AlertCircle,
  Search, FileText, Download, Printer, Eye,
  ChevronRight, Bell, Menu, X, Star, 
  Shield, Zap, Globe, Phone, Mail, MapPin,
  DollarSign, Calendar, Hash, Box, Weight,
  Navigation, Home, BarChart3, Settings,
  HelpCircle, CreditCard, Award, Target
} from "lucide-react";
import "./ClientDashboard.css";

function ClientDashboard() {
  const navigate = useNavigate();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [trackingId, setTrackingId] = useState("");
  const [trackingResult, setTrackingResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recentShipments, setRecentShipments] = useState([]);
  const [stats, setStats] = useState({
    totalShipments: 0,
    delivered: 0,
    inTransit: 0,
    pending: 0
  });

  const clientName = localStorage.getItem("clientName") || localStorage.getItem("username") || "Client";
  const clientId = localStorage.getItem("clientId");
  const clientEmail = localStorage.getItem("clientEmail") || "client@faithcargo.com";
  const clientCompany = localStorage.getItem("clientCompany") || clientName;

  useEffect(() => {
    fetchShipmentStats();
    fetchRecentShipments();
  }, []);

  const fetchShipmentStats = async () => {
    try {
      const response = await fetch(`https://faithcargo.onrender.com/api/shipments/dashboard-stats/?clientId=${clientId}`);
      if (response.ok) {
        const data = await response.json();
        setStats({
          totalShipments: data.total || 0,
          delivered: data.delivered || 0,
          inTransit: data.in_transit || 0,
          pending: data.booked || 0
        });
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
    navigate("/");
  };

  const modules = [
    {
      id: "rate",
      title: "Rate Calculator",
      description: "Calculate freight rates instantly",
      icon: <Calculator size={28} />,
      path: "/ba-b2b-rate-calculator",
      color: "#3b82f6",
      bgColor: "#eff6ff",
      features: ["Zone-based rates", "Real-time calculation", "GST included"]
    },
    {
      id: "order",
      title: "Create Order",
      description: "Book new shipment orders",
      icon: <Package size={28} />,
      path: "/create-order",
      color: "#10b981",
      bgColor: "#ecfdf5",
      features: ["Instant LR generation", "Multiple invoices", "E-way bill support"]
    },
    {
      id: "shipment",
      title: "Shipment Details",
      description: "Track all your shipments",
      icon: <Truck size={28} />,
      path: "/shipment-details",
      color: "#f59e0b",
      bgColor: "#fffbeb",
      features: ["Real-time tracking", "Status updates", "Download invoices"]
    }
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
    <div className="client-dashboard">
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
          </div>
        </div>

        <nav className="sidebar-nav">
          <button className="nav-item active" onClick={() => navigate("/client-dashboard")}>
            <Home size={20} /> Dashboard
          </button>
          <button className="nav-item" onClick={() => navigate("/ba-b2b-rate-calculator")}>
            <Calculator size={20} /> Rate Calculator
          </button>
          <button className="nav-item" onClick={() => navigate("/create-order")}>
            <Package size={20} /> Create Order
          </button>
          <button className="nav-item" onClick={() => navigate("/shipment-details")}>
            <Truck size={20} /> Shipment Details
          </button>
          <button className="nav-item" onClick={() => navigate("/tracking")}>
            <Navigation size={20} /> Track Shipment
          </button>
        </nav>

        <div className="sidebar-footer">
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
            <input type="text" placeholder="Search shipments..." />
          </div>

          <div className="header-actions">
            <button className="notification-btn">
              <Bell size={20} />
              <span className="notification-dot"></span>
            </button>
            <div className="header-user">
              <span>{clientName}</span>
              <User size={20} />
            </div>
          </div>
        </header>

        {/* Welcome Section */}
        <div className="welcome-section">
          <div className="welcome-text">
            <h1>Welcome back, <span>{clientName}</span>!</h1>
            <p>Manage your shipments, calculate rates, and track deliveries from one dashboard.</p>
          </div>
          <div className="welcome-stats">
            <div className="stat-card total">
              <div className="stat-icon"><Package size={24} /></div>
              <div className="stat-info">
                <h3>{stats.totalShipments}</h3>
                <p>Total Shipments</p>
              </div>
            </div>
            <div className="stat-card delivered">
              <div className="stat-icon"><CheckCircle size={24} /></div>
              <div className="stat-info">
                <h3>{stats.delivered}</h3>
                <p>Delivered</p>
              </div>
            </div>
            <div className="stat-card transit">
              <div className="stat-icon"><Truck size={24} /></div>
              <div className="stat-info">
                <h3>{stats.inTransit}</h3>
                <p>In Transit</p>
              </div>
            </div>
            <div className="stat-card pending">
              <div className="stat-icon"><Clock size={24} /></div>
              <div className="stat-info">
                <h3>{stats.pending}</h3>
                <p>Pending</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tracking Section */}
        <div className="tracking-section">
          <div className="section-header">
            <h2><Navigation size={22} /> Track Your Shipment</h2>
            <p>Enter LR number or AWB to track</p>
          </div>
          <div className="tracking-box">
            <input
              type="text"
              placeholder="Enter LR / AWB Number (e.g., FCPL0001)"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleTrackShipment()}
            />
            <button onClick={handleTrackShipment} disabled={loading}>
              {loading ? "Tracking..." : "Track Now"}
            </button>
          </div>

          {trackingResult && (
            <div className="tracking-result">
              <div className="tracking-header">
                <h3>Shipment: {trackingResult.lr}</h3>
                {getStatusBadge(trackingResult.status)}
              </div>
              <div className="tracking-details">
                <div className="detail">
                  <MapPin size={16} />
                  <div>
                    <label>From</label>
                    <p>{trackingResult.pickupName || "N/A"} - {trackingResult.pickupPincode}</p>
                  </div>
                </div>
                <div className="detail-arrow">→</div>
                <div className="detail">
                  <MapPin size={16} />
                  <div>
                    <label>To</label>
                    <p>{trackingResult.deliveryName || "N/A"} - {trackingResult.deliveryPincode}</p>
                  </div>
                </div>
                <div className="detail">
                  <Weight size={16} />
                  <div>
                    <label>Weight</label>
                    <p>{trackingResult.weight} kg</p>
                  </div>
                </div>
                <div className="detail">
                  <DollarSign size={16} />
                  <div>
                    <label>Freight</label>
                    <p>₹{trackingResult.freightAmount?.toLocaleString() || 0}</p>
                  </div>
                </div>
              </div>
              <button className="view-details-btn" onClick={() => navigate("/shipment-details")}>
                View Full Details <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Modules Grid */}
        <div className="modules-section">
          <div className="section-header">
            <h2><Star size={22} /> Your Services</h2>
            <p>Access all your logistics tools</p>
          </div>
          <div className="modules-grid">
            {modules.map((module) => (
              <div 
                key={module.id}
                className="module-card"
                onClick={() => navigate(module.path)}
                style={{ borderTopColor: module.color }}
              >
                <div className="module-icon" style={{ background: module.bgColor, color: module.color }}>
                  {module.icon}
                </div>
                <h3>{module.title}</h3>
                <p>{module.description}</p>
                <div className="module-features">
                  {module.features.map((feature, idx) => (
                    <span key={idx} className="feature-tag">{feature}</span>
                  ))}
                </div>
                <button className="module-btn" style={{ background: module.color }}>
                  Access <ChevronRight size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Shipments */}
        <div className="recent-section">
          <div className="section-header">
            <h2><Clock size={22} /> Recent Shipments</h2>
            <button className="view-all" onClick={() => navigate("/shipment-details")}>
              View All <ChevronRight size={16} />
            </button>
          </div>
          <div className="recent-table">
            <table>
              <thead>
                <tr><th>LR Number</th><th>Route</th><th>Weight</th><th>Status</th><th>Date</th><th></th>.</tr>
              </thead>
              <tbody>
                {recentShipments.length === 0 ? (
                  <tr><td colSpan="6" className="no-data">No shipments yet</td></tr>
                ) : (
                  recentShipments.map((shipment, idx) => (
                    <tr key={idx}>
                      <td className="lr-cell">{shipment.lr}</td>
                      <td>{shipment.route || `${shipment.pickupPincode} → ${shipment.deliveryPincode}`}</td>
                      <td>{shipment.weight || 0} kg</td>
                      <td>{getStatusBadge(shipment.status)}</td>
                      <td>{new Date(shipment.date).toLocaleDateString()}</td>
                      <td><button className="view-btn" onClick={() => navigate("/shipment-details")}><Eye size={16} /></button></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
              <a href="#">Support</a>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms</a>
              <a href="#">Contact</a>
            </div>
            <div className="footer-credit">
              <span>Developed by <strong>Devora Technologies</strong></span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default ClientDashboard;