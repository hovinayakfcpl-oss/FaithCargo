import React, { useState, useMemo, useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { 
  Truck, MapPin, Package, FileText, Plus, Trash2, 
  Calculator, CheckCircle, Printer, ChevronRight, AlertCircle, 
  ShieldCheck, Box, Info, Navigation, CreditCard, Search,
  History, Globe, Download, Settings, BarChart3, User,
  Clock, ArrowRightLeft, ShieldAlert, Layers, HardDrive, 
  Map, Activity, ClipboardCheck, PhoneCall, TrendingUp
} from "lucide-react";
import logo from "../assets/logo.png";
import "./CreateOrder.css";

// --- SYSTEM ARCHITECTURE CONSTANTS ---
const CONFIG = {
  VERSION: "5.0.1-LIGHT-PRO",
  TAX_RATE: 0.18,
  INSURANCE_RATE: 0.002,
  BRANCHES: ["NEW DELHI (HQ)", "MUMBAI", "BANGALORE", "KOLKATA", "CHENNAI", "AHMEDABAD"],
  MODES: {
    SURFACE: { name: "Surface Express", min: 450, perKg: 10, docket: 150 },
    AIR: { name: "Air Premium", min: 1100, perKg: 42, docket: 250 },
    EXPRESS: { name: "Express Logistics", min: 750, perKg: 25, docket: 200 }
  }
};

// --- DOCKET COMPONENT (MULTI-COPY PRINTING) ---
const ShipmentDocket = ({ data, lrNumber, totals, mode, copyType }) => {
  const barcodeRef = useRef(null);
  useEffect(() => {
    if (lrNumber && barcodeRef.current) {
      JsBarcode(barcodeRef.current, lrNumber, {
        format: "CODE128", width: 1.2, height: 30, displayValue: false, margin: 0,
        background: "transparent", lineColor: "#000"
      });
    }
  }, [lrNumber]);

  return (
    <div className="docket-container">
      <div className="docket-watermark">FAITH CARGO</div>
      <div className="copy-tag">{copyType} COPY</div>
      
      <div className="docket-header">
        <div className="brand-side">
          <img src={logo} alt="FC" className="docket-logo" />
          <div className="brand-text">
            <h2>FAITH CARGO PVT LTD</h2>
            <p>AN ISO 9001:2015 CERTIFIED LOGISTICS PARTNER</p>
            <p className="tiny-info">GSTIN: 07AAFCF2947K1ZD | CIN: U60231DL2021PTC384521</p>
          </div>
        </div>
        <div className="meta-side">
          <div className="doc-type">CONSIGNMENT NOTE</div>
          <div className="barcode-render"><canvas ref={barcodeRef}></canvas></div>
          <div className="lr-text">{lrNumber || "DRAFT"}</div>
          <div className="date-text">DATE: {new Date().toLocaleDateString('en-IN')}</div>
        </div>
      </div>

      <div className="address-grid">
        <div className="addr-box">
          <div className="addr-header">CONSIGNOR (SENDER)</div>
          <h3>{data.consignor.name || "____________________"}</h3>
          <p>{data.consignor.address || "Address not provided"}</p>
          <p><strong>GST:</strong> {data.consignor.gst || "NOT PROVIDED"}</p>
          <p><strong>Mobile:</strong> +91 {data.consignor.contact}</p>
        </div>
        <div className="addr-box">
          <div className="addr-header">CONSIGNEE (RECEIVER)</div>
          <h3>{data.consignee.name || "____________________"}</h3>
          <p>{data.consignee.address || "Address not provided"}</p>
          <p><strong>Destination:</strong> {data.consignee.city}, {data.consignee.pincode}</p>
          <p><strong>Mobile:</strong> +91 {data.consignee.contact}</p>
        </div>
      </div>

      <table className="docket-main-table">
        <thead>
          <tr>
            <th width="8%">PKGS</th>
            <th width="42%">DESCRIPTION OF GOODS (SAID TO CONTAIN)</th>
            <th width="15%">ACTUAL WT</th>
            <th width="15%">CHARGED WT</th>
            <th width="20%">INV & E-WAY BILL</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="center-text">{data.cargo.pkgs}</td>
            <td className="desc-td">
              <strong>{data.cargo.material || "GENERAL CARGO"}</strong>
              <div className="sub-info">Mode: {mode} | Booking: {CONFIG.BRANCHES[0]}</div>
            </td>
            <td className="center-text">{data.cargo.weight} KG</td>
            <td className="center-text font-bold">{totals.chargedWeight} KG</td>
            <td className="inv-td">
              <div>INV: {data.invoices[0]?.no || "N/A"}</div>
              {data.ewayBill && <div>EWB: {data.ewayBill}</div>}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="docket-footer">
        <div className="footer-cols">
          <div className="terms-col">
            <h4>Important Conditions</h4>
            <p>1. Goods carried at Owner's risk.</p>
            <p>2. No claims allowed after delivery acknowledgement.</p>
            <p>3. Subject to DELHI JURISDICTION only.</p>
          </div>
          <div className="billing-col">
            <div className="bill-row-tiny"><span>FREIGHT:</span> <span>PAID/TBB</span></div>
            <div className="bill-row-tiny"><span>GST:</span> <span>AS APPLICABLE</span></div>
            <div className="total-badge">VERIFIED</div>
          </div>
          <div className="sign-col">
            <div className="sign-placeholder">Consignor's Signature</div>
            <div className="sign-placeholder office-stamp">For FAITH CARGO PVT LTD</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APPLICATION ENGINE ---
export default function CreateOrder() {
  const [view, setView] = useState("booking"); 
  const [isProcessing, setIsProcessing] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [generatedLR, setGeneratedLR] = useState("");
  
  // LOGISTICS STATE
  const [shipMode, setShipMode] = useState("SURFACE");
  const [consignor, setConsignor] = useState({ name: "", contact: "", address: "", pincode: "", city: "", state: "", gst: "" });
  const [consignee, setConsignee] = useState({ name: "", contact: "", address: "", pincode: "", city: "", state: "", gst: "" });
  const [cargo, setCargo] = useState({ material: "", weight: "", pkgs: 0, risk: "OWNER RISK" });
  const [dims, setDims] = useState([]);
  const [invoices, setInvoices] = useState([{ id: Date.now(), no: "", value: "" }]);
  const [ewayBill, setEwayBill] = useState("");

  // --- CALCULATION LOGIC ---
  const calculation = useMemo(() => {
    const totalInvoiceVal = invoices.reduce((s, i) => s + (parseFloat(i.value) || 0), 0);
    const volWeight = dims.reduce((acc, d) => 
      acc + (parseFloat(d.l || 0) * parseFloat(d.w || 0) * parseFloat(d.h || 0)) / 1728, 0) * 10;
    
    const chargedWeight = Math.max(parseFloat(cargo.weight || 0), volWeight).toFixed(2);
    const currentMode = CONFIG.MODES[shipMode];
    
    const baseFreight = Math.max(chargedWeight * currentMode.perKg, currentMode.min);
    const fov = totalInvoiceVal * CONFIG.INSURANCE_RATE;
    const subTotal = baseFreight + currentMode.docket + fov;
    const gst = subTotal * CONFIG.TAX_RATE;
    
    return {
      totalInvoiceVal, volWeight: volWeight.toFixed(2), chargedWeight,
      baseFreight, fov, gst, total: subTotal + gst,
      needsEway: totalInvoiceVal >= 50000
    };
  }, [invoices, dims, cargo.weight, shipMode]);

  // --- API SIMULATIONS ---
  const handlePincodeSearch = async (pin, side) => {
    if (pin.length === 6) {
      try {
        const r = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const d = await r.json();
        if (d[0].Status === "Success") {
          const res = { city: d[0].PostOffice[0].District, state: d[0].PostOffice[0].State };
          side === "sender" ? setConsignor(p => ({...p, ...res})) : setConsignee(p => ({...p, ...res}));
        }
      } catch (e) { console.error("API Error"); }
    }
  };

  const handleBooking = () => {
    if (calculation.needsEway && !ewayBill) {
      alert("⚠️ E-WAY BILL REQUIRED: Consignment value exceeds ₹50,000.");
      return;
    }
    if (!consignor.name || !consignee.name || !cargo.weight) {
      alert("⚠️ INCOMPLETE DATA: Fill Sender, Receiver, and Weight fields.");
      return;
    }
    setIsProcessing(true);
    setTimeout(() => {
      setGeneratedLR("FC" + Math.floor(1000000 + Math.random() * 9000000));
      setBookingConfirmed(true);
      setIsProcessing(false);
    }, 2000);
  };

  // --- INTERFACE ---
  return (
    <div className="faith-app-root light-theme">
      {/* SIDEBAR NAVIGATION */}
      <aside className="app-sidebar no-print">
        <div className="sidebar-brand">
          <img src={logo} alt="Faith Cargo" />
          <div className="version-pill">v{CONFIG.VERSION}</div>
        </div>
        <nav className="sidebar-nav">
          <button className={view === 'booking' ? 'active' : ''} onClick={() => setView('booking')}><Plus size={20}/> New Booking</button>
          <button className={view === 'tracking' ? 'active' : ''} onClick={() => setView('tracking')}><Navigation size={20}/> Live Tracking</button>
          <button className={view === 'manifest' ? 'active' : ''} onClick={() => setView('manifest')}><FileText size={20}/> E-Manifest</button>
          <button onClick={() => setView('analytics')}><BarChart3 size={20}/> Dashboard</button>
          <button onClick={() => setView('settings')}><Settings size={20}/> Admin Panel</button>
        </nav>
        <div className="sidebar-user">
          <div className="user-icon"><User size={18}/></div>
          <div className="user-info">
            <span className="name">Admin_01</span>
            <span className="role">Centralized Control</span>
          </div>
        </div>
      </aside>

      <main className="app-main">
        {/* HEADER */}
        <header className="app-header no-print">
          <div className="header-left">
            <h1>Logistics Command Center</h1>
            <p>Managing Branch: <strong>{CONFIG.BRANCHES[0]}</strong> | {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          <div className="header-right">
            <div className="header-stat">
              <Activity size={18} color="#d32f2f" />
              <div><span>Status</span><strong>Active</strong></div>
            </div>
            <div className="header-stat">
              <PhoneCall size={18} color="#d32f2f" />
              <div><span>Help</span><strong>9818641504</strong></div>
            </div>
          </div>
        </header>

        {/* BOOKING INTERFACE */}
        {view === 'booking' && (
          <div className="booking-layout animate-fade">
            <div className="booking-columns">
              <div className="column-left">
                <div className="grid-2-cols">
                  <section className="ui-card red-top">
                    <div className="card-header"><MapPin size={18}/> <h3>Consignor (Sender)</h3></div>
                    <div className="card-body">
                      <input className="input-field primary" placeholder="Full Company Name" onChange={e => setConsignor({...consignor, name: e.target.value.toUpperCase()})} />
                      <div className="flex-row">
                        <input className="input-field" placeholder="GSTIN" onChange={e => setConsignor({...consignor, gst: e.target.value.toUpperCase()})} />
                        <input className="input-field" placeholder="Contact No" maxLength={10} onChange={e => setConsignor({...consignor, contact: e.target.value})} />
                      </div>
                      <textarea className="input-field" placeholder="Full Pickup Address" rows={2} onChange={e => setConsignor({...consignor, address: e.target.value})} />
                      <div className="flex-row">
                        <input className="input-field" placeholder="Pincode" maxLength={6} onChange={e => {setConsignor({...consignor, pincode: e.target.value}); handlePincodeSearch(e.target.value, 'sender')}} />
                        <input className="input-field locked" readOnly value={consignor.city} placeholder="City (Auto)" />
                      </div>
                    </div>
                  </section>

                  <section className="ui-card dark-top">
                    <div className="card-header"><Truck size={18}/> <h3>Consignee (Receiver)</h3></div>
                    <div className="card-body">
                      <input className="input-field primary" placeholder="Recipient / Company Name" onChange={e => setConsignee({...consignee, name: e.target.value.toUpperCase()})} />
                      <div className="flex-row">
                        <input className="input-field" placeholder="GST (Optional)" onChange={e => setConsignee({...consignee, gst: e.target.value.toUpperCase()})} />
                        <input className="input-field" placeholder="Mobile" maxLength={10} onChange={e => setConsignee({...consignee, contact: e.target.value})} />
                      </div>
                      <textarea className="input-field" placeholder="Full Delivery Address" rows={2} onChange={e => setConsignee({...consignee, address: e.target.value})} />
                      <div className="flex-row">
                        <input className="input-field" placeholder="Pincode" maxLength={6} onChange={e => {setConsignee({...consignee, pincode: e.target.value}); handlePincodeSearch(e.target.value, 'receiver')}} />
                        <input className="input-field locked" readOnly value={consignee.city} placeholder="City (Auto)" />
                      </div>
                    </div>
                  </section>
                </div>

                <section className="ui-card">
                  <div className="card-header"><Package size={18}/> <h3>Cargo Details & Volumetric Calculator</h3></div>
                  <div className="card-body">
                    <div className="flex-row">
                      <input className="input-field flex-2" placeholder="Material Type (e.g. Spare Parts, Textile)" onChange={e => setCargo({...cargo, material: e.target.value.toUpperCase()})} />
                      <select className="input-field" onChange={e => setShipMode(e.target.value)}>
                        <option value="SURFACE">Surface Logistics</option>
                        <option value="AIR">Air Cargo</option>
                        <option value="EXPRESS">Express Door</option>
                      </select>
                    </div>
                    <div className="flex-row">
                      <div className="field-group">
                        <label>Actual Weight (KG)</label>
                        <input type="number" className="input-field" onChange={e => setCargo({...cargo, weight: e.target.value})} />
                      </div>
                      <div className="field-group">
                        <label>No. of Packages</label>
                        <input type="number" className="input-field" onChange={e => {
                          const val = parseInt(e.target.value) || 0;
                          setCargo({...cargo, pkgs: val});
                          setDims(Array.from({length: val}, (_, i) => ({id: i, l:0, w:0, h:0})));
                        }} />
                      </div>
                    </div>
                    
                    {dims.length > 0 && (
                      <div className="vol-panel">
                        <div className="vol-header">
                          <span>Volumetric Calculation (Inch)</span>
                          <span className="badge">Total Vol: {calculation.volWeight} KG</span>
                        </div>
                        <div className="vol-grid">
                          {dims.map((dim, idx) => (
                            <div key={idx} className="vol-row">
                              <span className="idx">#{idx+1}</span>
                              <input placeholder="L" type="number" onChange={e => {let d=[...dims]; d[idx].l=e.target.value; setDims(d)}} />
                              <input placeholder="W" type="number" onChange={e => {let d=[...dims]; d[idx].w=e.target.value; setDims(d)}} />
                              <input placeholder="H" type="number" onChange={e => {let d=[...dims]; d[idx].h=e.target.value; setDims(d)}} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <div className="column-right">
                <section className="ui-card">
                  <div className="card-header between">
                    <div className="flex-center gap-2"><ClipboardCheck size={18}/> <h3>Invoice Ledger</h3></div>
                    <button className="add-row-btn" onClick={() => setInvoices([...invoices, {id: Date.now(), no: "", value: ""}])}><Plus size={14}/></button>
                  </div>
                  <div className="card-body">
                    {invoices.map((inv) => (
                      <div key={inv.id} className="inv-flex-row">
                        <input placeholder="Invoice No" className="input-field" onChange={e => setInvoices(invoices.map(i => i.id === inv.id ? {...i, no: e.target.value.toUpperCase()} : i))} />
                        <input placeholder="Value ₹" type="number" className="input-field" onChange={e => setInvoices(invoices.map(i => i.id === inv.id ? {...i, value: e.target.value} : i))} />
                        <button className="row-del" onClick={() => setInvoices(invoices.filter(i => i.id !== inv.id))}><Trash2 size={14}/></button>
                      </div>
                    ))}
                    
                    {calculation.needsEway && (
                      <div className="eway-box pulse-red">
                        <ShieldAlert size={18} />
                        <input placeholder="ENTER 12-DIGIT E-WAY BILL" maxLength={12} onChange={e => setEwayBill(e.target.value)} />
                      </div>
                    )}
                  </div>
                </section>

                <section className="billing-summary-card">
                  <div className="bill-title">Shipment Summary</div>
                  <div className="bill-items">
                    <div className="b-row"><span>Charged Weight:</span> <strong>{calculation.chargedWeight} KG</strong></div>
                    <div className="b-row"><span>Base Freight:</span> <span>₹{calculation.baseFreight.toFixed(2)}</span></div>
                    <div className="b-row"><span>Risk Surcharge:</span> <span>₹{calculation.fov.toFixed(2)}</span></div>
                    <div className="b-row"><span>GST (18%):</span> <span>₹{calculation.gst.toFixed(2)}</span></div>
                  </div>
                  <div className="b-total">
                    <span>Grand Total:</span>
                    <span>₹{calculation.total.toFixed(2)}</span>
                  </div>
                  <button className={`booking-btn ${isProcessing ? 'loading' : ''}`} onClick={handleBooking} disabled={isProcessing}>
                    {isProcessing ? "TRANSMITTING..." : "GENERATE CONSIGNMENT NOTE"}
                  </button>
                </section>
              </div>
            </div>
          </div>
        )}

        {/* --- LIVE DIRECT TRACKING INTERFACE --- */}
        {view === 'tracking' && (
          <div className="tracking-layout animate-fade">
             <div className="tracking-frame-wrapper">
                <div className="frame-header no-print">
                  <div className="dots"><span></span><span></span><span></span></div>
                  <div className="url-bar"><Globe size={12}/> https://tracking.faithcargo.com/</div>
                  <div className="live-status"><div className="pulse-dot"></div> Connected</div>
                </div>
                <iframe 
                  src="https://tracking.faithcargo.com/" 
                  title="Faith Cargo Live Tracking"
                  className="external-tracking-iframe"
                  frameBorder="0"
                ></iframe>
             </div>
          </div>
        )}

        {/* MODALS & PRINT ENGINE */}
        {bookingConfirmed && (
          <div className="modal-overlay no-print">
            <div className="confirmation-modal animate-zoom">
              <CheckCircle size={60} color="#10b981" />
              <h2>LR GENERATED SUCCESSFULLY</h2>
              <div className="lr-display">{generatedLR}</div>
              <p>Consignment Note is ready for printing. Please select action:</p>
              <div className="modal-actions">
                <button className="btn-print" onClick={() => window.print()}><Printer size={18}/> PRINT ALL COPIES</button>
                <button className="btn-close" onClick={() => window.location.reload()}>NEW BOOKING</button>
              </div>
            </div>
          </div>
        )}

        <div className="print-area">
          <ShipmentDocket data={{consignor, consignee, cargo, invoices, ewayBill}} lrNumber={generatedLR} totals={calculation} mode={shipMode} copyType="CONSIGNOR" />
          <ShipmentDocket data={{consignor, consignee, cargo, invoices, ewayBill}} lrNumber={generatedLR} totals={calculation} mode={shipMode} copyType="CONSIGNEE" />
          <ShipmentDocket data={{consignor, consignee, cargo, invoices, ewayBill}} lrNumber={generatedLR} totals={calculation} mode={shipMode} copyType="OFFICE" />
        </div>
      </main>
    </div>
  );
}