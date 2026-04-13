import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, Package, Truck, Users, MapPin, 
  Calculator, FileText, Settings, LogOut, Menu, 
  X, TrendingUp, Clock, CheckCircle, AlertCircle,
  User, CreditCard, PlusCircle, Eye, BarChart3,
  Bell, Search, ChevronRight, Star, Shield,
  Bot, Send, Volume2, VolumeX, Mic, Headphones,
  Loader, Zap, Award, Crown, DollarSign, UserCog,
  UserPlus, UserCheck, Users as UsersIcon
} from "lucide-react";
import "./AdminDashboard.css";
import "../styles/theme.css";
import logo from "../assets/logo.png";

// ============================================
// 🤖 ADVANCED JERVICE AI - WITH REAL API INTEGRATION
// ============================================
const JerviceAI = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { 
      role: "assistant", 
      content: "🎤 **नमस्ते सर!** Main hoon Jervice AI - Aapka Personal Logistics Assistant. Main aapki madad kar sakta hoon:\n\n✅ Real-Time Rate Calculation\n✅ Pincode ODA Status Check\n✅ Order Tracking\n✅ Pickup Schedule\n✅ Vendor Management\n✅ Document Help\n✅ User Management\n\nAaj main aapki kya seva kar sakta hoon?" 
    }
  ]);
  const [userInput, setUserInput] = useState("");
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // System Knowledge Base
  const systemKnowledge = {
    features: [
      "Create Order - New shipment booking with luxury docket",
      "Shipment Details - Track and manage all shipments",
      "FCPL Rate Calculator - Calculate freight rates",
      "Pickup Request - Schedule and manage pickups",
      "Vendor Management - Add and manage vendors",
      "Rate Update - Update shipping rates matrix",
      "Pincode Management - Manage serviceable pincodes",
      "User Management - Add, edit, delete users with permissions",
      "BA & B2B Rate - Business to business rates"
    ],
    contacts: {
      vinayak: "9311801079",
      support: "9818641504",
      email: "care@faithcargo.com",
      website: "www.faithcargo.com"
    }
  };

  // API Base URL
  const API_BASE = "https://faithcargo.onrender.com/api";

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const maleIndianVoice = voices.find(voice => 
        (voice.lang === 'hi-IN' || voice.lang === 'en-IN') && 
        (voice.name.includes('Male') || voice.name.includes('Google') || voice.name.includes('Rohan'))
      );
      if (maleIndianVoice) {
        window.maleVoice = maleIndianVoice;
      }
    };
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
  }, []);

  const speak = (text) => {
    if (!isVoiceEnabled) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[🎤✅📦💰⚠️🔍🚚📍⭐]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'hi-IN';
    utterance.rate = 0.9;
    utterance.pitch = 0.7;
    utterance.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const maleIndianVoice = voices.find(voice => 
      (voice.lang === 'hi-IN' || voice.lang === 'en-IN') && 
      (voice.name.includes('Male') || voice.name.includes('Rohan') || voice.name.includes('Google'))
    );
    if (maleIndianVoice) {
      utterance.voice = maleIndianVoice;
    }
    window.speechSynthesis.speak(utterance);
  };

  const initVoiceRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      speak("सर, आपका ब्राउज़र voice command support नहीं करता। कृपया Chrome use करें।");
      return false;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.lang = 'hi-IN';
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.onresult = (event) => {
      const voiceInput = event.results[0][0].transcript;
      setUserInput(voiceInput);
      handleChat(voiceInput);
      setIsListening(false);
    };
    recognitionRef.current.onerror = () => {
      setIsListening(false);
      speak("सर, आवाज़ नहीं सुनाई दी। कृपया दोबारा बोलें।");
    };
    return true;
  };

  const startVoiceInput = () => {
    if (!recognitionRef.current && !initVoiceRecognition()) return;
    setIsListening(true);
    recognitionRef.current.start();
    speak("बोल रहे हैं... मैं सुन रहा हूँ सर।");
  };

  const calculateRealTimeRate = async (origin, destination, weight = 10, paymentMode = "prepaid") => {
    try {
      const response = await fetch(`${API_BASE}/fcpl-rate-calculate/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: origin.toString().trim(),
          destination: destination.toString().trim(),
          weight: parseFloat(weight),
          paymentMode: paymentMode,
          invoiceValue: 50000,
          insurance: false,
          appointment: false,
          dimensions: []
        })
      });
      const data = await response.json();
      if (response.ok && !data.error) {
        return data;
      }
      return null;
    } catch (error) {
      console.error("Rate API error:", error);
      return null;
    }
  };

  const checkPincodeStatus = async (pincode) => {
    try {
      const response = await fetch(`${API_BASE}/pincode/zone/${pincode}/`);
      const data = await response.json();
      if (response.ok && !data.error) {
        return data;
      }
      return null;
    } catch (error) {
      console.error("Pincode API error:", error);
      return null;
    }
  };

  const trackShipment = async (trackingNumber) => {
    try {
      const response = await fetch(`${API_BASE}/shipments/shipment/${trackingNumber}`);
      const data = await response.json();
      if (response.ok) {
        return data;
      }
      return null;
    } catch (error) {
      console.error("Tracking API error:", error);
      return null;
    }
  };

  const generateResponse = async (userQuery) => {
    const query = userQuery.toLowerCase();
    
    // User Management related queries
    if (query.includes("user management") || query.includes("user manage") || query.includes("add user") || query.includes("create user")) {
      return `👥 **User Management Help!** Sir, user management से आप ये कर सकते हैं:\n\n✅ **Add New User** - Username, password, email, phone, company details\n✅ **Assign Permissions** - Module-wise access control\n✅ **Edit User** - Update user details and permissions\n✅ **Delete User** - Remove user accounts\n✅ **View User Stats** - Track user shipments and orders\n✅ **Generate User Bill** - Individual billing for each user\n\n📌 **How to use:**\n1. User Management page पर जाएं\n2. "Create New User" form fill करें\n3. Permissions select करें (Create Order, Shipment Details, etc.)\n4. Submit करें\n\nक्या मैं आपको User Management page पर redirect कर दूं सर?`;
    }
    
    // 📍 PINCODE CHECK
    const pincodeMatch = query.match(/\b\d{6}\b/);
    if (pincodeMatch && (query.includes("pincode") || query.includes("pin code") || query.includes("check") || query.includes("serviceable"))) {
      const pincode = pincodeMatch[0];
      setIsFetching(true);
      const pinData = await checkPincodeStatus(pincode);
      setIsFetching(false);
      if (pinData) {
        const odaText = pinData.oda ? "❌ ODA Area (Out of Delivery Area - Extra charges apply)" : "✅ Regular Area (No extra charges)";
        return `📍 **Pincode Status - ${pincode}**\n\n📌 **Zone:** ${pinData.zone || "Not Available"}\n📌 **City:** ${pinData.city || "N/A"}\n📌 **State:** ${pinData.state || "N/A"}\n📌 **Status:** ${odaText}\n\n💰 **ODA Charges:** ${pinData.oda ? "₹650 or ₹3/kg (whichever higher)" : "No ODA charges"}\n\nक्या आप इस पिनकोड के लिए rate check करवाना चाहेंगे सर?`;
      } else {
        return `❌ **Pincode Not Found!** Sir, pincode ${pincode} हमारे database में नहीं है।\n\nकृपया Pincode Management page पर जाकर add करें।`;
      }
    }
    
    // 💰 RATE CALCULATION
    const ratePattern = /(\d{6})\s*(?:to|se|->|से)\s*(\d{6})/i;
    const rateMatch = query.match(ratePattern);
    const weightMatch = query.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilo|kilogram)/i);
    
    if (rateMatch && (query.includes("rate") || query.includes("price") || query.includes("bhada"))) {
      const origin = rateMatch[1];
      const destination = rateMatch[2];
      const weight = weightMatch ? parseFloat(weightMatch[1]) : 10;
      setIsFetching(true);
      const rateData = await calculateRealTimeRate(origin, destination, weight);
      setIsFetching(false);
      if (rateData) {
        return `💰 **Rate Calculation Result!**\n\n📍 **Route:** ${origin} → ${destination}\n📊 **Weight:** ${rateData.chargeable_weight} kg\n📋 **Freight:** ₹${rateData.freight_charge?.toLocaleString()}\n💰 **Total:** ₹${rateData.total_charge?.toLocaleString()}\n\nक्या मैं order create कर दूं सर?`;
      } else {
        return `❌ **Rate Calculation Failed!** Sir, rate नहीं मिल पाया। कृपया Rate Update page जाकर rates configure करें।`;
      }
    }
    
    // 🔍 ORDER TRACKING
    const trackingMatch = query.match(/\b(FCPL|FCL|LR)?\s*(\d{4,12})\b/i);
    if (trackingMatch && (query.includes("track") || query.includes("order") || query.includes("shipment"))) {
      const trackingNo = trackingMatch[2];
      setIsFetching(true);
      const trackingData = await trackShipment(trackingNo);
      setIsFetching(false);
      if (trackingData) {
        return `✅ **Tracking Update!** Sir, ${trackingNo}:\n\n📦 **Status:** ${trackingData.status || "Booked"}\n📍 **Route:** ${trackingData.pickupPincode || "N/A"} → ${trackingData.deliveryPincode || "N/A"}\n\nक्या आप और details चाहेंगे सर?`;
      } else {
        return `❌ **Tracking Not Found!** Sir, docket number ${trackingNo} नहीं मिला।`;
      }
    }
    
    // 🚚 PICKUP REQUEST
    if (query.includes("pickup") || query.includes("schedule pickup")) {
      return `🚚 **Pickup Request Help!** Sir, pickup schedule के लिए बताएं:\n\n• Pickup pincode (से)\n• Delivery pincode (को)\n• Approximate weight\n\nExample: "Schedule pickup from 110001 to 400001 weight 50 kg"`;
    }
    
    // 📞 CONTACT
    if (query.includes("contact") || query.includes("number") || query.includes("vinayak")) {
      return `📞 **Contact Information!**\n\n👤 **Vinayak Sir:** ${systemKnowledge.contacts.vinayak}\n🏢 **Support:** ${systemKnowledge.contacts.support}\n📧 **Email:** ${systemKnowledge.contacts.email}\n🌐 **Website:** ${systemKnowledge.contacts.website}`;
    }
    
    // ❓ HELP
    if (query.includes("help") || query.includes("madad") || query.includes("kya kar sakte ho")) {
      return `🎤 **Jervice AI - Help Menu!**\n\n✅ **Rate Calculate** - "110001 to 400001 ka rate"\n✅ **Pincode Check** - "Check pincode 110001"\n✅ **Track Order** - "Track FCPL1234"\n✅ **User Management** - "Add new user"\n✅ **Schedule Pickup** - "Schedule pickup from 110001 to 400001"\n✅ **Contact Info** - "Vinayak Sir ka number"\n\nकैसे help करूं सर? 🙏`;
    }
    
    // DEFAULT
    return `🎤 **सर, मैं समझ गया!**\n\nमैं ये कर सकता हूँ:\n⭐ Rate Calculate - "110001 to 400001 ka rate"\n⭐ Pincode Check - "Check pincode 110001"\n⭐ User Management - "User management help"\n⭐ Track Order - "Track FCPL1234"\n\nक्या आपको इनमें से कुछ चाहिए? 🙏`;
  };

  const handleChat = async (inputOverride = null) => {
    const input = (inputOverride || userInput).trim();
    if (!input) return;

    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setUserInput("");
    setIsTyping(true);

    setTimeout(async () => {
      const reply = await generateResponse(input);
      setMessages([...newMessages, { role: "assistant", content: reply }]);
      speak(reply);
      setIsTyping(false);
    }, 500);
  };

  return (
    <div className="jervice-ai-container">
      {!isOpen ? (
        <button className="jervice-ai-trigger" onClick={() => setIsOpen(true)}>
          <div className="jervice-pulse"></div>
          <Bot size={28} />
          <div className="jervice-text">
            <span className="jervice-title">Jervice AI</span>
            <span className="jervice-status">Real-Time • API Ready</span>
          </div>
          <Headphones size={16} className="voice-badge" />
        </button>
      ) : (
        <div className="jervice-ai-window">
          <div className="jervice-ai-header">
            <div className="header-info">
              <div className="ai-avatar">
                <Bot size={24} />
                <div className="online-dot"></div>
              </div>
              <div className="ai-details">
                <h4>Jervice AI Assistant</h4>
                <p>🎤 Live • Real-Time Rates • User Management</p>
              </div>
            </div>
            <div className="header-actions">
              <button className="voice-control" onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}>
                {isVoiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>
              <button className="mic-control" onClick={startVoiceInput} disabled={isListening}>
                <Mic size={18} className={isListening ? 'pulse-mic' : ''} />
              </button>
              <button className="close-control" onClick={() => setIsOpen(false)}>
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="jervice-ai-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.role}`}>
                <div className="message-avatar">
                  {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
                </div>
                <div className="message-content">
                  {msg.content.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="message assistant typing">
                <div className="message-avatar"><Bot size={16} /></div>
                <div className="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
            {isFetching && (
              <div className="fetching-indicator">
                <Loader size={16} className="spin" />
                <span>Fetching real-time data...</span>
              </div>
            )}
            {isListening && (
              <div className="listening-indicator">
                🎙️ सुन रहा हूँ सर... बोलिए...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="jervice-ai-input">
            <input
              type="text"
              placeholder="Example: 110001 to 400001 ka rate 50 kg ke liye"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleChat()}
            />
            <button onClick={() => handleChat()} disabled={isTyping || isFetching}>
              <Send size={18} />
            </button>
          </div>

          <div className="jervice-ai-footer">
            <div className="quick-actions">
              <button onClick={() => handleChat("help")}>❓ Help</button>
              <button onClick={() => handleChat("110001 to 400001 ka rate 50 kg")}>💰 Rates</button>
              <button onClick={() => handleChat("Check pincode 110001")}>📍 Pincode</button>
              <button onClick={() => handleChat("user management help")}>👥 Users</button>
              <button onClick={() => handleChat("contact vinayak")}>📞 Contact</button>
            </div>
            <div className="system-status">
              <span className="status-badge">🤖 AI Ready</span>
              <span className="status-badge">🌐 API Connected</span>
              <span className="status-badge">🎤 Voice Active</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// 🚀 MAIN ADMIN DASHBOARD COMPONENT
// ============================================
function AdminDashboard() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notifications, setNotifications] = useState(3);
  const [adminName, setAdminName] = useState("Admin");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const storedName = localStorage.getItem("adminName");
    if (storedName) setAdminName(storedName);
    return () => clearInterval(timer);
  }, []);

  const logout = () => {
    localStorage.clear();
    navigate("/");
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const goTo = (path) => {
    navigate(path);
    setSidebarOpen(false);
  };

  const stats = [
    { label: "Total Shipments", value: "1,284", change: "+12%", icon: Package, color: "#4361ee" },
    { label: "Active Pickups", value: "48", change: "+5%", icon: Truck, color: "#f59e0b" },
    { label: "Delivered Today", value: "156", change: "+18%", icon: CheckCircle, color: "#10b981" },
    { label: "Total Users", value: "24", change: "+8%", icon: UsersIcon, color: "#8b5cf6" }
  ];

  const dashboardCards = [
    { title: "Create Order", desc: "Create new shipment order", link: "/create-order", icon: PlusCircle, color: "#4361ee", badge: "New" },
    { title: "Shipment Details", desc: "View and track shipments", link: "/shipment-details", icon: Eye, color: "#3b82f6", badge: "Live" },
    { title: "FCPL Rate Calculator", desc: "Calculate shipment rates", link: "/fcpl-rate", icon: Calculator, color: "#8b5cf6" },
    { title: "Pickup Request", desc: "Manage pickup requests", link: "/pickup", icon: Truck, color: "#f59e0b", badge: "Urgent" },
    { title: "Vendor Manage", desc: "Fresh vendor management module", link: "/vendor-manage", icon: Users, color: "#10b981" },
    { title: "Vendor Rates", desc: "View vendor rate cards", link: "/vendor-rate", icon: CreditCard, color: "#ec4898" },
    { title: "Rate Update", desc: "Update shipping rates", link: "/rate-update", icon: TrendingUp, color: "#f97316" },
    { title: "Pincode Management", desc: "Manage service pincodes", link: "/pincode", icon: MapPin, color: "#06b6d4" },
    { title: "User Management", desc: "Add, edit, delete users with permissions", link: "/user-management", icon: UserCog, color: "#6366f1", badge: "Advanced" },
    { title: "BA & B2B Rate", desc: "Calculate BA & B2B shipment rates", link: "/ba-b2b-rate", icon: Calculator, color: "#14b8a6" }
  ];

  const recentActivities = [
    { action: "New order created", id: "FCPL2024001", time: "2 min ago", status: "success" },
    { action: "Pickup completed", id: "PK-2024-1234", time: "15 min ago", status: "info" },
    { action: "Rate updated", id: "Mumbai-Delhi", time: "1 hour ago", status: "warning" },
    { action: "New user added", id: "client_five", time: "3 hours ago", status: "success" },
    { action: "New vendor added", id: "Vendor #458", time: "3 hours ago", status: "success" }
  ];

  const filteredCards = dashboardCards.filter(card =>
    card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    card.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="admin-dashboard-new">
      {sidebarOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}

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
          <div className="search-bar">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Search modules..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

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
            <div className="nav-item" onClick={() => goTo("/user-management")}>
              <UserCog size={20} />
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

      <main className="dashboard-main">
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

        <div className="dashboard-grid">
          <div className="cards-section">
            <div className="section-header">
              <h3>Quick Access Modules</h3>
              <span className="section-badge">{filteredCards.length} Modules</span>
            </div>
            <div className="card-grid">
              {filteredCards.map((card, index) => {
                const Icon = card.icon;
                return (
                  <div key={index} className="dashboard-card" onClick={() => goTo(card.link)}>
                    <div className="card-icon" style={{ background: `${card.color}15`, color: card.color }}>
                      <Icon size={24} />
                    </div>
                    <div className="card-content">
                      <h4>{card.title}</h4>
                      <p>{card.desc}</p>
                    </div>
                    {card.badge && (
                      <div className={`card-badge ${card.badge === "New" ? "new" : card.badge === "Advanced" ? "advanced" : "urgent"}`}>
                        {card.badge}
                      </div>
                    )}
                    <ChevronRight size={16} className="card-arrow" />
                  </div>
                );
              })}
            </div>
          </div>

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

            <div className="quick-tip">
              <div className="tip-icon">💡</div>
              <div className="tip-content">
                <strong>Jervice AI Pro Tip:</strong> "User management help" - नए users add करना, permissions देना, और user stats देखना सीखें!
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Advanced Jervice AI Component */}
      <JerviceAI />
    </div>
  );
}

export default AdminDashboard;