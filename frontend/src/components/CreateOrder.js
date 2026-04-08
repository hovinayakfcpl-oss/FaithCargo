import React, { useState, useMemo, useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { 
  Truck, MapPin, Package, FileText, Plus, Trash2,
  Calculator, CheckCircle, Printer, ChevronRight, AlertCircle, 
  ShieldCheck, Box, Info, Navigation, CreditCard, Upload, 
  IndianRupee, Save, RefreshCw, Search, History, Settings, User
} from "lucide-react";
import logo from "../assets/logo.png";
import "./CreateOrder.css";

// --- PROFESSIONAL DOCKET COMPONENT (TRIPLE COPY FOR PRINT) ---
const ShipmentDocket = ({ data, lrNumber, totalValue, ewayBill, billing, copyType }) => {
  const barcodeRef = useRef(null);
  
  useEffect(() => {
    if (lrNumber && barcodeRef.current) {
      JsBarcode(barcodeRef.current, lrNumber, {
        format: "CODE128", width: 2, height: 40, displayValue: false, margin: 0
      });
    }
  }, [lrNumber]);

  return (
    <div className="docket-container print-page-break">
      <div className="docket-copy-indicator">{copyType} COPY</div>
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
            <p><strong>Support:</strong> +91 9818641504 | <strong>Web:</strong> www.faithcargo.com</p>
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
            <p><strong>GSTIN:</strong> {data.pickup.gstin || "N/A"}</p>
          </div>
        </div>
        <div className="address-box">
          <div className="box-label">CONSIGNEE (RECEIVER)</div>
          <div className="address-content">
            <h3>{data.delivery.name || "__________________________"}</h3>
            <p className="addr-text">{data.delivery.address || "Address details not provided"}</p>
            <p><strong>City/State:</strong> {data.delivery.city}, {data.delivery.state} - {data.delivery.pincode}</p>
            <p className="contact-line"><strong>Mobile:</strong> +91 {data.delivery.contact}</p>
            <p><strong>GSTIN:</strong> {data.delivery.gstin || "N/A"}</p>
          </div>
        </div>
      </div>

      <table className="docket-main-table">
        <thead>
          <tr>
            <th>PKGS</th>
            <th>DESCRIPTION OF GOODS</th>
            <th>ACTUAL WT</th>
            <th>CHARGED WT</th>
            <th>INVOICE DETAILS</th>
          </tr>
        </thead>
        <tbody>
          <tr className="main-row">
            <td className="text-center font-bold">{data.orderDetails.boxesCount}</td>
            <td className="desc-cell">
              <span className="material-bold">{data.orderDetails.material || "GENERAL CARGO"}</span>
              <div className="dimension-summary">MODE: Surface | RISK: Owner's Risk</div>
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

      <div className="docket-middle-section">
          <div className="billing-summary-table">
              <div className="billing-row"><span>Freight Amount:</span> <strong>₹{billing.freight || "0.00"}</strong></div>
              <div className="billing-row"><span>Packing/Misc:</span> <strong>₹{billing.misc || "0.00"}</strong></div>
              <div className="billing-row"><span>GST @18%:</span> <strong>₹{((parseFloat(billing.freight || 0) + parseFloat(billing.misc || 0)) * 0.18).toFixed(2)}</strong></div>
              <div className="billing-row total"><span>Grand Total:</span> <strong>₹{billing.total || "0.00"}</strong></div>
          </div>
          <div className="instruction-box">
              <strong>Instructions:</strong>
              <p>Handle with care. Non-stackable cargo. Please ensure the seal is intact before accepting delivery.</p>
          </div>
      </div>

      <div className="docket-footer-grid">
        <div className="footer-notes">
          <h4>TERMS & CONDITIONS:</h4>
          <ul>
            <li>The company is not responsible for any internal damage or leakage.</li>
            <li>Insurance is the responsibility of the consignor.</li>
            <li>Octroi and other govt. taxes will be extra if applicable.</li>
            <li>Claims, if any, must be reported within 24 hours of delivery.</li>
            <li>Subject to Delhi Jurisdiction only.</li>
          </ul>
        </div>
        <div className="signature-area">
          <div className="sig-box">
            <div className="sig-line"></div>
            <p>Customer Signature</p>
          </div>
          <div className="sig-box main-stamp">
            <p>For FAITH CARGO PVT LTD</p>
            <div className="stamp-circle">STAMP</div>
            <p>Authorized Signatory</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APPLICATION COMPONENT ---
export default function CreateOrder() {
  // Core States
  const [boxes, setBoxes] = useState([]);
  const [showLR, setShowLR] = useState(false);
  const [lrNumber, setLrNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [ewayBill, setEwayBill] = useState("");
  const [activeTab, setActiveTab] = useState("booking");

  // Form Grouping
  const [pickup, setPickup] = useState({ name: "", contact: "", gstin: "", address: "", pincode: "", state: "", city: "" });
  const [delivery, setDelivery] = useState({ name: "", contact: "", gstin: "", address: "", pincode: "", state: "", city: "" });
  const [orderDetails, setOrderDetails] = useState({ material: "", weight: "", boxesCount: 0 });
  const [invoices, setInvoices] = useState([{ id: Date.now(), no: "", value: "", file: null }]);
  const [billing, setBilling] = useState({ freight: "", packing: "", misc: "", gst: 18 });

  // Advanced Calculation Logic
  const totalInvoiceValue = useMemo(() => 
    invoices.reduce((sum, inv) => sum + (parseFloat(inv.value) || 0), 0), 
  [invoices]);

  // CM Volumetric: (L * W * H) / 4000
  const volWeight = useMemo(() => {
    const totalVol = boxes.reduce((acc, b) => 
      acc + (parseFloat(b.l || 0) * parseFloat(b.w || 0) * parseFloat(b.h || 0)) / 4000, 0);
    return parseFloat(totalVol.toFixed(2));
  }, [boxes]);

  const chargedWeight = Math.max(parseFloat(orderDetails.weight || 0), volWeight);

  const finalBillingTotal = useMemo(() => {
    const base = (parseFloat(billing.freight) || 0) + (parseFloat(billing.packing) || 0) + (parseFloat(billing.misc) || 0);
    const tax = (base * billing.gst) / 100;
    return (base + tax).toFixed(2);
  }, [billing]);

  const needsEwayBill = totalInvoiceValue >= 50000;

  // Validation Logic
  const validateForm = () => {
    if (!pickup.name || !pickup.contact || pickup.contact.length < 10) return "Check Sender Details";
    if (!delivery.name || !delivery.pincode) return "Check Receiver Details";
    if (!orderDetails.weight || orderDetails.boxesCount <= 0) return "Check Material Details";
    if (needsEwayBill && (!ewayBill || ewayBill.length < 12)) return "Valid E-Way Bill Required (>50k)";
    return null;
  };

  // Handlers
  const fetchLocation = async (pin, type) => {
    if (pin.length === 6) {
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const data = await res.json();
        if (data[0].Status === "Success") {
          const po = data[0].PostOffice[0];
          const loc = { state: po.State, city: po.District };
          type === "pickup" ? setPickup(p => ({ ...p, ...loc })) : setDelivery(d => ({ ...d, ...loc }));
        }
      } catch (err) { console.error("Pincode API Fail"); }
    }
  };

  const handleCreateOrder = () => {
    const error = validateForm();
    if (error) {
      alert(`⚠️ Validation Error: ${error}`);
      return;
    }

    setLoading(true);
    // Simulate API Call
    setTimeout(() => {
      const generatedLR = "FC" + Math.floor(1000000 + Math.random() * 9000000);
      setLrNumber(generatedLR);
      setShowLR(true);
      setLoading(false);
    }, 1500);
  };

  const handleBoxCount = (count) => {
    const n = parseInt(count) || 0;
    if (n > 50) { alert("Max 50 packages allowed per LR"); return; }
    setOrderDetails({ ...orderDetails, boxesCount: n });
    setBoxes(Array.from({ length: n }, (_, i) => ({ id: i + 1, l: "", w: "", h: "" })));
  };

  return (
    <div className="order-wrapper">
      {/* --- SIDEBAR NAVIGATION --- */}
      <aside className="nav-sidebar no-print">
         <div className="logo-brand">
            <img src={logo} alt="Faith Cargo" />
            <div className="status-dot online"></div>
         </div>
         <nav className="side-menu">
            <button className={`menu-link ${activeTab === 'booking' ? 'active' : ''}`} onClick={() => setActiveTab('booking')}><Plus size={18}/> New Booking</button>
            <button className="menu-link"><Navigation size={18}/> Tracking</button>
            <button className="menu-link"><History size={18}/> Booking History</button>
            <button className="menu-link"><IndianRupee size={18}/> Billing</button>
            <button className="menu-link"><Search size={18}/> Rate Finder</button>
         </nav>
         <div className="user-profile-mini">
            <div className="avatar"><User size={20} /></div>
            <div className="info">
               <span className="name">Admin Panel</span>
               <span className="role">Branch: Delhi HQ</span>
            </div>
         </div>
      </aside>

      <main className="main-content">
        {/* --- DYNAMIC HEADER --- */}
        <header className="page-header no-print">
          <div className="header-text">
            <h1>Shipment Manifest v5.1</h1>
            <p>System Operating Date: {new Date().toDateString()}</p>
          </div>
          <div className="header-actions">
             <div className="realtime-stat-group">
                <div className="stat-box">
                   <label>Charged Wt</label>
                   <span>{chargedWeight} Kg</span>
                </div>
                <div className="stat-box accent">
                   <label>Total Value</label>
                   <span>₹{finalBillingTotal}</span>
                </div>
             </div>
             <button className="reset-btn" onClick={() => window.location.reload()}><RefreshCw size={18} /></button>
          </div>
        </header>

        {/* --- MAIN FORM LAYOUT --- */}
        <div className="form-layout no-print">
          <div className="form-column">
            
            {/* SENDER CARD */}
            <section className="premium-card">
              <div className="card-top red-accent"><MapPin size={18} /> <h3>1. Consignor Information</h3></div>
              <div className="card-body">
                <div className="input-row">
                  <div className="input-group flex-2">
                    <label>Company Name *</label>
                    <input value={pickup.name} onChange={e=>setPickup({...pickup, name:e.target.value.toUpperCase()})} placeholder="Full Business Name" />
                  </div>
                  <div className="input-group flex-1">
                    <label>Contact No *</label>
                    <input maxLength={10} value={pickup.contact} onChange={e=>setPickup({...pickup, contact:e.target.value})} placeholder="Mobile" />
                  </div>
                </div>
                <div className="input-group">
                    <label>GSTIN (Optional)</label>
                    <input maxLength={15} value={pickup.gstin} onChange={e=>setPickup({...pickup, gstin:e.target.value.toUpperCase()})} placeholder="Sender GST" />
                </div>
                <div className="input-group">
                    <label>Full Address *</label>
                    <textarea rows="2" value={pickup.address} onChange={e=>setPickup({...pickup, address:e.target.value})} placeholder="Street, Industrial Area, Phase..." />
                </div>
                <div className="input-row">
                  <input className="small-input" maxLength={6} value={pickup.pincode} onChange={e=>{setPickup({...pickup, pincode:e.target.value}); fetchLocation(e.target.value, 'pickup')}} placeholder="Pincode" />
                  <input className="locked-input" value={pickup.city ? `${pickup.city}, ${pickup.state}` : ""} readOnly placeholder="Auto-detecting city..." />
                </div>
              </div>
            </section>

            {/* RECEIVER CARD */}
            <section className="premium-card">
              <div className="card-top dark-accent"><Truck size={18} /> <h3>2. Consignee Information</h3></div>
              <div className="card-body">
                <div className="input-row">
                  <input className="flex-2" value={delivery.name} onChange={e=>setDelivery({...delivery, name:e.target.value.toUpperCase()})} placeholder="Recipient Name" />
                  <input className="flex-1" maxLength={10} value={delivery.contact} onChange={e=>setDelivery({...delivery, contact:e.target.value})} placeholder="Mobile" />
                </div>
                <input className="mb-2 mt-2" maxLength={15} value={delivery.gstin} onChange={e=>setDelivery({...delivery, gstin:e.target.value.toUpperCase()})} placeholder="Receiver GST" />
                <textarea className="mb-2" rows="2" value={delivery.address} onChange={e=>setDelivery({...delivery, address:e.target.value})} placeholder="Full Destination Address..." />
                <div className="input-row">
                  <input className="small-input" maxLength={6} value={delivery.pincode} onChange={e=>{setDelivery({...delivery, pincode:e.target.value}); fetchLocation(e.target.value, 'delivery')}} placeholder="Pincode" />
                  <input className="locked-input" value={delivery.city ? `${delivery.city}, ${delivery.state}` : ""} readOnly placeholder="Auto-detecting city..." />
                </div>
              </div>
            </section>

            {/* FREIGHT CALCULATOR CARD */}
            <section className="premium-card">
               <div className="card-top freight-accent"><IndianRupee size={18} /> <h3>3. Billing & Freight Details</h3></div>
               <div className="card-body">
                  <div className="billing-input-grid">
                     <div className="input-group">
                        <label>Basic Freight</label>
                        <input type="number" value={billing.freight} onChange={e=>setBilling({...billing, freight: e.target.value})} placeholder="₹" />
                     </div>
                     <div className="input-group">
                        <label>Misc. Charges</label>
                        <input type="number" value={billing.misc} onChange={e=>setBilling({...billing, misc: e.target.value})} placeholder="₹" />
                     </div>
                     <div className="input-group">
                        <label>Packing Cost</label>
                        <input type="number" value={billing.packing} onChange={e=>setBilling({...billing, packing: e.target.value})} placeholder="₹" />
                     </div>
                     <div className="input-group">
                        <label>GST (%)</label>
                        <select value={billing.gst} onChange={e=>setBilling({...billing, gst: parseInt(e.target.value)})}>
                           <option value={0}>0% (Exempt)</option>
                           <option value={5}>5% (RCM)</option>
                           <option value={12}>12%</option>
                           <option value={18}>18% (Standard)</option>
                        </select>
                     </div>
                  </div>
                  <div className="grand-total-display">
                      <div className="total-label">Total Amount Payable</div>
                      <div className="total-value">₹{finalBillingTotal}</div>
                  </div>
               </div>
            </section>
          </div>

          <div className="form-column">
            
            {/* SHIPMENT DETAIL CARD */}
            <section className="premium-card">
              <div className="card-top"><Package size={18} /> <h3>4. Material & Volumetric (CM)</h3></div>
              <div className="card-body">
                <input className="mb-2" placeholder="Said to Contain (e.g. ELECTRONIC GOODS)" onChange={e=>setOrderDetails({...orderDetails, material:e.target.value.toUpperCase()})} />
                <div className="input-row">
                    <div className="input-group">
                       <label>Actual Wt (Kg)</label>
                       <input type="number" value={orderDetails.weight} onChange={e=>setOrderDetails({...orderDetails, weight:e.target.value})} />
                    </div>
                    <div className="input-group">
                       <label>No. of Boxes</label>
                       <input type="number" value={orderDetails.boxesCount} onChange={e=>handleBoxCount(e.target.value)} />
                    </div>
                </div>

                {boxes.length > 0 && (
                  <div className="vol-container">
                    <div className="vol-header">
                       <span>Dimensions (CM) | Divider: 4000</span>
                       <span className="vol-res">Vol Wt: {volWeight} Kg</span>
                    </div>
                    <div className="vol-table-wrapper">
                      {boxes.map((box, i) => (
                        <div key={i} className="vol-row">
                          <span className="row-id">#{i+1}</span>
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

            {/* INVOICE CARD */}
            <section className="premium-card">
              <div className="card-top justify-between">
                <div className="flex-center gap-2"><FileText size={18} color="#d32f2f"/> <h3>5. Invoices & Documents</h3></div>
                <button className="mini-add-btn" onClick={() => setInvoices([...invoices, { id: Date.now(), no: "", value: "", file: null }])}><Plus size={14}/></button>
              </div>
              <div className="card-body">
                {invoices.map((inv) => (
                  <div key={inv.id} className="inv-advanced-row">
                    <div className="inv-inputs">
                        <input placeholder="Inv No" onChange={e=>setInvoices(invoices.map(i=>i.id===inv.id ? {...i, no:e.target.value.toUpperCase()} : i))} />
                        <input type="number" placeholder="Value ₹" onChange={e=>setInvoices(invoices.map(i=>i.id===inv.id ? {...i, value:e.target.value} : i))} />
                    </div>
                    <div className="inv-controls">
                        <label className={`file-upload-btn ${inv.file ? 'uploaded' : ''}`}>
                            {inv.file ? <CheckCircle size={14}/> : <Upload size={14}/>}
                            <input type="file" hidden onChange={e=>setInvoices(invoices.map(i=>i.id===inv.id ? {...i, file:e.target.files[0]} : i))} />
                        </label>
                        <button className="del-btn" onClick={() => setInvoices(invoices.filter(i=>i.id!==inv.id))}><Trash2 size={14}/></button>
                    </div>
                  </div>
                ))}

                {needsEwayBill && (
                  <div className="eway-alert-box animate-pulse">
                    <div className="alert-top"><AlertCircle size={16} /> <span>E-WAY BILL MANDATORY</span></div>
                    <input maxLength={12} className="eway-input-field" value={ewayBill} onChange={e=>setEwayBill(e.target.value.toUpperCase())} placeholder="ENTER 12 DIGIT NUMBER" />
                  </div>
                )}
              </div>
            </section>

            <button className={`main-action-btn ${loading ? 'loading' : ''}`} onClick={handleCreateOrder} disabled={loading}>
               {loading ? <RefreshCw className="spin" /> : <><Save size={20} /> FINAL BOOKING</>}
            </button>
          </div>
        </div>

        {/* --- SUCCESS MODAL --- */}
        {showLR && (
          <div className="modal-overlay no-print">
            <div className="modal-content large-modal animate-zoom">
              <div className="modal-header">
                  <div className="status-success"><CheckCircle size={40} /> <span>BOOKING CONFIRMED</span></div>
                  <div className="lr-tag">{lrNumber}</div>
              </div>
              
              <div className="preview-container">
                  <p>Preview of Consignor Copy</p>
                  <div className="preview-scale">
                      <ShipmentDocket 
                        data={{pickup, delivery, orderDetails, invoices, chargedWeight}} 
                        lrNumber={lrNumber} totalValue={totalInvoiceValue} ewayBill={ewayBill} 
                        billing={{freight: billing.freight, misc: billing.misc, total: finalBillingTotal}}
                        copyType="CONSIGNOR"
                      />
                  </div>
              </div>

              <div className="modal-footer">
                <button className="print-btn" onClick={() => window.print()}><Printer size={18}/> PRINT ALL COPIES (3)</button>
                <button className="close-btn" onClick={() => window.location.reload()}>DONE</button>
              </div>
            </div>
          </div>
        )}

        {/* --- PRINT ENGINE (3 COPIES) --- */}
        <div className="print-only">
            {["CONSIGNOR", "CONSIGNEE", "OFFICE"].map((copy) => (
                <ShipmentDocket 
                    key={copy}
                    data={{pickup, delivery, orderDetails, invoices, chargedWeight}} 
                    lrNumber={lrNumber} totalValue={totalInvoiceValue} ewayBill={ewayBill} 
                    billing={{freight: billing.freight, misc: billing.misc, total: finalBillingTotal}}
                    copyType={copy}
                />
            ))}
        </div>
      </main>
    </div>
  );
}