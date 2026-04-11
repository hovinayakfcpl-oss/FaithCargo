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
  Percent, DollarSign, Scale, Weight, Ruler
} from "lucide-react";
import logo from "../assets/logo.png";
import "./CreateOrder.css";

// ============================================
// 💰 REAL FREIGHT CALCULATOR (Using Rate Matrix)
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
            body: JSON.stringify({ 
              origin: origin, 
              destination: destination, 
              weight: parseFloat(weight) 
            })
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
              baseFreight: baseFreight,
              fuelSurcharge: fuelSurcharge,
              gst: gst,
              docketCharge: docketCharge,
              fovCharge: fovCharge,
              total: total,
              ratePerKg: (baseFreight / weight).toFixed(2),
              fromZone: data.from_zone,
              toZone: data.to_zone
            };
            
            setFreight(freightResult);
            if (onCalculate) onCalculate(freightResult);
          } else {
            setError(data.error || "Rate not found for this route");
          }
        } catch (err) {
          console.error("Freight calculation error:", err);
          setError("Network error. Please try again.");
        } finally {
          setLoading(false);
        }
      }
    };
    
    calculateFreight();
  }, [weight, origin, destination, bookingMode, onCalculate]);

  if (!origin || !destination || weight === 0) return null;

  return (
    <div className="freight-calculator-card">
      <div className="freight-header">
        <Calculator size={18} />
        <span>Freight Calculation {loading && "(Calculating...)"}</span>
      </div>
      
      {error && (
        <div className="freight-error" style={{color: '#dc2626', fontSize: '12px', padding: '8px', background: '#fee2e2', borderRadius: '8px', marginTop: '10px'}}>
          <AlertCircle size={14} /> {error}
        </div>
      )}
      
      {freight && !loading && (
        <div className="freight-details" style={{marginTop: '12px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px dashed #e2e8f0'}}>
            <span className="route-badge" style={{background: '#0284c7', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '10px'}}>{freight.fromZone} → {freight.toZone}</span>
            <span style={{fontSize: '12px', fontWeight: 'bold'}}>₹{freight.ratePerKg}/kg</span>
          </div>
          <div className="freight-item" style={{display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0'}}>
            <span>Base Freight:</span>
            <strong>₹{Math.round(freight.baseFreight).toLocaleString()}</strong>
          </div>
          <div className="freight-item" style={{display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0'}}>
            <span>Fuel Surcharge (10%):</span>
            <strong>₹{Math.round(freight.fuelSurcharge).toLocaleString()}</strong>
          </div>
          <div className="freight-item" style={{display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0'}}>
            <span>GST (18%):</span>
            <strong>₹{Math.round(freight.gst).toLocaleString()}</strong>
          </div>
          <div className="freight-item total" style={{display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', marginTop: '8px', paddingTop: '8px', borderTop: '2px solid #e2e8f0', color: '#d32f2f'}}>
            <span>Total Freight:</span>
            <strong>₹{Math.round(freight.total).toLocaleString()}</strong>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// 🎨 PROFESSIONAL DOCKET (Sender Left | Receiver Right)
// ============================================
const ProfessionalDocket = ({ data, lrNumber, totalValue, ewayBill, awbNumber, bookingMode, showFreight, isManualLR, manualLRNumber, freightData }) => {
  const barcodeRef = useRef(null);
  
  useEffect(() => {
    const barcodeNumber = isManualLR && manualLRNumber ? manualLRNumber : lrNumber;
    if (barcodeNumber && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, barcodeNumber, {
          format: "CODE128", 
          width: 1.8, 
          height: 40, 
          displayValue: false, 
          margin: 0
        });
      } catch (err) {
        console.error("Barcode error:", err);
      }
    }
  }, [lrNumber, isManualLR, manualLRNumber]);

  const getModeText = () => {
    switch(bookingMode) {
      case 'air': return 'AIR EXPRESS';
      case 'rail': return 'RAIL CARGO';
      case 'express': return 'SPEED POST';
      default: return 'SURFACE TRANSPORT';
    }
  };

  const displayLRNumber = isManualLR && manualLRNumber ? manualLRNumber : lrNumber;

  const safeData = {
    pickup: data?.pickup || { name: "", address: "", pincode: "", contact: "", city: "", state: "", gstin: "" },
    delivery: data?.delivery || { name: "", address: "", pincode: "", contact: "", city: "", state: "", gstin: "" },
    orderDetails: data?.orderDetails || { material: "", weight: 0, boxesCount: 0, hsnCode: "" },
    invoices: data?.invoices || [],
    volWeight: data?.volWeight || 0,
    chargedWeight: data?.chargedWeight || 0
  };

  return (
    <div className="luxury-docket-a4">
      <div className="docket-border-premium"></div>
      
      {/* Header */}
      <div className="docket-header-a4">
        <div className="company-info">
          <img src={logo} alt="FCPL" className="company-logo" />
          <div className="company-details">
            <h1>FAITH CARGO PRIVATE LIMITED</h1>
            <p>ISO 9001:2015 & ISO 14001:2015 CERTIFIED</p>
            <div className="company-address">
              <span>🏢 4/15, Kirti Nagar Industrial Area, New Delhi - 110015</span>
              <span>📞 +91 9818641504 | ✉️ care@faithcargo.com</span>
              <span>🔷 GST: 07AAFCF2947K1ZD | CIN: U60231DL2021PTC384521</span>
            </div>
          </div>
        </div>
        <div className="docket-meta">
          <div className="consignment-badge">CONSIGNMENT NOTE</div>
          <canvas ref={barcodeRef} className="barcode"></canvas>
          <div className="lr-number">{displayLRNumber || "DRAFT"}</div>
          <div className="awb-number">AWB: {awbNumber || "N/A"}</div>
          <div className="date">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
      </div>

      {/* Sender (Left) & Receiver (Right) Side by Side */}
      <div className="parties-section">
        <div className="party-card sender">
          <div className="party-header">
            <div className="party-icon">📤</div>
            <div>
              <h3>CONSIGNOR</h3>
              <p>(Sender)</p>
            </div>
          </div>
          <div className="party-body">
            <h4>{safeData.pickup.name || "____________________"}</h4>
            <p className="address">{safeData.pickup.address || "Address not provided"}</p>
            <div className="party-details">
              <span>📮 {safeData.pickup.pincode || "______"}</span>
              <span>📍 {safeData.pickup.city || "_____"}, {safeData.pickup.state || "_____"}</span>
              <span>📞 {safeData.pickup.contact || "_________"}</span>
              {safeData.pickup.gstin && <span>🔷 GST: {safeData.pickup.gstin}</span>}
            </div>
          </div>
        </div>

        <div className="party-arrow">
          <ArrowRight size={32} />
        </div>

        <div className="party-card receiver">
          <div className="party-header">
            <div className="party-icon">📥</div>
            <div>
              <h3>CONSIGNEE</h3>
              <p>(Receiver)</p>
            </div>
          </div>
          <div className="party-body">
            <h4>{safeData.delivery.name || "____________________"}</h4>
            <p className="address">{safeData.delivery.address || "Address not provided"}</p>
            <div className="party-details">
              <span>📮 {safeData.delivery.pincode || "______"}</span>
              <span>📍 {safeData.delivery.city || "_____"}, {safeData.delivery.state || "_____"}</span>
              <span>📞 {safeData.delivery.contact || "_________"}</span>
              {safeData.delivery.gstin && <span>🔷 GST: {safeData.delivery.gstin}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Shipment Details Table */}
      <div className="shipment-details-table">
        <table className="shipment-table-premium">
          <thead>
            <tr>
              <th width="8%">PKGS</th>
              <th width="32%">DESCRIPTION</th>
              <th width="10%">HSN</th>
              <th width="12%">ACTUAL WT</th>
              <th width="12%">VOL WT</th>
              <th width="12%">CHARGED WT</th>
              <th width="14%">MODE</th>
            </tr>
          </thead>
          <tbody>
            <tr className="main-row">
              <td className="text-center">{safeData.orderDetails.boxesCount || 0}</td>
              <td>
                <strong>{safeData.orderDetails.material || "GENERAL CARGO"}</strong>
                <div className="material-note">Said to contain</div>
              </td>
              <td className="text-center">{safeData.orderDetails.hsnCode || "1234"}</td>
              <td className="text-center">{safeData.orderDetails.weight || 0} kg</td>
              <td className="text-center">{safeData.volWeight} kg</td>
              <td className="text-center"><strong>{safeData.chargedWeight} kg</strong></td>
              <td className="text-center">
                <div className={`mode-tag mode-${bookingMode || 'surface'}`}>
                  {getModeText()}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Invoice & Freight Section */}
      <div className="invoice-freight-section">
        <div className="invoice-details">
          <div className="section-title">📄 INVOICE DETAILS</div>
          <div className="invoice-list">
            {safeData.invoices?.filter(inv => inv.no).map((inv, idx) => (
              <div key={idx} className="invoice-item">
                <span>{inv.no}</span>
                <span>₹{parseFloat(inv.value).toLocaleString()}</span>
              </div>
            ))}
            <div className="invoice-total">
              <span>TOTAL VALUE:</span>
              <strong>₹{totalValue?.toLocaleString() || 0}</strong>
            </div>
            {ewayBill && <div className="eway-bill-info">E-WAY BILL: {ewayBill}</div>}
          </div>
        </div>

        {showFreight && freightData && (
          <div className="freight-details">
            <div className="section-title">💰 FREIGHT DETAILS</div>
            <div className="freight-list">
              <div className="freight-item">
                <span>Base Freight:</span>
                <strong>₹{Math.round(freightData.baseFreight || 0).toLocaleString()}</strong>
              </div>
              <div className="freight-item">
                <span>Fuel Surcharge (10%):</span>
                <strong>₹{Math.round(freightData.fuelSurcharge || 0).toLocaleString()}</strong>
              </div>
              <div className="freight-item">
                <span>GST (18%):</span>
                <strong>₹{Math.round(freightData.gst || 0).toLocaleString()}</strong>
              </div>
              <div className="freight-item">
                <span>Docket Charge:</span>
                <strong>₹{freightData.docketCharge || 100}</strong>
              </div>
              <div className="freight-item">
                <span>FOV Charge:</span>
                <strong>₹{freightData.fovCharge || 75}</strong>
              </div>
              <div className="freight-item total">
                <span>TOTAL PAYABLE:</span>
                <strong className="text-red">₹{Math.round(freightData.total || 0).toLocaleString()}</strong>
              </div>
            </div>
            <div className="rate-slab-info-small">
              Rate: ₹{freightData.ratePerKg}/kg | Route: {freightData.fromZone} → {freightData.toZone}
            </div>
          </div>
        )}
      </div>

      {/* Terms & Signatures */}
      <div className="terms-signatures">
        <div className="terms">
          <h4>TERMS &amp; CONDITIONS</h4>
          <ul>
            <li>Goods carried at Owner's Risk. Insurance recommended.</li>
            <li>Claim within 7 days of delivery. Jurisdiction: Delhi Only.</li>
            <li>Transit liability as per Carriers Act, 1865.</li>
            <li>E-Way Bill mandatory for invoice &gt; ₹50,000.</li>
          </ul>
        </div>
        <div className="signatures">
          <div className="signature-box">
            <div className="sign-line"></div>
            <p>Receiver's Signature</p>
          </div>
          <div className="signature-box">
            <div className="stamp">FOR FAITH CARGO PVT LTD</div>
            <p>Authorized Signatory</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="docket-footer-a4">
        <div className="footer-copies">
          <span>📄 ORIGINAL - CONSIGNOR</span>
          <span>📄 DUPLICATE - CONSIGNEE</span>
          <span>📄 TRIPLICATE - OFFICE COPY</span>
        </div>
        <div className="footer-contact">
          <span>🌐 www.faithcargo.com</span>
          <span>📞 9818641504</span>
          <span>✉️ care@faithcargo.com</span>
        </div>
      </div>
    </div>
  );
};

// ============================================
// 📎 INVOICE UPLOAD COMPONENT
// ============================================
const InvoiceUpload = ({ onUpload }) => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileUpload = (files) => {
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files).map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: (file.size / 1024).toFixed(2),
      type: file.type,
      file: file
    }));
    const updated = [...uploadedFiles, ...newFiles];
    setUploadedFiles(updated);
    if (onUpload) onUpload(updated);
  };

  const removeFile = (id) => {
    const updated = uploadedFiles.filter(f => f.id !== id);
    setUploadedFiles(updated);
    if (onUpload) onUpload(updated);
  };

  return (
    <div className="invoice-upload-container">
      <div 
        className={`upload-area ${isDragging ? 'dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileUpload(e.dataTransfer.files); }}
      >
        <input
          type="file"
          id="invoice-upload"
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => handleFileUpload(e.target.files)}
          style={{ display: 'none' }}
        />
        <label htmlFor="invoice-upload" className="upload-label">
          <Upload size={32} />
          <span>Click or Drag & Drop Invoices</span>
          <small>PDF, JPG, PNG (Max 5MB each)</small>
        </label>
      </div>
      {uploadedFiles.length > 0 && (
        <div className="uploaded-files">
          <h4>Uploaded Invoices ({uploadedFiles.length})</h4>
          {uploadedFiles.map(file => (
            <div key={file.id} className="file-item">
              {file.type && file.type.includes('image') ? <Image size={16} /> : <File size={16} />}
              <span>{file.name}</span>
              <small>{file.size} KB</small>
              <button onClick={() => removeFile(file.id)}><X size={14} /></button>
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
  const [uploadedInvoices, setUploadedInvoices] = useState([]);
  const [freightData, setFreightData] = useState(null);
  
  const [isManualLR, setIsManualLR] = useState(false);
  const [manualLRNumber, setManualLRNumber] = useState("");
  const [showFreightOnDocket, setShowFreightOnDocket] = useState(true);
  
  const [pickup, setPickup] = useState({ name: "", contact: "", address: "", pincode: "", state: "", city: "", gstin: "" });
  const [delivery, setDelivery] = useState({ name: "", contact: "", address: "", pincode: "", state: "", city: "", gstin: "" });
  const [orderDetails, setOrderDetails] = useState({ material: "", weight: "", boxesCount: 0, hsnCode: "1234" });
  const [invoices, setInvoices] = useState([{ id: Date.now(), no: "", value: "" }]);

  const totalInvoiceValue = useMemo(() => 
    invoices.reduce((sum, inv) => sum + (parseFloat(inv.value) || 0), 0), 
  [invoices]);

  const volWeight = useMemo(() => {
    const totalVol = boxes.reduce((acc, b) => {
      const l = parseFloat(b.l) || 0;
      const w = parseFloat(b.w) || 0;
      const h = parseFloat(b.h) || 0;
      return acc + (l * w * h) / 4000;
    }, 0);
    return totalVol.toFixed(2);
  }, [boxes]);

  const chargedWeight = Math.max(parseFloat(orderDetails.weight || 0), parseFloat(volWeight));
  const needsEwayBill = totalInvoiceValue >= 50000;

  const fetchLocation = async (pin, type) => {
    if (pin && pin.length === 6) {
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const data = await res.json();
        if (data && data[0] && data[0].Status === "Success") {
          const po = data[0].PostOffice[0];
          const loc = { state: po.State, city: po.District };
          if (type === "pickup") setPickup(p => ({ ...p, ...loc }));
          else setDelivery(d => ({ ...d, ...loc }));
        }
      } catch (err) { 
        console.error("Pincode API Error:", err); 
      }
    }
  };

  const handleCreateOrder = async () => {
    if (needsEwayBill && !ewayBill) {
      alert("⚠️ E-Way Bill Number mandatory for Invoice Value above ₹50,000");
      return;
    }
    if (!pickup.name || !delivery.name || !orderDetails.weight) {
      alert("Please fill all mandatory fields (Sender, Receiver, Weight)");
      return;
    }
    if (!pickup.pincode || !delivery.pincode) {
      alert("Please enter valid 6-digit pincodes");
      return;
    }
    if (isManualLR && !manualLRNumber) {
      alert("Please enter Manual LR Number");
      return;
    }

    setLoading(true);
    setApiError("");

    const orderData = {
      pickupName: pickup.name,
      pickupAddress: pickup.address,
      pickupPincode: pickup.pincode,
      pickupContact: pickup.contact,
      pickupGstin: pickup.gstin,
      deliveryName: delivery.name,
      deliveryAddress: delivery.address,
      deliveryPincode: delivery.pincode,
      deliveryContact: delivery.contact,
      deliveryGstin: delivery.gstin,
      material: orderDetails.material || "General Cargo",
      hsn: orderDetails.hsnCode,
      boxes: orderDetails.boxesCount,
      weight: parseFloat(chargedWeight),
      actual_weight: parseFloat(orderDetails.weight || 0),
      volumetric_weight: parseFloat(volWeight),
      total_value: totalInvoiceValue,
      eway_bill: needsEwayBill ? ewayBill : "",
      booking_mode: bookingMode,
      freight_base: freightData?.baseFreight || 0,
      freight_gst: freightData?.gst || 0,
      freight_total: freightData?.total || 0,
      is_manual_lr: isManualLR,
      manual_lr_number: isManualLR ? manualLRNumber : null,
      invoices: invoices.filter(inv => inv.no && inv.value).map(inv => ({
        invoice_no: inv.no,
        invoice_value: parseFloat(inv.value)
      }))
    };

    try {
      const response = await fetch("https://faithcargo.onrender.com/api/shipments/create-order/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData)
      });

      const result = await response.json();

      if (result.success) {
        setLrNumber(result.lr_number);
        setAwbNumber(result.awb);
        setShowLR(true);
        
        const recentOrders = JSON.parse(localStorage.getItem('recentOrders') || '[]');
        recentOrders.unshift({
          lr: isManualLR ? manualLRNumber : result.lr_number,
          awb: result.awb,
          date: new Date().toISOString(),
          pickup: pickup.pincode,
          delivery: delivery.pincode,
          weight: chargedWeight,
          mode: bookingMode
        });
        localStorage.setItem('recentOrders', JSON.stringify(recentOrders.slice(0, 10)));
        
        // Refresh shipment list in localStorage for ShipmentDetails page
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
        setApiError(result.error || "Failed to create order");
        alert("Error: " + (result.error || "Could not create order"));
      }
    } catch (error) {
      console.error("API Error:", error);
      setApiError("Network error. Please check your connection.");
      alert("Network error! Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="order-wrapper-premium">
      <aside className="nav-sidebar-premium no-print">
        <div className="logo-brand-premium">
          <img src={logo} alt="Faith Cargo" />
          <div className="status-dot"></div>
        </div>
        <nav className="side-menu-premium">
          <div className="menu-link active"><Plus size={18}/> Create Booking</div>
          <div className="menu-link" onClick={() => window.location.href='/dashboard'}><Navigation size={18}/> Live Tracking</div>
          <div className="menu-link" onClick={() => window.location.href='/shipments'}><FileText size={18}/> All Dockets</div>
          <div className="menu-link"><CreditCard size={18}/> Payments</div>
        </nav>
        <div className="support-card-premium">
          <Award size={24} color="#d32f2f" />
          <p>Premium Support 24/7</p>
          <span>📞 +91 9818641504</span>
        </div>
      </aside>

      <main className="main-content-premium">
        <header className="page-header-premium no-print">
          <div className="header-text">
            <h1>Premium Shipment Booking</h1>
            <p>Create professional consignment with real-time freight calculation</p>
          </div>
          <div className="realtime-stats-premium">
            <div className="stat-card-premium">
              <Gem size={16} />
              <span>Charged: <strong>{chargedWeight} Kg</strong></span>
            </div>
            <div className="stat-card-premium red">
              <ShieldCheck size={16} />
              <span>Value: <strong>₹{totalInvoiceValue.toLocaleString()}</strong></span>
            </div>
          </div>
        </header>

        {apiError && <div className="error-banner-premium"><AlertCircle size={18} /> {apiError}</div>}

        <div className="form-layout-premium no-print">
          <div className="form-column">
            <section className="premium-card">
              <div className="card-top">
                <MapPin size={18} color="#d32f2f" /> 
                <h3>Consignor (Sender) Details</h3>
              </div>
              <div className="card-body">
                <div className="input-row">
                  <div className="input-group">
                    <label>Company / Name *</label>
                    <input value={pickup.name} onChange={e=>setPickup({...pickup, name:e.target.value.toUpperCase()})} placeholder="Enter sender name" />
                  </div>
                  <div className="input-group">
                    <label>Mobile Number *</label>
                    <input type="tel" maxLength={10} value={pickup.contact} onChange={e=>setPickup({...pickup, contact:e.target.value})} placeholder="10 digit mobile" />
                  </div>
                </div>
                <div className="input-group full-width">
                  <label>Full Address *</label>
                  <textarea rows="2" value={pickup.address} onChange={e=>setPickup({...pickup, address:e.target.value})} placeholder="House No, Street, Area, Landmark" />
                </div>
                <div className="input-row">
                  <div className="input-group">
                    <label>Pincode *</label>
                    <input maxLength={6} value={pickup.pincode} onChange={e=>{setPickup({...pickup, pincode:e.target.value}); fetchLocation(e.target.value, 'pickup')}} placeholder="6 digit pincode" />
                  </div>
                  <div className="input-group">
                    <label>City & State</label>
                    <input className="locked-input" value={pickup.city ? `${pickup.city}, ${pickup.state}` : ""} readOnly placeholder="Auto-filled" />
                  </div>
                </div>
                <div className="input-group">
                  <label>GSTIN (Optional)</label>
                  <input value={pickup.gstin} onChange={e=>setPickup({...pickup, gstin:e.target.value.toUpperCase()})} placeholder="15 digit GSTIN" maxLength={15} />
                </div>
              </div>
            </section>
          </div>

          <div className="form-column">
            <section className="premium-card">
              <div className="card-top">
                <Truck size={18} color="#d32f2f" /> 
                <h3>Consignee (Receiver) Details</h3>
              </div>
              <div className="card-body">
                <div className="input-row">
                  <div className="input-group">
                    <label>Receiver Name *</label>
                    <input value={delivery.name} onChange={e=>setDelivery({...delivery, name:e.target.value.toUpperCase()})} placeholder="Enter receiver name" />
                  </div>
                  <div className="input-group">
                    <label>Mobile Number *</label>
                    <input type="tel" maxLength={10} value={delivery.contact} onChange={e=>setDelivery({...delivery, contact:e.target.value})} placeholder="10 digit mobile" />
                  </div>
                </div>
                <div className="input-group full-width">
                  <label>Full Address *</label>
                  <textarea rows="2" value={delivery.address} onChange={e=>setDelivery({...delivery, address:e.target.value})} placeholder="House No, Street, Area, Landmark" />
                </div>
                <div className="input-row">
                  <div className="input-group">
                    <label>Pincode *</label>
                    <input maxLength={6} value={delivery.pincode} onChange={e=>{setDelivery({...delivery, pincode:e.target.value}); fetchLocation(e.target.value, 'delivery')}} placeholder="6 digit pincode" />
                  </div>
                  <div className="input-group">
                    <label>City & State</label>
                    <input className="locked-input" value={delivery.city ? `${delivery.city}, ${delivery.state}` : ""} readOnly placeholder="Auto-filled" />
                  </div>
                </div>
                <div className="input-group">
                  <label>GSTIN (Optional)</label>
                  <input value={delivery.gstin} onChange={e=>setDelivery({...delivery, gstin:e.target.value.toUpperCase()})} placeholder="15 digit GSTIN" maxLength={15} />
                </div>
              </div>
            </section>

            <section className="premium-card">
              <div className="card-top">
                <Package size={18} color="#d32f2f" /> 
                <h3>Shipment Details</h3>
              </div>
              <div className="card-body">
                <div className="input-group full-width">
                  <label>Material Description</label>
                  <input placeholder="e.g., Industrial Tools, Textile, Electronics" onChange={e=>setOrderDetails({...orderDetails, material:e.target.value.toUpperCase()})} />
                </div>
                
                <div className="input-group full-width">
                  <label>HSN Code</label>
                  <input placeholder="HSN Code (e.g., 1234, 8471)" value={orderDetails.hsnCode} onChange={e=>setOrderDetails({...orderDetails, hsnCode:e.target.value})} />
                </div>

                <div className="booking-mode-selector">
                  <label>Booking Mode *</label>
                  <div className="mode-buttons">
                    <button type="button" className={`mode-btn ${bookingMode === 'surface' ? 'active' : ''}`} onClick={() => setBookingMode('surface')}>
                      <Truck size={18} /> Surface
                    </button>
                    <button type="button" className={`mode-btn ${bookingMode === 'air' ? 'active' : ''}`} onClick={() => setBookingMode('air')}>
                      <Plane size={18} /> Air
                    </button>
                    <button type="button" className={`mode-btn ${bookingMode === 'rail' ? 'active' : ''}`} onClick={() => setBookingMode('rail')}>
                      <Train size={18} /> Rail
                    </button>
                    <button type="button" className={`mode-btn ${bookingMode === 'express' ? 'active' : ''}`} onClick={() => setBookingMode('express')}>
                      <TrendingUp size={18} /> Express
                    </button>
                  </div>
                </div>

                <div className="input-row">
                  <div className="input-group">
                    <label>Actual Weight (Kg) *</label>
                    <input type="number" step="0.1" value={orderDetails.weight} onChange={e=>setOrderDetails({...orderDetails, weight:e.target.value})} placeholder="Enter weight" />
                  </div>
                  <div className="input-group">
                    <label>No. of Packages *</label>
                    <input type="number" value={orderDetails.boxesCount} onChange={e=>{
                      const n = parseInt(e.target.value) || 0;
                      setOrderDetails({...orderDetails, boxesCount:n});
                      setBoxes(Array.from({length:n}, (_,i)=>({id:i+1, l:"", w:"", h:""})));
                    }} placeholder="Number of boxes" />
                  </div>
                </div>

                {boxes.length > 0 && (
                  <div className="dimension-calculator">
                    <div className="dimension-header">
                      <span>📦 Dimensions (CM) - Volumetric ÷ 4000</span>
                      <span className="vol-badge">Vol Wt: {volWeight} Kg</span>
                    </div>
                    <div className="dimension-grid">
                      {boxes.map((box, i) => (
                        <div key={i} className="dimension-row">
                          <span className="box-num">#{i+1}</span>
                          <input placeholder="Length (cm)" type="number" step="0.1" onChange={e=>{let b=[...boxes]; b[i].l=e.target.value; setBoxes(b)}} />
                          <input placeholder="Width (cm)" type="number" step="0.1" onChange={e=>{let b=[...boxes]; b[i].w=e.target.value; setBoxes(b)}} />
                          <input placeholder="Height (cm)" type="number" step="0.1" onChange={e=>{let b=[...boxes]; b[i].h=e.target.value; setBoxes(b)}} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="premium-card">
              <div className="card-top justify-between">
                <div className="flex-center"><FileText size={18} color="#d32f2f" /> <h3>Invoice & Documentation</h3></div>
                <button className="mini-add-btn" onClick={() => setInvoices([...invoices, { id: Date.now(), no: "", value: "" }])}><Plus size={14}/></button>
              </div>
              <div className="card-body">
                {invoices.map((inv) => (
                  <div key={inv.id} className="dynamic-inv-row">
                    <input placeholder="Invoice Number" value={inv.no} onChange={e=>{
                      setInvoices(invoices.map(i=>i.id===inv.id ? {...i, no:e.target.value.toUpperCase()} : i))
                    }} />
                    <input type="number" placeholder="Value (₹)" value={inv.value} onChange={e=>{
                      setInvoices(invoices.map(i=>i.id===inv.id ? {...i, value:e.target.value} : i))
                    }} />
                    <button className="row-del-btn" onClick={() => setInvoices(invoices.filter(i=>i.id!==inv.id))}><Trash2 size={14}/></button>
                  </div>
                ))}

                <InvoiceUpload onUpload={setUploadedInvoices} />

                {needsEwayBill && (
                  <div className="eway-critical-box">
                    <div className="alert-header"><AlertCircle size={18} /> <span>E-WAY BILL MANDATORY</span></div>
                    <input className="eway-main-input" value={ewayBill} onChange={e=>setEwayBill(e.target.value.toUpperCase())} placeholder="ENTER 12 DIGIT E-WAY BILL NO." maxLength={12} />
                  </div>
                )}

                <RealTimeFreightCalculator 
                  weight={chargedWeight}
                  origin={pickup.pincode}
                  destination={delivery.pincode}
                  bookingMode={bookingMode}
                  onCalculate={setFreightData}
                />

                <div className="lr-settings-section">
                  <div className="setting-toggle">
                    <label>Manual LR Number</label>
                    <button type="button" className={`toggle-btn ${isManualLR ? 'active' : ''}`} onClick={() => setIsManualLR(!isManualLR)}>
                      {isManualLR ? <ToggleRight size={24} color="#d32f2f" /> : <ToggleLeft size={24} color="#64748b" />}
                      {isManualLR ? 'Manual Mode ON' : 'Auto Mode'}
                    </button>
                  </div>
                  
                  {isManualLR && (
                    <div className="manual-lr-input">
                      <input 
                        type="text" 
                        placeholder="Enter Manual LR Number (e.g., FCPL9999)" 
                        value={manualLRNumber}
                        onChange={e => setManualLRNumber(e.target.value.toUpperCase())}
                        className="manual-lr-field"
                      />
                    </div>
                  )}

                  <div className="setting-toggle">
                    <label>Show Freight on Docket</label>
                    <button type="button" className={`toggle-btn ${showFreightOnDocket ? 'active' : ''}`} onClick={() => setShowFreightOnDocket(!showFreightOnDocket)}>
                      {showFreightOnDocket ? <ToggleRight size={24} color="#d32f2f" /> : <ToggleLeft size={24} color="#64748b" />}
                      {showFreightOnDocket ? 'Show Freight' : 'Hide Freight'}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <button className={`final-submit-btn-premium ${loading ? 'loading' : ''}`} onClick={handleCreateOrder} disabled={loading}>
              {loading ? <><Clock size={20} /> Generating LR...</> : <><Crown size={20} /> Generate Premium Consignment Note</>}
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {showLR && (
          <div className="modal-overlay-premium no-print">
            <div className="modal-content-premium">
              <div className="success-icon"><CheckCircle size={60} color="#10b981" /></div>
              <h2>Consignment Generated Successfully!</h2>
              <div className="lr-premium-display">{isManualLR ? manualLRNumber : lrNumber}</div>
              <div className="awb-premium-display">AWB: {awbNumber}</div>
              
              <div className="docket-preview">
                <ProfessionalDocket 
                  data={{pickup, delivery, orderDetails, invoices, chargedWeight, volWeight}}
                  lrNumber={lrNumber}
                  totalValue={totalInvoiceValue}
                  ewayBill={ewayBill}
                  awbNumber={awbNumber}
                  bookingMode={bookingMode}
                  showFreight={showFreightOnDocket}
                  isManualLR={isManualLR}
                  manualLRNumber={manualLRNumber}
                  freightData={freightData}
                />
              </div>

              <div className="modal-actions-premium">
                <button className="action-print" onClick={() => window.print()}><Printer size={18}/> Print Docket</button>
                <button className="action-label" onClick={() => {
                  const printWindow = window.open('', '_blank');
                  printWindow.document.write(`
                    <html><head><title>Label - ${isManualLR ? manualLRNumber : lrNumber}</title>
                    <style>
                      body { font-family: Arial; padding: 20px; }
                      .label { width: 4in; border: 2px solid #000; padding: 10px; margin: 0 auto; }
                      .label h2 { text-align: center; margin: 0 0 10px; }
                      .lr { font-size: 24px; font-weight: bold; text-align: center; margin: 10px 0; }
                      .address { font-size: 12px; margin: 5px 0; }
                    </style>
                    </head>
                    <body>
                      <div class="label">
                        <h2>FAITH CARGO PVT LTD</h2>
                        <div class="lr">LR: ${isManualLR ? manualLRNumber : lrNumber}</div>
                        <div class="address">From: ${pickup.name} - ${pickup.pincode}</div>
                        <div class="address">To: ${delivery.name} - ${delivery.pincode}</div>
                        <div class="address">Weight: ${chargedWeight} Kg | Mode: ${bookingMode.toUpperCase()}</div>
                      </div>
                    </body>
                    </html>
                  `);
                  printWindow.print();
                  printWindow.close();
                }}><Barcode size={18}/> Print Label</button>
                <button className="action-view" onClick={() => window.location.href='/shipments'}><Eye size={18}/> View All Shipments</button>
                <button className="action-new" onClick={() => window.location.reload()}><Plus size={18}/> New Booking</button>
              </div>
            </div>
          </div>
        )}

        <div className="print-only">
          <ProfessionalDocket 
            data={{pickup, delivery, orderDetails, invoices, chargedWeight, volWeight}}
            lrNumber={lrNumber}
            totalValue={totalInvoiceValue}
            ewayBill={ewayBill}
            awbNumber={awbNumber}
            bookingMode={bookingMode}
            showFreight={showFreightOnDocket}
            isManualLR={isManualLR}
            manualLRNumber={manualLRNumber}
            freightData={freightData}
          />
        </div>
      </main>
    </div>
  );
}