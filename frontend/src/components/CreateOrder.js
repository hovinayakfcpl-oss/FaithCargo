import React, { useState, useMemo, useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { 
  Truck, MapPin, Package, FileText, Plus, Trash2,
  Calculator, CheckCircle, Printer, ChevronRight, AlertCircle, 
  ShieldCheck, Box, Info, Navigation, CreditCard, Upload, Phone,
  Settings, User, LogOut, Search, RefreshCw, Layers
} from "lucide-react";
import logo from "../assets/logo.png";
import "./CreateOrder.css";

// --- PROFESSIONAL DOCKET COMPONENT (OPTIMIZED FOR A4 PRINT) ---
const ShipmentDocket = ({ data, lrNumber, totalValue, ewayBill, billing, showFreight, copyType }) => {
  const barcodeRef = useRef(null);
  
  useEffect(() => {
    if (lrNumber && barcodeRef.current) {
      JsBarcode(barcodeRef.current, lrNumber, {
        format: "CODE128", 
        width: 1.5, 
        height: 35, 
        displayValue: false, 
        margin: 0,
        lineColor: "#000"
      });
    }
  }, [lrNumber]);

  return (
    <div className="docket-container">
      {/* Top Banner for Copy Identification */}
      <div className={`copy-ribbon ${copyType.toLowerCase()}`}>
        <span>{copyType} COPY</span>
      </div>
      
      <div className="docket-watermark">FAITH CARGO</div>
      
      <div className="docket-header">
        <div className="brand-block">
          <img src={logo} alt="FCPL Logo" className="docket-main-logo" />
          <div className="brand-text">
            <h1>FAITH CARGO PVT LTD</h1>
            <p className="iso-tag">AN ISO 9001:2015 CERTIFIED LOGISTICS COMPANY</p>
            <div className="reg-details">
              <span><strong>GSTIN:</strong> 07AAFCF2947K1ZD</span> | <span><strong>CIN:</strong> U60231DL2021PTC384521</span>
            </div>
          </div>
        </div>

        <div className="lr-meta-block">
          <div className="lr-title-box">CONSIGNMENT NOTE</div>
          <div className="barcode-wrapper">
             <canvas ref={barcodeRef}></canvas>
             <p className="lr-id-text">{lrNumber}</p>
          </div>
          <div className="date-loc-row">
            <span>Date: <strong>{new Date().toLocaleDateString('en-IN')}</strong></span>
            <span>Origin: <strong>DELHI</strong></span>
          </div>
        </div>
      </div>

      <div className="office-address-strip">
        <strong>H.O:</strong> 4/15, Kirti Nagar Industrial Area, New Delhi-110015 | 
        <strong> Helpline:</strong> +91 9818641504 | 
        <strong> Email:</strong> info@faithcargo.com
      </div>

      <div className="party-details-grid">
        <div className="party-box consignor">
          <div className="party-label">CONSIGNOR (SENDER)</div>
          <div className="party-info">
            <h3>{data.pickup.name || "_________________________________"}</h3>
            <p className="address-area">{data.pickup.address || "No address provided"}</p>
            <div className="party-sub-details">
              <p><strong>GST:</strong> {data.pickup.gst || "URD"}</p>
              <p><strong>City:</strong> {data.pickup.city}, {data.pickup.state} - {data.pickup.pincode}</p>
              <p><strong>Contact:</strong> +91 {data.pickup.contact || "XXXXXXXXXX"}</p>
            </div>
          </div>
        </div>

        <div className="party-box consignee">
          <div className="party-label">CONSIGNEE (RECEIVER)</div>
          <div className="party-info">
            <h3>{data.delivery.name || "_________________________________"}</h3>
            <p className="address-area">{data.delivery.address || "No address provided"}</p>
            <div className="party-sub-details">
              <p><strong>GST:</strong> {data.delivery.gst || "URD"}</p>
              <p><strong>City:</strong> {data.delivery.city}, {data.delivery.state} - {data.delivery.pincode}</p>
              <p><strong>Contact:</strong> +91 {data.delivery.contact || "XXXXXXXXXX"}</p>
            </div>
          </div>
        </div>
      </div>

      <table className="docket-item-table">
        <thead>
          <tr>
            <th>PKGS</th>
            <th>CONTENT DESCRIPTION (SAID TO CONTAIN)</th>
            <th>ACTUAL WT</th>
            <th>CHARGED WT</th>
            <th>INVOICE / E-WAY BILL</th>
          </tr>
        </thead>
        <tbody>
          <tr className="data-row">
            <td className="qty-cell">{data.orderDetails.boxesCount}</td>
            <td className="desc-cell">
              <span className="material-name">{data.orderDetails.material || "GENERAL MERCHANDISE"}</span>
              <div className="extra-info">
                <span>Method: SURFACE</span> | <span>Risk: OWNER'S RISK</span>
              </div>
            </td>
            <td className="wt-cell">{data.orderDetails.weight} Kg</td>
            <td className="wt-cell highlighted">{data.chargedWeight} Kg</td>
            <td className="bill-cell">
               {data.invoices.map((inv, idx) => (
                 <div key={idx}>Inv: {inv.no} (₹{inv.value})</div>
               ))}
               {ewayBill && <div className="ewb-tag">EWB: {ewayBill}</div>}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="bottom-meta-grid">
        <div className="terms-column">
          <h5>TERMS & CONDITIONS:</h5>
          <ul>
            <li>Goods carried at owner's risk. No liability for leakage/breakage.</li>
            <li>Subject to Delhi Jurisdiction. Claims within 7 days.</li>
            <li><strong>Customer Care: 9818641504</strong></li>
          </ul>
        </div>
        
        <div className="billing-column">
          <div className="bill-row">
             <span>Freight:</span>
             <strong>{showFreight ? `₹${billing.total}` : "AS PER AGMT / TO-PAY"}</strong>
          </div>
          <div className="bill-row highlight">
             <span>Payment Mode:</span>
             <strong>CREDIT / B2B</strong>
          </div>
        </div>

        <div className="auth-column">
           <div className="signature-space consignor-sig">
              <div className="sig-line"></div>
              <span>Customer Signature</span>
           </div>
           <div className="signature-space office-stamp">
              <p className="stamp-text">FOR FAITH CARGO PVT LTD</p>
              <div className="stamp-box">AUTH SIGNATORY</div>
           </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APPLICATION COMPONENT ---
export default function CreateOrder() {
  // Application State
  const [lrSequence, setLrSequence] = useState(1); // Starting from 1
  const [boxes, setBoxes] = useState([]);
  const [showLR, setShowLR] = useState(false);
  const [lrNumber, setLrNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [ewayBill, setEwayBill] = useState("");
  const [showFreight, setShowFreight] = useState(true);
  
  // Form States
  const [pickup, setPickup] = useState({ name: "", contact: "", address: "", pincode: "", state: "", city: "", gst: "" });
  const [delivery, setDelivery] = useState({ name: "", contact: "", address: "", pincode: "", state: "", city: "", gst: "" });
  const [orderDetails, setOrderDetails] = useState({ material: "", weight: "", boxesCount: 0 });
  const [invoices, setInvoices] = useState([{ id: Date.now(), no: "", value: "", file: null }]);

  // Calculations
  const volWeight = useMemo(() => {
    const totalVolume = boxes.reduce((acc, b) => 
      acc + (parseFloat(b.l||0) * parseFloat(b.w||0) * parseFloat(b.h||0)), 0);
    return (totalVolume / 4000).toFixed(2); 
  }, [boxes]);

  const chargedWeight = Math.max(parseFloat(orderDetails.weight || 0), parseFloat(volWeight));

  const billingSummary = useMemo(() => {
    const rate = 12.5; // Base Rate
    const base = chargedWeight * rate;
    const gst = base * 0.18;
    return {
      base: base.toFixed(2),
      gst: gst.toFixed(2),
      total: (base + gst).toFixed(2)
    };
  }, [chargedWeight]);

  const totalInvoiceValue = useMemo(() => 
    invoices.reduce((sum, inv) => sum + (parseFloat(inv.value) || 0), 0), 
  [invoices]);

  const needsEwayBill = totalInvoiceValue >= 50000;

  // Handlers
  const fetchLocation = async (pin, type) => {
    if (pin.length === 6) {
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const data = await res.json();
        if (data[0].Status === "Success") {
          const po = data[0].PostOffice[0];
          const loc = { state: po.State, city: po.District };
          if (type === "pickup") setPickup(p => ({ ...p, ...loc }));
          else setDelivery(d => ({ ...d, ...loc }));
        }
      } catch (err) { console.error("Pincode API Error"); }
    }
  };

  const handleCreateOrder = () => {
    if (!pickup.name || !delivery.name || !orderDetails.weight) {
      alert("Please fill mandatory fields (Consignor, Consignee, Weight)");
      return;
    }
    if (needsEwayBill && !ewayBill) {
      alert("E-Way Bill is required for value > ₹50,000");
      return;
    }

    setLoading(true);
    // Simulating API Save
    setTimeout(() => {
      const formattedLR = `FCPL${String(lrSequence).padStart(4, '0')}`;
      setLrNumber(formattedLR);
      setLrSequence(prev => prev + 1); // Increment for next entry
      setShowLR(true);
      setLoading(false);
    }, 1500);
  };

  const resetForm = () => {
    window.location.reload(); // Simple reset
  };

  return (
    <div className="app-container">
      {/* SIDEBAR NAVIGATION */}
      <aside className="app-sidebar no-print">
        <div className="brand-identity">
          <img src={logo} alt="FCPL" />
          <div className="brand-status">
            <span className="online-indicator"></span>
            <span>SYSTEM LIVE</span>
          </div>
        </div>

        <nav className="nav-group">
          <p className="nav-heading">MAIN MENU</p>
          <div className="nav-item active"><Plus size={18}/> New Booking</div>
          <div className="nav-item"><Layers size={18}/> Bulk Upload</div>
          <div className="nav-item"><Navigation size={18}/> Track Vehicle</div>
          <div className="nav-item"><FileText size={18}/> Reports</div>
          
          <p className="nav-heading">ACCOUNTS</p>
          <div className="nav-item"><CreditCard size={18}/> Billing</div>
          <div className="nav-item"><User size={18}/> Clients</div>
          <div className="nav-item"><Settings size={18}/> Settings</div>
        </nav>

        <div className="sidebar-footer">
          <div className="support-box">
             <Phone size={14} />
             <div>
               <p>24/7 Support</p>
               <strong>9818641504</strong>
             </div>
          </div>
          <button className="logout-btn"><LogOut size={16}/> Exit</button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="app-main">
        <header className="main-header no-print">
          <div className="header-info">
            <h1>Booking Console <small>v5.2</small></h1>
            <p>Faith Cargo Logistics Management System</p>
          </div>
          <div className="header-actions">
             <div className="search-bar">
                <Search size={16} />
                <input type="text" placeholder="Search LR or Invoice..." />
             </div>
             <div className="user-profile">
                <div className="profile-img">AD</div>
                <span>Admin</span>
             </div>
          </div>
        </header>

        <div className="dashboard-content no-print">
          <div className="form-grid">
            {/* COLUMN 1: ADDRESSES */}
            <div className="form-column">
              {/* CONSIGNOR CARD */}
              <div className="content-card">
                <div className="card-header consignor-border">
                   <div className="header-icon"><MapPin size={20}/></div>
                   <h3>Consignor (Sender Details)</h3>
                </div>
                <div className="card-body">
                  <div className="input-row">
                    <div className="input-wrap">
                      <label>Sender Name / Company *</label>
                      <input type="text" value={pickup.name} onChange={e=>setPickup({...pickup, name:e.target.value.toUpperCase()})} placeholder="Enter Business Name" />
                    </div>
                    <div className="input-wrap">
                      <label>GST Number</label>
                      <input type="text" value={pickup.gst} onChange={e=>setPickup({...pickup, gst:e.target.value.toUpperCase()})} placeholder="Optional" />
                    </div>
                  </div>
                  <div className="input-row">
                    <div className="input-wrap">
                      <label>Contact Mobile *</label>
                      <input type="tel" value={pickup.contact} onChange={e=>setPickup({...pickup, contact:e.target.value})} maxLength={10} placeholder="10 Digit Number" />
                    </div>
                    <div className="input-wrap">
                      <label>Pickup Pincode *</label>
                      <input type="text" value={pickup.pincode} onChange={e=>{setPickup({...pickup, pincode:e.target.value}); fetchLocation(e.target.value, 'pickup')}} maxLength={6} placeholder="6 Digit" />
                    </div>
                  </div>
                  <div className="input-wrap">
                    <label>Pickup Full Address *</label>
                    <textarea rows="2" value={pickup.address} onChange={e=>setPickup({...pickup, address:e.target.value})} placeholder="Building, Street, Landmark..." />
                  </div>
                  <div className="location-pill">
                    {pickup.city ? `${pickup.city}, ${pickup.state}` : "Waiting for pincode..."}
                  </div>
                </div>
              </div>

              {/* CONSIGNEE CARD */}
              <div className="content-card">
                <div className="card-header consignee-border">
                   <div className="header-icon"><Truck size={20}/></div>
                   <h3>Consignee (Receiver Details)</h3>
                </div>
                <div className="card-body">
                   <div className="input-row">
                    <div className="input-wrap">
                      <label>Receiver Name / Company *</label>
                      <input type="text" value={delivery.name} onChange={e=>setDelivery({...delivery, name:e.target.value.toUpperCase()})} placeholder="Enter Receiver Name" />
                    </div>
                    <div className="input-wrap">
                      <label>Receiver Mobile *</label>
                      <input type="tel" value={delivery.contact} onChange={e=>setDelivery({...delivery, contact:e.target.value})} maxLength={10} />
                    </div>
                  </div>
                  <div className="input-wrap">
                    <label>Delivery Address *</label>
                    <textarea rows="2" value={delivery.address} onChange={e=>setDelivery({...delivery, address:e.target.value})} />
                  </div>
                  <div className="input-row">
                    <div className="input-wrap">
                      <label>Delivery Pincode</label>
                      <input type="text" value={delivery.pincode} onChange={e=>{setDelivery({...delivery, pincode:e.target.value}); fetchLocation(e.target.value, 'delivery')}} maxLength={6} />
                    </div>
                    <div className="input-wrap">
                      <label>City & State</label>
                      <input className="readonly-input" value={delivery.city ? `${delivery.city}, ${delivery.state}` : ""} readOnly />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMN 2: SHIPMENT & BILLING */}
            <div className="form-column">
               {/* GOODS DETAIL CARD */}
               <div className="content-card">
                <div className="card-header">
                   <div className="header-icon"><Package size={20}/></div>
                   <h3>Shipment Content & Volumetric</h3>
                </div>
                <div className="card-body">
                  <div className="input-wrap">
                    <label>Nature of Goods (Material)</label>
                    <input type="text" placeholder="e.g. TEXTILE, AUTO PARTS" onChange={e=>setOrderDetails({...orderDetails, material:e.target.value.toUpperCase()})} />
                  </div>
                  <div className="input-row">
                    <div className="input-wrap">
                      <label>Actual Weight (Kg) *</label>
                      <input type="number" onChange={e=>setOrderDetails({...orderDetails, weight:e.target.value})} />
                    </div>
                    <div className="input-wrap">
                      <label>No. of Packages *</label>
                      <input type="number" onChange={e=>{
                        const n = parseInt(e.target.value)||0;
                        setOrderDetails({...orderDetails, boxesCount:n});
                        setBoxes(Array.from({length:n}, (_,i)=>({id:i+1, l:"", w:"", h:""})));
                      }} />
                    </div>
                  </div>

                  {boxes.length > 0 && (
                    <div className="dimension-section">
                       <div className="dim-head">
                          <span>Box Dimensions (Inch)</span>
                          <span className="vol-result">Vol: {volWeight} Kg</span>
                       </div>
                       <div className="dim-scroll-box">
                         {boxes.map((box, i) => (
                           <div key={i} className="dim-row">
                             <span className="dim-index">#{i+1}</span>
                             <input placeholder="L" type="number" onChange={e=>{let b=[...boxes]; b[i].l=e.target.value; setBoxes(b)}} />
                             <input placeholder="W" type="number" onChange={e=>{let b=[...boxes]; b[i].w=e.target.value; setBoxes(b)}} />
                             <input placeholder="H" type="number" onChange={e=>{let b=[...boxes]; b[i].h=e.target.value; setBoxes(b)}} />
                           </div>
                         ))}
                       </div>
                    </div>
                  )}
                </div>
               </div>

               {/* BILLING CARD */}
               <div className="content-card">
                 <div className="card-header justify-between">
                    <div className="flex items-center gap-2">
                       <div className="header-icon"><Calculator size={20}/></div>
                       <h3>Billing & Invoices</h3>
                    </div>
                    <button className="add-inv-btn" onClick={() => setInvoices([...invoices, { id: Date.now(), no: "", value: "", file: null }])}><Plus size={14}/></button>
                 </div>
                 <div className="card-body">
                   <div className="invoice-list">
                     {invoices.map((inv) => (
                       <div key={inv.id} className="inv-item">
                         <input placeholder="Inv No" onChange={e=>setInvoices(invoices.map(i=>i.id===inv.id?{...i, no:e.target.value.toUpperCase()}:i))} />
                         <input type="number" placeholder="Value ₹" onChange={e=>setInvoices(invoices.map(i=>i.id===inv.id?{...i, value:e.target.value}:i))} />
                         <button className="del-btn" onClick={() => setInvoices(invoices.filter(i=>i.id!==inv.id))}><Trash2 size={14}/></button>
                       </div>
                     ))}
                   </div>

                   <div className="toggle-box">
                      <span>Show Freight on Docket?</span>
                      <button className={`switch ${showFreight ? 'on' : ''}`} onClick={() => setShowFreight(!showFreight)}>
                        {showFreight ? "YES" : "NO"}
                      </button>
                   </div>

                   {needsEwayBill && (
                     <div className="eway-alert">
                       <div className="alert-top"><AlertCircle size={16}/> <span>E-WAY BILL REQUIRED</span></div>
                       <input value={ewayBill} onChange={e=>setEwayBill(e.target.value.toUpperCase())} placeholder="12 DIGIT EWB NO." maxLength={12} />
                     </div>
                   )}

                   <div className="billing-summary">
                      <div className="summary-row"><span>Charged Weight:</span> <strong>{chargedWeight} Kg</strong></div>
                      <div className="summary-row total"><span>Est. Total:</span> <strong>₹{billingSummary.total}</strong></div>
                   </div>
                 </div>
               </div>

               <button className={`submit-button ${loading ? 'spinning' : ''}`} onClick={handleCreateOrder} disabled={loading}>
                 {loading ? <RefreshCw className="animate-spin" /> : "Generate Consignment Note (FCPL)"}
               </button>
            </div>
          </div>
        </div>

        {/* POST-GENERATION MODAL */}
        {showLR && (
          <div className="modal-backdrop">
            <div className="success-modal">
              <div className="success-icon"><CheckCircle size={50} /></div>
              <h2>DOCKET GENERATED SUCCESS</h2>
              <p className="lr-display">{lrNumber}</p>
              <div className="modal-btns">
                <button className="btn-print" onClick={() => window.print()}><Printer size={18}/> PRINT COPIES</button>
                <button className="btn-reset" onClick={resetForm}>NEW BOOKING</button>
              </div>
            </div>
          </div>
        )}

        {/* HIDDEN PRINT ENGINE */}
        <div className="print-area">
          {["CONSIGNOR", "CONSIGNEE", "OFFICE"].map((copy) => (
            <React.Fragment key={copy}>
              <ShipmentDocket 
                copyType={copy}
                showFreight={showFreight}
                billing={billingSummary}
                data={{pickup, delivery, orderDetails, invoices, chargedWeight}} 
                lrNumber={lrNumber} 
                totalValue={totalInvoiceValue} 
                ewayBill={ewayBill} 
              />
              <div className="page-break"></div>
            </React.Fragment>
          ))}
        </div>
      </main>
    </div>
  );
}