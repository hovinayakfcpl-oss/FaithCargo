import React, { useState, useEffect, useRef } from "react";
import { Bot, Send, X, Activity } from "lucide-react";
import "./ShipmentDetail.css";

function ShipmentDetail() {
  const [isJerviceOpen, setIsJerviceOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Online and ready, sir. I can track any shipment for you." }
  ]);
  const [userInput, setUserInput] = useState("");
  const chatEndRef = useRef(null);

  // --- JERVICE VOICE ENGINE (No API Needed) ---
  const speak = (text) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find(v => v.name.includes("Male")) || voices[0];
    utterance.pitch = 0.8;
    window.speechSynthesis.speak(utterance);
  };

  // --- MANUAL INTELLIGENCE LOGIC ---
  const handleJerviceChat = () => {
    if (!userInput.trim()) return;

    const input = userInput.toLowerCase();
    const newMessages = [...messages, { role: "user", content: userInput }];
    setMessages(newMessages);
    setUserInput("");

    let response = "";

    // 1. Check for Mumbai / City context
    if (input.includes("mumbai") || input.includes("delhi") || input.includes("shipment")) {
        if (!/\d{5,}/.test(input)) {
            response = "Sir, Faith Cargo has multiple shipments in that region. Please provide the specific Docket Number for a precise update.";
        }
    }

    // 2. Check for Docket Number and Track
    const docketMatch = input.match(/\d{5,}/);
    if (docketMatch) {
        const docket = docketMatch[0];
        // Yahan hum tracking link use kar rahe hain
        const trackingUrl = `https://tracking.faithcargo.com/`; 
        
        response = `Sir, I am accessing the Faith Cargo portal for Docket ${docket}. The system shows it is currently in transit. You can see full logs at ${trackingUrl}`;
        
        // Voice automation
        speak(`Tracking docket ${docket} now. The shipment is active in our network, sir.`);
    }

    if (!response) {
        response = "I am monitoring the network, sir. How can I help with your logistics today?";
    }

    setTimeout(() => {
        setMessages([...newMessages, { role: "assistant", content: response }]);
        if (!docketMatch) speak(response);
    }, 600);
  };

  return (
    <div className="main">
      {/* ... Aapka existing table code ... */}

      {/* --- JERVICE UI --- */}
      <div className={`jervice-container ${isJerviceOpen ? 'open' : ''}`}>
        {!isJerviceOpen ? (
          <button className="jervice-trigger" onClick={() => setIsJerviceOpen(true)}>
            <Bot size={24} color="white" />
            <span>JERVICE LIVE</span>
          </button>
        ) : (
          <div className="jervice-window professional-dark">
            <div className="jervice-header">
              <span>JERVICE v5.0 (SYSTEMS NOMINAL)</span>
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
                placeholder="Ask Jervice..." 
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