import React, { useState, useEffect, useRef } from "react";
import { 
  Bot, Send, X, ShieldCheck, Activity, Truck, MapPin, 
  Package, Calendar, Clock, AlertCircle, CheckCircle, 
  Volume2, VolumeX, Mic, RefreshCw, FileText, Eye, Trash2,
  Download, Printer, Search, Navigation
} from "lucide-react";
import "./ShipmentDetail.css";

function ShipmentDetails() {
  // State Management
  const [isJerviceOpen, setIsJerviceOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "🎤 **BIGG BOSS MODE ACTIVE!** Main hoon Jervice AI. Docket number batao, main tracking status bata dunga. Ya rate, booking ke liye pucho!" }
  ]);
  const [userInput, setUserInput] = useState("");
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shipments, setShipments] = useState([]);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [searchDocket, setSearchDocket] = useState("");
  const [trackingResult, setTrackingResult] = useState(null);
  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Load shipments on mount
  useEffect(() => {
    fetchShipments();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ============================================
  // 🚚 FETCH ALL SHIPMENTS FROM BACKEND
  // ============================================
  const fetchShipments = async () => {
    try {
      const response = await fetch("https://faithcargo.onrender.com/api/shipments/");
      const data = await response.json();
      setShipments(data);
    } catch (error) {
      console.error("Error fetching shipments:", error);
    }
  };

  // ============================================
  // 🔍 TRACK SHIPMENT FROM TRACKING PAGE
  // ============================================
  const trackShipment = async (docketNumber) => {
    setIsLoading(true);
    try {
      // Try to fetch from tracking API
      const trackingResponse = await fetch(`https://tracking.faithcargo.com/api/track/${docketNumber}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      }).catch(() => null);

      if (trackingResponse && trackingResponse.ok) {
        const trackingData = await trackingResponse.json();
        setTrackingResult(trackingData);
        return trackingData;
      }

      // Fallback to local database
      const dbResponse = await fetch(`https://faithcargo.onrender.com/api/shipments/shipment/${docketNumber}`);
      if (dbResponse.ok) {
        const dbData = await dbResponse.json();
        setTrackingResult(dbData);
        return dbData;
      }

      return null;
    } catch (error) {
      console.error("Tracking error:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // 🎤 BIGG BOSS STYLE VOICE ENGINE
  // ============================================
  const speak = (text) => {
    if (!isVoiceEnabled) return;
    
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[🎤💰📦✅⚠️🔍🚚📍]/g, '');
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'hi-IN';
    utterance.rate = 0.92;
    utterance.pitch = 0.88;
    utterance.volume = 1;
    
    // Try to get Indian female voice
    const voices = window.speechSynthesis.getVoices();
    const indianVoice = voices.find(voice => 
      voice.lang === 'hi-IN' && (voice.name.includes('Female') || voice.name.includes('Google'))
    );
    if (indianVoice) utterance.voice = indianVoice;
    
    window.speechSynthesis.speak(utterance);
  };

  // ============================================
  // 🎙️ VOICE RECOGNITION
  // ============================================
  const initVoiceRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      speak("Sir, aapka browser voice command support nahi karta. Chrome use karein.");
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
      handleJerviceChat(voiceInput);
      setIsListening(false);
    };
    
    recognitionRef.current.onerror = () => {
      setIsListening(false);
      speak("Sir, awaaz nahi sunai di. Dobara bolein.");
    };
    
    return true;
  };

  const startVoiceInput = () => {
    if (!recognitionRef.current && !initVoiceRecognition()) return;
    setIsListening(true);
    recognitionRef.current.start();
    speak("Bol rahe hain... Sun raha hoon.");
  };

  // ============================================
  // 🤖 EXTRACT DOCKET NUMBER
  // ============================================
  const extractDocketNumber = (text) => {
    const patterns = [
      /\bFCPL\d{4,8}\b/gi,
      /\b\d{8,15}\b/g,
      /\b[F][A]\d{8,12}\b/gi,
      /\b[D][L]\d{8,12}\b/gi
    ];
    
    for (let pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[0].toUpperCase();
    }
    return null;
  };

  // ============================================
  // 💰 CALCULATE RATE (HINDI)
  // ============================================
  const calculateRate = (origin, destination, weight = 10) => {
    const rates = {
      'mumbai-delhi': 18,
      'delhi-mumbai': 18,
      'mumbai-bangalore': 22,
      'delhi-kolkata': 25,
      'ahmedabad-mumbai': 12
    };
    const key = `${origin.toLowerCase()}-${destination.toLowerCase()}`;
    const rate = rates[key] || 25;
    const freight = rate * weight;
    return `💰 **RATE CALCULATION!** ${origin} se ${destination} tak ${weight} kg ka freight ₹${freight} hoga. Rate ₹${rate}/kg hai. GST 18% extra. Kya book karoon?`;
  };

  // ============================================
  // 🧠 JERVICE AI INTELLIGENT RESPONSE
  // ============================================
  const handleJerviceChat = async (inputOverride = null) => {
    const input = (inputOverride || userInput).trim();
    if (!input) return;

    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setUserInput("");
    setIsLoading(true);

    // Extract docket number
    const docketNumber = extractDocketNumber(input);
    
    let reply = "";
    
    // CASE 1: TRACKING REQUEST
    if (docketNumber || input.includes("track") || input.includes("kahan") || input.includes("status")) {
      const searchDocket = docketNumber || input.match(/\d+/)?.[0];
      
      if (searchDocket) {
        speak(`Sir, ${searchDocket} track kar raha hoon. Ek second...`);
        const trackingData = await trackShipment(searchDocket);
        
        if (trackingData) {
          reply = `🎤 **TRACKING UPDATE!** Docket ${searchDocket.toUpperCase()}\n\n` +
                  `📍 **Current Status:** ${trackingData.status || 'In Transit'}\n` +
                  `🚚 **Location:** ${trackingData.pickupPincode || 'N/A'} → ${trackingData.deliveryPincode || 'N/A'}\n` +
                  `📦 **Weight:** ${trackingData.weight || 'N/A'} kg\n` +
                  `👤 **Receiver:** ${trackingData.deliveryName || 'N/A'}\n` +
                  `⏰ **Last Update:** ${new Date().toLocaleString()}\n\n` +
                  `Kya aapko aur koi information chahiye, Sir?`;
        } else {
          reply = `⚠️ **SORRY SIR!** Docket ${searchDocket} humare system mein nahi mila. Kya aapne sahi number daala? Customer care se contact karein: 9818641504`;
        }
      } else {
        reply = "Sir, docket number batao jaise 'FCPL0001 track karo' ya 'Mera order kahan hai'. Main turant bata dunga!";
      }
    }
    
    // CASE 2: RATE CALCULATION
    else if (input.includes("rate") || input.includes("bhada") || input.includes("price") || input.includes("kitna")) {
      const cities = input.match(/([A-Za-z\u0900-\u097F]+)\s+se\s+([A-Za-z\u0900-\u097F]+)/i);
      if (cities) {
        const origin = cities[1];
        const destination = cities[2];
        const weightMatch = input.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilo|किलो)/i);
        const weight = weightMatch ? parseFloat(weightMatch[1]) : 10;
        reply = calculateRate(origin, destination, weight);
      } else {
        reply = "Sir, location batao jaise 'Mumbai se Delhi ka rate' ya 'Delhi se Bangalore 50kg'. Main turant calculate kar dunga!";
      }
    }
    
    // CASE 3: HELP / GENERAL
    else if (input.includes("help") || input.includes("madad") || input.includes("kya kar sakte ho")) {
      reply = `🎤 **JERVICE AI CAPABILITIES!** Sir, main ye sab kar sakta hoon:\n\n` +
              `✅ **Track Shipment** - Docket number batao\n` +
              `✅ **Rate Calculator** - "Mumbai se Delhi ka rate"\n` +
              `✅ **All Shipments** - Saare orders dikhao\n` +
              `✅ **Order Status** - Kahan hai mera order\n` +
              `✅ **Voice Commands** - Hindi mein bolo\n\n` +
              `Aaj kya service chahiye, Sir?`;
    }
    
    // CASE 4: LIST ALL SHIPMENTS
    else if (input.includes("all shipments") || input.includes("saare order") || input.includes("sab dikhao")) {
      if (shipments.length > 0) {
        reply = `📋 **ALL SHIPMENTS!** Sir, total ${shipments.length} orders hai system mein:\n\n` +
                shipments.slice(0, 5).map(s => `• ${s.lr} - ${s.route} - ${s.status}`).join('\n') +
                `\n\nPoori list neeche table mein hai. Kisi specific ka track karna ho toh docket number batao!`;
      } else {
        reply = "Sir, abhi koi shipment nahi hai system mein. Naya order create karein!";
      }
    }
    
    // DEFAULT
    else {
      reply = "🎤 **SUNIYE!** Main aapka logistics assistant hoon. Mujhse puchiye:\n• Docket track karna hai?\n• Rate nikalna hai?\n• Saare orders dekhne hain?\n\nMain taiyaar hoon, Sir!";
    }
    
    setMessages([...newMessages, { role: "assistant", content: reply }]);
    speak(reply);
    setIsLoading(false);
  };

  // ============================================
  // 🗑️ DELETE SHIPMENT
  // ============================================
  const deleteShipment = async (lrNumber) => {
    if (window.confirm(`Sir, kya aap sach mein ${lrNumber} delete karna chahte hain?`)) {
      try {
        const response = await fetch(`https://faithcargo.onrender.com/api/shipments/delete/${lrNumber}/`, {
          method: "DELETE"
        });
        if (response.ok) {
          fetchShipments();
          speak(`${lrNumber} delete ho gaya, Sir.`);
        }
      } catch (error) {
        console.error("Delete error:", error);
      }
    }
  };

  // ============================================
  // 📊 RENDER SHIPMENT TABLE
  // ============================================
  const renderShipmentTable = () => (
    <div className="shipment-table-container">
      <div className="table-header">
        <h3><Package size={20} /> All Shipments</h3>
        <div className="search-box">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search by LR Number..." 
            value={searchDocket}
            onChange={(e) => setSearchDocket(e.target.value)}
          />
          <button onClick={() => searchDocket && trackShipment(searchDocket)}>
            <RefreshCw size={16} />
          </button>
        </div>
      </div>
      
      <div className="table-wrapper">
        <table className="shipment-table">
          <thead>
            <tr>
              <th>LR Number</th>
              <th>Route</th>
              <th>Value (₹)</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {shipments.filter(s => !searchDocket || s.lr.includes(searchDocket.toUpperCase())).map((shipment, idx) => (
              <tr key={idx} className="shipment-row">
                <td className="lr-cell">{shipment.lr}</td>
                <td><MapPin size={14} /> {shipment.route}</td>
                <td>₹{shipment.value?.toLocaleString()}</td>
                <td>
                  <span className={`status-badge status-${shipment.status?.toLowerCase() || 'booked'}`}>
                    {shipment.status || 'Booked'}
                  </span>
                </td>
                <td className="action-buttons">
                  <button onClick={() => trackShipment(shipment.lr)} className="action-icon view" title="Track">
                    <Eye size={16} />
                  </button>
                  <button onClick={() => deleteShipment(shipment.lr)} className="action-icon delete" title="Delete">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ============================================
  // 🎨 TRACKING RESULT MODAL
  // ============================================
  const renderTrackingModal = () => {
    if (!trackingResult) return null;
    
    return (
      <div className="tracking-modal-overlay" onClick={() => setTrackingResult(null)}>
        <div className="tracking-modal" onClick={(e) => e.stopPropagation()}>
          <div className="tracking-modal-header">
            <h3><Truck size={20} /> Tracking Details</h3>
            <button className="close-modal" onClick={() => setTrackingResult(null)}>✕</button>
          </div>
          <div className="tracking-modal-body">
            <div className="tracking-lr">LR: {trackingResult.lr}</div>
            <div className="tracking-status-large">
              <div className={`status-icon status-${trackingResult.status?.toLowerCase() || 'in_transit'}`}>
                {trackingResult.status === 'delivered' ? <CheckCircle /> : <Activity />}
              </div>
              <div className="status-text">{trackingResult.status || 'In Transit'}</div>
            </div>
            <div className="tracking-details-grid">
              <div className="detail-item">
                <MapPin size={16} />
                <div>
                  <label>From</label>
                  <p>{trackingResult.pickupName || 'N/A'}<br/>{trackingResult.pickupPincode}</p>
                </div>
              </div>
              <div className="detail-item">
                <Package size={16} />
                <div>
                  <label>To</label>
                  <p>{trackingResult.deliveryName || 'N/A'}<br/>{trackingResult.deliveryPincode}</p>
                </div>
              </div>
              <div className="detail-item">
                <Clock size={16} />
                <div>
                  <label>Weight</label>
                  <p>{trackingResult.weight} kg</p>
                </div>
              </div>
              <div className="detail-item">
                <Calendar size={16} />
                <div>
                  <label>Last Update</label>
                  <p>{new Date().toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="tracking-modal-footer">
            <button onClick={() => window.print()} className="print-btn"><Printer size={16} /> Print</button>
            <button onClick={() => setTrackingResult(null)} className="close-btn">Close</button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // 🎨 MAIN RENDER
  // ============================================
  return (
    <div className="shipment-details-page">
      <div className="page-header-shipment">
        <div className="header-title">
          <h1>📦 Shipment Management</h1>
          <p>Track, manage and monitor all your shipments in real-time</p>
        </div>
        <div className="header-stats">
          <div className="stat-card">
            <Package size={20} />
            <div>
              <span>Total Shipments</span>
              <strong>{shipments.length}</strong>
            </div>
          </div>
          <div className="stat-card">
            <CheckCircle size={20} color="#10b981" />
            <div>
              <span>Delivered</span>
              <strong>{shipments.filter(s => s.status === 'delivered').length}</strong>
            </div>
          </div>
        </div>
      </div>

      {renderShipmentTable()}
      {renderTrackingModal()}

      {/* JERVICE AI FLOATING ASSISTANT */}
      <div className={`jervice-container ${isJerviceOpen ? 'open' : ''}`}>
        {!isJerviceOpen ? (
          <button className="jervice-trigger" onClick={() => setIsJerviceOpen(true)}>
            <div className="pulse-ring"></div>
            <Bot size={28} color="white" />
            <span className="jervice-label">JERVICE AI</span>
            <div className="voice-badge">🎤</div>
          </button>
        ) : (
          <div className="jervice-window professional-dark">
            <div className="jervice-header">
              <div className="ai-identity">
                <ShieldCheck size={16} color="#00ff00" />
                <span className="ai-title">🎤 BIGG BOSS MODE | HINDI AI</span>
              </div>
              <div className="header-controls">
                <button 
                  className="voice-toggle" 
                  onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                  title={isVoiceEnabled ? "Voice ON" : "Voice OFF"}
                >
                  {isVoiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
                <button 
                  className="mic-btn" 
                  onClick={startVoiceInput}
                  disabled={isListening}
                >
                  <Mic size={16} className={isListening ? 'pulse-mic' : ''} />
                </button>
                <X className="close-icon" onClick={() => setIsJerviceOpen(false)} />
              </div>
            </div>
            
            <div className="jervice-chat-area">
              {messages.map((m, idx) => (
                <div key={idx} className={`chat-msg ${m.role}`}>
                  <div className="msg-content">{m.content}</div>
                </div>
              ))}
              {isLoading && (
                <div className="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              )}
              {isListening && (
                <div className="listening-indicator">
                  🎙️ Sun raha hoon... Boliye...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="jervice-input-bar">
              <input 
                type="text"
                placeholder="Hindi mein bolein... Jaise: 'Docket FCPL0001 track karo'"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleJerviceChat()}
              />
              <button onClick={() => handleJerviceChat()} className="send-btn" disabled={isLoading}>
                <Send size={18} />
              </button>
            </div>
            
            <div className="jervice-footer">
              <div className="quick-actions">
                <button onClick={() => handleJerviceChat("saare order dikhao")}>📋 All Orders</button>
                <button onClick={() => handleJerviceChat("help")}>❓ Help</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ShipmentDetails;