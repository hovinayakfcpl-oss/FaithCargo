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

// --- SYSTEM CONFIGURATION ---
const SYSTEM_CONFIG = {
  VERSION: "5.0.2-ENTERPRISE-LIGHT",
  BRANCH: "NEW DELHI (HQ)",
  GST_RATE: 0.18,
  FOV_RATE: 0.002, 
  MODES: {
    SURFACE: { name: "Surface Express", min: 450, perKg: 10, docket: 150 },
    AIR: { name: "Air Premium", min: 1100, perKg: 42, docket: 250 },
    EXPRESS: { name: "Express Logistics", min: 750, perKg: 25, docket: 200 }
  }
};

// --- SUB-COMPONENT: DOCKET (MULTI-COPY PRINTING) ---
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
              <div className="sub-info">Mode: {mode} | Booking: {SYSTEM_CONFIG.BRANCH}</div>
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
  const [view, setView] = useState("booking"); // Tabs
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
  
  // TRACKING ENGINE STATE
  const [trackId, setTrackId] = useState("");
  const [trackResult, setTrackResult] = useState(null);

  // --- BUSINESS LOGIC: CALCULATIONS ---
  const calculation = useMemo(() => {
    const totalInvoiceVal = invoices.reduce((s, i) => s + (parseFloat(i.value) || 0), 0);
    const volWeight = dims.reduce((acc, d) => 
      acc + (parseFloat(d.l || 0) * parseFloat(d.w || 0) * parseFloat(d.h || 0)) / 1728, 0) * 10;
    
    const chargedWeight = Math.max(parseFloat(cargo.weight || 0), volWeight).toFixed(2);
    const currentMode = SYSTEM_CONFIG.MODES[shipMode];
    
    const baseFreight = Math.max(chargedWeight * currentMode.perKg, currentMode.min);
    const fov = totalInvoiceVal * SYSTEM_CONFIG.FOV_RATE;
    const subTotal = baseFreight + currentMode.docket + fov;
    const gst = subTotal * SYSTEM_CONFIG.GST_RATE;
    
    return {
      totalInvoiceVal, volWeight: volWeight.toFixed(2), chargedWeight,
      baseFreight, fov, gst, total: subTotal + gst,
      needsEway: totalInvoiceVal >= 50000
    };
  }, [invoices, dims, cargo.weight, shipMode]);

  // --- API SIMULATIONS (PINCODE & BOOKING) ---
  const handlePincodeSearch = async (pin, side) => {
    if (pin.length === 6) {
      try {
        const r = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const d = await r.json();
        if (d[0].Status === "Success") {
          const res = { city: d[0].PostOffice[0].District, state: d[0].PostOffice[0].State };
          side === "sender" ? setConsignor(p => ({...p, ...res})) : setConsignee(p => ({...p, ...res}));
        }
      } catch (e) { console.error("Pincode API Error"); }
    }
  };

  const generateBooking = () => {
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
      setGeneratedLR("FC" + Math.floor(1000000 + Math.random() * 8999999));
      setBookingConfirmed(true);
      setIsProcessing(false);
    }, 1800);
  };

  const handleTrack = () => {
    if (!trackId) return;
    setIsProcessing(true);
    setTimeout(() => {
      setTrackResult({
        id: trackId,
        status: "IN TRANSIT",
        currentLocation: "JAIPUR LOGISTICS HUB",
        milestones: [
          { date: "10 Apr 2026", time: "10:30 AM", msg: "Booking created at Delhi HQ" },
          { date: "11 Apr 2026", time: "05:00 AM", msg: "Arrived at Jaipur Hub" }
        ]
      });
      setIsProcessing(false);
    }, 900);
  };

  // --- PAGE RESTRENGTHENING: PROFESSONAL LAYOUT ---
  return (
    <div className="faith-app-root light-enterprise-theme">
      {/* PROFESSIONAL SIDEBAR (White with Red Accent) */}
      <aside className="app-sidebar no-print">
        <div className="sidebar-brand">
          <img src={logo} alt="Faith Cargo" />
          <div className="version-tag">v{SYSTEM_CONFIG.VERSION}</div>
        </div>
        <nav className="sidebar-nav">
          <button className={view === 'booking' ? 'active' : ''} onClick={() => setView('booking')}><Plus size={18}/> New Booking</button>
          <button className={view === 'tracking' ? 'active' : ''} onClick={() => setView('tracking')}><Navigation size={18}/> Live Tracking</button>
          <button className={view === 'manifest' ? 'active' : ''} onClick={() => setView('manifest')}><FileText size={18}/> E-Manifest Ledger</button>
          <button><Layers size={18}/> Client Ledger</button>
          <button><HardDrive size={18}/> Database</button>
          <button><Settings size={18}/> Configuration</button>
        </nav>
        <div className="sidebar-footer">
           <div className="user-profile"><User size={16}/> Admin_ Delhi_HQ</div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="app-main">
        {/* ENTERPRISE HEADER (White Card with Stats) */}
        <header className="app-header no-print">
          <div className="header-info">
            <h1>Shipment Console</h1>
            <p>Branch: <strong>{SYSTEM_CONFIG.BRANCH}</strong> | Date: {new Date().toLocaleDateString('en-IN')}</p>
          </div>
          <div className="header-quick-stats">
            <div className="stat-pill">
              <ClipboardCheck size={16} color="#d32f2f" />
              <span>Charged Weight: <strong>{calculation.chargedWeight} kg</strong></span>
            </div>
            <div className="stat-pill red-stat">
              <Calculator size={16} color="#d32f2f" />
              <span>Invoice Value: <strong>₹{totals.invTotal}</strong></span>
            </div>
          </div>
        </header>

        {/* TAB CONTENT: BOOKING (Professionally Restructured) */}
        {view === 'booking' && (
          <div className="booking-layout animate-fade">
            <div className="layout-columns">
              {/* LEFT COLUMN: Data Entry */}
              <div className="entry-column">
                <div className="addr-grid-2">
                  {/* SENDER BOX */}
                  <section className="entry-card red-top">
                    <div className="card-header"><MapPin size={18}/> <h3>Origin Details (Consignor)</h3></div>
                    <div className="card-body">
                      <input className="entry-input p-input" placeholder="Consignor Name / Company Name" onChange={e => setConsignor({...consignor, name: e.target.value.toUpperCase()})} />
                      <div className="input-flex">
                        <input className="entry-input" placeholder="GSTIN" onChange={e => setConsignor({...consignor, gst: e.target.value.toUpperCase()})} />
                        <input className="entry-input" placeholder="Contact Phone" maxLength={10} onChange={e => setConsignor({...consignor, contact: e.target.value})} />
                      </div>
                      <textarea className="entry-input" placeholder="Full Pickup Address" rows={2} onChange={e => setConsignor({...consignor, address: e.target.value})} />
                      <div className="input-flex">
                        <input className="entry-input" placeholder="Pincode" maxLength={6} onChange={e => {setConsignor({...consignor, pincode: e.target.value}); handlePincodeSearch(e.target.value, 'sender')}} />
                        <input className="entry-input locked" readOnly value={consignor.city} placeholder="Auto-City" />
                      </div>
                    </div>
                  </section>

                  {/* RECEIVER BOX */}
                  <section className="entry-card dark-top">
                    <div className="card-header"><Truck size={18}/> <h3>Destination Details (Consignee)</h3></div>
                    <div className="card-body">
                      <input className="entry-input p-input" placeholder="Consignee Name" onChange={e => setConsignee({...consignee, name: e.target.value.toUpperCase()})} />
                      <div className="input-flex">
                        <input className="entry-input" placeholder="Contact Person (Opt)" />
                        <input className="entry-input" placeholder="Mobile" maxLength={10} onChange={e => setConsignee({...consignee, contact: e.target.value})} />
                      </div>
                      <textarea className="entry-input" placeholder="Detailed Delivery Address" rows={2} onChange={e => setConsignee({...consignee, address: e.target.value})} />
                      <div className="input-flex">
                        <input className="entry-input" placeholder="Pincode" maxLength={6} onChange={e => {setConsignee({...consignee, pincode: e.target.value}); handlePincodeSearch(e.target.value, 'receiver')}} />
                        <input className="entry-input locked" readOnly value={consignee.city} placeholder="Auto-City" />
                      </div>
                    </div>
                  </section>
                </div>

                {/* ITEM & VOLUMETRIC AUDIT */}
                <section className="entry-card Audit-card">
                  <div className="card-header"><Package size={18}/> <h3>Shipment Content & Volumetric Audit</h3></div>
                  <div className="card-body Audit-body">
                    <div className="input-flex">
                      <input className="entry-input f-3" placeholder="Material Description (e.g. Textiles, Auto Parts)" onChange={e => setCargo({...cargo, material: e.target.value.toUpperCase()})} />
                      <select className="entry-input f-1" onChange={e => setMode(e.target.value)}>
                        <option value="SURFACE">Surface Logistics</option>
                        <option value="AIR">Air Cargo</option>
                        <option value="EXPRESS">Express Door</option>
                      </select>
                    </div>
                    <div className="input-flex">
                      <div className="field-block">
                        <label>ACTUAL WEIGHT (KG)</label>
                        <input type="number" className="entry-input" onChange={e => setCargo({...cargo, weight: e.target.value})} />
                      </div>
                      <div className="field-block">
                        <label>TOTAL PACKAGES (PKGS)</label>
                        <input type="number" className="entry-input" onChange={e => {
                          const n = parseInt(e.target.value) || 0;
                          setCargo({...cargo, pkgs: n});
                          setDims(Array.from({length: n}, (_, i) => ({id: i, l:0, w:0, h:0})));
                        }} />
                      </div>
                    </div>
                    
                    {dims.length > 0 && (
                      <div className="vol-audit-panel">
                        <div className="panel-header">Dimensional Calculator (Inch) <span>Vol Wt: {totals.volWeight} kg</span></div>
                        <div className="vol-grid-scroll">
                          {dims.map((dim, idx) => (
                            <div key={idx} className="dim-row">
                              <span className="dim-idx">P{idx+1}</span>
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

              {/* RIGHT COLUMN: Billing & Invoices */}
              <div className="summary-column">
                {/* INVOICE LEDGER */}
                <section className="entry-card invoice-audit-card">
                  <div className="card-header f-between">
                    <div className="flex-center gap-2"><ClipboardCheck size={18}/> <h3>Invoice Ledger</h3></div>
                    <button className="add-row-btn" onClick={() => setInvoices([...invoices, {id: Date.now(), no: "", value: ""}])}><Plus size={14}/></button>
                  </div>
                  <div className="card-body">
                    {invoices.map(inv => (
                      <div key={inv.id} className="invoice-lineanimate-in">
                        <input placeholder="Invoice No" className="entry-input" onChange={e => setInvoices(invoices.map(i => i.id === inv.id ? {...i, no: e.target.value.toUpperCase()} : i))} />
                        <input placeholder="Value ₹" type="number" className="entry-input" onChange={e => setInvoices(invoices.map(i => i.id === inv.id ? {...i, value: e.target.value} : i))} />
                        <button className="row-del-btn" onClick={() => setInvoices(invoices.filter(i => i.id !== inv.id))}><Trash2 size={14}/></button>
                      </div>
                    ))}

                    {calculation.needsEway && (
                      <div className="eway-bill-alert animate-pulse-red">
                        <ShieldAlert size={18} />
                        <input placeholder="E-WAY BILL NUMBER REQUIRED" maxLength={12} onChange={e => setEwayBill(e.target.value)} />
                      </div>
                    )}
                  </div>
                </section>

                {/* BILLING FINAL SUMMARY */}
                <section className="billing-final-card">
                  <h3>Freight & Charges Summary</h3>
                  <div className="bill-item-row"><span>Charged Weight:</span> <strong>{calculation.chargedWeight} kg</strong></div>
                  <div className="bill-item-row"><span>Base Freight:</span> <span>₹{calculation.baseFreight.toFixed(2)}</span></div>
                  <div className="bill-item-row"><span>Docket Charges:</span> <span>₹{SYSTEM_CONFIG.MODES[mode].docket}</span></div>
                  <div className="bill-item-row"><span>Insurance (FOV):</span> <span>₹{totals.fov.toFixed(2)}</span></div>
                  <div className="bill-item-row"><span>GST (18%):</span> <span>₹{totals.gst.toFixed(2)}</span></div>
                  <div className="bill-total-row">
                    <span>GRAND TOTAL:</span>
                    <span>₹{calculation.total.toFixed(2)}</span>
                  </div>
                  <button className={`final-booking-btn ${isProcessing ? 'loading' : ''}`} onClick={generateBooking}>
                    {isProcessing ? "PROCESSINGSHIPMENT..." : "GENERATE CONSIGNMENT NOTE (LR)"}
                  </button>
                </section>
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTENT: TRACKING ENGINE */}
        {view === 'tracking' && (
          <div className="tracking-viz-layout animate-fade">
            <div className="track-hero-search">
              <div className="search-bar-pro">
                <Search size={22} color="#aaa" />
                <input 
                  placeholder="Enter Booking ID / Airwaybill No. (e.g. FC8827361)" 
                  value={trackId} 
                  onChange={e => setTrackId(e.target.value.toUpperCase())}
                />
                <button onClick={handleTrack}>TRACK</button>
              </div>
            </div>

            {trackResult && (
              <div className="tracking-results-pro animate-fade">
                <div className="res-header">
                  <div className="res-id"><h2>{trackResult.id}</h2></div>
                  <div className="res-status"><div className="status-badge">{trackResult.status}</div></div>
                </div>

                <div className="tracking-path-viz">
                  <div className="path-line"></div>
                  {['Booked', 'Dispatched', 'Transit', 'Delivered'].map((step, idx) => (
                    <div key={idx} className={`path-stop ${idx < 2 ? 'done' : idx === 2 ? 'active' : ''}`}>
                      <div className="path-dot"></div>
                      <span className="step-name">{step}</span>
                    </div>
                  ))}
                </div>

                <div className="milestone-history">
                  <h3>Lifecycle Milestones</h3>
                  {trackResult.milestones.map((m, i) => (
                    <div key={i} className="milestone-block">
                       <div className="m-time"><strong>{m.date}</strong><br/>{m.time}</div>
                       <div className="m-text">{m.msg}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PRINT MODAL (Professional Zoom Animation) */}
        {bookingConfirmed && (
          <div className="overlay no-print">
            <div className="booking-modal animate-zoom">
              <CheckCircle size={50} color="#10b981" />
              <h2>LR SUCCESSFULLY GENERATED</h2>
              <div className="lr-pill">{lrNumber}</div>
              <p>Shipment manifests and consignment notes (X3 copies) are ready. Please select action:</p>
              <div className="modal-actions">
                <button className="modal-print-btn" onClick={() => window.print()}><Printer size={18}/> PRINT ALL COPIES</button>
                <button className="modal-close-btn" onClick={() => window.location.reload()}>DONE & NEW ENTRY</button>
              </div>
            </div>
          </div>
        )}

        {/* PRINT ENGINE (Hidden from UI, renders 3 A4 half copies) */}
        <div className="print-engine">
          <ShipmentDocket data={{consignor, consignee, cargo, invoices, ewayBill}} lrNumber={generatedLR} totals={calculation} mode={shipMode} copyType="CONSIGNOR" />
          <ShipmentDocket data={{consignor, consignee, cargo, invoices, ewayBill}} lrNumber={generatedLR} totals={calculation} mode={shipMode} copyType="CONSIGNEE" />
          <ShipmentDocket data={{consignor, consignee, cargo, invoices, ewayBill}} lrNumber={generatedLR} totals={calculation} mode={shipMode} copyType="OFFICE" />
        </div>
      </main>
    </div>
  );
}