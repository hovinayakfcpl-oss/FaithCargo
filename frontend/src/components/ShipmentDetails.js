import React, { useState, useEffect, useRef } from "react";
import { 
  Bot, Send, X, ShieldCheck, Activity, Truck, MapPin, 
  Package, Calendar, Clock, AlertCircle, CheckCircle, 
  Volume2, VolumeX, Mic, RefreshCw, FileText, Eye, Trash2,
  Download, Printer, Search, Navigation, Edit3, Save, 
  PlusCircle, Filter, TrendingUp, Award, Crown, Settings,
  CheckSquare, Square, Printer as PrinterIcon, Barcode,
  Image as ImageIcon, File as FileIcon
} from "lucide-react";
import "./ShipmentDetail.css";

function ShipmentDetails() {
  // State Management
  const [isJerviceOpen, setIsJerviceOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "🎤 **BIGG BOSS MODE ACTIVE!** Main hoon Jervice AI. Docket number batao, main tracking status bata dunga. Ya rate, booking ke liye pucho!\n\n**NEW FEATURES:**\n✅ Manual Status Update\n✅ Edit Shipment\n✅ Delete Shipment\n✅ Print Docket\n✅ Print Label\n✅ Voice Commands\n✅ Invoice Download" }
  ]);
  const [userInput, setUserInput] = useState("");
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shipments, setShipments] = useState([]);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [searchDocket, setSearchDocket] = useState("");
  const [trackingResult, setTrackingResult] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [statusFilter, setStatusFilter] = useState("all");
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printDocketData, setPrintDocketData] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const printRef = useRef(null);

  // Available statuses for manual update - with black text by default
  const statusOptions = [
    { value: "booked", label: "📝 Booked", color: "#f59e0b", bgColor: "#fef3c7", icon: "📝" },
    { value: "picked", label: "🚚 Picked Up", color: "#3b82f6", bgColor: "#dbeafe", icon: "🚚" },
    { value: "in_transit", label: "🚛 In Transit", color: "#8b5cf6", bgColor: "#e0e7ff", icon: "🚛" },
    { value: "out_for_delivery", label: "📦 Out for Delivery", color: "#ec4898", bgColor: "#fce7f3", icon: "📦" },
    { value: "delivered", label: "✅ Delivered", color: "#10b981", bgColor: "#d1fae5", icon: "✅" },
    { value: "cancelled", label: "❌ Cancelled", color: "#ef4444", bgColor: "#fee2e2", icon: "❌" },
    { value: "dispatched", label: "✈️ Dispatched", color: "#06b6d4", bgColor: "#cffafe", icon: "✈️" },
    { value: "hold", label: "⏸️ On Hold", color: "#6b7280", bgColor: "#f1f5f9", icon: "⏸️" }
  ];

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
      // Load uploaded invoices from localStorage
      const enhancedData = data.map(shipment => {
        const savedInvoices = localStorage.getItem(`invoices_${shipment.lr}`);
        if (savedInvoices) {
          return { ...shipment, uploadedInvoices: JSON.parse(savedInvoices) };
        }
        return shipment;
      });
      setShipments(enhancedData);
      localStorage.setItem('allShipments', JSON.stringify(enhancedData));
    } catch (error) {
      console.error("Error fetching shipments:", error);
      const localShipments = JSON.parse(localStorage.getItem('allShipments') || '[]');
      setShipments(localShipments);
    }
  };

  // ============================================
  // 📎 VIEW INVOICES
  // ============================================
  const viewInvoices = (shipment) => {
    const invoices = shipment.uploadedInvoices || [];
    if (invoices.length === 0) {
      alert("No invoices uploaded for this shipment");
      return;
    }
    setSelectedInvoices(invoices);
    setShowInvoiceModal(true);
  };

  // ============================================
  // 📥 DOWNLOAD INVOICE
  // ============================================
  const downloadInvoice = (invoice) => {
    if (invoice.url) {
      const link = document.createElement('a');
      link.href = invoice.url;
      link.download = invoice.name;
      link.click();
    } else if (invoice.file) {
      // If file object is stored
      const url = URL.createObjectURL(invoice.file);
      const link = document.createElement('a');
      link.href = url;
      link.download = invoice.name;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      alert("Invoice file not available for download");
    }
  };

  // ============================================
  // 🔍 TRACK SHIPMENT
  // ============================================
  const trackShipment = async (docketNumber) => {
    setIsLoading(true);
    try {
      const response = await fetch(`https://faithcargo.onrender.com/api/shipments/shipment/${docketNumber}`);
      if (response.ok) {
        const data = await response.json();
        // Load uploaded invoices for this shipment
        const savedInvoices = localStorage.getItem(`invoices_${data.lr}`);
        if (savedInvoices) {
          data.uploadedInvoices = JSON.parse(savedInvoices);
        }
        setTrackingResult(data);
        return data;
      }
      const localShipments = JSON.parse(localStorage.getItem('allShipments') || '[]');
      const found = localShipments.find(s => s.lr === docketNumber || s.awb === docketNumber);
      if (found) {
        setTrackingResult(found);
        return found;
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
  // ✏️ EDIT SHIPMENT
  // ============================================
  const handleEditShipment = (shipment) => {
    setSelectedShipment(shipment);
    setEditFormData({
      lr: shipment.lr,
      awb: shipment.awb || "",
      pickupName: shipment.pickupName || "",
      pickupPincode: shipment.pickupPincode || "",
      deliveryName: shipment.deliveryName || "",
      deliveryPincode: shipment.deliveryPincode || "",
      weight: shipment.weight || 0,
      status: shipment.status || "booked",
      total_value: shipment.total_value || shipment.value || 0
    });
    setIsEditing(true);
  };

  const saveEditShipment = async () => {
    try {
      const response = await fetch(`https://faithcargo.onrender.com/api/shipments/update/${editFormData.lr}/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData)
      });
      
      if (response.ok) {
        await fetchShipments();
        setIsEditing(false);
        setSelectedShipment(null);
        speak(`Sir, shipment ${editFormData.lr} successfully update ho gaya.`);
      } else {
        const localShipments = JSON.parse(localStorage.getItem('allShipments') || '[]');
        const index = localShipments.findIndex(s => s.lr === editFormData.lr);
        if (index !== -1) {
          localShipments[index] = { ...localShipments[index], ...editFormData };
          localStorage.setItem('allShipments', JSON.stringify(localShipments));
          fetchShipments();
          setIsEditing(false);
          speak(`Sir, shipment ${editFormData.lr} update ho gaya.`);
        }
      }
    } catch (error) {
      console.error("Edit error:", error);
    }
  };

  // ============================================
  // 🎯 UPDATE STATUS MANUALLY
  // ============================================
  const updateShipmentStatus = async (lrNumber, newStatus) => {
    try {
      const response = await fetch(`https://faithcargo.onrender.com/api/shipments/update-status/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lr: lrNumber, status: newStatus })
      });
      
      if (response.ok) {
        await fetchShipments();
        const statusLabel = statusOptions.find(s => s.value === newStatus)?.label || newStatus;
        speak(`Sir, docket ${lrNumber} ka status ${statusLabel} update kar diya gaya.`);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Status update error:", error);
      return false;
    }
  };

  // ============================================
  // 🗑️ DELETE SHIPMENT
  // ============================================
  const deleteShipment = async (lrNumber) => {
    if (window.confirm(`⚠️ Sir, kya aap sach mein ${lrNumber} permanently delete karna chahte hain?`)) {
      try {
        const response = await fetch(`https://faithcargo.onrender.com/api/shipments/delete/${lrNumber}/`, {
          method: "DELETE"
        });
        
        if (response.ok) {
          localStorage.removeItem(`invoices_${lrNumber}`);
          fetchShipments();
          speak(`${lrNumber} delete ho gaya, Sir.`);
        } else {
          const localShipments = JSON.parse(localStorage.getItem('allShipments') || '[]');
          const filtered = localShipments.filter(s => s.lr !== lrNumber);
          localStorage.setItem('allShipments', JSON.stringify(filtered));
          localStorage.removeItem(`invoices_${lrNumber}`);
          fetchShipments();
          speak(`${lrNumber} delete ho gaya, Sir.`);
        }
      } catch (error) {
        console.error("Delete error:", error);
      }
    }
  };

  // ============================================
  // 🖨️ PRINT DOCKET
  // ============================================
  const printDocket = (shipment) => {
    setPrintDocketData(shipment);
    setTimeout(() => {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>Faith Cargo - Docket ${shipment.lr}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: Arial, sans-serif; padding: 20px; background: white; }
              .docket { width: 190mm; min-height: 270mm; margin: 0 auto; border: 2px solid #d32f2f; padding: 15px; position: relative; }
              .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 60px; font-weight: bold; color: rgba(0,0,0,0.03); white-space: nowrap; pointer-events: none; }
              .header { text-align: center; border-bottom: 2px solid #d32f2f; padding-bottom: 10px; margin-bottom: 15px; }
              .header h1 { color: #d32f2f; margin-bottom: 5px; font-size: 18px; }
              .lr-number { font-size: 20px; font-weight: bold; text-align: center; margin: 10px 0; color: #d32f2f; }
              .barcode { text-align: center; margin: 10px 0; }
              .parties { display: flex; gap: 15px; margin-bottom: 15px; }
              .party { flex: 1; border: 1px solid #ddd; padding: 10px; border-radius: 6px; }
              .party h3 { background: #f5f5f5; margin: -10px -10px 10px -10px; padding: 8px; border-radius: 6px 6px 0 0; font-size: 12px; }
              .details-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 12px; }
              .details-table th, .details-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              .details-table th { background: #f5f5f5; }
              .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; text-align: center; font-size: 10px; }
              @media print { body { margin: 0; padding: 0; } .watermark { print-color-adjust: exact; } }
            </style>
          </head>
          <body>
            <div class="docket">
              <div class="watermark">FCPL</div>
              <div class="header">
                <h1>FAITH CARGO PRIVATE LIMITED</h1>
                <p>4/15, Kirti Nagar Industrial Area, New Delhi - 110015</p>
                <p>GST: 07AAFCF2947K1ZD | Tel: 9818641504</p>
              </div>
              <div class="lr-number">CONSIGNMENT NOTE: ${shipment.lr}</div>
              <div class="barcode"><img src="https://barcode.tec-it.com/barcode.ashx?data=${shipment.lr}&code=Code128&dpi=96" width="250" /></div>
              <div class="parties">
                <div class="party">
                  <h3>📤 CONSIGNOR (Sender)</h3>
                  <p><strong>${shipment.pickupName || 'N/A'}</strong></p>
                  <p>Pincode: ${shipment.pickupPincode || 'N/A'}</p>
                </div>
                <div class="party">
                  <h3>📥 CONSIGNEE (Receiver)</h3>
                  <p><strong>${shipment.deliveryName || 'N/A'}</strong></p>
                  <p>Pincode: ${shipment.deliveryPincode || 'N/A'}</p>
                </div>
              </div>
              <table class="details-table">
                <tr><th>Description</th><td>${shipment.material || 'General Cargo'}</td></tr>
                <tr><th>Weight</th><td>${shipment.weight || 0} kg</td></tr>
                <tr><th>Total Value</th><td>₹${(shipment.total_value || shipment.value || 0).toLocaleString()}</td></tr>
                <tr><th>Status</th><td><span style="background:${statusOptions.find(s=>s.value===shipment.status)?.bgColor || '#fef3c7'}; color:${statusOptions.find(s=>s.value===shipment.status)?.color || '#f59e0b'}; padding:3px 10px; border-radius:15px;">${statusOptions.find(s=>s.value===shipment.status)?.label || 'Booked'}</span></td></tr>
                <tr><th>AWB Number</th><td>${shipment.awb || 'N/A'}</td></tr>
              </table>
              <div class="footer">
                <p>Terms: Goods carried at Owner's Risk | Subject to Delhi Jurisdiction</p>
                <p>For Support: 9818641504 | care@faithcargo.com</p>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
      setPrintDocketData(null);
    }, 100);
  };

  // ============================================
  // 🏷️ PRINT LABEL
  // ============================================
  const printLabel = (shipment) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Label - ${shipment.lr}</title>
          <style>
            body { font-family: Arial; padding: 20px; background: white; }
            .label { width: 4in; border: 2px solid #2563eb; padding: 15px; margin: 0 auto; border-radius: 10px; }
            .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 10px; }
            .header h2 { margin: 0; color: #0f172a; font-size: 16px; }
            .lr { font-size: 20px; font-weight: bold; text-align: center; margin: 12px 0; color: #d32f2f; }
            .barcode { text-align: center; margin: 10px 0; }
            .address { font-size: 10px; margin: 6px 0; }
            .footer { font-size: 8px; text-align: center; margin-top: 10px; padding-top: 8px; border-top: 1px dashed #ccc; }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="header">
              <h2>FAITH CARGO PVT LTD</h2>
              <p>4/15, Kirti Nagar, Delhi - 110015</p>
            </div>
            <div class="lr">LR: ${shipment.lr}</div>
            <div class="barcode"><img src="https://barcode.tec-it.com/barcode.ashx?data=${shipment.lr}&code=Code128&dpi=96" width="200" /></div>
            <div class="address"><strong>From:</strong> ${shipment.pickupName || 'N/A'} - ${shipment.pickupPincode || 'N/A'}</div>
            <div class="address"><strong>To:</strong> ${shipment.deliveryName || 'N/A'} - ${shipment.deliveryPincode || 'N/A'}</div>
            <div class="footer">Weight: ${shipment.weight || 0} Kg | Status: ${statusOptions.find(s=>s.value===shipment.status)?.label || 'Booked'}</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  // ============================================
  // 🎤 VOICE ENGINE
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
      speak("Sir, aapka browser voice command support nahi karta.");
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
      speak("Sir, awaaz nahi sunai di.");
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
  // 🤖 JERVICE AI - ADVANCED RESPONSE
  // ============================================
  const handleJerviceChat = async (inputOverride = null) => {
    const input = (inputOverride || userInput).trim();
    if (!input) return;

    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setUserInput("");
    setIsLoading(true);

    const lowerInput = input.toLowerCase();
    
    const docketMatch = input.match(/\b(FCPL|FCL|LR)?\s*(\d{4,12})\b/i);
    const docketNumber = docketMatch ? docketMatch[2] : null;
    
    let reply = "";
    
    if ((lowerInput.includes("update status") || lowerInput.includes("status update") || 
         lowerInput.includes("change status") || lowerInput.includes("dispatch")) && docketNumber) {
      
      let newStatus = null;
      for (let status of statusOptions) {
        if (lowerInput.includes(status.value.replace('_', ' ')) || 
            lowerInput.includes(status.label.toLowerCase())) {
          newStatus = status.value;
          break;
        }
      }
      
      if (newStatus) {
        const success = await updateShipmentStatus(docketNumber, newStatus);
        if (success) {
          reply = `✅ **STATUS UPDATED!** Sir, docket ${docketNumber} ka status "${statusOptions.find(s => s.value === newStatus)?.label}" kar diya gaya.\n\nKya aapko aur koi help chahiye?`;
        } else {
          reply = `❌ **UPDATE FAILED!** Sir, docket ${docketNumber} ka status update nahi ho paya.`;
        }
      } else {
        reply = `📝 **STATUS UPDATE HELP!** Sir, batao kis status mein change karna hai:\n\n` +
                statusOptions.map(s => `• ${s.label}`).join('\n') +
                `\n\nExample: "Docket ${docketNumber} status update karo delivered"`;
      }
    }
    
    else if (docketNumber || lowerInput.includes("track") || lowerInput.includes("kahan") || lowerInput.includes("status check")) {
      const searchDocket = docketNumber || input.match(/\d+/)?.[0];
      
      if (searchDocket) {
        speak(`Sir, ${searchDocket} track kar raha hoon...`);
        const trackingData = await trackShipment(searchDocket);
        
        if (trackingData) {
          const invoiceCount = trackingData.uploadedInvoices?.length || 0;
          reply = `🎤 **TRACKING UPDATE!** Docket ${searchDocket.toUpperCase()}\n\n` +
                  `📍 **Current Status:** ${statusOptions.find(s => s.value === trackingData.status)?.label || trackingData.status || 'In Transit'}\n` +
                  `🚚 **Route:** ${trackingData.pickupPincode || 'N/A'} → ${trackingData.deliveryPincode || 'N/A'}\n` +
                  `📦 **Weight:** ${trackingData.weight || 0} kg\n` +
                  `👤 **Receiver:** ${trackingData.deliveryName || 'N/A'}\n` +
                  `📎 **Invoices:** ${invoiceCount} invoice(s) uploaded\n` +
                  `⏰ **Last Update:** ${new Date().toLocaleString()}\n\n` +
                  `Kya aapko status update karna hai ya invoices dekhne hain?`;
        } else {
          reply = `⚠️ **NOT FOUND!** Sir, docket ${searchDocket} system mein nahi mila. Customer care: 9818641504`;
        }
      } else {
        reply = "Sir, docket number batao jaise 'FCPL0001 track karo'.";
      }
    }
    
    else if (lowerInput.includes("all shipments") || lowerInput.includes("saare order") || 
             lowerInput.includes("sab dikhao") || lowerInput.includes("list")) {
      if (shipments.length > 0) {
        reply = `📋 **ALL SHIPMENTS!** Sir, total ${shipments.length} orders:\n\n` +
                shipments.slice(0, 5).map(s => `• ${s.lr} - ${s.route || s.pickupPincode + '→' + s.deliveryPincode} - ${statusOptions.find(opt => opt.value === s.status)?.label || s.status} ${s.uploadedInvoices?.length ? `📎(${s.uploadedInvoices.length})` : ''}`).join('\n') +
                `\n\nPoori list neeche table mein hai.`;
      } else {
        reply = "Sir, abhi koi shipment nahi hai.";
      }
    }
    
    else if ((lowerInput.includes("delete") || lowerInput.includes("remove")) && docketNumber) {
      await deleteShipment(docketNumber);
      reply = `🗑️ **DELETED!** Sir, docket ${docketNumber} delete kar diya gaya.`;
    }
    
    else if ((lowerInput.includes("print") || lowerInput.includes("docket print")) && docketNumber) {
      const shipment = shipments.find(s => s.lr === docketNumber || s.awb === docketNumber);
      if (shipment) {
        printDocket(shipment);
        reply = `🖨️ **PRINTING!** Sir, docket ${docketNumber} print kar raha hoon.`;
      } else {
        reply = `❌ Sir, docket ${docketNumber} nahi mila.`;
      }
    }
    
    else if ((lowerInput.includes("invoice") || lowerInput.includes("download invoice")) && docketNumber) {
      const shipment = shipments.find(s => s.lr === docketNumber || s.awb === docketNumber);
      if (shipment && shipment.uploadedInvoices?.length > 0) {
        setSelectedInvoices(shipment.uploadedInvoices);
        setShowInvoiceModal(true);
        reply = `📎 **INVOICES!** Sir, docket ${docketNumber} ke liye ${shipment.uploadedInvoices.length} invoice(s) hain. Window khulegi.`;
      } else if (shipment) {
        reply = `❌ Sir, docket ${docketNumber} ke liye koi invoice upload nahi hai.`;
      } else {
        reply = `❌ Sir, docket ${docketNumber} nahi mila.`;
      }
    }
    
    else if (lowerInput.includes("help") || lowerInput.includes("madad") || 
             lowerInput.includes("kya kar sakte ho") || lowerInput.includes("features")) {
      reply = `🎤 **JERVICE AI - COMPLETE FEATURES!** Sir, main ye sab kar sakta hoon:\n\n` +
              `✅ **Track Shipment** - "Track FCPL0001"\n` +
              `✅ **Update Status** - "Docket FCPL0001 status update karo delivered"\n` +
              `✅ **Delete Shipment** - "Delete FCPL0001"\n` +
              `✅ **Print Docket** - "Print docket FCPL0001"\n` +
              `✅ **Print Label** - "Print label FCPL0001"\n` +
              `✅ **View Invoices** - "Invoices FCPL0001"\n` +
              `✅ **Download Invoice** - "Download invoice FCPL0001"\n` +
              `✅ **All Shipments** - "Saare order dikhao"\n` +
              `✅ **Edit Shipment** - Table mein edit button use karein\n\n` +
              `Aaj kya service chahiye, Sir? 🙏`;
    }
    
    else {
      reply = `🎤 **SUNIYE!** Main aapka logistics assistant hoon. Mujhse puchiye:\n\n` +
              `• "Track FCPL0001" - Status check\n` +
              `• "Docket FCPL0001 status update karo delivered" - Status change\n` +
              `• "Invoices FCPL0001" - View uploaded invoices\n` +
              `• "Saare order dikhao" - All shipments\n` +
              `• "Print docket FCPL0001" - Print docket\n` +
              `• "Help" - All features\n\n` +
              `Main taiyaar hoon, Sir!`;
    }
    
    setMessages([...newMessages, { role: "assistant", content: reply }]);
    speak(reply);
    setIsLoading(false);
  };

  // Filter shipments by status
  const filteredShipments = shipments.filter(s => {
    if (statusFilter === "all") return true;
    return s.status === statusFilter;
  }).filter(s => !searchDocket || s.lr?.toUpperCase().includes(searchDocket.toUpperCase()) || s.awb?.toUpperCase().includes(searchDocket.toUpperCase()));

  // Get status count
  const getStatusCount = (statusValue) => {
    return shipments.filter(s => s.status === statusValue).length;
  };

  // ============================================
  // 📊 RENDER SHIPMENT TABLE
  // ============================================
  const renderShipmentTable = () => (
    <div className="shipment-table-container">
      <div className="table-header">
        <div className="header-left">
          <h3><Package size={20} /> All Shipments</h3>
          <div className="filter-buttons">
            <button 
              className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All ({shipments.length})
            </button>
            {statusOptions.map(opt => (
              <button
                key={opt.value}
                className={`filter-btn ${statusFilter === opt.value ? 'active' : ''}`}
                style={{ 
                  '--status-color': opt.color,
                  '--status-bg': opt.bgColor
                }}
                onClick={() => setStatusFilter(opt.value)}
              >
                {opt.icon} {opt.label} ({getStatusCount(opt.value)})
              </button>
            ))}
          </div>
        </div>
        <div className="search-box">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search by LR / AWB..." 
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
              <th>AWB</th>
              <th>Route</th>
              <th>Weight</th>
              <th>Value (₹)</th>
              <th>Status</th>
              <th>Invoices</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredShipments.map((shipment, idx) => {
              const statusOpt = statusOptions.find(opt => opt.value === shipment.status) || statusOptions[0];
              const invoiceCount = shipment.uploadedInvoices?.length || 0;
              return (
                <tr key={idx} className="shipment-row">
                  <td className="lr-cell"><strong>{shipment.lr}</strong></td>
                  <td>{shipment.awb || '—'}</td>
                  <td><MapPin size={14} /> {shipment.route || `${shipment.pickupPincode}→${shipment.deliveryPincode}`}</td>
                  <td>{shipment.weight || 0} kg</td>
                  <td>₹{(shipment.total_value || shipment.value || 0).toLocaleString()}</td>
                  <td>
                    <select 
                      className={`status-select`}
                      value={shipment.status || 'booked'}
                      onChange={(e) => updateShipmentStatus(shipment.lr, e.target.value)}
                      style={{
                        backgroundColor: statusOpt.bgColor,
                        color: statusOpt.color,
                        border: `1px solid ${statusOpt.color}40`,
                        fontWeight: '600'
                      }}
                    >
                      {statusOptions.map(opt => (
                        <option key={opt.value} value={opt.value} style={{ backgroundColor: opt.bgColor, color: opt.color }}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {invoiceCount > 0 ? (
                      <button 
                        className="invoice-btn" 
                        onClick={() => viewInvoices(shipment)}
                        title={`${invoiceCount} invoice(s) uploaded`}
                      >
                        <FileText size={16} /> {invoiceCount}
                      </button>
                    ) : (
                      <span className="no-invoice">—</span>
                    )}
                  </td>
                  <td className="action-buttons">
                    <button onClick={() => trackShipment(shipment.lr)} className="action-icon view" title="Track">
                      <Eye size={16} />
                    </button>
                    <button onClick={() => handleEditShipment(shipment)} className="action-icon edit" title="Edit">
                      <Edit3 size={16} />
                    </button>
                    <button onClick={() => printDocket(shipment)} className="action-icon print" title="Print Docket">
                      <Printer size={16} />
                    </button>
                    <button onClick={() => printLabel(shipment)} className="action-icon label" title="Print Label">
                      <Barcode size={16} />
                    </button>
                    <button onClick={() => deleteShipment(shipment.lr)} className="action-icon delete" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ============================================
  // 📎 INVOICE MODAL
  // ============================================
  const renderInvoiceModal = () => {
    if (!showInvoiceModal) return null;
    
    return (
      <div className="modal-overlay" onClick={() => setShowInvoiceModal(false)}>
        <div className="invoice-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3><FileText size={20} /> Uploaded Invoices</h3>
            <button className="close-modal" onClick={() => setShowInvoiceModal(false)}>✕</button>
          </div>
          <div className="modal-body">
            {selectedInvoices.length === 0 ? (
              <div className="no-invoices">No invoices uploaded</div>
            ) : (
              <div className="invoices-list">
                {selectedInvoices.map((invoice, idx) => (
                  <div key={idx} className="invoice-item">
                    <div className="invoice-icon">
                      {invoice.name?.match(/\.(jpg|jpeg|png)$/i) ? (
                        <ImageIcon size={24} />
                      ) : (
                        <FileIcon size={24} />
                      )}
                    </div>
                    <div className="invoice-details">
                      <div className="invoice-name">{invoice.name}</div>
                      <div className="invoice-size">{invoice.size} KB</div>
                    </div>
                    <button 
                      className="download-invoice-btn"
                      onClick={() => downloadInvoice(invoice)}
                      title="Download Invoice"
                    >
                      <Download size={18} />
                      Download
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button className="close-btn" onClick={() => setShowInvoiceModal(false)}>Close</button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // ✏️ EDIT MODAL
  // ============================================
  const renderEditModal = () => {
    if (!isEditing) return null;
    
    return (
      <div className="modal-overlay" onClick={() => setIsEditing(false)}>
        <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3><Edit3 size={20} /> Edit Shipment</h3>
            <button className="close-modal" onClick={() => setIsEditing(false)}>✕</button>
          </div>
          <div className="modal-body">
            <div className="form-group">
              <label>LR Number</label>
              <input type="text" value={editFormData.lr} disabled />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Sender Name</label>
                <input type="text" value={editFormData.pickupName} onChange={(e) => setEditFormData({...editFormData, pickupName: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Sender Pincode</label>
                <input type="text" value={editFormData.pickupPincode} onChange={(e) => setEditFormData({...editFormData, pickupPincode: e.target.value})} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Receiver Name</label>
                <input type="text" value={editFormData.deliveryName} onChange={(e) => setEditFormData({...editFormData, deliveryName: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Receiver Pincode</label>
                <input type="text" value={editFormData.deliveryPincode} onChange={(e) => setEditFormData({...editFormData, deliveryPincode: e.target.value})} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Weight (kg)</label>
                <input type="number" value={editFormData.weight} onChange={(e) => setEditFormData({...editFormData, weight: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Total Value (₹)</label>
                <input type="number" value={editFormData.total_value} onChange={(e) => setEditFormData({...editFormData, total_value: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={editFormData.status} onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}>
                {statusOptions.map(opt => (
                  <option key={opt.value} value={opt.value} style={{ backgroundColor: opt.bgColor, color: opt.color }}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button className="cancel-btn" onClick={() => setIsEditing(false)}>Cancel</button>
            <button className="save-btn" onClick={saveEditShipment}><Save size={16} /> Save Changes</button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // 🎨 TRACKING RESULT MODAL
  // ============================================
  const renderTrackingModal = () => {
    if (!trackingResult) return null;
    const statusOpt = statusOptions.find(opt => opt.value === trackingResult.status) || statusOptions[0];
    const invoiceCount = trackingResult.uploadedInvoices?.length || 0;
    
    return (
      <div className="modal-overlay" onClick={() => setTrackingResult(null)}>
        <div className="tracking-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3><Truck size={20} /> Tracking Details</h3>
            <button className="close-modal" onClick={() => setTrackingResult(null)}>✕</button>
          </div>
          <div className="modal-body">
            <div className="tracking-lr">{trackingResult.lr}</div>
            <div className="tracking-status-large">
              <div className={`status-icon`} style={{ backgroundColor: `${statusOpt.color}15`, color: statusOpt.color }}>
                {trackingResult.status === 'delivered' ? <CheckCircle size={40} /> : <Activity size={40} />}
              </div>
              <div className="status-text" style={{ color: statusOpt.color }}>{statusOpt.label}</div>
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
                  <label>AWB</label>
                  <p>{trackingResult.awb || 'N/A'}</p>
                </div>
              </div>
            </div>
            {invoiceCount > 0 && (
              <div className="tracking-invoices">
                <button 
                  className="view-invoices-btn"
                  onClick={() => {
                    setSelectedInvoices(trackingResult.uploadedInvoices);
                    setShowInvoiceModal(true);
                    setTrackingResult(null);
                  }}
                >
                  <FileText size={16} /> View {invoiceCount} Invoice(s)
                </button>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button onClick={() => printDocket(trackingResult)} className="print-btn"><Printer size={16} /> Print Docket</button>
            <button onClick={() => printLabel(trackingResult)} className="label-btn"><Barcode size={16} /> Print Label</button>
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
              <strong>{getStatusCount('delivered')}</strong>
            </div>
          </div>
          <div className="stat-card">
            <Activity size={20} color="#f59e0b" />
            <div>
              <span>In Transit</span>
              <strong>{getStatusCount('in_transit') + getStatusCount('dispatched')}</strong>
            </div>
          </div>
        </div>
      </div>

      {renderShipmentTable()}
      {renderTrackingModal()}
      {renderEditModal()}
      {renderInvoiceModal()}

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
                <span className="ai-title">🎤 BIGG BOSS MODE | ADVANCED AI</span>
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
                placeholder="Example: 'Docket FCPL0001 status update karo delivered' or 'Invoices FCPL0001'"
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
                <button onClick={() => handleJerviceChat("track")}>🔍 Track</button>
              </div>
              <div className="voice-commands-hint">
                🎤 Try: "Invoices FCPL0001" to view uploaded invoices
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ShipmentDetails;