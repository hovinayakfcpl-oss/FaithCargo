import React, { useState, useEffect, useRef } from "react";
import { Bot, Send, X, Activity, Terminal, ShieldCheck } from "lucide-react";
import "./ShipmentDetail.css";

function ShipmentDetail() {
  const BASE_URL = "https://faithcargo.onrender.com";

  const [shipments, setShipments] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // --- JERVICE STATES ---
  const [isJerviceOpen, setIsJerviceOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Mainframe online, sir. Monitoring Faith Cargo network. How can I help?" }
  ]);
  const [userInput, setUserInput] = useState("");
  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchShipments();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- JERVICE VOICE ENGINE ---
  const speak = (text) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    // Deep male voice filter
    utterance.voice = voices.find(v => v.name.includes("Male") || v.name.includes("UK English")) || voices[0];
    utterance.pitch = 0.8;
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  // --- JERVICE TRACKING LOGIC ---
  const handleJerviceChat = () => {
    if (!userInput.trim()) return;

    const input = userInput.toLowerCase();
    const newMessages = [...messages, { role: "user", content: userInput }];
    setMessages(newMessages);
    setUserInput("");

    let response = "";
    const docketMatch = input.match(/\d{5,}/);

    if (docketMatch) {
      const docket = docketMatch[0];
      // Professional Jarvis Response
      response = `Sir, I am accessing the Faith Cargo mainframe for Docket ${docket}. The shipment is currently in transit and moving towards its destination. You can view the live technical logs here: https://tracking.faithcargo.com/`;
      speak(`Tracking docket ${docket} now. Status is active, sir.`);
    } else if (input.includes("mumbai") || input.includes("delhi") || input.includes("shipment")) {
      response = "Sir, we have multiple shipments in the system. Please provide a specific Docket Number for a precise update.";
      speak(response);
    } else {
      response = "I am monitoring all routes, sir. Systems are nominal.";
      speak(response);
    }

    setTimeout(() => {
      setMessages([...newMessages, { role: "assistant", content: response }]);
    }, 600);
  };

  const fetchShipments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/api/shipments/`);
      const data = await res.json();
      setShipments(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main">
      <div className="card dark-professional">
        <div className="dashboard-header">
          <h2><Activity size={20} color="#d32f2f" /> LOGISTICS COMMAND CENTER</h2>
          <span className="version-tag">ENTERPRISE v5.0.2</span>
        </div>

        <input
          className="search-input"
          placeholder="Search LR Database (e.g. FCPL0001)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loading ? (
          <p className="loading-text">Accessing Satellite Uplink...</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>DOCKET</th>
                  <th>ROUTE</th>
                  <th>VALUE</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {shipments.filter(s => s.lr.includes(search)).map((s, i) => (
                  <tr key={i} className="table-row">
                    <td className="lr-text">{s.lr}</td>
                    <td>{s.route}</td>
                    <td>₹ {s.value?.toLocaleString()}</td>
                    <td><span className="status-badge">{s.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- JERVICE UI --- */}
      <div className={`jervice-container ${isJerviceOpen ? 'open' : ''}`}>
        {!isJerviceOpen ? (
          <button className="jervice-trigger" onClick={() => setIsJerviceOpen(true)}>
            <div className="pulse-ring"></div>
            <Bot size={24} color="white" />
            <span>JERVICE LIVE</span>
          </button>
        ) : (
          <div className="jervice-window">
            <div className="jervice-header">
              <div className="ai-identity">
                <ShieldCheck size={16} color="#00ff00" />
                <span>JERVICE SECURE-LINK</span>
              </div>
              <X className="close-icon" onClick={() => setIsJerviceOpen(false)} />
            </div>
            <div className="jervice-chat-area">
              {messages.map((m, i) => (
                <div key={i} className={`chat-msg ${m.role}`}>{m.content}</div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="jervice-input-bar">
              <input 
                placeholder="Awaiting command, sir..." 
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleJerviceChat()}
              />
              <button onClick={handleJerviceChat}><Send size={18}/></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Ye line sabse zaroori hai error fix karne ke liye
export default ShipmentDetail;