import React, { useState, useEffect, useRef } from "react";
import { 
  Bot, Send, X, ShieldCheck, Activity, Truck, MapPin, 
  Package, Calendar, Clock, AlertCircle, CheckCircle, 
  Volume2, VolumeX, Mic, RefreshCw, FileText, Eye, Trash2,
  Download, Printer, Search, Navigation, Edit3, Save, 
  PlusCircle, Filter, TrendingUp, Award, Crown, Settings,
  CheckSquare, Square, PrinterIcon, Barcode,
  Image as ImageIcon, File as FileIcon, User, LogOut, Building2
} from "lucide-react";
import "./ShipmentDetail.css";

function ShipmentDetails() {
  // ============================================
  // 🔐 USER AUTHENTICATION STATE
  // ============================================
  const [userRole, setUserRole] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [userName, setUserName] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingShipments, setIsLoadingShipments] = useState(false);

  // State Management
  const [isJerviceOpen, setIsJerviceOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "🎤 **BIGG BOSS MODE ACTIVE!** Main hoon Jervice AI. Docket number batao, main tracking status bata dunga.\n\n**FEATURES:**\n✅ Track Shipment\n✅ Update Status\n✅ Edit Shipment\n✅ Delete Shipment\n✅ Print Docket/Label\n✅ View Invoices" }
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
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Available statuses
  const statusOptions = [
    { value: "booked", label: "📝 Booked", color: "#d97706", bgColor: "#fef3c7", icon: "📝" },
    { value: "picked", label: "🚚 Picked Up", color: "#2563eb", bgColor: "#dbeafe", icon: "🚚" },
    { value: "in_transit", label: "🚛 In Transit", color: "#4f46e5", bgColor: "#e0e7ff", icon: "🚛" },
    { value: "out_for_delivery", label: "📦 Out for Delivery", color: "#ea580c", bgColor: "#fed7aa", icon: "📦" },
    { value: "delivered", label: "✅ Delivered", color: "#059669", bgColor: "#d1fae5", icon: "✅" },
    { value: "cancelled", label: "❌ Cancelled", color: "#dc2626", bgColor: "#fee2e2", icon: "❌" },
    { value: "dispatched", label: "✈️ Dispatched", color: "#0891b2", bgColor: "#cffafe", icon: "✈️" },
    { value: "hold", label: "⏸️ On Hold", color: "#475569", bgColor: "#f1f5f9", icon: "⏸️" }
  ];

  // ============================================
  // 🔐 CHECK AUTHENTICATION ON MOUNT
  // ============================================
  useEffect(() => {
    const token = localStorage.getItem("token");
    const clientToken = localStorage.getItem("clientToken");
    const role = localStorage.getItem("userRole");
    const storedClientId = localStorage.getItem("clientId");
    const username = localStorage.getItem("username") || localStorage.getItem("clientName");
    
    if (!token && !clientToken) {
      window.location.href = "/";
      return;
    }
    
    let finalRole = "staff";
    if (clientToken) {
      finalRole = "client";
    } else if (role === "admin") {
      finalRole = "admin";
    } else if (role === "staff") {
      finalRole = "staff";
    }
    
    setUserRole(finalRole);
    setClientId(storedClientId);
    setUserName(username || (finalRole === "client" ? "Client" : "Admin"));
    setIsAuthenticated(true);
    
    fetchShipments();
  }, []);

  // ============================================
  // 🚚 FETCH SHIPMENTS
  // ============================================
  const fetchShipments = async () => {
    setIsLoadingShipments(true);
    try {
      const clientToken = localStorage.getItem("clientToken");
      let storedClientId = localStorage.getItem("clientId");
      const isClient = !!clientToken;
      
      let url = "https://faithcargo.onrender.com/api/shipments/";
      
      if (isClient && storedClientId) {
        const cleanClientId = storedClientId.trim();
        url = `https://faithcargo.onrender.com/api/shipments/client/${cleanClientId}/orders/`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      const enhancedData = data.map(shipment => {
        const savedInvoices = localStorage.getItem(`invoices_${shipment.lr}`);
        if (savedInvoices) {
          return { ...shipment, uploadedInvoices: JSON.parse(savedInvoices) };
        }
        return shipment;
      });
      
      setShipments(enhancedData);
    } catch (error) {
      console.error("Error fetching shipments:", error);
      const localShipments = JSON.parse(localStorage.getItem('allShipments') || '[]');
      setShipments(localShipments);
    } finally {
      setIsLoadingShipments(false);
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
  // 🖨️ PROFESSIONAL DOCKET PRINT - FULLY FIXED
  // ============================================
  const printDocket = (shipment) => {
    const statusOpt = statusOptions.find(s => s.value === shipment.status) || statusOptions[0];
    // Fixed Barcode URL with better rendering
    const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${shipment.lr}&code=Code128&dpi=120&hidehrt=0`;
    const currentDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    
    // Get data safely
    const pickupName = shipment.pickupName || 'N/A';
    const pickupAddress = shipment.pickupAddress || 'Address not provided';
    const pickupPincode = shipment.pickupPincode || 'N/A';
    const pickupContact = shipment.pickupContact || 'N/A';
    const pickupCity = shipment.pickupCity || '';
    const pickupState = shipment.pickupState || '';
    
    const deliveryName = shipment.deliveryName || 'N/A';
    const deliveryAddress = shipment.deliveryAddress || 'Address not provided';
    const deliveryPincode = shipment.deliveryPincode || 'N/A';
    const deliveryContact = shipment.deliveryContact || 'N/A';
    const deliveryCity = shipment.deliveryCity || '';
    const deliveryState = shipment.deliveryState || '';
    
    const material = shipment.material || 'GENERAL CARGO';
    const hsn = shipment.hsn || '1234';
    const actualWeight = shipment.actual_weight || shipment.weight || 0;
    const volumetricWeight = shipment.volumetric_weight || '0';
    const chargedWeight = shipment.weight || 0;
    const boxes = shipment.boxes || 1;
    const bookingMode = shipment.booking_mode || 'surface';
    const modeText = bookingMode === 'air' ? 'AIR' : bookingMode === 'rail' ? 'RAIL' : bookingMode === 'express' ? 'EXPRESS' : 'SURFACE';
    const modeClass = bookingMode === 'air' ? 'mode-air' : bookingMode === 'rail' ? 'mode-rail' : bookingMode === 'express' ? 'mode-express' : 'mode-surface';
    
    const totalValue = shipment.total_value || shipment.value || 0;
    const ewayBill = shipment.eway_bill || '';
    const freightAmount = shipment.freight_amount || 0;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Faith Cargo - Consignment Note ${shipment.lr}</title>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', 'Roboto', Arial, sans-serif; 
            background: #e2e8f0; 
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
          }
          @media print {
            body { background: white; padding: 0; margin: 0; }
            @page { size: A4; margin: 0; }
          }
          .docket-pro {
            width: 210mm;
            min-height: 297mm;
            background: white;
            position: relative;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            margin: 0 auto;
          }
          .docket-watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 80px;
            font-weight: 900;
            color: rgba(211, 47, 47, 0.03);
            white-space: nowrap;
            letter-spacing: 10px;
            pointer-events: none;
            z-index: 0;
          }
          .docket-border {
            position: absolute;
            top: 8px;
            left: 8px;
            right: 8px;
            bottom: 8px;
            border: 2px solid #d32f2f;
            pointer-events: none;
            border-radius: 8px;
            z-index: 1;
          }
          .status-ribbon {
            position: absolute;
            top: 20px;
            right: 20px;
            padding: 6px 20px;
            background: ${statusOpt.color};
            color: white;
            border-radius: 30px;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 1px;
            z-index: 10;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .docket-header {
            padding: 20px 25px 15px 25px;
            border-bottom: 3px solid #d32f2f;
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 20px;
            position: relative;
            z-index: 2;
            background: white;
          }
          .logo-section {
            display: flex;
            gap: 18px;
            flex-wrap: wrap;
          }
          .logo-text {
            font-size: 28px;
            font-weight: 900;
            color: #d32f2f;
            letter-spacing: 2px;
          }
          .company-details h1 {
            font-size: 16px;
            font-weight: 900;
            color: #1a1a2e;
            margin: 0 0 3px 0;
          }
          .company-details p {
            font-size: 8px;
            color: #d32f2f;
            font-weight: 600;
            margin: 0 0 5px 0;
          }
          .company-address {
            font-size: 7px;
            color: #4a5568;
            margin-bottom: 3px;
          }
          .company-contact {
            font-size: 7px;
            color: #4a5568;
            margin-bottom: 2px;
          }
          .company-gst {
            font-size: 7px;
            color: #64748b;
          }
          .doc-section {
            text-align: right;
          }
          .doc-title {
            font-size: 10px;
            font-weight: 800;
            color: #64748b;
            letter-spacing: 2px;
            margin-bottom: 5px;
          }
          .lr-number {
            font-size: 26px;
            font-weight: 900;
            color: #d32f2f;
            font-family: monospace;
            letter-spacing: 2px;
          }
          .barcode-img {
            width: 200px;
            height: auto;
            margin: 8px 0;
            background: white;
            padding: 4px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
          }
          .awb-text, .date-text {
            font-size: 9px;
            color: #64748b;
            margin-top: 4px;
          }
          .parties-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 25px;
            padding: 20px 25px;
            background: #f8fafc;
            position: relative;
            z-index: 2;
          }
          .party-card {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            overflow: hidden;
          }
          .party-header {
            background: #f1f5f9;
            padding: 10px 15px;
            display: flex;
            align-items: center;
            gap: 10px;
            border-bottom: 1px solid #e2e8f0;
          }
          .party-icon { font-size: 22px; }
          .party-title { font-size: 11px; font-weight: 800; color: #1e293b; }
          .party-sub { font-size: 9px; color: #64748b; }
          .party-body { padding: 12px 15px; }
          .party-name { font-size: 12px; font-weight: 800; margin-bottom: 6px; color: #0f172a; }
          .party-address { font-size: 9px; color: #475569; margin-bottom: 8px; line-height: 1.4; }
          .party-details { display: flex; flex-wrap: wrap; gap: 12px; font-size: 8px; padding-top: 8px; border-top: 1px dashed #e2e8f0; color: #64748b; }
          .table-wrapper { padding: 0 25px; margin-bottom: 20px; overflow-x: auto; position: relative; z-index: 2; }
          .shipment-table { width: 100%; border-collapse: collapse; font-size: 9px; }
          .shipment-table th { background: #f1f5f9; padding: 10px 8px; font-weight: 800; border: 1px solid #e2e8f0; text-align: center; }
          .shipment-table td { padding: 10px 8px; border: 1px solid #e2e8f0; text-align: center; }
          .text-left { text-align: left; }
          .text-center { text-align: center; }
          .goods-note { font-size: 7px; color: #64748b; margin-top: 3px; }
          .mode-badge { display: inline-block; padding: 3px 12px; border-radius: 20px; font-size: 8px; font-weight: 800; }
          .mode-surface { background: #dbeafe; color: #1e40af; }
          .mode-air { background: #fef3c7; color: #92400e; }
          .mode-rail { background: #e0e7ff; color: #3730a3; }
          .mode-express { background: #dcfce7; color: #166534; }
          .billing-section { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; padding: 0 25px; margin-bottom: 20px; position: relative; z-index: 2; }
          .invoice-box, .freight-box { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
          .box-header { background: #f8fafc; padding: 10px 15px; font-size: 10px; font-weight: 800; border-bottom: 1px solid #e2e8f0; }
          .box-content { padding: 12px 15px; }
          .billing-row { display: flex; justify-content: space-between; font-size: 9px; padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
          .billing-total { display: flex; justify-content: space-between; font-size: 10px; font-weight: 800; margin-top: 10px; padding-top: 10px; border-top: 2px solid #e2e8f0; }
          .eway-bill { margin-top: 10px; padding: 8px; background: #fef3c7; border-radius: 8px; font-size: 9px; text-align: center; }
          .stamp-section { display: flex; justify-content: space-between; align-items: center; padding: 0 25px; margin: 20px 0; flex-wrap: wrap; gap: 30px; position: relative; z-index: 2; }
          .stamp-area { width: 100px; height: 100px; display: flex; align-items: center; justify-content: center; }
          .stamp-fallback { width: 90px; height: 90px; border-radius: 50%; border: 2px solid #2563eb; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; font-size: 8px; font-weight: 800; color: #2563eb; background: rgba(37,99,235,0.02); }
          .stamp-line { width: 25px; height: 1px; background: #2563eb; margin: 3px 0; }
          .signatures { display: flex; gap: 50px; flex-wrap: wrap; }
          .sign-box { text-align: center; }
          .sign-line { width: 120px; border-top: 1.5px solid #0f172a; margin-bottom: 6px; }
          .sign-box p { font-size: 8px; color: #64748b; margin-top: 4px; }
          .stamp-text { border: 1px dashed #d32f2f; padding: 6px 15px; font-size: 8px; font-weight: 700; color: #d32f2f; background: #ffebed; border-radius: 6px; margin-bottom: 5px; white-space: nowrap; }
          .terms-section { margin: 0 25px 15px 25px; padding: 10px 15px; background: #f8fafc; border-radius: 10px; position: relative; z-index: 2; }
          .terms-title { font-size: 8px; font-weight: 800; margin-bottom: 8px; }
          .terms-section ul { padding-left: 18px; font-size: 6.5px; color: #475569; line-height: 1.5; }
          .footer { padding: 12px 25px; background: linear-gradient(135deg, #0f172a, #1e1b4b); color: white; position: relative; z-index: 2; }
          .footer-copies { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 7px; flex-wrap: wrap; gap: 10px; }
          .footer-powered { font-size: 6px; opacity: 0.6; text-align: center; }
        </style>
      </head>
      <body>
        <div class="docket-pro">
          <div class="docket-watermark">FAITH CARGO</div>
          <div class="docket-border"></div>
          <div class="status-ribbon">${statusOpt.label.replace(/[📝🚚🚛📦✅❌✈️⏸️]/g, '').trim()}</div>
          
          <div class="docket-header">
            <div class="logo-section">
              <div class="logo-text">FCPL</div>
              <div class="company-details">
                <h1>FAITH CARGO PRIVATE LIMITED</h1>
                <p>ISO 9001:2015 & ISO 14001:2015 CERTIFIED</p>
                <div class="company-address">4/15, Kirti Nagar Industrial Area, New Delhi - 110015</div>
                <div class="company-contact">📞 +91 9818641504 | ✉️ care@faithcargo.com | 🌐 www.faithcargo.com</div>
                <div class="company-gst">GST: 07AAFCF2947K1ZD | CIN: U60231DL2021PTC384521</div>
              </div>
            </div>
            <div class="doc-section">
              <div class="doc-title">CONSIGNMENT NOTE</div>
              <div class="lr-number">${shipment.lr}</div>
              <img src="${barcodeUrl}" class="barcode-img" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'200\\' height=\\'50\\'%3E%3Crect width=\\'200\\' height=\\'50\\' fill=\\'%23f0f0f0\\'/%3E%3Ctext x=\\'50%25\\' y=\\'50%25\\' text-anchor=\\'middle\\' dy=\\'.3em\\' fill=\\'%23999\\' font-family=\\'monospace\\' font-size=\\'14\\'%3E${shipment.lr}%3C/text%3E%3C/svg%3E'" />
              <div class="awb-text">AWB: ${shipment.awb || 'N/A'}</div>
              <div class="date-text">Date: ${currentDate}</div>
            </div>
          </div>

          <div class="parties-section">
            <div class="party-card">
              <div class="party-header"><span class="party-icon">📤</span><div><div class="party-title">CONSIGNOR</div><div class="party-sub">Sender</div></div></div>
              <div class="party-body">
                <div class="party-name">${pickupName}</div>
                <div class="party-address">${pickupAddress}</div>
                <div class="party-details">
                  <span>📮 Pincode: ${pickupPincode}</span>
                  <span>📍 ${pickupCity} ${pickupState}</span>
                  <span>📞 ${pickupContact}</span>
                </div>
              </div>
            </div>
            <div class="party-card">
              <div class="party-header"><span class="party-icon">📥</span><div><div class="party-title">CONSIGNEE</div><div class="party-sub">Receiver</div></div></div>
              <div class="party-body">
                <div class="party-name">${deliveryName}</div>
                <div class="party-address">${deliveryAddress}</div>
                <div class="party-details">
                  <span>📮 Pincode: ${deliveryPincode}</span>
                  <span>📍 ${deliveryCity} ${deliveryState}</span>
                  <span>📞 ${deliveryContact}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="table-wrapper">
            <table class="shipment-table">
              <thead><tr><th>PKGS</th><th>DESCRIPTION OF GOODS</th><th>HSN</th><th>ACTUAL WT</th><th>VOL WT</th><th>CHARGED WT</th><th>MODE</th></tr></thead>
              <tbody>
                <tr>
                  <td class="text-center">${boxes}</td>
                  <td class="text-left"><strong>${material}</strong><div class="goods-note">Said to Contain</div></td>
                  <td class="text-center">${hsn}</td>
                  <td class="text-center">${actualWeight} kg</td>
                  <td class="text-center">${volumetricWeight} kg</td>
                  <td class="text-center"><strong>${chargedWeight} kg</strong></td>
                  <td class="text-center"><span class="mode-badge ${modeClass}">${modeText}</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="billing-section">
            <div class="invoice-box">
              <div class="box-header">📄 INVOICE DETAILS</div>
              <div class="box-content">
                <div class="billing-total"><span>TOTAL INVOICE VALUE:</span><strong>₹${totalValue.toLocaleString()}</strong></div>
                ${ewayBill ? `<div class="eway-bill">🚛 E-WAY BILL: ${ewayBill}</div>` : ''}
              </div>
            </div>
            <div class="freight-box">
              <div class="box-header">💰 FREIGHT BREAKDOWN</div>
              <div class="box-content">
                <div class="billing-row"><span>Total Freight</span><span>₹${freightAmount.toLocaleString()}</span></div>
                <div class="billing-total"><span>TOTAL FREIGHT</span><strong>₹${freightAmount.toLocaleString()}</strong></div>
              </div>
            </div>
          </div>

          <div class="stamp-section">
            <div class="stamp-area">
              <div class="stamp-fallback">
                <div>FAITH</div>
                <div>CARGO</div>
                <div>PVT LTD</div>
                <div class="stamp-line"></div>
                <div>AUTHORIZED</div>
              </div>
            </div>
            <div class="signatures">
              <div class="sign-box"><div class="sign-line"></div><p>Receiver's Signature</p></div>
              <div class="sign-box"><div class="stamp-text">FOR FAITH CARGO PVT LTD</div><p>Authorized Signatory</p></div>
            </div>
          </div>

          <div class="terms-section">
            <div class="terms-title">TERMS & CONDITIONS</div>
            <ul>
              <li>Goods carried at Owner's Risk. Insurance recommended for high-value shipments.</li>
              <li>Claim must be filed within 7 days of delivery. Jurisdiction: Delhi Only.</li>
              <li>Transit liability as per Carriers Act, 1865.</li>
              <li>E-Way Bill mandatory for invoice value &gt; ₹50,000.</li>
            </ul>
          </div>

          <div class="footer">
            <div class="footer-copies"><span>📄 ORIGINAL - CONSIGNOR</span><span>📄 DUPLICATE - CONSIGNEE</span><span>📄 TRIPLICATE - OFFICE COPY</span></div>
            <div class="footer-powered">Powered by <strong>Faith Cargo Logistics</strong> | Developed by <strong>Devora Technologies</strong></div>
          </div>
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
  // 🏷️ PROFESSIONAL BOX LABEL PRINT - FULLY FIXED
  // ============================================
  const printLabel = (shipment) => {
    const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${shipment.lr}&code=Code128&dpi=120&hidehrt=0`;
    const awbNumber = shipment.awb || shipment.lr || 'N/A';
    const totalBoxes = shipment.boxes || 1;
    
    const pickupName = shipment.pickupName || 'N/A';
    const pickupPincode = shipment.pickupPincode || 'N/A';
    const pickupCity = shipment.pickupCity || 'DELHI';
    
    const deliveryName = shipment.deliveryName || 'N/A';
    const deliveryPincode = shipment.deliveryPincode || 'N/A';
    const deliveryCity = shipment.deliveryCity || 'LUDHIANA';
    const deliveryContact = shipment.deliveryContact || 'N/A';
    const weight = shipment.weight || 0;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Faith Cargo - Box Label ${shipment.lr}</title>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', 'Arial', sans-serif; 
            background: #e2e8f0; 
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
          }
          @media print {
            body { background: white; padding: 0; margin: 0; }
            @page { size: A4; margin: 0; }
          }
          .box-label {
            width: 180mm;
            height: 120mm;
            background: white;
            border: 3px solid #d32f2f;
            position: relative;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(0,0,0,0.15);
            font-family: 'Segoe UI', 'Arial', sans-serif;
          }
          .label-watermark {
            position: absolute;
            bottom: 10px;
            right: 10px;
            font-size: 50px;
            font-weight: 900;
            color: rgba(211, 47, 47, 0.05);
            white-space: nowrap;
            pointer-events: none;
            transform: rotate(-15deg);
          }
          .top-red-bar {
            background: linear-gradient(135deg, #d32f2f, #b71c1c);
            padding: 8px 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            color: white;
          }
          .brand-name { font-size: 18px; font-weight: 800; letter-spacing: 1px; }
          .brand-tagline { font-size: 9px; opacity: 0.9; }
          .tollfree { font-size: 11px; font-weight: 700; background: rgba(255,255,255,0.2); padding: 3px 10px; border-radius: 20px; }
          .label-body { padding: 15px; }
          .lr-section { text-align: center; margin-bottom: 15px; }
          .lr-label { font-size: 10px; color: #64748b; letter-spacing: 2px; }
          .lr-number-large { font-size: 28px; font-weight: 900; color: #d32f2f; font-family: monospace; letter-spacing: 2px; }
          .barcode-container { text-align: center; margin: 10px 0; }
          .barcode-img { width: 200px; height: auto; }
          .address-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0; }
          .address-box { background: #f8fafc; padding: 10px; border-radius: 8px; border-left: 3px solid #d32f2f; }
          .address-label { font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 5px; }
          .address-name { font-size: 11px; font-weight: 800; color: #1e293b; margin-bottom: 3px; }
          .address-location { font-size: 9px; color: #475569; }
          .info-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px; background: #f1f5f9; border-radius: 6px; }
          .info-item { text-align: center; flex: 1; }
          .info-label { font-size: 8px; color: #64748b; text-transform: uppercase; }
          .info-value { font-size: 12px; font-weight: 700; color: #1e293b; }
          .icons-section { display: flex; justify-content: space-around; margin: 15px 0; padding: 10px; background: #fef3c7; border-radius: 8px; flex-wrap: wrap; gap: 10px; }
          .icon-item { text-align: center; }
          .icon-text { font-size: 8px; font-weight: 600; margin-top: 3px; }
          .icon-large { font-size: 24px; }
          .box-count { text-align: center; margin: 10px 0; }
          .box-badge { display: inline-block; background: #d32f2f; color: white; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: 800; }
          .footer-bar { background: #0f172a; color: white; padding: 6px; text-align: center; font-size: 7px; position: absolute; bottom: 0; left: 0; right: 0; }
          .awb-small { font-size: 9px; color: #64748b; text-align: center; margin-top: 5px; }
        </style>
      </head>
      <body>
        <div class="box-label">
          <div class="label-watermark">FCPL</div>
          <div class="top-red-bar">
            <div><div class="brand-name">FAITH CARGO</div><div class="brand-tagline">LEGACY OF TRUST & DELIVERY</div></div>
            <div class="tollfree">📞 TOLL FREE: 9818641504</div>
          </div>
          
          <div class="label-body">
            <div class="lr-section">
              <div class="lr-label">LR No.</div>
              <div class="lr-number-large">${shipment.lr}</div>
            </div>
            
            <div class="barcode-container">
              <img src="${barcodeUrl}" class="barcode-img" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'200\\' height=\\'40\\'%3E%3Crect width=\\'200\\' height=\\'40\\' fill=\\'%23f0f0f0\\'/%3E%3Ctext x=\\'50%25\\' y=\\'50%25\\' text-anchor=\\'middle\\' dy=\\'.3em\\' fill=\\'%23999\\' font-family=\\'monospace\\' font-size=\\'12\\'%3E${shipment.lr}%3C/text%3E%3C/svg%3E'" />
              <div class="awb-small">AWB: ${awbNumber}</div>
            </div>
            
            <div class="address-grid">
              <div class="address-box">
                <div class="address-label">📤 FROM:</div>
                <div class="address-name">${pickupName}</div>
                <div class="address-location">${pickupCity} - ${pickupPincode}</div>
              </div>
              <div class="address-box">
                <div class="address-label">📥 TO:</div>
                <div class="address-name">${deliveryName}</div>
                <div class="address-location">${deliveryCity} - ${deliveryPincode}</div>
              </div>
            </div>
            
            <div class="info-row">
              <div class="info-item"><div class="info-label">Receiver Mob</div><div class="info-value">${deliveryContact}</div></div>
              <div class="info-item"><div class="info-label">Weight</div><div class="info-value">${weight} kg</div></div>
              <div class="info-item"><div class="info-label">AWB</div><div class="info-value">${awbNumber}</div></div>
            </div>
            
            <div class="icons-section">
              <div class="icon-item"><div class="icon-large">📦</div><div class="icon-text">FRAGILE</div></div>
              <div class="icon-item"><div class="icon-large">🤲</div><div class="icon-text">HANDLE WITH CARE</div></div>
              <div class="icon-item"><div class="icon-large">⬆️</div><div class="icon-text">THIS SIDE UP</div></div>
              <div class="icon-item"><div class="icon-large">💧</div><div class="icon-text">KEEP DRY</div></div>
            </div>
            
            <div class="box-count">
              <span class="box-badge">BOX 1/${totalBoxes}</span>
            </div>
          </div>
          
          <div class="footer-bar">
            FAITH CARGO PVT. LTD. | 4/15, Kirti Nagar, Delhi - 110015 | care@faithcargo.com
          </div>
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
  // 🤖 JERVICE AI
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
    
    if ((lowerInput.includes("update status") || lowerInput.includes("status update")) && docketNumber) {
      let newStatus = null;
      for (let status of statusOptions) {
        if (lowerInput.includes(status.value.replace('_', ' ')) || lowerInput.includes(status.label.toLowerCase())) {
          newStatus = status.value;
          break;
        }
      }
      if (newStatus) {
        const success = await updateShipmentStatus(docketNumber, newStatus);
        if (success) {
          reply = `✅ **STATUS UPDATED!** Sir, docket ${docketNumber} ka status "${statusOptions.find(s => s.value === newStatus)?.label}" kar diya gaya.`;
        } else {
          reply = `❌ **UPDATE FAILED!** Sir, docket ${docketNumber} ka status update nahi ho paya.`;
        }
      } else {
        reply = `📝 **STATUS UPDATE HELP!** Sir, batao kis status mein change karna hai:\n\n` +
                statusOptions.map(s => `• ${s.label}`).join('\n') +
                `\n\nExample: "Docket ${docketNumber} status update karo delivered"`;
      }
    } else if (docketNumber || lowerInput.includes("track")) {
      const searchDocketNum = docketNumber || input.match(/\d+/)?.[0];
      if (searchDocketNum) {
        speak(`Sir, ${searchDocketNum} track kar raha hoon...`);
        const trackingData = await trackShipment(searchDocketNum);
        if (trackingData) {
          const invoiceCount = trackingData.uploadedInvoices?.length || 0;
          reply = `🎤 **TRACKING UPDATE!** Docket ${searchDocketNum.toUpperCase()}\n\n` +
                  `📍 **Current Status:** ${statusOptions.find(s => s.value === trackingData.status)?.label || 'Booked'}\n` +
                  `🚚 **Route:** ${trackingData.pickupPincode || 'N/A'} → ${trackingData.deliveryPincode || 'N/A'}\n` +
                  `📦 **Weight:** ${trackingData.weight || 0} kg\n` +
                  `📎 **Invoices:** ${invoiceCount} invoice(s) uploaded`;
        } else {
          reply = `⚠️ **NOT FOUND!** Sir, docket ${searchDocketNum} system mein nahi mila.`;
        }
      } else {
        reply = "Sir, docket number batao jaise 'FCPL0001 track karo'.";
      }
    } else if (lowerInput.includes("all shipments") || lowerInput.includes("saare order")) {
      if (shipments.length > 0) {
        reply = `📋 **ALL SHIPMENTS!** Sir, total ${shipments.length} orders:\n\n` +
                shipments.slice(0, 5).map(s => `• ${s.lr} - ${s.route || s.pickupPincode + '→' + s.deliveryPincode} - ${statusOptions.find(opt => opt.value === s.status)?.label || s.status}`).join('\n');
      } else {
        reply = "Sir, abhi koi shipment nahi hai.";
      }
    } else if (lowerInput.includes("help")) {
      reply = `🎤 **JERVICE AI - FEATURES!**\n\n✅ Track - "Track FCPL0001"\n✅ Update Status - "Docket FCPL0001 status update karo delivered"\n✅ Delete - "Delete FCPL0001"\n✅ Print - "Print docket FCPL0001"\n✅ All Orders - "Saare order dikhao"\n\nAaj kya service chahiye, Sir?`;
    } else {
      reply = `🎤 **SUNIYE!** Main aapka logistics assistant hoon. Puchiye:\n\n• "Track FCPL0001"\n• "Saare order dikhao"\n• "Help" for all commands`;
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

  // Logout function
  const logout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  // ============================================
  // 📊 RENDER SHIPMENT TABLE
  // ============================================
  const renderShipmentTable = () => {
    const hasClientToken = !!localStorage.getItem("clientToken");
    const isClientUser = hasClientToken;
    const displayClientId = clientId || localStorage.getItem("clientId");
    const displayName = userName || (isClientUser ? "Client" : "Admin");
    
    return (
      <div className="shipment-table-container">
        <div className="user-info-bar">
          <div className="user-details">
            <User size={18} />
            <span>{displayName}</span>
            {isClientUser ? (
              <span className="client-id-badge">Client ID: {displayClientId}</span>
            ) : (
              <span className="role-badge">Administrator</span>
            )}
          </div>
          <button className="logout-btn" onClick={logout}>
            <LogOut size={16} /> Logout
          </button>
        </div>

        <div className="table-header">
          <div className="header-left">
            <h3><Package size={20} /> {isClientUser ? "My Shipments" : "All Shipments"}</h3>
            <div className="filter-buttons">
              <button className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`} onClick={() => setStatusFilter('all')}>
                All ({shipments.length})
              </button>
              {statusOptions.map(opt => (
                <button key={opt.value} className={`filter-btn ${statusFilter === opt.value ? 'active' : ''}`} onClick={() => setStatusFilter(opt.value)}>
                  {opt.icon} {opt.label} ({getStatusCount(opt.value)})
                </button>
              ))}
            </div>
          </div>
          <div className="search-box">
            <Search size={18} />
            <input type="text" placeholder="Search by LR / AWB..." value={searchDocket} onChange={(e) => setSearchDocket(e.target.value)} />
            <button onClick={() => searchDocket && trackShipment(searchDocket)}><RefreshCw size={16} /></button>
          </div>
        </div>
        
        <div className="table-wrapper">
          <table className="shipment-table">
            <thead>
              <tr><th>LR Number</th><th>AWB</th><th>Route</th><th>Weight</th><th>Value (₹)</th><th>Status</th><th>Invoices</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filteredShipments.length === 0 ? (
                <tr><td colSpan="8" className="no-data">No shipments found</td></tr>
              ) : (
                filteredShipments.map((shipment, idx) => {
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
                        <select className="status-select" value={shipment.status || 'booked'} onChange={(e) => updateShipmentStatus(shipment.lr, e.target.value)} style={{ backgroundColor: statusOpt.bgColor, color: statusOpt.color }}>
                          {statusOptions.map(opt => (<option key={opt.value} value={opt.value} style={{ backgroundColor: opt.bgColor, color: opt.color }}>{opt.label}</option>))}
                        </select>
                      </td>
                      <td>{invoiceCount > 0 ? (<button className="invoice-btn" onClick={() => viewInvoices(shipment)}><FileText size={16} /> {invoiceCount}</button>) : (<span className="no-invoice">—</span>)}</td>
                      <td className="action-buttons">
                        <button onClick={() => trackShipment(shipment.lr)} className="action-icon view" title="Track"><Eye size={16} /></button>
                        <button onClick={() => handleEditShipment(shipment)} className="action-icon edit" title="Edit"><Edit3 size={16} /></button>
                        <button onClick={() => printDocket(shipment)} className="action-icon print" title="Print Docket"><Printer size={16} /></button>
                        <button onClick={() => printLabel(shipment)} className="action-icon label" title="Print Label"><Barcode size={16} /></button>
                        <button onClick={() => deleteShipment(shipment.lr)} className="action-icon delete" title="Delete"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ============================================
  // 📎 INVOICE MODAL
  // ============================================
  const renderInvoiceModal = () => {
    if (!showInvoiceModal) return null;
    return (
      <div className="modal-overlay" onClick={() => setShowInvoiceModal(false)}>
        <div className="invoice-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header"><h3><FileText size={20} /> Uploaded Invoices</h3><button className="close-modal" onClick={() => setShowInvoiceModal(false)}>✕</button></div>
          <div className="modal-body">
            {selectedInvoices.length === 0 ? (<div className="no-invoices">No invoices uploaded</div>) : (
              <div className="invoices-list">
                {selectedInvoices.map((invoice, idx) => (
                  <div key={idx} className="invoice-item">
                    <div className="invoice-icon">{invoice.name?.match(/\.(jpg|jpeg|png)$/i) ? (<ImageIcon size={24} />) : (<FileIcon size={24} />)}</div>
                    <div className="invoice-details"><div className="invoice-name">{invoice.name}</div><div className="invoice-size">{invoice.size} KB</div></div>
                    <button className="download-invoice-btn" onClick={() => downloadInvoice(invoice)}><Download size={18} /> Download</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="modal-footer"><button className="close-btn" onClick={() => setShowInvoiceModal(false)}>Close</button></div>
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
          <div className="modal-header"><h3><Edit3 size={20} /> Edit Shipment</h3><button className="close-modal" onClick={() => setIsEditing(false)}>✕</button></div>
          <div className="modal-body">
            <div className="form-group"><label>LR Number</label><input type="text" value={editFormData.lr} disabled /></div>
            <div className="form-row"><div className="form-group"><label>Sender Name</label><input type="text" value={editFormData.pickupName} onChange={(e) => setEditFormData({...editFormData, pickupName: e.target.value})} /></div><div className="form-group"><label>Sender Pincode</label><input type="text" value={editFormData.pickupPincode} onChange={(e) => setEditFormData({...editFormData, pickupPincode: e.target.value})} /></div></div>
            <div className="form-row"><div className="form-group"><label>Receiver Name</label><input type="text" value={editFormData.deliveryName} onChange={(e) => setEditFormData({...editFormData, deliveryName: e.target.value})} /></div><div className="form-group"><label>Receiver Pincode</label><input type="text" value={editFormData.deliveryPincode} onChange={(e) => setEditFormData({...editFormData, deliveryPincode: e.target.value})} /></div></div>
            <div className="form-row"><div className="form-group"><label>Weight (kg)</label><input type="number" value={editFormData.weight} onChange={(e) => setEditFormData({...editFormData, weight: e.target.value})} /></div><div className="form-group"><label>Total Value (₹)</label><input type="number" value={editFormData.total_value} onChange={(e) => setEditFormData({...editFormData, total_value: e.target.value})} /></div></div>
            <div className="form-group"><label>Status</label><select value={editFormData.status} onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}>{statusOptions.map(opt => (<option key={opt.value} value={opt.value} style={{ backgroundColor: opt.bgColor, color: opt.color }}>{opt.label}</option>))}</select></div>
          </div>
          <div className="modal-footer"><button className="cancel-btn" onClick={() => setIsEditing(false)}>Cancel</button><button className="save-btn" onClick={saveEditShipment}><Save size={16} /> Save Changes</button></div>
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
          <div className="modal-header"><h3><Truck size={20} /> Tracking Details</h3><button className="close-modal" onClick={() => setTrackingResult(null)}>✕</button></div>
          <div className="modal-body">
            <div className="tracking-lr">{trackingResult.lr}</div>
            <div className="tracking-status-large"><div className="status-icon" style={{ backgroundColor: `${statusOpt.color}15`, color: statusOpt.color }}>{trackingResult.status === 'delivered' ? <CheckCircle size={40} /> : <Activity size={40} />}</div><div className="status-text" style={{ color: statusOpt.color }}>{statusOpt.label}</div></div>
            <div className="tracking-details-grid">
              <div className="detail-item"><MapPin size={16} /><div><label>From</label><p>{trackingResult.pickupName || 'N/A'}<br/>{trackingResult.pickupPincode}</p></div></div>
              <div className="detail-item"><Package size={16} /><div><label>To</label><p>{trackingResult.deliveryName || 'N/A'}<br/>{trackingResult.deliveryPincode}</p></div></div>
              <div className="detail-item"><Clock size={16} /><div><label>Weight</label><p>{trackingResult.weight} kg</p></div></div>
              <div className="detail-item"><Calendar size={16} /><div><label>AWB</label><p>{trackingResult.awb || 'N/A'}</p></div></div>
            </div>
            {invoiceCount > 0 && (<div className="tracking-invoices"><button className="view-invoices-btn" onClick={() => { setSelectedInvoices(trackingResult.uploadedInvoices); setShowInvoiceModal(true); setTrackingResult(null); }}><FileText size={16} /> View {invoiceCount} Invoice(s)</button></div>)}
          </div>
          <div className="modal-footer"><button onClick={() => printDocket(trackingResult)} className="print-btn"><Printer size={16} /> Print Docket</button><button onClick={() => printLabel(trackingResult)} className="label-btn"><Barcode size={16} /> Print Label</button><button onClick={() => setTrackingResult(null)} className="close-btn">Close</button></div>
        </div>
      </div>
    );
  };

  // ============================================
  // 🎨 MAIN RENDER
  // ============================================
  if (!isAuthenticated) {
    return <div className="loading-container">Loading...</div>;
  }

  return (
    <div className="shipment-details-page">
      <div className="page-header-shipment">
        <div className="header-title"><h1>📦 Shipment Management</h1><p>{userRole === "client" ? "View and track your shipments" : "Track, manage and monitor all your shipments in real-time"}</p></div>
        <div className="header-stats">
          <div className="stat-card"><Package size={20} /><div><span>Total Shipments</span><strong>{shipments.length}</strong></div></div>
          <div className="stat-card"><CheckCircle size={20} color="#10b981" /><div><span>Delivered</span><strong>{getStatusCount('delivered')}</strong></div></div>
          <div className="stat-card"><Activity size={20} color="#f59e0b" /><div><span>In Transit</span><strong>{getStatusCount('in_transit') + getStatusCount('dispatched')}</strong></div></div>
        </div>
      </div>

      {renderShipmentTable()}
      {renderTrackingModal()}
      {renderEditModal()}
      {renderInvoiceModal()}

      {/* JERVICE AI FLOATING ASSISTANT */}
      <div className={`jervice-container ${isJerviceOpen ? 'open' : ''}`}>
        {!isJerviceOpen ? (
          <button className="jervice-trigger" onClick={() => setIsJerviceOpen(true)}><div className="pulse-ring"></div><Bot size={28} color="white" /><span className="jervice-label">JERVICE AI</span><div className="voice-badge">🎤</div></button>
        ) : (
          <div className="jervice-window professional-dark">
            <div className="jervice-header"><div className="ai-identity"><ShieldCheck size={16} color="#00ff00" /><span className="ai-title">🎤 BIGG BOSS MODE | ADVANCED AI</span></div><div className="header-controls"><button className="voice-toggle" onClick={() => setIsVoiceEnabled(!isVoiceEnabled)} title={isVoiceEnabled ? "Voice ON" : "Voice OFF"}>{isVoiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}</button><button className="mic-btn" onClick={startVoiceInput} disabled={isListening}><Mic size={16} className={isListening ? 'pulse-mic' : ''} /></button><X className="close-icon" onClick={() => setIsJerviceOpen(false)} /></div></div>
            <div className="jervice-chat-area">{messages.map((m, idx) => (<div key={idx} className={`chat-msg ${m.role}`}><div className="msg-content">{m.content}</div></div>))}{isLoading && (<div className="typing-indicator"><span></span><span></span><span></span></div>)}{isListening && (<div className="listening-indicator">🎙️ Sun raha hoon... Boliye...</div>)}<div ref={chatEndRef} /></div>
            <div className="jervice-input-bar"><input type="text" placeholder="Example: 'Docket FCPL0001 status update karo delivered' or 'Invoices FCPL0001'" value={userInput} onChange={(e) => setUserInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleJerviceChat()} /><button onClick={() => handleJerviceChat()} className="send-btn" disabled={isLoading}><Send size={18} /></button></div>
            <div className="jervice-footer"><div className="quick-actions"><button onClick={() => handleJerviceChat("saare order dikhao")}>📋 All Orders</button><button onClick={() => handleJerviceChat("help")}>❓ Help</button><button onClick={() => handleJerviceChat("track")}>🔍 Track</button></div><div className="voice-commands-hint">🎤 Try: "Invoices FCPL0001" to view uploaded invoices</div></div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ShipmentDetails;