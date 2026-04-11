import React, { useState, useEffect, useRef } from "react";
import { Bot, Send, X, ShieldCheck, Activity } from "lucide-react";
import "./ShipmentDetail.css";

function ShipmentDetails() {
  const [isJerviceOpen, setIsJerviceOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Mainframe online, Sir. Faith Cargo network active hai. Main aapki kya madad kar sakta hoon?" }
  ]);
  const [userInput, setUserInput] = useState("");
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Voice Engine (Hindi Support)
  const speak = (text) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'hi-IN'; // Hindi Voice support
    utterance.pitch = 0.8;
    window.speechSynthesis.speak(utterance);
  };

  const handleJerviceChat = async () => {
    if (!userInput.trim()) return;

    const input = userInput.toLowerCase();
    const newMessages = [...messages, { role: "user", content: userInput }];
    setMessages(newMessages);
    setUserInput("");

    let contextData = {};

    // Check if user is asking for rates (e.g., "Mumbai se Delhi ka rate kya hai?")
    if (input.includes("rate") || input.includes("bhada") || input.includes("price")) {
      speak("Sir, main rate calculate kar raha hoon. Ek pal dijiye.");
      // Yahan hum dummy context bhej rahe hain, aap real calculation function call kar sakte hain
      contextData = { info: "Asking for rates", min_billing: 650, gst: "18%" };
    }

    try {
      const res = await fetch("https://faithcargo.onrender.com/api/jervice/intelligent-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input, contextData })
      });

      const data = await res.json();
      setMessages([...newMessages, { role: "assistant", content: data.reply }]);
      speak(data.reply);
      
    } catch (err) {
      const errorMsg = "Sir, satellite link unstable hai. Please try again.";
      setMessages([...newMessages, { role: "assistant", content: errorMsg }]);
      speak(errorMsg);
    }
  };

  return (
    <div className="main">
      {/* Existing Table Content... */}
      
      <div className={`jervice-container ${isJerviceOpen ? 'open' : ''}`}>
        {!isJerviceOpen ? (
          <button className="jervice-trigger" onClick={() => setIsJerviceOpen(true)}>
            <div className="pulse-ring"></div>
            <Bot size={24} color="white" />
            <span>JERVICE AI</span>
          </button>
        ) : (
          <div className="jervice-window professional-dark">
            <div className="jervice-header">
              <div className="ai-identity">
                <ShieldCheck size={16} color="#00ff00" />
                <span>JERVICE SECURE-LINK (HINDI)</span>
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
                placeholder="Command dijiye, Sir..." 
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

export default ShipmentDetails; // Match the filename in your image