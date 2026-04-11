import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, Package, Truck, Users, MapPin, 
  Calculator, FileText, Settings, LogOut, Menu, 
  X, TrendingUp, Clock, CheckCircle, AlertCircle,
  User, CreditCard, PlusCircle, Eye, BarChart3,
  Bell, Search, ChevronRight, Star, Shield,
  Bot, Send, Volume2, VolumeX, Mic, Headphones
} from "lucide-react";
import "./AdminDashboard.css";
import "../styles/theme.css";
import logo from "../assets/logo.png";

// ============================================
// 🤖 ADVANCED JERVICE AI COMPONENT
// ============================================
const JerviceAI = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { 
      role: "assistant", 
      content: "🎤 **नमस्ते सर!** Main hoon Jervice AI - Aapka Personal Logistics Assistant. Main aapki madad kar sakta hoon:\n\n✅ Order Tracking\n✅ Rate Calculation\n✅ Pickup Schedule\n✅ Vendor Management\n✅ Pincode Check\n✅ Document Help\n\nAaj main aapki kya seva kar sakta hoon?" 
    }
  ]);
  const [userInput, setUserInput] = useState("");
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
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
      "User Management - Add admin users",
      "BA & B2B Rate - Business to business rates"
    ],
    contacts: {
      vinayak: "9311801079",
      support: "9818641504",
      email: "care@faithcargo.com",
      website: "www.faithcargo.com"
    },
    rates: {
      mumbai_delhi: "₹18/kg",
      delhi_mumbai: "₹18/kg",
      mumbai_bangalore: "₹22/kg",
      delhi_kolkata: "₹25/kg"
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    // Load Indian male voice
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

  // 🎤 Male Voice Engine (Professional Indian Male Voice)
  const speak = (text) => {
    if (!isVoiceEnabled) return;
    
    window.speechSynthesis.cancel();
    
    // Clean text for speech
    const cleanText = text.replace(/[🎤✅📦💰⚠️🔍🚚📍⭐]/g, '');
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'hi-IN';
    utterance.rate = 0.9;
    utterance.pitch = 0.7; // Lower pitch for male voice
    utterance.volume = 1;
    
    // Use Indian male voice if available
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

  // 🎙️ Voice Recognition
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

  // 🧠 Intelligent Response Generator
  const generateResponse = async (userQuery) => {
    const query = userQuery.toLowerCase();
    
    // Order Tracking
    if (query.includes("track") || query.includes("order") || query.includes("shipment") || query.includes("docket")) {
      const docketMatch = query.match(/\d{4,10}/);
      if (docketMatch) {
        return `✅ **Tracking Update!** Sir, docket number ${docketMatch[0]} के लिए:\n\n📦 Status: In Transit\n📍 Current Location: Mumbai Hub\n⏰ Estimated Delivery: 2-3 days\n\nक्या आप और detail चाहेंगे?`;
      } else {
        return `📦 **Order Tracking Help!** Sir, order track करने के लिए कृपया docket number बताएं।\n\nExample: "Track FCPL1234" या "Mera order kahan hai"\n\nया फिर आप Shipment Details page पर जा सकते हैं।`;
      }
    }
    
    // Rate Inquiry
    else if (query.includes("rate") || query.includes("price") || query.includes("bhada") || query.includes("kitna")) {
      if (query.includes("mumbai") && query.includes("delhi")) {
        return `💰 **Rate Information!** Sir, Mumbai se Delhi का rate ₹18/kg है।\n\nMinimum billing: 10kg\nGST: 18% extra\nTransit time: 2-3 days\n\nक्या आप booking कराना चाहेंगे?`;
      } else if (query.includes("delhi") && query.includes("mumbai")) {
        return `💰 **Rate Information!** Sir, Delhi se Mumbai का rate ₹18/kg है।\n\nMinimum billing: 10kg\nGST: 18% extra\nTransit time: 2-3 days`;
      } else {
        return `💰 **Rate Calculator!** Sir, rate जानने के लिए location बताएं।\n\nExample:\n• "Mumbai se Delhi ka rate"\n• "Delhi to Bangalore price"\n\nया FCPL Rate Calculator page use करें।`;
      }
    }
    
    // Pickup Request
    else if (query.includes("pickup") || query.includes("pick") || query.includes("schedule")) {
      return `🚚 **Pickup Request!** Sir, pickup schedule करने के लिए:\n\n1. Pickup Request page पर जाएं\n2. Pickup address और time select करें\n3. Submit करें\n\nया मुझे बताएं:\n• Pickup pincode\n• Delivery pincode\n• Weight\n\nमैं request create कर दूंगा!`;
    }
    
    // Vendor Related
    else if (query.includes("vendor") || query.includes("supplier")) {
      return `🏢 **Vendor Management!** Sir, vendor related काम के लिए:\n\n✅ Add New Vendor\n✅ Update Vendor Rates\n✅ View Vendor List\n✅ Vendor Performance Report\n\nVendor Manage page पर जाकर details देख सकते हैं।`;
    }
    
    // Pincode Check
    else if (query.includes("pincode") || query.includes("pin code") || query.includes("serviceable")) {
      return `📍 **Pincode Serviceability!** Sir, pincode check करने के लिए:\n\n1. Pincode Management page पर जाएं\n2. Pincode enter करें\n3. Serviceability status देखें\n\nया मुझे pincode बताएं, मैं check कर दूंगा।`;
    }
    
    // Help / Support
    else if (query.includes("help") || query.includes("madad") || query.includes("support") || query.includes("sahayata")) {
      return `🎤 **Jervice AI Help Menu!** Sir, main ये सब कर सकता हूँ:\n\n✅ **Order Tracking** - "Track FCPL1234"\n✅ **Rate Check** - "Mumbai to Delhi rate"\n✅ **Pickup Schedule** - "Schedule pickup"\n✅ **Vendor Info** - "Vendor details"\n✅ **Pincode Check** - "Check pincode 110001"\n✅ **Document Help** - "E-Way bill help"\n\nकिस चीज़ में मदद चाहिए सर?`;
    }
    
    // Create Order
    else if (query.includes("create order") || query.includes("new booking") || query.includes("book shipment")) {
      return `📝 **Create Order Guide!** Sir, नया order create करने के लिए:\n\n1. Create Order page पर जाएं\n2. Sender और Receiver details fill करें\n3. Weight, dimensions enter करें\n4. Invoices upload करें\n5. Submit करें\n\nक्या मैं आपको Create Order page पर redirect कर दूं?`;
    }
    
    // Contact Information
    else if (query.includes("contact") || query.includes("number") || query.includes("phone") || query.includes("vinayak")) {
      return `📞 **Contact Information!** Sir, ये रहे हमारे contact details:\n\n👤 **Vinayak Sir:** ${systemKnowledge.contacts.vinayak}\n🏢 **Support Team:** ${systemKnowledge.contacts.support}\n📧 **Email:** ${systemKnowledge.contacts.email}\n🌐 **Website:** ${systemKnowledge.contacts.website}\n\nक्या मैं और कुछ help कर सकता हूँ सर?`;
    }
    
    // Unknown Query - Professional Response
    else {
      return `🎤 **सर, मुझे माफ करें!** इस विषय के बारे में मुझे अभी जानकारी नहीं दी गई है।\n\nकृपया **Vinayak Sir** से संपर्क करें: 📞 ${systemKnowledge.contacts.vinayak}\n\nया फिर आप मुझसे ये पूछ सकते हैं:\n\n⭐ Order Tracking\n⭐ Rate Calculation\n⭐ Pickup Schedule\n⭐ Vendor Management\n⭐ Pincode Check\n\nमैं आपकी पूरी मदद करूंगा सर! 🙏`;
    }
  };

  const handleChat = async (inputOverride = null) => {
    const input = (inputOverride || userInput).trim();
    if (!input) return;

    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setUserInput("");
    setIsTyping(true);

    // Simulate typing delay
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
            <span className="jervice-status">Online • Male Voice</span>
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
                <p>🎤 Male Voice • Active</p>
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
              placeholder="Hindi ya English mein poochiye..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleChat()}
            />
            <button onClick={() => handleChat()} disabled={isTyping}>
              <Send size={18} />
            </button>
          </div>

          <div className="jervice-ai-footer">
            <div className="quick-actions">
              <button onClick={() => handleChat("help")}>❓ Help</button>
              <button onClick={() => handleChat("track order")}>📦 Track</button>
              <button onClick={() => handleChat("rate mumbai delhi")}>💰 Rates</button>
              <button onClick={() => handleChat("contact vinayak")}>📞 Contact</button>
            </div>
            <div className="system-status">
              <span className="status-badge">🤖 AI Ready</span>
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
    { label: "Pending Orders", value: "23", change: "-3%", icon: Clock, color: "#ef4444" }
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
    { title: "User Management", desc: "Add and manage users", link: "/user-add", icon: Users, color: "#6366f1" },
    { title: "BA & B2B Rate", desc: "Calculate BA & B2B shipment rates", link: "/ba-b2b-rate", icon: Calculator, color: "#14b8a6" }
  ];

  const recentActivities = [
    { action: "New order created", id: "FCPL2024001", time: "2 min ago", status: "success" },
    { action: "Pickup completed", id: "PK-2024-1234", time: "15 min ago", status: "info" },
    { action: "Rate updated", id: "Mumbai-Delhi", time: "1 hour ago", status: "warning" },
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
                <strong>Pro Tip:</strong> Jervice AI se baat karein! "Help" ya "Contact Vinayak" bolein
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Jervice AI Component */}
      <JerviceAI />
    </div>
  );
}

export default AdminDashboard;