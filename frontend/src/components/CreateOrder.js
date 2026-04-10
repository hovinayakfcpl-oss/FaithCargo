import React, { useState, useMemo, useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { 
  Truck, MapPin, Package, FileText, Plus, Trash2,
  Calculator, CheckCircle, Printer, ChevronRight, AlertCircle, 
  ShieldCheck, Box, Info, Navigation, CreditCard, Upload, IndianRupee
} from "lucide-react";
import logo from "../assets/logo.png";
import "./CreateOrder.css";

// --- PROFESSIONAL DOCKET COMPONENT (FOR PRINT & MODAL PREVIEW ONLY) ---
const ShipmentDocket = ({ data, lrNumber, totalValue, ewayBill }) => {
  const barcodeRef = useRef(null);
  
  useEffect(() => {
    if (lrNumber && barcodeRef.current) {
      JsBarcode(barcodeRef.current, lrNumber, {
        format: "CODE128", width: 2, height: 40, displayValue: false, margin: 0
      });
    }
  }, [lrNumber]);

  return (
    <div className="docket-container">
      <div className="docket-watermark">FAITH CARGO</div>
      
      <div className="docket-header">
        <div className="docket-brand-section">
          <div className="docket-logo-box">
             <img src={logo} alt="FCPL" className="docket-logo-img" />
             <div className="docket-brand-name">
                <h2>FAITH CARGO PVT LTD</h2>
                <p className="docket-tagline">AN ISO 9001:2015 CERTIFIED LOGISTICS COMPANY</p>
             </div>
          </div>
          <div className="docket-company-details">
            <p><strong>Regd. Office:</strong> 4/15, Kirti Nagar Industrial Area, New Delhi - 110015</p>
            <p><strong>GSTIN:</strong> 07AAFCF2947K1ZD | <strong>CIN:</strong> U60231DL2021PTC384521</p>
            <p><strong>Customer Care:</strong> +91 9818641504 | <strong>Web:</strong> www.faithcargo.com</p>
          </div>
        </div>
        
        <div className="docket-lr-meta">
          <div className="lr-header-box">CONSIGNMENT NOTE</div>
          <div className="barcode-area"><canvas ref={barcodeRef}></canvas></div>
          <div className="lr-number-display">{lrNumber || "DRAFT COPY"}</div>
          <div className="lr-date-row">DATE: <strong>{new Date().toLocaleDateString('en-IN')}</strong></div>
        </div>
      </div>

      <div className="docket-address-grid">
        <div className="address-box">
          <div className="box-label">CONSIGNOR (SENDER)</div>
          <div className="address-content">
            <h3>{data.pickup.name || "__________________________"}</h3>
            <p className="addr-text">{data.pickup.address || "Address details not provided"}</p>
            <p><strong>City/State:</strong> {data.pickup.city}, {data.pickup.state} - {data.pickup.pincode}</p>
            <p className="contact-line"><strong>Mobile:</strong> +91 {data.pickup.contact}</p>
          </div>
        </div>
        <div className="address-box">
          <div className="box-label">CONSIGNEE (RECEIVER)</div>
          <div className="address-content">
            <h3>{data.delivery.name || "__________________________"}</h3>
            <p className="addr-text">{data.delivery.address || "Address details not provided"}</p>
            <p><strong>City/State:</strong> {data.delivery.city}, {data.delivery.state} - {data.delivery.pincode}</p>
            <p className="contact-line"><strong>Mobile:</strong> +91 {data.delivery.contact}</p>
          </div>
        </div>
      </div>

      <table className="docket-main-table">
        <thead>
          <tr>
            <th width="10%">PKGS</th>
            <th width="40%">DESCRIPTION OF GOODS (SAID TO CONTAIN)</th>
            <th width="15%">ACTUAL WT</th>
            <th width="15%">CHARGED WT</th>
            <th width="20%">INVOICE & E-WAY BILL</th>
          </tr>
        </thead>
        <tbody>
          <tr className="main-row">
            <td className="text-center font-bold">{data.orderDetails.boxesCount}</td>
            <td className="desc-cell">
              <span className="material-bold">{data.orderDetails.material || "GENERAL CARGO"}</span>
              <div className="dimension-summary">
                  Method: Surface Logistics | Risk: Owner's Risk
              </div>
            </td>
            <td className="text-center">{data.orderDetails.weight} Kg</td>
            <td className="text-center font-bold">{data.chargedWeight} Kg</td>
            <td className="inv-cell">
               <div>INV: {data.invoices[0]?.no || "N/A"}</div>
               <div>VAL: ₹{totalValue}</div>
               {ewayBill && <div className="eway-print-tag">EWB: {ewayBill}</div>}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="docket-billing-details">
         <div className="billing-grid">
            <div className="billing-item"><span>FREIGHT:</span> <strong>As Per Agreement</strong></div>
            <div className="billing-item"><span>GST PAYABLE BY:</span> <strong>CONSIGNOR</strong></div>
            <div className="billing-item"><span>BOOKING BRANCH:</span> <strong>NEW DELHI (HQ)</strong></div>
            <div className="billing-item"><span>DELIVERY TYPE:</span> <strong>DOOR DELIVERY</strong></div>
         </div>
      </div>

      <div className="docket-footer-grid">
        <div className="footer-notes">
          <h4>IMPORTANT TERMS:</h4>
          <ul>
            <li>Goods are carried at Owner's risk. Insurance to be arranged by Sender.</li>
            <li>We are not responsible for leakage, breakage or damage in transit.</li>
            <li>No claim will be entertained after the delivery of goods.</li>
            <li>All disputes are subject to DELHI JURISDICTION only.</li>
          </ul>
          <div className="safety-badge">✓ SAFE ✓ FAST ✓ SECURE SHIPMENT</div>
        </div>
        <div className="signature-grid">
          <div className="sig-box">
            <div className="sig-line"></div>
            <p>Consignor's Signature</p>
          </div>
          <div className="sig-box">
            <p className="stamp-title">For FAITH CARGO PVT LTD</p>
            <div className="stamp-placeholder">
               <span>OFFICE STAMP</span>
            </div>
            <p className="auth-sign">Authorized Signatory</p>
          </div>
        </div>
      </div>
      
      <div className="docket-copies-row">
        <span className="copy-tag">ORIGINAL: CONSIGNOR</span>
        <span className="copy-tag">DUPLICATE: CONSIGNEE</span>
        <span className="copy-tag">TRIPLICATE: OFFICE COPY</span>
      </div>
    </div>
  );
};

// --- MAIN PAGE COMPONENT ---
export default function CreateOrder() {
  const [boxes, setBoxes] = useState([]);
  const [showLR, setShowLR] = useState(false);
  const [lrNumber, setLrNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [ewayBill, setEwayBill] = useState("");
  const [invoiceFile, setInvoiceFile] = useState(null);
  
  // Form States
  const [pickup, setPickup] = useState({ name: "", contact: "", address: "", pincode: "", state: "", city: "" });
  const [delivery, setDelivery] = useState({ name: "", contact: "", address: "", pincode: "", state: "", city: "" });
  const [orderDetails, setOrderDetails] = useState({ material: "", weight: "", boxesCount: 0 });
  const [invoices, setInvoices] = useState([{ id: Date.now(), no: "", value: "" }]);

  const totalInvoiceValue = useMemo(() => 
    invoices.reduce((sum, inv) => sum + (parseFloat(inv.value) || 0), 0), 
  [invoices]);

  const volWeight = useMemo(() => {
    const totalVol = boxes.reduce((acc, b) => 
      acc + (parseFloat(b.l||0) * parseFloat(b.w||0) * parseFloat(b.h||0)) / 4000, 0);
    return totalVol.toFixed(2);
  }, [boxes]);

  const chargedWeight = Math.max(parseFloat(orderDetails.weight || 0), parseFloat(volWeight));

  const estimatedFreight = useMemo(() => {
    const basicFreight = chargedWeight * 12;
    const fuel = basicFreight * 0.10;
    const docket = 100;
    const fov = 75;
    const gst = basicFreight * 0.18;
    let total = basicFreight + fuel + docket + fov + gst;
    return total < 650 ? 650 : total.toFixed(2);
  }, [chargedWeight]);

  const needsEwayBill = totalInvoiceValue >= 50000;

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
    if (needsEwayBill && !ewayBill) {
      alert("⚠️ CRITICAL ERROR: E-Way Bill Number is mandatory for Invoice Values above ₹50,000.");
      return;
    }
    if (!pickup.name || !delivery.name || !orderDetails.weight) {
      alert("Please fill all mandatory fields (Sender, Receiver, Weight).");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLrNumber("FC" + Math.floor(1000000 + Math.random() * 9000000));
      setShowLR(true);
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="order-wrapper">
      <aside className="nav-sidebar no-print">
         <div className="logo-brand">
            <img src={logo} alt="Faith Cargo" />
            <div className="status-dot"></div>
         </div>
         <nav className="side-menu">
            <div className="menu-link active"><Plus size={18}/> Create Booking</div>
            <div className="menu-link"><Navigation size={18}/> Live Tracking</div>
            <div className="menu-link"><FileText size={18}/> All Dockets</div>
            <div className="menu-link"><CreditCard size={18}/> Payments</div>
         </nav>
         <div className="support-card">
            <Info size={16} />
            <p>Need help with booking?</p>
            <span>Call: 9818641504</span>
         </div>
      </aside>

      <main className="main-content">
        <header className="page-header no-print">
          <div className="header-text">
            <h1>Shipment Manifest v3.0</h1>
            <p>Enter consignment details for real-time LR generation</p>
          </div>
          <div className="realtime-stats">
            <div className="stat-pill">
              <span className="dot"></span> Charged: <strong>{chargedWeight} Kg</strong>
            </div>
            <div className="stat-pill red-pill">
              <ShieldCheck size={14}/> Value: <strong>₹{totalInvoiceValue}</strong>
            </div>
            <div className="stat-pill freight-pill">
              <IndianRupee size={14}/> Freight: <strong>₹{estimatedFreight}</strong>
            </div>
          </div>
        </header>

        {/* FORM SECTION - ALWAYS VISIBLE UNTIL LR GENERATED */}
        {!showLR && (
          <div className="form-layout no-print">
            <div className="form-column">
              <section className="premium-card">
                <div className="card-top red-accent">
                  <MapPin size={18} /> <h3>Consignor (Sender)</h3>
                </div>
                <div className="card-body">
                  <div className="input-row">
                    <div className="input-group">
                      <label>Company / Name *</label>
                      <input value={pickup.name} onChange={e=>setPickup({...pickup, name:e.target.value.toUpperCase()})} placeholder="Sender Name" />
                    </div>
                    <div className="input-group">
                      <label>Mobile Number *</label>
                      <input type="tel" maxLength={10} value={pickup.contact} onChange={e=>setPickup({...pickup, contact:e.target.value})} placeholder="10 Digit Mobile" />
                    </div>
                  </div>
                  <div className="input-group full-width">
                    <label>Full Pickup Address *</label>
                    <textarea rows="2" value={pickup.address} onChange={e=>setPickup({...pickup, address:e.target.value})} placeholder="House/Plot No, Area, Landmark..." />
                  </div>
                  <div className="input-row">
                    <div className="input-group">
                      <label>Pincode</label>
                      <input maxLength={6} value={pickup.pincode} onChange={e=>{setPickup({...pickup, pincode:e.target.value}); fetchLocation(e.target.value, 'pickup')}} placeholder="6 Digit" />
                    </div>
                    <div className="input-group">
                      <label>City & State</label>
                      <input className="locked-input" value={pickup.city ? `${pickup.city}, ${pickup.state}` : ""} readOnly placeholder="Auto-Fill" />
                    </div>
                  </div>
                </div>
              </section>

              <section className="premium-card">
                <div className="card-top dark-accent">
                  <Truck size={18} /> <h3>Consignee (Receiver)</h3>
                </div>
                <div className="card-body">
                  <div className="input-row">
                    <div className="input-group">
                      <label>Receiver Name *</label>
                      <input value={delivery.name} onChange={e=>setDelivery({...delivery, name:e.target.value.toUpperCase()})} placeholder="Recipient Name" />
                    </div>
                    <div className="input-group">
                      <label>Receiver Contact *</label>
                      <input type="tel" maxLength={10} value={delivery.contact} onChange={e=>setDelivery({...delivery, contact:e.target.value})} placeholder="Mobile Number" />
                    </div>
                  </div>
                  <div className="input-group full-width">
                    <label>Full Delivery Address *</label>
                    <textarea rows="2" value={delivery.address} onChange={e=>setDelivery({...delivery, address:e.target.value})} placeholder="Detailed Destination..." />
                  </div>
                  <div className="input-row">
                    <div className="input-group">
                      <label>Pincode</label>
                      <input maxLength={6} value={delivery.pincode} onChange={e=>{setDelivery({...delivery, pincode:e.target.value}); fetchLocation(e.target.value, 'delivery')}} placeholder="6 Digit" />
                    </div>
                    <div className="input-group">
                      <label>City & State</label>
                      <input className="locked-input" value={delivery.city ? `${delivery.city}, ${delivery.state}` : ""} readOnly placeholder="Auto-Fill" />
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div className="form-column">
              <section className="premium-card">
                <div className="card-top">
                  <Package size={18} /> <h3>Shipment Content</h3>
                </div>
                <div className="card-body">
                  <div className="input-group full-width">
                    <label>Material Description</label>
                    <input placeholder="e.g., Industrial Tools, Textile" onChange={e=>setOrderDetails({...orderDetails, material:e.target.value.toUpperCase()})} />
                  </div>
                  <div className="input-row">
                    <div className="input-group">
                      <label>Weight (Kg) *</label>
                      <input type="number" value={orderDetails.weight} onChange={e=>setOrderDetails({...orderDetails, weight:e.target.value})} placeholder="Actual Wt" />
                    </div>
                    <div className="input-group">
                      <label>No. of Boxes *</label>
                      <input type="number" value={orderDetails.boxesCount} onChange={e=>{
                        const n = parseInt(e.target.value)||0;
                        setOrderDetails({...orderDetails, boxesCount:n});
                        setBoxes(Array.from({length:n}, (_,i)=>({id:i+1, l:"", w:"", h:""})));
                      }} placeholder="Total Pkgs" />
                    </div>
                  </div>

                  {boxes.length > 0 && (
                    <div className="volumetric-calculator">
                      <div className="vol-header">
                         <span>Dimensional Calculator (CM)</span>
                         <span className="vol-badge">Vol Wt: {volWeight} Kg</span>
                      </div>
                      <div className="vol-grid-scroll">
                        {boxes.map((box, i) => (
                          <div key={i} className="vol-input-row">
                            <span className="box-index">#{i+1}</span>
                            <input placeholder="L" type="number" onChange={e=>{let b=[...boxes]; b[i].l=e.target.value; setBoxes(b)}} />
                            <input placeholder="W" type="number" onChange={e=>{let b=[...boxes]; b[i].w=e.target.value; setBoxes(b)}} />
                            <input placeholder="H" type="number" onChange={e=>{let b=[...boxes]; b[i].h=e.target.value; setBoxes(b)}} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="premium-card">
                <div className="card-top justify-between">
                  <div className="flex-center gap-2"><FileText size={18} color="#d32f2f"/> <h3>Invoice / E-Way</h3></div>
                  <button className="mini-add-btn" onClick={() => setInvoices([...invoices, { id: Date.now(), no: "", value: "" }])}><Plus size={14}/></button>
                </div>
                <div className="card-body">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="dynamic-inv-row">
                      <input placeholder="Invoice No" value={inv.no} onChange={e=>{
                        setInvoices(invoices.map(i=>i.id===inv.id ? {...i, no:e.target.value.toUpperCase()} : i))
                      }} />
                      <input type="number" placeholder="Value ₹" value={inv.value} onChange={e=>{
                        setInvoices(invoices.map(i=>i.id===inv.id ? {...i, value:e.target.value} : i))
                      }} />
                      <button className="row-del-btn" onClick={() => setInvoices(invoices.filter(i=>i.id!==inv.id))}><Trash2 size={14}/></button>
                    </div>
                  ))}

                  <div className="invoice-upload-box">
                      <label className="upload-btn-label">
                          <Upload size={16} /> 
                          <span>{invoiceFile ? invoiceFile.name : "Upload Invoice Copy"}</span>
                          <input type="file" hidden onChange={(e) => setInvoiceFile(e.target.files[0])} />
                      </label>
                  </div>

                  {needsEwayBill && (
                    <div className="eway-critical-box">
                      <div className="alert-header">
                         <AlertCircle size={18} /> <span>E-WAY BILL MANDATORY</span>
                      </div>
                      <input 
                        className="eway-main-input"
                        value={ewayBill} 
                        onChange={e=>setEwayBill(e.target.value.toUpperCase())} 
                        placeholder="ENTER 12 DIGIT E-WAY BILL NO."
                        maxLength={12}
                      />
                    </div>
                  )}
                </div>
              </section>

              <button className={`final-submit-btn ${loading ? 'loading' : ''}`} onClick={handleCreateOrder} disabled={loading}>
                 {loading ? "Generating LR..." : "Generate Consignment Note"} <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* SUCCESS MODAL - SHOWS DOCKET PREVIEW ONLY AFTER GENERATION */}
        {showLR && (
          <div className="modal-overlay no-print">
            <div className="modal-content animate-zoom">
              <div className="success-icon-wrapper">
                 <CheckCircle size={60} color="#10b981" />
              </div>
              <h2>LR GENERATED SUCCESSFULLY</h2>
              <div className="lr-id-display">{lrNumber}</div>
              
              <div className="mini-docket-preview">
                 <ShipmentDocket data={{pickup, delivery, orderDetails, invoices, chargedWeight}} lrNumber={lrNumber} totalValue={totalInvoiceValue} ewayBill={ewayBill} />
              </div>

              <div className="modal-actions">
                <button className="action-btn print" onClick={() => window.print()}><Printer size={18}/> PRINT DOCKET</button>
                <button className="action-btn next" onClick={() => window.location.reload()}>NEW ENTRY</button>
              </div>
            </div>
          </div>
        )}

        {/* HIDDEN IN UI - ONLY VISIBLE DURING PRINT */}
        <div className="print-only">
            <ShipmentDocket data={{pickup, delivery, orderDetails, invoices, chargedWeight}} lrNumber={lrNumber} totalValue={totalInvoiceValue} ewayBill={ewayBill} />
        </div>
      </main>
    </div>
  );
}