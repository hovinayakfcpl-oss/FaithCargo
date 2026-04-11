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
  Stamp, Circle, Star, HelpCircle, Search, Filter
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
// 🎨 DOCKET COMPONENT (FOR PRINTING - WITH FIXED LOGO & BARCODE)
// ============================================
const PrintDocket = React.forwardRef(({ data, lrNumber, totalValue, ewayBill, awbNumber, bookingMode, showFreight, freightData }, ref) => {
  const barcodeRef = useRef(null);
  
  useEffect(() => {
    if (lrNumber && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, lrNumber, {
          format: "CODE128", 
          width: 2, 
          height: 45, 
          displayValue: true,
          fontSize: 12,
          margin: 5,
          textAlign: "center"
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
          <canvas ref={barcodeRef} className="barcode-canvas"></canvas>
          <div className="lr-value">{lrNumber || "DRAFT"}</div>
          <div className="awb-value">AWB: {awbNumber || "N/A"}</div>
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
          <ArrowRight size={28} />
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

      {/* Official Red Stamp - Circular Shape */}
      <div className="stamp-signature-wrapper">
        <div className="official-stamp">
          <div className="stamp-circle">
            <div className="stamp-outer">
              <div className="stamp-inner">
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

      {/* Terms */}
      <div className="terms-wrapper">
        <h4>TERMS & CONDITIONS</h4>
        <ul>
          <li>Goods carried at Owner's Risk. Insurance recommended.</li>
          <li>Claim within 7 days of delivery. Jurisdiction: Delhi Only.</li>
          <li>Transit liability as per Carriers Act, 1865.</li>
          <li>E-Way Bill mandatory for invoice &gt; ₹50,000.</li>
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
  
  // Live Tracking State
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingResult, setTrackingResult] = useState(null);
  const [showTracking, setShowTracking] = useState(false);
  
  const printDocketRef = useRef(null);

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
              body { font-family: Arial, sans-serif; background: white; padding: 20px; }
              .print-docket { width: 210mm; min-height: 297mm; margin: 0 auto; position: relative; }
              .docket-inner-border { position: absolute; top: 5px; left: 5px; right: 5px; bottom: 5px; border: 2px solid #d32f2f; pointer-events: none; border-radius: 4px; }
              .docket-header { display: flex; justify-content: space-between; padding: 15px; border-bottom: 3px solid #d32f2f; }
              .brand-section { display: flex; gap: 12px; }
              .brand-logo { height: 55px; }
              .brand-info h2 { font-size: 16px; font-weight: bold; margin: 0; }
              .brand-info p { font-size: 8px; color: #666; }
              .contact-line { font-size: 7px; color: #666; margin-top: 5px; display: flex; flex-direction: column; gap: 2px; }
              .docket-number { text-align: right; }
              .lr-badge { background: #0f172a; color: white; padding: 3px 10px; font-size: 9px; display: inline-block; }
              .barcode-canvas { margin: 5px 0; }
              .lr-value { font-size: 20px; font-weight: bold; color: #d32f2f; font-family: monospace; }
              .awb-value, .date-value { font-size: 9px; color: #666; }
              .parties-container { display: flex; gap: 15px; padding: 15px; background: #fafafa; }
              .party { flex: 1; background: white; border: 1px solid #e2e8f0; border-radius: 8px; }
              .party-title { background: #f8fafc; padding: 8px 12px; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #e2e8f0; }
              .party-icon { width: 28px; height: 28px; background: #ffebed; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
              .party-title h3 { font-size: 11px; margin: 0; }
              .party-title span { font-size: 8px; color: #666; }
              .party-content { padding: 12px; }
              .party-content h4 { font-size: 11px; margin-bottom: 6px; }
              .address-text { font-size: 9px; color: #666; margin-bottom: 8px; }
              .party-contact { display: flex; flex-wrap: wrap; gap: 8px; font-size: 8px; padding-top: 6px; border-top: 1px dashed #e2e8f0; }
              .party-arrow-icon { display: flex; align-items: center; color: #d32f2f; }
              .shipment-wrapper { padding: 0 15px; margin-bottom: 15px; }
              .shipment-data-table { width: 100%; border-collapse: collapse; }
              .shipment-data-table th { background: #f8fafc; padding: 6px; font-size: 8px; border: 1px solid #e2e8f0; }
              .shipment-data-table td { padding: 6px; font-size: 9px; border: 1px solid #e2e8f0; text-align: center; }
              .goods-note { font-size: 7px; color: #666; }
              .mode-label { display: inline-block; padding: 2px 6px; border-radius: 8px; font-size: 7px; font-weight: bold; }
              .mode-label.surface { background: #dbeafe; color: #1e40af; }
              .billing-wrapper { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; padding: 0 15px; margin-bottom: 15px; }
              .invoice-section, .freight-section { border: 1px solid #e2e8f0; border-radius: 8px; }
              .section-header { background: #f8fafc; padding: 6px 10px; font-size: 9px; font-weight: bold; border-bottom: 1px solid #e2e8f0; }
              .invoice-items, .freight-items { padding: 8px; }
              .invoice-row-line, .freight-row-line { display: flex; justify-content: space-between; font-size: 8px; padding: 3px 0; }
              .invoice-total-line { display: flex; justify-content: space-between; font-size: 9px; font-weight: bold; padding-top: 5px; border-top: 1px solid #e2e8f0; }
              .eway-badge { margin-top: 5px; padding: 3px; background: #fef3c7; text-align: center; font-size: 7px; border-radius: 4px; }
              .total-freight { font-weight: bold; color: #d32f2f; border-top: 1px solid #e2e8f0; margin-top: 5px; padding-top: 5px; }
              .rate-note { margin-top: 6px; padding: 3px; background: #e0f2fe; text-align: center; font-size: 7px; border-radius: 4px; }
              .stamp-signature-wrapper { display: flex; justify-content: space-between; align-items: center; padding: 0 15px; margin-bottom: 15px; }
              .official-stamp { width: 100px; height: 100px; }
              .stamp-circle { width: 100%; height: 100%; border-radius: 50%; background: rgba(211,47,47,0.05); display: flex; align-items: center; justify-content: center; }
              .stamp-outer { width: 85px; height: 85px; border-radius: 50%; border: 2px solid #d32f2f; display: flex; align-items: center; justify-content: center; }
              .stamp-inner { text-align: center; }
              .stamp-title { font-size: 9px; font-weight: bold; color: #d32f2f; display: block; }
              .stamp-sub { font-size: 7px; font-weight: bold; color: #d32f2f; display: block; }
              .stamp-line { width: 25px; height: 1px; background: #d32f2f; margin: 3px auto; }
              .stamp-auth { font-size: 6px; font-weight: bold; color: #d32f2f; display: block; }
              .signature-area { display: flex; gap: 20px; }
              .signature-line-item { text-align: center; }
              .sign-line { width: 80px; border-top: 1px solid #0f172a; margin-bottom: 3px; }
              .stamp-box { border: 1px dashed #d32f2f; padding: 5px; font-size: 7px; font-weight: bold; margin-bottom: 3px; color: #d32f2f; background: #fff1f2; }
              .terms-wrapper { padding: 0 15px; margin-bottom: 15px; }
              .terms-wrapper h4 { font-size: 9px; margin-bottom: 5px; }
              .terms-wrapper ul { padding-left: 15px; font-size: 7px; color: #666; }
              .docket-footer { padding: 8px 15px; background: #0f172a; color: white; display: flex; justify-content: space-between; font-size: 7px; }
              .footer-copies, .footer-website { display: flex; gap: 15px; }
              .text-center { text-align: center; }
              @media print {
                body { margin: 0; padding: 0; }
                .print-docket { margin: 0; }
              }
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

  // Track Shipment Function
  const handleTrackShipment = async () => {
    if (!trackingNumber) {
      alert("Please enter LR Number to track");
      return;
    }
    
    setShowTracking(true);
    setTrackingResult(null);
    
    try {
      // First try to get from localStorage
      const allShipments = JSON.parse(localStorage.getItem('allShipments') || '[]');
      const found = allShipments.find(s => s.lr === trackingNumber.toUpperCase() || s.awb === trackingNumber);
      
      if (found) {
        setTrackingResult(found);
      } else {
        // Try API
        const response = await fetch(`https://faithcargo.onrender.com/api/shipments/shipment/${trackingNumber}`);
        if (response.ok) {
          const data = await response.json();
          setTrackingResult({
            lr: data.lr,
            awb: data.awb,
            route: `${data.pickupPincode} → ${data.deliveryPincode}`,
            status: data.status || 'in_transit',
            date: new Date().toISOString()
          });
        } else {
          alert("Shipment not found!");
        }
      }
    } catch (error) {
      console.error("Tracking error:", error);
      alert("Error tracking shipment");
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
      booking_mode: bookingMode, freight_base: freightData?.baseFreight || 0,
      freight_gst: freightData?.gst || 0, freight_total: freightData?.total || 0,
      is_manual_lr: isManualLR, manual_lr_number: isManualLR ? manualLRNumber : null,
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
        setShowLR(true);
        
        const allShipments = JSON.parse(localStorage.getItem('allShipments') || '[]');
        allShipments.unshift({
          lr: isManualLR ? manualLRNumber : result.lr_number, awb: result.awb,
          route: `${pickup.pincode} → ${delivery.pincode}`, value: totalInvoiceValue,
          status: 'booked', date: new Date().toISOString()
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
      'booked': { text: 'Booked', class: 'status-booked' },
      'picked': { text: 'Picked Up', class: 'status-picked' },
      'in_transit': { text: 'In Transit', class: 'status-transit' },
      'out_for_delivery': { text: 'Out for Delivery', class: 'status-out' },
      'delivered': { text: 'Delivered', class: 'status-delivered' }
    };
    const s = statusMap[status] || { text: status || 'Booked', class: 'status-booked' };
    return <span className={`status-badge ${s.class}`}>{s.text}</span>;
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

        {/* Live Tracking Section */}
        {showTracking && (
          <div className="tracking-section">
            <div className="tracking-header">
              <Search size={20} />
              <h3>Track Your Shipment</h3>
            </div>
            <div className="tracking-input-group">
              <input 
                type="text" 
                placeholder="Enter LR Number or AWB Number" 
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleTrackShipment()}
              />
              <button onClick={handleTrackShipment}><Search size={18} /> Track</button>
            </div>
            
            {trackingResult && (
              <div className="tracking-result">
                <div className="tracking-card">
                  <div className="tracking-lr">{trackingResult.lr}</div>
                  <div className="tracking-status">{getStatusBadge(trackingResult.status)}</div>
                  <div className="tracking-route">
                    <span>📦 {trackingResult.route}</span>
                  </div>
                  <div className="tracking-date">
                    <Clock size={14} /> {new Date(trackingResult.date).toLocaleString()}
                  </div>
                  {trackingResult.awb && (
                    <div className="tracking-awb">AWB: {trackingResult.awb}</div>
                  )}
                </div>
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
              {loading ? <Clock size={20} /> : <Crown size={20} />}
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
                />
              </div>

              <div className="modal-buttons">
                <button className="modal-btn print-btn" onClick={handlePrintDocket}><Printer size={16} /> Print Docket</button>
                <button className="modal-btn label-btn" onClick={() => {
                  const printWin = window.open('', '_blank');
                  printWin.document.write(`
                    <html><head><title>Label - ${isManualLR ? manualLRNumber : lrNumber}</title>
                    <style>
                      body { font-family: Arial; padding: 20px; }
                      .label-card { width: 4in; border: 2px solid #d32f2f; padding: 15px; margin: 0 auto; border-radius: 8px; }
                      .label-header { text-align: center; border-bottom: 2px solid #d32f2f; padding-bottom: 10px; margin-bottom: 10px; }
                      .label-header h2 { margin: 0; color: #0f172a; }
                      .label-header p { margin: 2px 0; color: #64748b; font-size: 10px; }
                      .label-lr { font-size: 22px; font-weight: bold; text-align: center; margin: 15px 0; color: #d32f2f; }
                      .label-address { font-size: 11px; margin: 8px 0; }
                      .label-footer { font-size: 9px; text-align: center; margin-top: 12px; padding-top: 8px; border-top: 1px dashed #ccc; }
                      .barcode-img { text-align: center; margin: 10px 0; }
                    </style>
                    </head>
                    <body>
                      <div class="label-card">
                        <div class="label-header">
                          <h2>FAITH CARGO PVT LTD</h2>
                          <p>4/15, Kirti Nagar Industrial Area, New Delhi - 110015</p>
                          <p>GST: 07AAFCF2947K1ZD</p>
                        </div>
                        <div class="label-lr">LR: ${isManualLR ? manualLRNumber : lrNumber}</div>
                        <div class="barcode-img"><img src="https://barcode.tec-it.com/barcode.ashx?data=${isManualLR ? manualLRNumber : lrNumber}&code=Code128&dpi=96" width="200" /></div>
                        <div class="label-address"><strong>From:</strong> ${pickup.name} - ${pickup.pincode}</div>
                        <div class="label-address"><strong>To:</strong> ${delivery.name} - ${delivery.pincode}</div>
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