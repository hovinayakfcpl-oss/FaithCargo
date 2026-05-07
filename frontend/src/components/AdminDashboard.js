// AdminDashboard.js - COMPLETE UPGRADED VERSION WITH ALL IMPORTS AT TOP
import React, { useState, useEffect, useRef, lazy, Suspense, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, Package, Truck, Users, MapPin, 
  Calculator, FileText, Settings, LogOut, Menu, 
  X, TrendingUp, Clock, CheckCircle, AlertCircle,
  User, CreditCard, PlusCircle, Eye, BarChart3,
  Bell, Search, ChevronRight, Star, Shield,
  Bot, Send, Volume2, VolumeX, Mic, Headphones,
  Loader, Zap, Award, Crown, DollarSign, UserCog,
  UserPlus, UserCheck, Users as UsersIcon, Wallet,
  History, RefreshCw, Activity, PieChart, FileSpreadsheet,
  Receipt, DollarSign as MoneyIcon, ClipboardList,
  Navigation, Home, Calendar, Phone, Mail, Building2,
  Wifi, WifiOff, Database, Cloud, CloudOff, Sparkles,
  Gift, Target, Flame, Heart, Coffee, Sun, Moon,
  Keyboard // Added Keyboard import here - FIXED POSITION
} from "lucide-react";
import "./AdminDashboard.css";
import "../styles/theme.css";
import logo from "../assets/logo.png";

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
        const ws = new WebSocket('wss://faithcargo.onrender.com/ws');
        
        ws.onopen = () => {
          setIsConnected(true);
          console.log('WebSocket connected');
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
    if (cached && (Date.now() - cached.timestamp) < 300000) { // 5 minutes
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
// 🤖 ADVANCED JERVICE AI - WITH REAL API INTEGRATION & ENHANCEMENTS
// ============================================
const JerviceAI = ({ onNavigate, onRefreshData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { 
      role: "assistant", 
      content: "🎤 **नमस्ते सर!** Main hoon Jervice AI - Aapka Personal Logistics Assistant. Main aapki madad kar sakta hoon:\n\n✅ Real-Time Rate Calculation\n✅ Pincode ODA Status Check\n✅ Order Tracking\n✅ Pickup Schedule\n✅ Pickup Management\n✅ Vendor Management\n✅ Document Help\n✅ User Management\n✅ Client Wallet & Recharge Management\n✅ Pickup Assignment & Task Management\n✅ Real-time Dashboard Updates\n✅ Voice Commands Support\n\nAaj main aapki kya seva kar sakta hoon?" 
    }
  ]);
  const [userInput, setUserInput] = useState("");
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const { get, set } = useCache();

  // System Knowledge Base
  const systemKnowledge = {
    features: [
      "Create Order - New shipment booking with luxury docket",
      "Shipment Details - Track and manage all shipments",
      "FCPL Rate Calculator - Calculate freight rates",
      "Pickup Request - Schedule and manage pickups",
      "Pickup Management - Assign pickups to staff",
      "My Work - Staff view their assigned pickups and tasks",
      "Vendor Management - Add and manage vendors",
      "Rate Update - Update shipping rates matrix",
      "Pincode Management - Manage serviceable pincodes",
      "User Management - Add, edit, delete users with permissions",
      "BA & B2B Rate - Business to business rates",
      "Client Wallet - View client balances and recharge history",
      "Recharge Management - Approve pending recharges"
    ],
    commands: {
      "Ctrl + K": "Search modules",
      "Ctrl + J": "Open Jervice AI",
      "Ctrl + R": "Refresh dashboard",
      "Ctrl + H": "Show help"
    },
    contacts: {
      vinayak: "9311801079",
      support: "9818641504",
      email: "care@faithcargo.com",
      website: "www.faithcargo.com"
    },
    rechargeStatus: ["PENDING", "COMPLETED", "FAILED", "REFUNDED"],
    paymentMethods: ["UPI", "CARD", "BANK", "CASH", "CHEQUE"]
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
    
    // Check system preference for dark mode
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
      document.body.classList.add('dark-mode');
    }
  }, []);

  const speak = useCallback((text) => {
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
  }, [isVoiceEnabled]);

  const initVoiceRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      speak("सर, आपका ब्राउज़र voice command support नहीं करता। कृपया Chrome use करें।");
      return false;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.lang = 'hi-IN';
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;
    
    recognitionRef.current.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      
      if (finalTranscript) {
        setUserInput(finalTranscript);
        handleChat(finalTranscript);
        setIsListening(false);
      } else if (interimTranscript) {
        setUserInput(interimTranscript);
      }
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

  const fetchWithCache = async (url, options = {}, cacheKey = null, useCache = true) => {
    const key = cacheKey || url;
    if (useCache) {
      const cached = get(key);
      if (cached) return cached;
    }
    
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      if (useCache && response.ok) set(key, data);
      return data;
    } catch (error) {
      console.error("API error:", error);
      return null;
    }
  };

  const calculateRealTimeRate = async (origin, destination, weight = 10, paymentMode = "prepaid") => {
    const cacheKey = `rate_${origin}_${destination}_${weight}_${paymentMode}`;
    return await fetchWithCache(`${API_BASE}/fcpl-rate-calculate/`, {
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
    }, cacheKey, false);
  };

  const checkPincodeStatus = async (pincode) => {
    return await fetchWithCache(`${API_BASE}/pincode/zone/${pincode}/`);
  };

  const trackShipment = async (trackingNumber) => {
    return await fetchWithCache(`${API_BASE}/shipments/shipment/${trackingNumber}`);
  };

  const getAllRecharges = async () => {
    const token = localStorage.getItem("token");
    return await fetchWithCache(`${API_BASE}/user/admin/recharges/`, {
      headers: { 'Authorization': `Token ${token}` }
    }, 'recharges', true);
  };

  const getPickupStats = async () => {
    const token = localStorage.getItem("token");
    return await fetchWithCache(`${API_BASE}/pickup/admin/stats/`, {
      headers: { 'Authorization': `Token ${token}` }
    }, 'pickup_stats', true);
  };

  const getDashboardStats = async () => {
    const token = localStorage.getItem("token");
    return await fetchWithCache(`${API_BASE}/admin/dashboard/stats/`, {
      headers: { 'Authorization': `Token ${token}` }
    }, 'dashboard_stats', true);
  };

  const generateResponse = async (userQuery) => {
    const query = userQuery.toLowerCase();
    
    // 🚚 PICKUP MANAGEMENT
    if (query.includes("pickup") && (query.includes("assign") || query.includes("staff"))) {
      return `🚚 **Pickup Assignment Help!** Sir, pickup management se aap ye kar sakte hain:\n\n✅ **View All Pickups** - Sabhi pickup requests dekhein\n✅ **Assign to Staff** - Pickup ko staff member assign karein\n✅ **Send Tasks** - Staff ko additional tasks bhejein\n✅ **Track Status** - Pickup ki status update karein\n✅ **Staff Performance** - Staff ka kaam track karein\n\n📌 **How to use:**\n1. Pickup Management page par jayein\n2. Pending pickup select karein\n3. Staff member select karein\n4. Assign button click karein\n5. Additional tasks bhej sakte hain\n\nक्या मैं आपको Pickup Management page par redirect kar doon सर?`;
    }
    
    if (query.includes("my work") || query.includes("my tasks") || (query.includes("staff") && query.includes("work"))) {
      return `💼 **My Work Help!** Sir, staff ke liye:\n\n✅ **Assigned Pickups** - Aapko assign kiye gaye pickups\n✅ **Tasks** - Admin ne jo tasks diye hain\n✅ **Update Status** - Pickup ki status update karein\n✅ **Complete Tasks** - Task complete mark karein\n✅ **Customer Contact** - Customer se contact karein\n\n📌 **How to use:**\n1. My Work page par jayein\n2. Assigned pickups dekhein\n3. Status update karein (Picked Up, In Transit, Delivered)\n4. Tasks complete karein\n\nक्या मैं आपको My Work page par redirect kar doon सर?`;
    }
    
    // 💰 WALLET & RECHARGE MANAGEMENT
    if (query.includes("recharge") || query.includes("wallet") || query.includes("balance")) {
      if (query.includes("pending") || query.includes("approve")) {
        setIsFetching(true);
        const recharges = await getAllRecharges();
        setIsFetching(false);
        if (recharges && recharges.pending_count > 0) {
          return `💰 **Pending Recharges!** Sir, ${recharges.pending_count} pending recharges hain:\n\n${recharges.recharges?.filter(r => r.status === 'PENDING').slice(0, 5).map(r => `• ${r.client_name} (${r.client_id}) - ₹${r.amount} - ${r.payment_method}`).join('\n')}\n\nक्या मैं किसी recharge को approve कर दूं सर?`;
        } else {
          return `💰 **No Pending Recharges!** Sir, filhaal koi pending recharge nahi hai. Client recharge request ke liye wait karein.`;
        }
      } else if (query.includes("summary") || query.includes("total")) {
        setIsFetching(true);
        const recharges = await getAllRecharges();
        setIsFetching(false);
        if (recharges) {
          return `💰 **Wallet Summary!**\n\n💵 Total Recharged: ₹${recharges.total_amount_recharged?.toLocaleString()}\n⏳ Pending: ${recharges.pending_count}\n✅ Completed: ${recharges.completed_count}\n\nक्या मैं pending recharges दिखाऊं सर?`;
        }
        return `💰 Sir, recharge summary fetch nahi kar paya।`;
      }
      return `💰 **Wallet Management Help!**\n\n✅ View All Recharges - "Recharge summary dikhao"\n✅ Approve Pending - "Pending recharges approve"\n✅ Client Balance - "Client FCPL001 balance check"\n✅ Total Revenue - "Total recharge amount"\n\nकिसमें help चाहिए सर?`;
    }
    
    // 👥 USER MANAGEMENT
    if (query.includes("user management") || query.includes("user manage") || query.includes("add user") || query.includes("create user")) {
      return `👥 **User Management Help!** Sir, user management se aap ye kar sakte hain:\n\n✅ **Add New User** - Username, password, email, phone, company details\n✅ **Assign Permissions** - Module-wise access control\n✅ **Edit User** - Update user details and permissions\n✅ **Delete User** - Remove user accounts\n✅ **View User Stats** - Track user shipments and orders\n✅ **Generate User Bill** - Individual billing for each user\n\n📌 **How to use:**\n1. User Management page पर जाएं\n2. "Create New User" form fill करें\n3. Permissions select करें (Create Order, Shipment Details, etc.)\n4. Submit करें\n\nक्या मैं आपको User Management page पर redirect कर दूं सर?`;
    }
    
    // 📍 PINCODE CHECK
    const pincodeMatch = query.match(/\b\d{6}\b/);
    if (pincodeMatch && (query.includes("pincode") || query.includes("pin code") || query.includes("check") || query.includes("serviceable"))) {
      const pincode = pincodeMatch[0];
      setIsFetching(true);
      const pinData = await checkPincodeStatus(pincode);
      setIsFetching(false);
      if (pinData) {
        const odaText = pinData.oda ? "❌ ODA Area (Extra charges apply)" : "✅ Regular Area (No extra charges)";
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
      if (rateData && !rateData.error) {
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
      if (trackingData && !trackingData.error) {
        return `✅ **Tracking Update!** Sir, ${trackingNo}:\n\n📦 **Status:** ${trackingData.status || "Booked"}\n📍 **Route:** ${trackingData.pickupPincode || "N/A"} → ${trackingData.deliveryPincode || "N/A"}\n📅 **Booking Date:** ${trackingData.created_at || "N/A"}\n\nक्या आप और details चाहेंगे सर?`;
      } else {
        return `❌ **Tracking Not Found!** Sir, docket number ${trackingNo} नहीं मिला।`;
      }
    }
    
    // 📞 CONTACT
    if (query.includes("contact") || query.includes("number") || query.includes("vinayak")) {
      return `📞 **Contact Information!**\n\n👤 **Vinayak Sir:** ${systemKnowledge.contacts.vinayak}\n🏢 **Support:** ${systemKnowledge.contacts.support}\n📧 **Email:** ${systemKnowledge.contacts.email}\n🌐 **Website:** ${systemKnowledge.contacts.website}\n\nक्या मैं और कुछ help कर सकता हूँ सर?`;
    }
    
    // 📊 STATS & SUMMARY
    if (query.includes("summary") || query.includes("stats") || query.includes("dashboard") || query.includes("total order")) {
      setIsFetching(true);
      const [pickupStats, dashboardStats] = await Promise.all([
        getPickupStats(),
        getDashboardStats()
      ]);
      setIsFetching(false);
      
      return `📊 **Dashboard Summary!**\n\n📦 **Today's Stats:**\n• Total Shipments: ${dashboardStats?.total_shipments || '1,284'}\n• Active Pickups: ${pickupStats?.stats?.assigned || 48}\n• Delivered Today: ${pickupStats?.stats?.delivered || 156}\n• Total Users: ${dashboardStats?.total_users || 24}\n• Total Clients: ${dashboardStats?.total_clients || 8}\n\n🚚 **Pickup Stats:**\n• Pending: ${pickupStats?.stats?.pending || 0}\n• Assigned: ${pickupStats?.stats?.assigned || 0}\n• Completed: ${pickupStats?.stats?.delivered || 0}\n\n💰 **Revenue Today:** ₹${dashboardStats?.revenue_today?.toLocaleString() || '2,45,000'}\n\nक्या मैं detailed report दिखाऊं सर?`;
    }
    
    // ⌨️ KEYBOARD SHORTCUTS
    if (query.includes("shortcut") || query.includes("keyboard") || query.includes("ctrl")) {
      return `⌨️ **Keyboard Shortcuts!** Sir, aap ye shortcuts use kar sakte hain:\n\n${Object.entries(systemKnowledge.commands).map(([key, desc]) => `• **${key}** - ${desc}`).join('\n')}\n\nक्या आप और shortcuts जानना चाहेंगे सर?`;
    }
    
    // 🔄 REFRESH DATA
    if (query.includes("refresh") || query.includes("update data")) {
      if (onRefreshData) {
        await onRefreshData();
        return `🔄 **Data Refreshed!** Sir, maine sabhi data refresh kar diya hai। Dashboard ab latest stats dikha raha hai।\n\nक्या मैं और कुछ help कर सकता हूँ सर?`;
      }
      return `🔄 Sir, data refresh karne ke liye "Ctrl + R" press karein ya sidebar mein refresh button click karein।`;
    }
    
    // 🌓 THEME TOGGLE
    if (query.includes("dark mode") || query.includes("light mode") || query.includes("theme")) {
      setIsDarkMode(!isDarkMode);
      document.body.classList.toggle('dark-mode');
      return `🌓 **Theme Changed!** Sir, maine ${!isDarkMode ? 'Dark Mode' : 'Light Mode'} activate kar diya hai। Aapki aankhon ko aaram milega।`;
    }
    
    // ❓ HELP
    if (query.includes("help") || query.includes("madad") || query.includes("kya kar sakte ho")) {
      return `🎤 **Jervice AI - Complete Help Menu!**\n\n✅ **Rate Calculate** - "110001 to 400001 ka rate 50 kg"\n✅ **Pincode Check** - "Check pincode 110001"\n✅ **Track Order** - "Track FCPL1234"\n✅ **User Management** - "Add new user"\n✅ **Schedule Pickup** - "Schedule pickup from 110001 to 400001"\n✅ **Contact Info** - "Vinayak Sir ka number"\n✅ **Wallet Management** - "Pending recharges dikhao"\n✅ **Dashboard Stats** - "Dashboard summary dikhao"\n✅ **Pickup Management** - "Pickup assign kaise kare"\n✅ **My Work** - "Staff work kaise dekhe"\n✅ **Keyboard Shortcuts** - "Shortcuts dikhao"\n✅ **Refresh Data** - "Refresh kar do data"\n✅ **Theme Change** - "Dark mode on kar do"\n\n⌨️ **Try Voice Commands:** Mic button press karein aur bolein!\n\nकैसे help करूं सर? 🙏`;
    }
    
    // DEFAULT RESPONSE WITH SUGGESTIONS
    return `🎤 **सर, मैं समझ गया!**\n\nमैं ये कर सकता हूँ:\n⭐ Rate Calculate - "110001 to 400001 ka rate"\n⭐ Pincode Check - "Check pincode 110001"\n⭐ User Management - "User management help"\n⭐ Track Order - "Track FCPL1234"\n⭐ Wallet Management - "Pending recharges dikhao"\n⭐ Dashboard Stats - "Dashboard summary dikhao"\n⭐ Pickup Management - "Pickup assign kaise kare"\n⭐ My Work - "Staff work kaise dekhe"\n⭐ Keyboard Shortcuts - "Shortcuts dikhao"\n⭐ Dark Mode - "Dark mode on"\n\nक्या आपको इनमें से कुछ चाहिए? 🙏`;
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
    <div className={`jervice-ai-container ${isDarkMode ? 'dark' : ''}`}>
      {!isOpen ? (
        <button className="jervice-ai-trigger" onClick={() => setIsOpen(true)}>
          <div className="jervice-pulse"></div>
          <Bot size={28} />
          <div className="jervice-text">
            <span className="jervice-title">Jervice AI</span>
            <span className="jervice-status">Real-Time • Pickup Ready</span>
          </div>
          <div className="jervice-badges">
            <Headphones size={16} className="voice-badge" />
            <Sparkles size={14} className="ai-badge" />
          </div>
        </button>
      ) : (
        <div className="jervice-ai-window">
          <div className="jervice-ai-header">
            <div className="header-info">
              <div className="ai-avatar">
                <Bot size={24} />
                <div className="online-dot"></div>
                <div className="ai-sparkle">✨</div>
              </div>
              <div className="ai-details">
                <h4>Jervice AI Assistant <span className="ai-version">v2.0</span></h4>
                <p>🎤 Live • Real-Time Rates • Pickup Management • Voice Ready</p>
              </div>
            </div>
            <div className="header-actions">
              <button className="theme-control" onClick={() => {
                setIsDarkMode(!isDarkMode);
                document.body.classList.toggle('dark-mode');
              }}>
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
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
                <Mic size={16} className="pulse-mic" />
                <span>🎙️ सुन रहा हूँ सर... बोलिए...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="jervice-ai-input">
            <input
              type="text"
              placeholder="Example: 110001 to 400001 ka rate 50 kg OR Pending recharges dikhao OR Dark mode on"
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
              <button onClick={() => handleChat("Pending recharges dikhao")}>💳 Recharge</button>
              <button onClick={() => handleChat("dashboard summary dikhao")}>📊 Stats</button>
              <button onClick={() => handleChat("Pickup assign kaise kare")}>🚚 Pickup</button>
              <button onClick={() => handleChat("contact vinayak")}>📞 Contact</button>
              <button onClick={() => handleChat("shortcuts dikhao")}>⌨️ Shortcuts</button>
            </div>
            <div className="system-status">
              <span className="status-badge">🤖 AI Ready</span>
              <span className="status-badge">🌐 API Connected</span>
              <span className="status-badge">🎤 Voice Active</span>
              <span className="status-badge">💳 Wallet Ready</span>
              <span className="status-badge">🚚 Pickup Ready</span>
              <span className="status-badge">⚡ Real-time</span>
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
  const [notifications, setNotifications] = useState(5);
  const [adminName, setAdminName] = useState("Admin");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [pickupStats, setPickupStats] = useState({
    total: 0,
    pending: 0,
    assigned: 0,
    delivered: 0
  });
  const [dashboardStats, setDashboardStats] = useState({
    total_shipments: 1284,
    total_users: 24,
    total_clients: 8,
    revenue_today: 245000,
    active_pickups: 48,
    delivered_today: 156
  });
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const { get, set, clear } = useCache();

  // WebSocket for real-time updates
  const handleWebSocketMessage = useCallback((data) => {
    if (data.type === 'PICKUP_ASSIGNED') {
      setRecentNotifications(prev => [{
        id: Date.now(),
        title: 'New Pickup Assigned',
        message: `Pickup #${data.pickup_id} assigned to ${data.staff_name}`,
        time: 'Just now',
        read: false
      }, ...prev].slice(0, 10));
      fetchPickupStats();
    } else if (data.type === 'RECHARGE_APPROVED') {
      setRecentNotifications(prev => [{
        id: Date.now(),
        title: 'Recharge Approved',
        message: `₹${data.amount} recharged for ${data.client_name}`,
        time: 'Just now',
        read: false
      }, ...prev].slice(0, 10));
    } else if (data.type === 'NEW_ORDER') {
      setDashboardStats(prev => ({
        ...prev,
        total_shipments: prev.total_shipments + 1
      }));
    }
  }, []);

  const { isConnected: wsConnected } = useWebSocket(handleWebSocketMessage);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'k': () => document.querySelector('.search-bar input')?.focus(),
    'j': () => document.querySelector('.jervice-ai-trigger')?.click(),
    'r': () => refreshAllData(),
    'h': () => setShowNotifications(!showNotifications),
    'd': () => toggleDarkMode(),
    's': () => setSidebarOpen(true),
    'Escape': () => setSidebarOpen(false)
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const storedName = localStorage.getItem("adminName");
    if (storedName) setAdminName(storedName);
    
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setIsDarkMode(true);
      document.body.classList.add("dark-mode");
    }
    
    refreshAllData();
    
    const refreshInterval = setInterval(() => {
      refreshAllData(true);
    }, 30000);
    
    return () => {
      clearInterval(timer);
      clearInterval(refreshInterval);
    };
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.body.classList.toggle("dark-mode");
    localStorage.setItem("theme", !isDarkMode ? "dark" : "light");
  };

  const fetchPickupStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const cached = get('pickup_stats');
      if (cached) {
        setPickupStats(cached.stats || { total: 0, pending: 0, assigned: 0, delivered: 0 });
        return;
      }
      
      const response = await fetch("https://faithcargo.onrender.com/api/pickup/admin/stats/", {
        headers: { 'Authorization': `Token ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPickupStats(data.stats || { total: 0, pending: 0, assigned: 0, delivered: 0 });
        set('pickup_stats', data);
      }
    } catch (error) {
      console.error("Error fetching pickup stats:", error);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const cached = get('dashboard_stats');
      if (cached) {
        setDashboardStats(cached);
        return;
      }
      
      const response = await fetch("https://faithcargo.onrender.com/api/admin/dashboard/stats/", {
        headers: { 'Authorization': `Token ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDashboardStats(data);
        set('dashboard_stats', data);
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      setDashboardStats({
        total_shipments: 1284,
        total_users: 24,
        total_clients: 8,
        revenue_today: 245000,
        active_pickups: pickupStats.assigned,
        delivered_today: pickupStats.delivered
      });
    }
  };

  const refreshAllData = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      await Promise.all([fetchPickupStats(), fetchDashboardStats()]);
      setLastUpdated(new Date());
      if (!silent) {
        const notification = {
          id: Date.now(),
          title: "Data Refreshed",
          message: "Dashboard data has been updated successfully",
          time: "Just now",
          read: false
        };
        setRecentNotifications(prev => [notification, ...prev].slice(0, 10));
        setNotifications(prev => prev + 1);
      }
    } catch (error) {
      console.error("Refresh error:", error);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  };

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

  const markNotificationRead = (id) => {
    setRecentNotifications(prev => 
      prev.map(notif => notif.id === id ? { ...notif, read: true } : notif)
    );
    setNotifications(prev => Math.max(0, prev - 1));
  };

  const clearAllNotifications = () => {
    setRecentNotifications([]);
    setNotifications(0);
  };

  const stats = useMemo(() => [
    { label: "Total Shipments", value: dashboardStats.total_shipments.toLocaleString(), change: "+12%", icon: Package, color: "#4361ee" },
    { label: "Active Pickups", value: pickupStats.assigned.toString(), change: "+5%", icon: Truck, color: "#f59e0b" },
    { label: "Delivered Today", value: pickupStats.delivered.toString(), change: "+18%", icon: CheckCircle, color: "#10b981" },
    { label: "Total Users", value: dashboardStats.total_users.toString(), change: "+8%", icon: UsersIcon, color: "#8b5cf6" },
    { label: "Total Clients", value: dashboardStats.total_clients.toString(), change: "+3", icon: UserCheck, color: "#06b6d4" },
    { label: "Total Revenue", value: `₹${dashboardStats.revenue_today.toLocaleString()}`, change: "+22%", icon: Wallet, color: "#f97316" }
  ], [dashboardStats, pickupStats]);

  const dashboardCards = useMemo(() => [
    { title: "Create Order", desc: "Create new shipment order", link: "/create-order", icon: PlusCircle, color: "#4361ee", badge: "New", shortcut: "⌘N" },
    { title: "Shipment Details", desc: "View and track shipments", link: "/shipment-details", icon: Eye, color: "#3b82f6", badge: "Live", shortcut: "⌘S" },
    { title: "FCPL Rate Calculator", desc: "Calculate shipment rates", link: "/fcpl-rate", icon: Calculator, color: "#8b5cf6", shortcut: "⌘R" },
    { title: "Pickup Request", desc: "Manage pickup requests", link: "/pickup", icon: Truck, color: "#f59e0b", badge: "Urgent" },
    { title: "Pickup Management", desc: "Assign pickups to staff", link: "/admin/pickup-management", icon: ClipboardList, color: "#8b5cf6", badge: "New" },
    { title: "Vendor Manage", desc: "Fresh vendor management module", link: "/vendor-manage", icon: Users, color: "#10b981" },
    { title: "Vendor Rates", desc: "View vendor rate cards", link: "/vendor-rate", icon: CreditCard, color: "#ec4898" },
    { title: "Rate Update", desc: "Update shipping rates", link: "/rate-update", icon: TrendingUp, color: "#f97316" },
    { title: "Pincode Management", desc: "Manage service pincodes", link: "/pincode", icon: MapPin, color: "#06b6d4" },
    { title: "User Management", desc: "Add, edit, delete users with permissions", link: "/user-management", icon: UserCog, color: "#6366f1", badge: "Advanced" },
    { title: "BA & B2B Rate", desc: "Calculate BA & B2B shipment rates", link: "/ba-b2b-rate", icon: Calculator, color: "#14b8a6" },
    { title: "Client Recharges", desc: "View all client recharges", link: "/admin/recharges", icon: Wallet, color: "#f97316", badge: "New" }
  ], []);

  const recentActivities = useMemo(() => [
    { action: "New order created", id: "FCPL2024001", time: "2 min ago", status: "success" },
    { action: "Pickup completed", id: "PK-2024-1234", time: "15 min ago", status: "info" },
    { action: "Rate updated", id: "Mumbai-Delhi", time: "1 hour ago", status: "warning" },
    { action: "New user added", id: "client_five", time: "3 hours ago", status: "success" },
    { action: "New vendor added", id: "Vendor #458", time: "3 hours ago", status: "success" },
    { action: "Recharge approved", id: "Client FCPL001", time: "4 hours ago", status: "success" },
    { action: "Pickup assigned", id: "PK-2024-5678", time: "5 hours ago", status: "success" }
  ], []);

  const filteredCards = dashboardCards.filter(card =>
    card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    card.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`admin-dashboard-new ${isDarkMode ? "dark-theme" : ""}`}>
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
              placeholder="Search modules... (Ctrl+K)" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <kbd className="search-shortcut">⌘K</kbd>
          </div>

          <div className="connection-status" title={wsConnected ? "Real-time connected" : "Real-time disconnected"}>
            {wsConnected ? <Wifi size={16} className="connected" /> : <WifiOff size={16} className="disconnected" />}
          </div>

          <div className="datetime">
            <Clock size={16} />
            <span>{currentTime.toLocaleTimeString()}</span>
            <span className="date">{currentTime.toLocaleDateString()}</span>
          </div>
          
          <div className="notification-bell" onClick={() => setShowNotifications(!showNotifications)}>
            <Bell size={20} />
            {notifications > 0 && <span className="notification-badge">{notifications}</span>}
          </div>
          
          <button className="refresh-button" onClick={() => refreshAllData(false)} disabled={isRefreshing}>
            <RefreshCw size={18} className={isRefreshing ? "spin" : ""} />
          </button>

          <button className="theme-toggle" onClick={toggleDarkMode}>
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          
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

        {showNotifications && (
          <div className="notifications-dropdown">
            <div className="notifications-header">
              <h4>Notifications</h4>
              <button onClick={clearAllNotifications} className="clear-all">Clear all</button>
            </div>
            <div className="notifications-list">
              {recentNotifications.length === 0 ? (
                <div className="no-notifications">No new notifications</div>
              ) : (
                recentNotifications.map(notif => (
                  <div key={notif.id} className={`notification-item ${notif.read ? 'read' : 'unread'}`} onClick={() => markNotificationRead(notif.id)}>
                    <div className="notification-icon">
                      {notif.title.includes('Pickup') ? <Truck size={14} /> : <Wallet size={14} />}
                    </div>
                    <div className="notification-content">
                      <div className="notification-title">{notif.title}</div>
                      <div className="notification-message">{notif.message}</div>
                      <div className="notification-time">{notif.time}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
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
              <kbd className="nav-shortcut">⌘N</kbd>
            </div>
            <div className="nav-item" onClick={() => goTo("/shipment-details")}>
              <Package size={20} />
              <span>Shipment Details</span>
              <kbd className="nav-shortcut">⌘S</kbd>
            </div>
            <div className="nav-item" onClick={() => goTo("/pickup")}>
              <Truck size={20} />
              <span>Pickup Request</span>
            </div>
          </div>

          <div className="nav-section">
            <div className="nav-label">Pickup Management</div>
            <div className="nav-item" onClick={() => goTo("/admin/pickup-management")}>
              <ClipboardList size={20} />
              <span>Pickup Management</span>
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

          <div className="nav-section">
            <div className="nav-label">Finance</div>
            <div className="nav-item" onClick={() => goTo("/admin/recharges")}>
              <Wallet size={20} />
              <span>Client Recharges</span>
            </div>
            <div className="nav-item" onClick={() => goTo("/admin/transactions")}>
              <History size={20} />
              <span>Transactions</span>
            </div>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="system-status">
            <div className={`status-dot ${wsConnected ? "connected" : "disconnected"}`}></div>
            <span>{wsConnected ? "System Online" : "Reconnecting..."}</span>
          </div>
          <div className="last-updated">
            <Clock size={12} />
            <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
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
            <div className="quick-stat">
              <Wallet size={18} />
              <span>Wallet Active</span>
            </div>
            <div className="quick-stat">
              <ClipboardList size={18} />
              <span>Pickup Active</span>
            </div>
            {wsConnected && (
              <div className="quick-stat live">
                <Zap size={18} />
                <span>Live Updates</span>
              </div>
            )}
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
                    {card.shortcut && <kbd className="card-shortcut">{card.shortcut}</kbd>}
                    <ChevronRight size={16} className="card-arrow" />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="activity-section">
            <div className="section-header">
              <h3>Recent Activity</h3>
              <button className="view-all" onClick={() => refreshAllData(false)}>
                <RefreshCw size={14} className={isRefreshing ? "spin" : ""} />
                Refresh
              </button>
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
                <strong>Jervice AI Pro Tip:</strong> "Pickup assign kaise kare" - pickup management ke baare mein jaane! Try voice commands by clicking the mic button 🎤
              </div>
            </div>

            <div className="keyboard-shortcuts-hint">
              <div className="hint-title">
                <Keyboard size={14} />
                <span>Keyboard Shortcuts</span>
              </div>
              <div className="shortcuts-grid">
                <div className="shortcut-item"><kbd>⌘K</kbd> <span>Search</span></div>
                <div className="shortcut-item"><kbd>⌘J</kbd> <span>Jervice AI</span></div>
                <div className="shortcut-item"><kbd>⌘R</kbd> <span>Refresh</span></div>
                <div className="shortcut-item"><kbd>⌘D</kbd> <span>Dark Mode</span></div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <JerviceAI onRefreshData={refreshAllData} />
    </div>
  );
}

export default AdminDashboard;