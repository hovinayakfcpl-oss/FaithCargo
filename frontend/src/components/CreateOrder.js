import React, { useState, useMemo, useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { 
  Truck, MapPin, Package, FileText, Plus, Trash2,
  Calculator, CheckCircle, Printer, ChevronRight, AlertCircle, 
  ShieldCheck, Box, Info, Navigation, CreditCard, 
  Upload, File, Image, X, TrendingUp, Clock, Train, Plane,
  Save, Download, Eye, Award, Gem, Crown, Settings, 
  ToggleLeft, ToggleRight, Building, Hash, Tag, FileSpreadsheet,
  Barcode, Layers, CheckSquare, Square, Printer as PrinterIcon,
  ArrowRight, Warehouse, Building2, Phone, Mail, Globe,
  Percent, DollarSign, Scale, Weight, Ruler, User, Users,
  Stamp, Circle, Star, HelpCircle, Search, Filter,
  RefreshCw, Activity, CheckCircle2, XCircle, Timer, Map, PhoneCall
} from "lucide-react";
import logo from "../assets/logo.png";
import "./CreateOrder.css";

// ============================================
// 💰 REAL FREIGHT CALCULATOR
// ============================================
const RealTimeFreightCalculator = ({ weight, origin, destination, bookingMode, onCalculate }) => {
  const [freight, setFreight] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const calculateFreight = async () => {
      if (weight > 0 && origin && destination && origin.length === 6 && destination.length === 6) {
        setLoading(true);
        setError(null);
        try {
          const response = await fetch("https://faithcargo.onrender.com/api/shipments/calculate-freight/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ origin, destination, weight: parseFloat(weight) })
          });
          const data = await response.json();
          
          if (data.success) {
            const multiplier = bookingMode === 'air' ? 1.5 : bookingMode === 'express' ? 1.3 : bookingMode === 'rail' ? 0.8 : 1;
            const baseFreight = data.freight_charge * multiplier;
            const fuelSurcharge = baseFreight * 0.10;
            const gst = baseFreight * 0.18;
            const docketCharge = 100;
            const fovCharge = 75;
            let total = baseFreight + fuelSurcharge + gst + docketCharge + fovCharge;
            if (total < 650) total = 650;
            
            const freightResult = {
              baseFreight: Math.round(baseFreight),
              fuelSurcharge: Math.round(fuelSurcharge),
              gst: Math.round(gst),
              docketCharge, fovCharge,
              total: Math.round(total),
              ratePerKg: (baseFreight / weight).toFixed(2),
              fromZone: data.from_zone,
              toZone: data.to_zone
            };
            setFreight(freightResult);
            if (onCalculate) onCalculate(freightResult);
          } else {
            setError(data.error || "Rate not found");
          }
        } catch (err) {
          setError("Network error");
        } finally {
          setLoading(false);
        }
      }
    };
    calculateFreight();
  }, [weight, origin, destination, bookingMode]);

  if (!origin || !destination || weight === 0) return null;

  return (
    <div className="freight-card">
      <div className="freight-card-header">
        <Calculator size={18} />
        <span>Freight Calculator</span>
        {loading && <span className="loading-badge">Calculating...</span>}
      </div>
      {error && <div className="freight-error-msg"><AlertCircle size={14} /> {error}</div>}
      {freight && !loading && (
        <div className="freight-card-body">
          <div className="route-info">
            <span className="route-badge">{freight.fromZone} → {freight.toZone}</span>
            <span className="rate-badge">₹{freight.ratePerKg}/kg</span>
          </div>
          <div className="freight-row">
            <span>Base Freight</span>
            <span>₹{freight.baseFreight.toLocaleString()}</span>
          </div>
          <div className="freight-row">
            <span>Fuel Surcharge (10%)</span>
            <span>₹{freight.fuelSurcharge.toLocaleString()}</span>
          </div>
          <div className="freight-row">
            <span>GST (18%)</span>
            <span>₹{freight.gst.toLocaleString()}</span>
          </div>
          <div className="freight-row">
            <span>Charges</span>
            <span>₹{freight.docketCharge + freight.fovCharge}</span>
          </div>
          <div className="freight-row total-row">
            <span>Total</span>
            <span className="total-amount">₹{freight.total.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// 🎨 DOCKET COMPONENT (PROFESSIONAL WITH BARCODE & CIRCULAR STAMP)
// ============================================
const PrintDocket = React.forwardRef(({ data, lrNumber, totalValue, ewayBill, awbNumber, bookingMode, showFreight, freightData, status }, ref) => {
  const barcodeRef = useRef(null);
  
  useEffect(() => {
    if (lrNumber && barcodeRef.current) {
      try {
        const canvas = barcodeRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        JsBarcode(canvas, lrNumber, {
          format: "CODE128",
          width: 2.5,
          height: 60,
          displayValue: true,
          fontSize: 14,
          font: "monospace",
          margin: 10,
          textAlign: "center",
          textMargin: 5,
          background: "#ffffff",
          lineColor: "#000000"
        });
      } catch (err) {
        console.error("Barcode error:", err);
      }
    }
  }, [lrNumber]);

  const getModeText = () => {
    switch(bookingMode) {
      case 'air': return 'AIR EXPRESS';
      case 'rail': return 'RAIL CARGO';
      case 'express': return 'SPEED POST';
      default: return 'SURFACE TRANSPORT';
    }
  };

  const getStatusText = () => {
    switch(status) {
      case 'delivered': return '✅ DELIVERED';
      case 'in_transit': return '🚛 IN TRANSIT';
      case 'out_for_delivery': return '📦 OUT FOR DELIVERY';
      case 'picked': return '🚚 PICKED UP';
      default: return '📝 BOOKED';
    }
  };

  const safeData = {
    pickup: data?.pickup || { name: "", address: "", pincode: "", contact: "", city: "", state: "", gstin: "" },
    delivery: data?.delivery || { name: "", address: "", pincode: "", contact: "", city: "", state: "", gstin: "" },
    orderDetails: data?.orderDetails || { material: "", weight: 0, boxesCount: 0, hsnCode: "" },
    invoices: data?.invoices || [],
    volWeight: data?.volWeight || 0,
    chargedWeight: data?.chargedWeight || 0
  };

  return (
    <div ref={ref} className="print-docket">
      <div className="docket-inner-border"></div>
      
      {/* Header with Logo */}
      <div className="docket-header">
        <div className="brand-section">
          <img src={logo} alt="FCPL" className="brand-logo" />
          <div className="brand-info">
            <h2>FAITH CARGO PRIVATE LIMITED</h2>
            <p>ISO 9001:2015 & ISO 14001:2015 CERTIFIED</p>
            <div className="contact-line">
              <span>🏢 4/15, Kirti Nagar Industrial Area, New Delhi - 110015</span>
              <span>📞 +91 9818641504 | ✉️ care@faithcargo.com</span>
              <span>🔷 GST: 07AAFCF2947K1ZD | CIN: U60231DL2021PTC384521</span>
            </div>
          </div>
        </div>
        <div className="docket-number">
          <div className="lr-badge">CONSIGNMENT NOTE</div>
          <canvas ref={barcodeRef} className="barcode-canvas" width="320" height="90"></canvas>
          <div className="lr-value">{lrNumber || "DRAFT"}</div>
          <div className="awb-value">AWB: {awbNumber || "N/A"}</div>
          <div className="status-badge-docket">{getStatusText()}</div>
          <div className="date-value">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
      </div>

      {/* Sender & Receiver Side by Side */}
      <div className="parties-container">
        <div className="party sender">
          <div className="party-title">
            <div className="party-icon">📤</div>
            <div>
              <h3>CONSIGNOR</h3>
              <span>Sender</span>
            </div>
          </div>
          <div className="party-content">
            <h4>{safeData.pickup.name || "____________________"}</h4>
            <p className="address-text">{safeData.pickup.address || "Address not provided"}</p>
            <div className="party-contact">
              <span>📮 {safeData.pickup.pincode || "______"}</span>
              <span>📍 {safeData.pickup.city || "_____"}, {safeData.pickup.state || "_____"}</span>
              <span>📞 {safeData.pickup.contact || "_________"}</span>
              {safeData.pickup.gstin && <span>🔷 GST: {safeData.pickup.gstin}</span>}
            </div>
          </div>
        </div>

        <div className="party-arrow-icon">
          <ArrowRight size={32} />
        </div>

        <div className="party receiver">
          <div className="party-title">
            <div className="party-icon">📥</div>
            <div>
              <h3>CONSIGNEE</h3>
              <span>Receiver</span>
            </div>
          </div>
          <div className="party-content">
            <h4>{safeData.delivery.name || "____________________"}</h4>
            <p className="address-text">{safeData.delivery.address || "Address not provided"}</p>
            <div className="party-contact">
              <span>📮 {safeData.delivery.pincode || "______"}</span>
              <span>📍 {safeData.delivery.city || "_____"}, {safeData.delivery.state || "_____"}</span>
              <span>📞 {safeData.delivery.contact || "_________"}</span>
              {safeData.delivery.gstin && <span>🔷 GST: {safeData.delivery.gstin}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Shipment Table */}
      <div className="shipment-wrapper">
        <table className="shipment-data-table">
          <thead>
            <tr>
              <th>PKGS</th>
              <th>DESCRIPTION</th>
              <th>HSN</th>
              <th>ACTUAL WT</th>
              <th>VOL WT</th>
              <th>CHARGED WT</th>
              <th>MODE</th>
            </tr>
          </thead>
          <tbody>
            <tr className="main-data-row">
              <td className="text-center">{safeData.orderDetails.boxesCount || 0}</td>
              <td>
                <strong>{safeData.orderDetails.material || "GENERAL CARGO"}</strong>
                <div className="goods-note">Said to contain</div>
              </td>
              <td className="text-center">{safeData.orderDetails.hsnCode || "1234"}</td>
              <td className="text-center">{safeData.orderDetails.weight || 0} kg</td>
              <td className="text-center">{safeData.volWeight} kg</td>
              <td className="text-center"><strong>{safeData.chargedWeight} kg</strong></td>
              <td className="text-center">
                <div className={`mode-label mode-${bookingMode || 'surface'}`}>
                  {getModeText()}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Invoice & Freight */}
      <div className="billing-wrapper">
        <div className="invoice-section">
          <div className="section-header">INVOICE DETAILS</div>
          <div className="invoice-items">
            {safeData.invoices?.filter(inv => inv.no).map((inv, idx) => (
              <div key={idx} className="invoice-row-line">
                <span>{inv.no}</span>
                <span>₹{parseFloat(inv.value).toLocaleString()}</span>
              </div>
            ))}
            <div className="invoice-total-line">
              <span>TOTAL VALUE:</span>
              <strong>₹{totalValue?.toLocaleString() || 0}</strong>
            </div>
            {ewayBill && <div className="eway-badge">E-WAY BILL: {ewayBill}</div>}
          </div>
        </div>

        {showFreight && freightData && (
          <div className="freight-section">
            <div className="section-header">FREIGHT BREAKDOWN</div>
            <div className="freight-items">
              <div className="freight-row-line">
                <span>Base Freight:</span>
                <span>₹{freightData.baseFreight?.toLocaleString()}</span>
              </div>
              <div className="freight-row-line">
                <span>Fuel Surcharge:</span>
                <span>₹{freightData.fuelSurcharge?.toLocaleString()}</span>
              </div>
              <div className="freight-row-line">
                <span>GST (18%):</span>
                <span>₹{freightData.gst?.toLocaleString()}</span>
              </div>
              <div className="freight-row-line total-freight">
                <span>TOTAL:</span>
                <span className="total-price">₹{freightData.total?.toLocaleString()}</span>
              </div>
              <div className="rate-note">Rate: ₹{freightData.ratePerKg}/kg | {freightData.fromZone} → {freightData.toZone}</div>
            </div>
          </div>
        )}
      </div>

      {/* Professional Circular Stamp */}
      <div className="stamp-signature-wrapper">
        <div className="official-stamp">
          <div className="stamp-circle">
            <div className="stamp-outer-ring">
              <div className="stamp-inner-content">
                <span className="stamp-title">FAITH CARGO</span>
                <span className="stamp-sub">PVT LTD</span>
                <div className="stamp-line"></div>
                <span className="stamp-auth">AUTHORIZED</span>
              </div>
            </div>
          </div>
        </div>
        <div className="signature-area">
          <div className="signature-line-item">
            <div className="sign-line"></div>
            <p>Receiver's Signature</p>
          </div>
          <div className="signature-line-item">
            <div className="stamp-box">FOR FAITH CARGO PVT LTD</div>
            <p>Authorized Signatory</p>
          </div>
        </div>
      </div>

      {/* Professional Company Instructions */}
      <div className="company-instructions">
        <h4>📋 IMPORTANT INSTRUCTIONS</h4>
        <div className="instructions-grid">
          <div className="instruction-item">
            <span className="instruction-icon">⏰</span>
            <div>
              <strong>Timely Delivery</strong>
              <p>Transit time: 2-5 business days depending on location</p>
            </div>
          </div>
          <div className="instruction-item">
            <span className="instruction-icon">📄</span>
            <div>
              <strong>Documents Required</strong>
              <p>Tax Invoice, E-Way Bill (if value > ₹50,000), GR Copy</p>
            </div>
          </div>
          <div className="instruction-item">
            <span className="instruction-icon">🛡️</span>
            <div>
              <strong>Insurance</strong>
              <p>Insurance recommended for high-value shipments</p>
            </div>
          </div>
          <div className="instruction-item">
            <span className="instruction-icon">📞</span>
            <div>
              <strong>Support</strong>
              <p>24/7 Customer Care: +91 9818641504</p>
            </div>
          </div>
        </div>
      </div>

      {/* Terms */}
      <div className="terms-wrapper">
        <h4>TERMS & CONDITIONS</h4>
        <ul>
          <li>Goods carried at Owner's Risk. Insurance recommended for valuable shipments.</li>
          <li>Claims must be reported within 7 days of delivery. Jurisdiction: Delhi Only.</li>
          <li>Transit liability as per Carriers Act, 1865. Maximum liability limited to invoice value.</li>
          <li>E-Way Bill mandatory for invoice value &gt; ₹50,000 as per GST rules.</li>
          <li>Detention charges applicable after 24 hours of free time at delivery location.</li>
        </ul>
      </div>

      {/* Footer */}
      <div className="docket-footer">
        <div className="footer-copies">
          <span>📄 ORIGINAL - CONSIGNOR</span>
          <span>📄 DUPLICATE - CONSIGNEE</span>
          <span>📄 TRIPLICATE - OFFICE</span>
        </div>
        <div className="footer-website">
          <span>🌐 www.faithcargo.com</span>
          <span>📞 9818641504</span>
          <span>✉️ care@faithcargo.com</span>
        </div>
      </div>
    </div>
  );
});

// ============================================
// 📎 INVOICE UPLOAD
// ============================================
const InvoiceUpload = ({ onUpload }) => {
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);

  const handleUpload = (fileList) => {
    const newFiles = Array.from(fileList).map(f => ({
      id: Date.now() + Math.random(),
      name: f.name,
      size: (f.size / 1024).toFixed(2),
      file: f
    }));
    const updated = [...files, ...newFiles];
    setFiles(updated);
    onUpload && onUpload(updated);
  };

  const removeFile = (id) => {
    const updated = files.filter(f => f.id !== id);
    setFiles(updated);
    onUpload && onUpload(updated);
  };

  return (
    <div className="upload-container">
      <div 
        className={`upload-dropzone ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleUpload(e.dataTransfer.files); }}
      >
        <input type="file" id="invoice-files" multiple accept=".pdf,.jpg,.png" onChange={(e) => handleUpload(e.target.files)} style={{ display: 'none' }} />
        <label htmlFor="invoice-files" className="upload-label-btn">
          <Upload size={28} />
          <span>Click or Drag Invoices</span>
          <small>PDF, JPG, PNG (Max 5MB)</small>
        </label>
      </div>
      {files.length > 0 && (
        <div className="file-list-preview">
          <h4>{files.length} Invoice(s)</h4>
          {files.map(f => (
            <div key={f.id} className="file-preview-item">
              <File size={14} /> <span>{f.name}</span> <small>{f.size} KB</small>
              <button onClick={() => removeFile(f.id)}><X size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================
// 🚀 MAIN COMPONENT
// ============================================
export default function CreateOrder() {
  const [boxes, setBoxes] = useState([]);
  const [showLR, setShowLR] = useState(false);
  const [lrNumber, setLrNumber] = useState("");
  const [awbNumber, setAwbNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [ewayBill, setEwayBill] = useState("");
  const [apiError, setApiError] = useState("");
  const [bookingMode, setBookingMode] = useState("surface");
  const [freightData, setFreightData] = useState(null);
  const [isManualLR, setIsManualLR] = useState(false);
  const [manualLRNumber, setManualLRNumber] = useState("");
  const [showFreightOnDocket, setShowFreightOnDocket] = useState(true);
  const [shipmentStatus, setShipmentStatus] = useState("booked");
  
  // Live Tracking State
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingResult, setTrackingResult] = useState(null);
  const [showTracking, setShowTracking] = useState(false);
  const [trackingLoading, setTrackingLoading] = useState(false);
  
  const printDocketRef = useRef(null);

  // Fetch real-time shipment status from API
  const fetchShipmentStatus = async (trackingNo) => {
    try {
      const response = await fetch(`https://faithcargo.onrender.com/api/shipments/shipment/${trackingNo}`);
      if (response.ok) {
        const data = await response.json();
        return data;
      }
      return null;
    } catch (error) {
      console.error("Status fetch error:", error);
      return null;
    }
  };

  // Print Docket Function
  const handlePrintDocket = () => {
    const printContent = printDocketRef.current;
    if (printContent) {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>Faith Cargo - Docket ${lrNumber}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: 'Segoe UI', Arial, sans-serif; background: white; padding: 20px; }
              .print-docket { width: 210mm; min-height: 297mm; margin: 0 auto; position: relative; background: white; }
              .docket-inner-border { position: absolute; top: 5px; left: 5px; right: 5px; bottom: 5px; border: 2px solid #d32f2f; pointer-events: none; border-radius: 8px; }
              .docket-header { display: flex; justify-content: space-between; padding: 20px; border-bottom: 3px solid #d32f2f; background: #fef9f9; }
              .brand-section { display: flex; gap: 15px; align-items: center; }
              .brand-logo { height: 70px; width: auto; }
              .brand-info h2 { font-size: 18px; font-weight: bold; margin: 0; color: #1a1a2e; }
              .brand-info p { font-size: 9px; color: #d32f2f; font-weight: 600; }
              .contact-line { font-size: 7px; color: #4a5568; margin-top: 6px; display: flex; flex-direction: column; gap: 2px; }
              .docket-number { text-align: right; }
              .lr-badge { background: #0f172a; color: white; padding: 4px 12px; font-size: 10px; font-weight: bold; border-radius: 4px; }
              .barcode-canvas { margin: 8px 0; background: white; padding: 5px; }
              .lr-value { font-size: 24px; font-weight: bold; color: #d32f2f; font-family: monospace; letter-spacing: 2px; }
              .status-badge-docket { display: inline-block; margin-top: 5px; padding: 3px 10px; border-radius: 20px; font-size: 9px; font-weight: bold; background: #10b981; color: white; }
              .parties-container { display: flex; gap: 20px; padding: 20px; background: #f8fafc; }
              .party { flex: 1; background: white; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
              .party-title { background: #f1f5f9; padding: 10px 15px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid #e2e8f0; }
              .party-icon { width: 32px; height: 32px; background: #ffebed; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
              .party-content { padding: 15px; }
              .party-content h4 { font-size: 13px; margin-bottom: 8px; }
              .address-text { font-size: 10px; color: #475569; margin-bottom: 10px; }
              .party-contact { display: flex; flex-wrap: wrap; gap: 10px; font-size: 9px; padding-top: 8px; border-top: 1px dashed #e2e8f0; }
              .shipment-wrapper { padding: 0 20px; margin-bottom: 20px; }
              .shipment-data-table { width: 100%; border-collapse: collapse; }
              .shipment-data-table th { background: #f1f5f9; padding: 10px; font-size: 9px; font-weight: bold; border: 1px solid #e2e8f0; }
              .shipment-data-table td { padding: 10px; font-size: 10px; border: 1px solid #e2e8f0; text-align: center; }
              .billing-wrapper { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 0 20px; margin-bottom: 20px; }
              .invoice-section, .freight-section { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
              .section-header { background: #f8fafc; padding: 8px 15px; font-size: 10px; font-weight: bold; border-bottom: 1px solid #e2e8f0; }
              .stamp-signature-wrapper { display: flex; justify-content: space-between; align-items: center; padding: 0 20px; margin-bottom: 20px; }
              .official-stamp { width: 120px; height: 120px; }
              .stamp-circle { width: 100%; height: 100%; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
              .stamp-outer-ring { width: 110px; height: 110px; border-radius: 50%; border: 3px solid #2563eb; display: flex; align-items: center; justify-content: center; }
              .stamp-title { font-size: 12px; font-weight: 800; color: #2563eb; }
              .stamp-sub { font-size: 9px; font-weight: 700; color: #2563eb; }
              .stamp-line { width: 30px; height: 1.5px; background: #2563eb; margin: 5px auto; }
              .stamp-auth { font-size: 7px; font-weight: 600; color: #2563eb; }
              .company-instructions { margin: 20px; padding: 15px; background: #f0fdf4; border-radius: 12px; border-left: 4px solid #10b981; }
              .instructions-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px; }
              .instruction-item { display: flex; gap: 10px; font-size: 8px; }
              .instruction-icon { font-size: 16px; }
              .terms-wrapper { padding: 0 20px; margin-bottom: 20px; }
              .terms-wrapper ul { padding-left: 20px; font-size: 8px; }
              .docket-footer { padding: 12px 20px; background: #0f172a; color: white; display: flex; justify-content: space-between; font-size: 8px; }
              @media print { body { margin: 0; padding: 0; } }
            </style>
          </head>
          <body>
            ${printContent.outerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  // Professional Track Shipment Function with Real-time Status
  const handleTrackShipment = async () => {
    if (!trackingNumber) {
      alert("Please enter LR Number or AWB Number to track");
      return;
    }
    
    setTrackingLoading(true);
    setTrackingResult(null);
    
    try {
      // Fetch from API with real-time status
      const response = await fetch(`https://faithcargo.onrender.com/api/shipments/shipment/${trackingNumber}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Get tracking history if available
        let trackingHistory = [];
        try {
          const historyResponse = await fetch(`https://faithcargo.onrender.com/api/shipments/tracking-history/${trackingNumber}`);
          if (historyResponse.ok) {
            trackingHistory = await historyResponse.json();
          }
        } catch (e) {}
        
        setTrackingResult({
          lr: data.lr,
          awb: data.awb,
          pickupName: data.pickupName,
          pickupPincode: data.pickupPincode,
          deliveryName: data.deliveryName,
          deliveryPincode: data.deliveryPincode,
          status: data.status || 'booked',
          weight: data.weight,
          material: data.material,
          totalValue: data.totalValue,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          trackingHistory: trackingHistory
        });
      } else {
        // Check local storage as fallback
        const allShipments = JSON.parse(localStorage.getItem('allShipments') || '[]');
        const found = allShipments.find(s => s.lr === trackingNumber.toUpperCase() || s.awb === trackingNumber);
        
        if (found) {
          setTrackingResult({
            ...found,
            status: found.status || 'booked'
          });
        } else {
          alert("Shipment not found! Please check the LR/AWB number.");
        }
      }
    } catch (error) {
      console.error("Tracking error:", error);
      alert("Error tracking shipment. Please try again.");
    } finally {
      setTrackingLoading(false);
    }
  };

  const [pickup, setPickup] = useState({ name: "", contact: "", address: "", pincode: "", state: "", city: "", gstin: "" });
  const [delivery, setDelivery] = useState({ name: "", contact: "", address: "", pincode: "", state: "", city: "", gstin: "" });
  const [orderDetails, setOrderDetails] = useState({ material: "", weight: "", boxesCount: 0, hsnCode: "1234" });
  const [invoices, setInvoices] = useState([{ id: Date.now(), no: "", value: "" }]);

  const totalInvoiceValue = useMemo(() => invoices.reduce((s, inv) => s + (parseFloat(inv.value) || 0), 0), [invoices]);
  const volWeight = useMemo(() => {
    const total = boxes.reduce((acc, b) => acc + ((parseFloat(b.l)||0) * (parseFloat(b.w)||0) * (parseFloat(b.h)||0)) / 4000, 0);
    return total.toFixed(2);
  }, [boxes]);
  const chargedWeight = Math.max(parseFloat(orderDetails.weight || 0), parseFloat(volWeight));
  const needsEwayBill = totalInvoiceValue >= 50000;

  const fetchLocation = async (pin, type) => {
    if (pin?.length === 6) {
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const data = await res.json();
        if (data?.[0]?.Status === "Success") {
          const po = data[0].PostOffice[0];
          const loc = { state: po.State, city: po.District };
          type === "pickup" ? setPickup(p => ({ ...p, ...loc })) : setDelivery(d => ({ ...d, ...loc }));
        }
      } catch (err) {}
    }
  };

  const handleCreateOrder = async () => {
    if (needsEwayBill && !ewayBill) return alert("E-Way Bill required for invoice > ₹50,000");
    if (!pickup.name || !delivery.name || !orderDetails.weight) return alert("Fill all mandatory fields");
    if (!pickup.pincode || !delivery.pincode) return alert("Enter valid 6-digit pincodes");
    if (isManualLR && !manualLRNumber) return alert("Enter Manual LR Number");

    setLoading(true);
    setApiError("");

    const orderData = {
      pickupName: pickup.name, pickupAddress: pickup.address, pickupPincode: pickup.pincode,
      pickupContact: pickup.contact, pickupGstin: pickup.gstin,
      deliveryName: delivery.name, deliveryAddress: delivery.address, deliveryPincode: delivery.pincode,
      deliveryContact: delivery.contact, deliveryGstin: delivery.gstin,
      material: orderDetails.material || "General Cargo", hsn: orderDetails.hsnCode,
      boxes: orderDetails.boxesCount, weight: parseFloat(chargedWeight),
      actual_weight: parseFloat(orderDetails.weight || 0), volumetric_weight: parseFloat(volWeight),
      total_value: totalInvoiceValue, eway_bill: needsEwayBill ? ewayBill : "",
      booking_mode: bookingMode,
      invoices: invoices.filter(inv => inv.no && inv.value).map(inv => ({ invoice_no: inv.no, invoice_value: parseFloat(inv.value) }))
    };

    try {
      const response = await fetch("https://faithcargo.onrender.com/api/shipments/create-order/", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(orderData)
      });
      const result = await response.json();

      if (result.success) {
        setLrNumber(result.lr_number);
        setAwbNumber(result.awb);
        setShipmentStatus("booked");
        setShowLR(true);
        
        const allShipments = JSON.parse(localStorage.getItem('allShipments') || '[]');
        allShipments.unshift({
          lr: isManualLR ? manualLRNumber : result.lr_number, 
          awb: result.awb,
          route: `${pickup.pincode} → ${delivery.pincode}`, 
          value: totalInvoiceValue,
          status: 'booked', 
          date: new Date().toISOString()
        });
        localStorage.setItem('allShipments', JSON.stringify(allShipments.slice(0, 50)));
      } else {
        setApiError(result.error || "Failed");
        alert("Error: " + result.error);
      }
    } catch (error) {
      setApiError("Network error");
      alert("Network error! Try again.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'booked': { text: '📝 Booked', class: 'status-booked', icon: '📝', color: '#f59e0b' },
      'picked': { text: '🚚 Picked Up', class: 'status-picked', icon: '🚚', color: '#3b82f6' },
      'in_transit': { text: '🚛 In Transit', class: 'status-transit', icon: '🚛', color: '#8b5cf6' },
      'out_for_delivery': { text: '📦 Out for Delivery', class: 'status-out', icon: '📦', color: '#ec4898' },
      'delivered': { text: '✅ Delivered', class: 'status-delivered', icon: '✅', color: '#10b981' },
      'cancelled': { text: '❌ Cancelled', class: 'status-cancelled', icon: '❌', color: '#ef4444' }
    };
    const s = statusMap[status] || { text: status || 'Booked', class: 'status-booked', icon: '📝', color: '#f59e0b' };
    return (
      <div className="status-badge-container">
        <span className={`status-badge ${s.class}`} style={{ backgroundColor: `${s.color}15`, color: s.color, borderLeftColor: s.color }}>
          {s.icon} {s.text}
        </span>
      </div>
    );
  };

  // Professional Tracking Timeline Component
  const getTrackingTimeline = (currentStatus) => {
    const steps = [
      { key: 'booked', label: 'Booked', icon: '📝', description: 'Order confirmed and registered' },
      { key: 'picked', label: 'Picked Up', icon: '🚚', description: 'Shipment collected from pickup location' },
      { key: 'in_transit', label: 'In Transit', icon: '🚛', description: 'Shipment on the way to destination' },
      { key: 'out_for_delivery', label: 'Out for Delivery', icon: '📦', description: 'Out for final delivery' },
      { key: 'delivered', label: 'Delivered', icon: '✅', description: 'Successfully delivered' }
    ];
    
    const currentIndex = steps.findIndex(s => s.key === currentStatus);
    
    return (
      <div className="tracking-timeline">
        {steps.map((step, idx) => {
          const isCompleted = idx <= currentIndex;
          const isCurrent = idx === currentIndex;
          
          return (
            <div key={step.key} className={`timeline-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}>
              <div className="timeline-icon">
                {isCompleted ? <CheckCircle2 size={24} /> : <span className="step-icon">{step.icon}</span>}
              </div>
              <div className="timeline-content">
                <div className="step-label">{step.label}</div>
                <div className="step-desc">{step.description}</div>
              </div>
              {idx < steps.length - 1 && <div className={`timeline-line ${isCompleted ? 'completed' : ''}`}></div>}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="create-order-page">
      {/* Sidebar */}
      <aside className="order-sidebar">
        <div className="sidebar-logo">
          <img src={logo} alt="FCPL" />
          <div className="online-indicator"></div>
        </div>
        <nav className="sidebar-navigation">
          <div className="nav-link active"><Plus size={18} /> Create Booking</div>
          <div className="nav-link" onClick={() => {
            setShowTracking(!showTracking);
            if (!showTracking) setTrackingResult(null);
          }}><Search size={18} /> Live Tracking</div>
          <div className="nav-link" onClick={() => window.location.href='/shipments'}><FileText size={18} /> All Dockets</div>
          <div className="nav-link"><CreditCard size={18} /> Payments</div>
        </nav>
        <div className="sidebar-help">
          <Award size={24} color="#d32f2f" />
          <p>Support 24/7</p>
          <span>📞 9818641504</span>
        </div>
      </aside>

      {/* Main Content */}
      <main className="order-main-content">
        <div className="page-title-section">
          <div>
            <h1>Create Shipment</h1>
            <p>Enter consignment details for LR generation</p>
          </div>
          <div className="stats-badges">
            <div className="badge">⚡ Charged: {chargedWeight} Kg</div>
            <div className="badge red">💰 Value: ₹{totalInvoiceValue.toLocaleString()}</div>
          </div>
        </div>

        {apiError && <div className="error-notice"><AlertCircle size={18} /> {apiError}</div>}

        {/* Live Tracking Section - Professional Design */}
        {showTracking && (
          <div className="tracking-section">
            <div className="tracking-header">
              <Activity size={24} color="#d32f2f" />
              <h3>Live Shipment Tracking</h3>
              <span className="tracking-badge">Real-Time</span>
            </div>
            <div className="tracking-input-group">
              <input 
                type="text" 
                placeholder="Enter LR Number (e.g., FCPL0016) or AWB Number" 
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && handleTrackShipment()}
              />
              <button onClick={handleTrackShipment} disabled={trackingLoading}>
                {trackingLoading ? <RefreshCw size={18} className="spin" /> : <Search size={18} />}
                {trackingLoading ? "Tracking..." : "Track Shipment"}
              </button>
            </div>
            
            {trackingResult && (
              <div className="tracking-result">
                <div className="tracking-card">
                  <div className="tracking-card-header">
                    <div>
                      <span className="tracking-lr">{trackingResult.lr}</span>
                      <span className="tracking-awb">AWB: {trackingResult.awb}</span>
                    </div>
                    {getStatusBadge(trackingResult.status)}
                  </div>
                  
                  <div className="tracking-route-info">
                    <div className="route-point pickup">
                      <div className="point-icon"><MapPin size={20} /></div>
                      <div className="point-details">
                        <label>Pickup Location</label>
                        <p><strong>{trackingResult.pickupName || 'N/A'}</strong></p>
                        <span>Pincode: {trackingResult.pickupPincode}</span>
                      </div>
                    </div>
                    <div className="route-arrow">→</div>
                    <div className="route-point delivery">
                      <div className="point-icon"><Truck size={20} /></div>
                      <div className="point-details">
                        <label>Delivery Location</label>
                        <p><strong>{trackingResult.deliveryName || 'N/A'}</strong></p>
                        <span>Pincode: {trackingResult.deliveryPincode}</span>
                      </div>
                    </div>
                  </div>

                  {/* Professional Tracking Timeline */}
                  <div className="tracking-timeline-container">
                    <h4>Shipment Progress</h4>
                    {getTrackingTimeline(trackingResult.status)}
                  </div>

                  <div className="tracking-details-grid">
                    <div className="detail-item">
                      <Weight size={16} />
                      <div>
                        <label>Weight</label>
                        <p>{trackingResult.weight} kg</p>
                      </div>
                    </div>
                    <div className="detail-item">
                      <Package size={16} />
                      <div>
                        <label>Material</label>
                        <p>{trackingResult.material || 'General Cargo'}</p>
                      </div>
                    </div>
                    <div className="detail-item">
                      <DollarSign size={16} />
                      <div>
                        <label>Invoice Value</label>
                        <p>₹{trackingResult.totalValue?.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="detail-item">
                      <Clock size={16} />
                      <div>
                        <label>Last Updated</label>
                        <p>{new Date(trackingResult.updatedAt || trackingResult.date).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="tracking-actions">
                    <button className="tracking-print" onClick={() => {
                      const printWin = window.open('', '_blank');
                      printWin.document.write(`
                        <html><head><title>Tracking - ${trackingResult.lr}</title>
                        <style>body{font-family:Arial;padding:20px} .track-report{border:1px solid #ddd;padding:20px;border-radius:10px}</style>
                        </head><body>
                        <div class="track-report">
                          <h2>Faith Cargo - Tracking Report</h2>
                          <p><strong>LR:</strong> ${trackingResult.lr}</p>
                          <p><strong>AWB:</strong> ${trackingResult.awb}</p>
                          <p><strong>Status:</strong> ${trackingResult.status}</p>
                          <p><strong>Route:</strong> ${trackingResult.pickupPincode} → ${trackingResult.deliveryPincode}</p>
                          <p><strong>Weight:</strong> ${trackingResult.weight} kg</p>
                          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
                        </div>
                        </body></html>
                      `);
                      printWin.document.close();
                      printWin.print();
                      printWin.close();
                    }}><Printer size={16} /> Print Report</button>
                    <button className="tracking-close" onClick={() => setTrackingResult(null)}>Close</button>
                  </div>
                </div>
              </div>
            )}
            
            {!trackingResult && !trackingLoading && trackingNumber && (
              <div className="tracking-empty">
                <Package size={48} color="#cbd5e1" />
                <p>Enter LR Number or AWB Number to track your shipment</p>
              </div>
            )}
          </div>
        )}

        <div className="two-column-form">
          {/* Left Column - Sender & Receiver */}
          <div className="left-form-col">
            {/* Sender Card */}
            <div className="form-section">
              <div className="section-heading"><MapPin size={18} color="#d32f2f" /> Consignor (Sender)</div>
              <div className="section-body">
                <div className="form-row">
                  <div className="form-field">
                    <label>Company / Name *</label>
                    <input value={pickup.name} onChange={e => setPickup({...pickup, name: e.target.value.toUpperCase()})} placeholder="Enter sender name" />
                  </div>
                  <div className="form-field">
                    <label>Mobile Number *</label>
                    <input type="tel" maxLength={10} value={pickup.contact} onChange={e => setPickup({...pickup, contact: e.target.value})} placeholder="10 digit mobile" />
                  </div>
                </div>
                <div className="form-field full-width">
                  <label>Full Address *</label>
                  <textarea rows={2} value={pickup.address} onChange={e => setPickup({...pickup, address: e.target.value})} placeholder="House No, Street, Area" />
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <label>Pincode *</label>
                    <input maxLength={6} value={pickup.pincode} onChange={e => { setPickup({...pickup, pincode: e.target.value}); fetchLocation(e.target.value, 'pickup'); }} placeholder="6 digit" />
                  </div>
                  <div className="form-field">
                    <label>City & State</label>
                    <input className="readonly-field" value={pickup.city ? `${pickup.city}, ${pickup.state}` : ""} readOnly placeholder="Auto-filled" />
                  </div>
                </div>
                <div className="form-field">
                  <label>GSTIN (Optional)</label>
                  <input value={pickup.gstin} onChange={e => setPickup({...pickup, gstin: e.target.value.toUpperCase()})} placeholder="15 digit GSTIN" maxLength={15} />
                </div>
              </div>
            </div>

            {/* Receiver Card */}
            <div className="form-section">
              <div className="section-heading"><Truck size={18} color="#d32f2f" /> Consignee (Receiver)</div>
              <div className="section-body">
                <div className="form-row">
                  <div className="form-field">
                    <label>Receiver Name *</label>
                    <input value={delivery.name} onChange={e => setDelivery({...delivery, name: e.target.value.toUpperCase()})} placeholder="Enter receiver name" />
                  </div>
                  <div className="form-field">
                    <label>Mobile Number *</label>
                    <input type="tel" maxLength={10} value={delivery.contact} onChange={e => setDelivery({...delivery, contact: e.target.value})} placeholder="10 digit mobile" />
                  </div>
                </div>
                <div className="form-field full-width">
                  <label>Full Address *</label>
                  <textarea rows={2} value={delivery.address} onChange={e => setDelivery({...delivery, address: e.target.value})} placeholder="House No, Street, Area" />
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <label>Pincode *</label>
                    <input maxLength={6} value={delivery.pincode} onChange={e => { setDelivery({...delivery, pincode: e.target.value}); fetchLocation(e.target.value, 'delivery'); }} placeholder="6 digit" />
                  </div>
                  <div className="form-field">
                    <label>City & State</label>
                    <input className="readonly-field" value={delivery.city ? `${delivery.city}, ${delivery.state}` : ""} readOnly placeholder="Auto-filled" />
                  </div>
                </div>
                <div className="form-field">
                  <label>GSTIN (Optional)</label>
                  <input value={delivery.gstin} onChange={e => setDelivery({...delivery, gstin: e.target.value.toUpperCase()})} placeholder="15 digit GSTIN" maxLength={15} />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Shipment Details & Invoice */}
          <div className="right-form-col">
            {/* Shipment Details Card */}
            <div className="form-section">
              <div className="section-heading"><Package size={18} color="#d32f2f" /> Shipment Details</div>
              <div className="section-body">
                <div className="form-field full-width">
                  <label>Material Description</label>
                  <input placeholder="e.g., Industrial Tools, Textile" onChange={e => setOrderDetails({...orderDetails, material: e.target.value.toUpperCase()})} />
                </div>
                <div className="form-field full-width">
                  <label>HSN Code</label>
                  <input value={orderDetails.hsnCode} onChange={e => setOrderDetails({...orderDetails, hsnCode: e.target.value})} placeholder="HSN Code" />
                </div>

                <div className="mode-selector">
                  <label>Booking Mode *</label>
                  <div className="mode-options">
                    <button type="button" className={`mode-option ${bookingMode === 'surface' ? 'active' : ''}`} onClick={() => setBookingMode('surface')}><Truck size={16} /> Surface</button>
                    <button type="button" className={`mode-option ${bookingMode === 'air' ? 'active' : ''}`} onClick={() => setBookingMode('air')}><Plane size={16} /> Air</button>
                    <button type="button" className={`mode-option ${bookingMode === 'rail' ? 'active' : ''}`} onClick={() => setBookingMode('rail')}><Train size={16} /> Rail</button>
                    <button type="button" className={`mode-option ${bookingMode === 'express' ? 'active' : ''}`} onClick={() => setBookingMode('express')}><TrendingUp size={16} /> Express</button>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label>Actual Weight (Kg) *</label>
                    <input type="number" step="0.1" value={orderDetails.weight} onChange={e => setOrderDetails({...orderDetails, weight: e.target.value})} placeholder="Weight" />
                  </div>
                  <div className="form-field">
                    <label>No. of Packages *</label>
                    <input type="number" value={orderDetails.boxesCount} onChange={e => {
                      const n = parseInt(e.target.value) || 0;
                      setOrderDetails({...orderDetails, boxesCount: n});
                      setBoxes(Array.from({length: n}, (_, i) => ({ id: i+1, l: "", w: "", h: "" })));
                    }} placeholder="Boxes" />
                  </div>
                </div>

                {boxes.length > 0 && (
                  <div className="dimension-panel">
                    <div className="dimension-header">
                      <span>📦 Dimensions (CM) - ÷4000</span>
                      <span className="vol-badge">Vol: {volWeight} Kg</span>
                    </div>
                    {boxes.map((box, i) => (
                      <div key={i} className="dimension-input-row">
                        <span className="box-count">#{i+1}</span>
                        <input placeholder="L" type="number" step="0.1" onChange={e => { let b = [...boxes]; b[i].l = e.target.value; setBoxes(b); }} />
                        <input placeholder="W" type="number" step="0.1" onChange={e => { let b = [...boxes]; b[i].w = e.target.value; setBoxes(b); }} />
                        <input placeholder="H" type="number" step="0.1" onChange={e => { let b = [...boxes]; b[i].h = e.target.value; setBoxes(b); }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Invoice Card */}
            <div className="form-section">
              <div className="section-heading between">
                <div><FileText size={18} color="#d32f2f" /> Invoice Details</div>
                <button className="add-invoice-btn" onClick={() => setInvoices([...invoices, { id: Date.now(), no: "", value: "" }])}><Plus size={14} /> Add</button>
              </div>
              <div className="section-body">
                {invoices.map(inv => (
                  <div key={inv.id} className="invoice-input-row">
                    <input placeholder="Invoice No" value={inv.no} onChange={e => setInvoices(invoices.map(i => i.id === inv.id ? {...i, no: e.target.value.toUpperCase()} : i))} />
                    <input type="number" placeholder="Value ₹" value={inv.value} onChange={e => setInvoices(invoices.map(i => i.id === inv.id ? {...i, value: e.target.value} : i))} />
                    <button className="remove-invoice-btn" onClick={() => setInvoices(invoices.filter(i => i.id !== inv.id))}><Trash2 size={14} /></button>
                  </div>
                ))}

                <InvoiceUpload onUpload={(files) => console.log("Uploaded:", files)} />

                {needsEwayBill && (
                  <div className="eway-alert">
                    <div className="eway-header"><AlertCircle size={16} /> E-WAY BILL REQUIRED</div>
                    <input className="eway-input-field" value={ewayBill} onChange={e => setEwayBill(e.target.value.toUpperCase())} placeholder="12 DIGIT E-WAY BILL NO." maxLength={12} />
                  </div>
                )}

                <RealTimeFreightCalculator 
                  weight={chargedWeight} origin={pickup.pincode} destination={delivery.pincode}
                  bookingMode={bookingMode} onCalculate={setFreightData}
                />

                {/* Settings */}
                <div className="settings-panel">
                  <div className="setting-row">
                    <label>Manual LR Number</label>
                    <button className={`toggle-switch ${isManualLR ? 'on' : 'off'}`} onClick={() => setIsManualLR(!isManualLR)}>
                      {isManualLR ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      {isManualLR ? 'Manual ON' : 'Auto'}
                    </button>
                  </div>
                  {isManualLR && (
                    <input className="manual-lr-input" placeholder="Enter LR Number" value={manualLRNumber} onChange={e => setManualLRNumber(e.target.value.toUpperCase())} />
                  )}
                  <div className="setting-row">
                    <label>Show Freight on Docket</label>
                    <button className={`toggle-switch ${showFreightOnDocket ? 'on' : 'off'}`} onClick={() => setShowFreightOnDocket(!showFreightOnDocket)}>
                      {showFreightOnDocket ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      {showFreightOnDocket ? 'Show' : 'Hide'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button className={`generate-btn ${loading ? 'loading-state' : ''}`} onClick={handleCreateOrder} disabled={loading}>
              {loading ? <Clock size={20} className="spin" /> : <Crown size={20} />}
              {loading ? "Generating LR..." : "Generate Consignment Note"}
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Success Modal */}
        {showLR && (
          <div className="modal-overlay" onClick={() => setShowLR(false)}>
            <div className="modal-dialog" onClick={e => e.stopPropagation()}>
              <div className="modal-icon"><CheckCircle size={60} color="#10b981" /></div>
              <h2>Consignment Generated!</h2>
              <div className="modal-lr-number">{isManualLR ? manualLRNumber : lrNumber}</div>
              <div className="modal-awb-number">AWB: {awbNumber}</div>
              
              {/* Hidden Docket for Printing */}
              <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                <PrintDocket
                  ref={printDocketRef}
                  data={{pickup, delivery, orderDetails, invoices, chargedWeight, volWeight}}
                  lrNumber={isManualLR ? manualLRNumber : lrNumber}
                  totalValue={totalInvoiceValue}
                  ewayBill={ewayBill}
                  awbNumber={awbNumber}
                  bookingMode={bookingMode}
                  showFreight={showFreightOnDocket}
                  freightData={freightData}
                  status={shipmentStatus}
                />
              </div>

              <div className="modal-buttons">
                <button className="modal-btn print-btn" onClick={handlePrintDocket}><Printer size={16} /> Print Docket</button>
                <button className="modal-btn label-btn" onClick={() => {
                  const printWin = window.open('', '_blank');
                  printWin.document.write(`
                    <html><head><title>Label - ${isManualLR ? manualLRNumber : lrNumber}</title>
                    <style>
                      body { font-family: Arial, sans-serif; padding: 20px; background: #f1f5f9; }
                      .label-card { width: 4in; border: 3px solid #2563eb; padding: 15px; margin: 0 auto; border-radius: 16px; background: white; }
                      .label-header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 12px; }
                      .label-header h2 { margin: 0; color: #1e293b; font-size: 16px; }
                      .label-lr { font-size: 20px; font-weight: bold; text-align: center; margin: 12px 0; color: #d32f2f; }
                      .barcode-img { text-align: center; margin: 10px 0; }
                      .label-footer { font-size: 8px; text-align: center; margin-top: 12px; padding-top: 8px; border-top: 1px dashed #cbd5e1; }
                    </style>
                    </head>
                    <body>
                      <div class="label-card">
                        <div class="label-header">
                          <h2>FAITH CARGO PVT LTD</h2>
                          <p>4/15, Kirti Nagar Industrial Area, New Delhi - 110015</p>
                        </div>
                        <div class="label-lr">LR: ${isManualLR ? manualLRNumber : lrNumber}</div>
                        <div class="barcode-img"><img src="https://barcode.tec-it.com/barcode.ashx?data=${isManualLR ? manualLRNumber : lrNumber}&code=Code128&dpi=96" width="220" /></div>
                        <div class="label-footer">Weight: ${chargedWeight} Kg | Mode: ${bookingMode.toUpperCase()} | AWB: ${awbNumber}</div>
                      </div>
                    </body>
                    </html>
                  `);
                  printWin.document.close();
                  printWin.focus();
                  printWin.print();
                  printWin.close();
                }}><Barcode size={16} /> Print Label</button>
                <button className="modal-btn view-btn" onClick={() => window.location.href='/shipments'}><Eye size={16} /> View All</button>
                <button className="modal-btn new-btn" onClick={() => window.location.reload()}><Plus size={16} /> New</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}