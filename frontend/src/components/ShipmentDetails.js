import React, { useEffect, useState, useRef } from "react";
import { Bot, Send, X, Mic, Headset } from "lucide-react"; 
import "./ShipmentDetail.css";

function ShipmentDetail() {
  // --- CONFIGURATION ---
  const BASE_URL = "https://faithcargo.onrender.com"; //

  const [shipments, setShipments] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // --- JERVICE AI STATES ---
  const [isJerviceOpen, setIsJerviceOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Systems online. Monitoring Faith Cargo network. How can I help, sir?" }
  ]);
  const [userInput, setUserInput] = useState("");
  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchShipments();
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- JERVICE VOICE ENGINE (Iron Man Style) ---
  const speak = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // Stop previous speech
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    
    // Selecting a deep male voice for Jarvis effect
    utterance.voice = voices.find(v => v.name.includes("Google UK English Male")) || voices[0];
    utterance.pitch = 0.85; 
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  // --- JERVICE API HANDLER (Connecting to DeepSeek via Backend) ---
  const handleJerviceChat = async () => {
    if (!userInput.trim()) return;

    const currentInput = userInput;
    const newMessages = [...messages, { role: "user", content: currentInput }];
    setMessages(newMessages);
    setUserInput("");

    try {
      // API call to your backend which holds the DeepSeek Key
      const res = await fetch(`${BASE_URL}/api/jervice/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            prompt: currentInput,
            context: "User is asking about Faith Cargo shipments. Tracking link: https://tracking.faithcargo.com/"
        })
      });

      const data = await res.json();
      const jerviceReply = data.reply || "Sir, I'm having trouble accessing the satellite uplink. Please try again.";

      setMessages([...newMessages, { role: "assistant", content: jerviceReply }]);
      speak(jerviceReply);

    } catch (err) {
      const errorMsg = "Communication failure, sir. The backend server is not responding.";
      setMessages([...newMessages, { role: "assistant", content: errorMsg }]);
      speak(errorMsg);
    }
  };

  const fetchShipments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/api/shipments/`);
      const data = await res.json();
      setShipments(data || []);
    } catch (err) {
      console.error(err);
      alert("❌ Failed to load shipments");
    } finally {
      setLoading(false);
    }
  };

  const filtered = shipments.filter((s) =>
    s.lr?.toString().toLowerCase().includes(search.toLowerCase())
  );

  // --- PRINT LOGIC (DOCKET & LABELS) ---
  const printDocket = async (lr) => {
    try {
      const res = await fetch(`${BASE_URL}/api/shipment/${lr}/`);
      const data = await res.json();

      const html = `
      <html>
      <head>
        <title>Docket - ${data.lr}</title>
        <style>
          body{font-family:Arial, sans-serif;padding:20px;}
          .container{border:2px solid #000;padding:20px; max-width:800px; margin:auto}
          .header{display:flex;justify-content:space-between; align-items:center}
          .company{font-size:24px;font-weight:bold; color:#d32f2f}
          .lr-box{border:2px solid #000; padding:10px; text-align:center}
          .section{margin-top:20px; border-top:1px solid #eee; padding-top:10px}
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div><div class="company">FAITH CARGO PVT LTD</div></div>
            <div class="lr-box"><b>LR NO:</b><br/><span style="font-size:22px">${data.lr}</span></div>
          </div>
          <div class="section"><b>Receiver:</b> ${data.deliveryName} | ${data.deliveryAddress}</div>
          <div class="section"><b>Status:</b> ${data.status} | <b>Weight:</b> ${data.weight} KG</div>
          <div style="text-align:center; margin-top:30px">
            <img src="https://barcode.tec-it.com/barcode.ashx?data=${data.lr}&code=Code128"/>
          </div>
        </div>
      </body>
      </html>`;

      const win = window.open("", "_blank");
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 500);
    } catch { alert("Print failed"); }
  };

  const printLabel = async (lr) => {
    // ... same logic as your original printLabel
    alert("Printing Labels for " + lr);
  };

  return (
    <div className="main">
      <div className="card">
        <div className="header-flex">
            <h2>Logistics Command Center</h2>
            <div className="badge-v">v5.0.2-ENTERPRISE</div>
        </div>
        
        <input
          className="search"
          placeholder="Search by LR (e.g. FCPL0001)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loading ? (
          <div className="loader-container">
            <div className="radar"></div>
            <p>Scanning Database...</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>LR Number</th>
                  <th>Route</th>
                  <th>Value</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((s, i) => (
                    <tr key={i}>
                      <td className="lr-col">{s.lr}</td>
                      <td>{s.route}</td>
                      <td>₹ {s.value?.toLocaleString()}</td>
                      <td><span className={`status-pill ${s.status?.toLowerCase()}`}>{s.status}</span></td>
                      <td className="action-btns">
                        <button onClick={() => printDocket(s.lr)}>🧾</button>
                        <button onClick={() => printLabel(s.lr)}>🏷️</button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="5" className="no-data">No Shipments Found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- JERVICE FLOATING UI --- */}
      <div className={`jervice-fab ${isJerviceOpen ? 'active' : ''}`} onClick={() => setIsJerviceOpen(!isJerviceOpen)}>
        <div className="fab-icon">
            {isJerviceOpen ? <X size={24}/> : <Bot size={24}/>}
        </div>
        {!isJerviceOpen && <span className="fab-text">JERVICE SUPPORT</span>}
      </div>

      {isJerviceOpen && (
        <div className="jervice-chat-window">
          <div className="chat-header">
            <div className="ai-status">
                <div className="dot"></div>
                <span>JERVICE v5.0.2</span>
            </div>
            <Headset size={18} />
          </div>
          
          <div className="chat-body">
            {messages.map((m, i) => (
              <div key={i} className={`chat-bubble ${m.role}`}>
                {m.content}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="chat-footer">
            <input 
              placeholder="Type your command, sir..." 
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleJerviceChat()}
            />
            <button className="send-btn" onClick={handleJerviceChat}>
                <Send size={18}/>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ShipmentDetail;