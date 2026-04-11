import React, { useState, useMemo, useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { 
  Truck, MapPin, Package, FileText, Plus, Trash2, 
  Calculator, CheckCircle, Printer, Navigation, 
  Search, Settings, Layers, HardDrive, User, 
  ClipboardCheck, ShieldAlert
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
      try {
        JsBarcode(barcodeRef.current, lrNumber, {
          format: "CODE128", width: 1.2, height: 30, displayValue: false, margin: 0,
          background: "transparent", lineColor: "#000"
        });
      } catch (e) {
        console.error("Barcode Generation Failed", e);
      }
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
            <th width="42%">DESCRIPTION OF GOODS</th>
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
            <p>2. Subject to DELHI JURISDICTION only.</p>
          </div>
          <div className="billing-col">
            <div className="bill-row-tiny"><span>FREIGHT:</span> <span>PAID/TBB</span></div>
            <div className="total-badge">VERIFIED</div>
          </div>
          <div className="sign-col">
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
  
  // TRACKING STATE
  const [trackId, setTrackId] = useState("");
  const [trackResult, setTrackResult] = useState(null);

  // --- BUSINESS LOGIC: CALCULATIONS ---
  const totals = useMemo(() => {
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
      totalInvoiceVal, 
      volWeight: volWeight.toFixed(2), 
      chargedWeight,
      baseFreight, 
      fov, 
      gst, 
      total: subTotal + gst,
      needsEway: totalInvoiceVal >= 50000
    };
  }, [invoices, dims, cargo.weight, shipMode]);

  // Alias definitions for older references in JSX
  const mode = shipMode;
  const setMode = setShipMode;
  const lrNumber = generatedLR;

  // --- ACTIONS ---
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
    if (totals.needsEway && !ewayBill) {
      alert("⚠️ E-WAY BILL REQUIRED: Consignment value exceeds ₹50,000.");
      return;
    }
    if (!consignor.name || !consignee.name || !cargo.weight) {
      alert("⚠️ INCOMPLETE DATA: Fill required fields.");
      return;
    }
    setIsProcessing(true);
    setTimeout(() => {
      const newLR = "FC" + Math.floor(1000000 + Math.random() * 8999999);
      setGeneratedLR(newLR);
      setBookingConfirmed(true);
      setIsProcessing(false);
    }, 1500);
  };

  const handleTrack = () => {
    if (!trackId) return;
    setIsProcessing(true);
    setTimeout(() => {
      setTrackResult({
        id: trackId,
        status: "IN TRANSIT",
        milestones: [{ date: "11 Apr 2026", time: "10:30 AM", msg: "Booking created at Delhi HQ" }]
      });
      setIsProcessing(false);
    }, 800);
  };

  return (
    <div className="faith-app-root light-enterprise-theme">
      {/* SIDEBAR */}
      <aside className="app-sidebar no-print">
        <div className="sidebar-brand">
          <img src={logo} alt="Faith Cargo" />
          <div className="version-tag">v{SYSTEM_CONFIG.VERSION}</div>
        </div>
        <nav className="sidebar-nav">
          <button className={view === 'booking' ? 'active' : ''} onClick={() => setView('booking')}><Plus size={18}/> New Booking</button>
          <button className={view === 'tracking' ? 'active' : ''} onClick={() => setView('tracking')}><Navigation size={18}/> Live Tracking</button>
          <button><Layers size={18}/> Client Ledger</button>
          <button><HardDrive size={18}/> Database</button>
          <button><Settings size={18}/> Configuration</button>
        </nav>
        <div className="sidebar-footer">
           <div className="user-profile"><User size={16}/> Admin_Delhi_HQ</div>
        </div>
      </aside>

      <main className="app-main">
        {/* HEADER */}
        <header className="app-header no-print">
          <div className="header-info">
            <h1>Shipment Console</h1>
            <p>Branch: <strong>{SYSTEM_CONFIG.BRANCH}</strong> | {new Date().toLocaleDateString('en-IN')}</p>
          </div>
          <div className="header-quick-stats">
            <div className="stat-pill">
              <ClipboardCheck size={16} color="#d32f2f" />
              <span>Charged Wt: <strong>{totals.chargedWeight} kg</strong></span>
            </div>
            <div className="stat-pill">
              <Calculator size={16} color="#d32f2f" />
              <span>Invoice Val: <strong>₹{totals.totalInvoiceVal}</strong></span>
            </div>
          </div>
        </header>

        {view === 'booking' && (
          <div className="booking-layout animate-fade">
            <div className="layout-columns">
              <div className="entry-column">
                <div className="input-flex">
                  <section className="entry-card red-top" style={{flex: 1}}>
                    <div className="card-header"><MapPin size={18}/> <h3>Origin (Consignor)</h3></div>
                    <div className="card-body">
                      <input className="entry-input" placeholder="Consignor Name" onChange={e => setConsignor({...consignor, name: e.target.value.toUpperCase()})} />
                      <div className="input-flex">
                        <input className="entry-input" placeholder="GSTIN" onChange={e => setConsignor({...consignor, gst: e.target.value.toUpperCase()})} />
                        <input className="entry-input" placeholder="Phone" onChange={e => setConsignor({...consignor, contact: e.target.value})} />
                      </div>
                      <textarea className="entry-input" placeholder="Pickup Address" rows={2} onChange={e => setConsignor({...consignor, address: e.target.value})} />
                      <div className="input-flex">
                        <input className="entry-input" placeholder="Pincode" maxLength={6} onChange={e => {setConsignor({...consignor, pincode: e.target.value}); handlePincodeSearch(e.target.value, 'sender')}} />
                        <input className="entry-input locked" readOnly value={consignor.city} />
                      </div>
                    </div>
                  </section>

                  <section className="entry-card dark-top" style={{flex: 1}}>
                    <div className="card-header"><Truck size={18}/> <h3>Destination (Consignee)</h3></div>
                    <div className="card-body">
                      <input className="entry-input" placeholder="Consignee Name" onChange={e => setConsignee({...consignee, name: e.target.value.toUpperCase()})} />
                      <input className="entry-input" placeholder="Mobile" onChange={e => setConsignee({...consignee, contact: e.target.value})} />
                      <textarea className="entry-input" placeholder="Delivery Address" rows={2} onChange={e => setConsignee({...consignee, address: e.target.value})} />
                      <div className="input-flex">
                        <input className="entry-input" placeholder="Pincode" maxLength={6} onChange={e => {setConsignee({...consignee, pincode: e.target.value}); handlePincodeSearch(e.target.value, 'receiver')}} />
                        <input className="entry-input locked" readOnly value={consignee.city} />
                      </div>
                    </div>
                  </section>
                </div>

                <section className="entry-card">
                  <div className="card-header"><Package size={18}/> <h3>Cargo & Volumetric</h3></div>
                  <div className="card-body">
                    <div className="input-flex">
                      <input className="entry-input" style={{flex: 2}} placeholder="Material Description" onChange={e => setCargo({...cargo, material: e.target.value.toUpperCase()})} />
                      <select className="entry-input" style={{flex: 1}} onChange={e => setMode(e.target.value)}>
                        <option value="SURFACE">Surface</option>
                        <option value="AIR">Air</option>
                        <option value="EXPRESS">Express</option>
                      </select>
                    </div>
                    <div className="input-flex">
                      <input className="entry-input" type="number" placeholder="Actual Weight (KG)" onChange={e => setCargo({...cargo, weight: e.target.value})} />
                      <input className="entry-input" type="number" placeholder="Packages" onChange={e => {
                        const n = parseInt(e.target.value) || 0;
                        setCargo({...cargo, pkgs: n});
                        setDims(Array.from({length: n}, (_, i) => ({id: i, l:0, w:0, h:0})));
                      }} />
                    </div>
                  </div>
                </section>
              </div>

              <div className="summary-column">
                <section className="entry-card">
                  <div className="card-header"><h3>Invoice Ledger</h3><button onClick={() => setInvoices([...invoices, {id: Date.now(), no: "", value: ""}])}><Plus size={14}/></button></div>
                  <div className="card-body">
                    {invoices.map(inv => (
                      <div key={inv.id} className="input-flex" style={{marginBottom: '10px'}}>
                        <input placeholder="Inv No" className="entry-input" onChange={e => setInvoices(invoices.map(i => i.id === inv.id ? {...i, no: e.target.value} : i))} />
                        <input placeholder="Value ₹" type="number" className="entry-input" onChange={e => setInvoices(invoices.map(i => i.id === inv.id ? {...i, value: e.target.value} : i))} />
                      </div>
                    ))}
                    {totals.needsEway && <input className="entry-input" style={{borderColor: 'red'}} placeholder="E-WAY BILL NO REQUIRED" onChange={e => setEwayBill(e.target.value)} />}
                  </div>
                </section>

                <section className="billing-final-card">
                  <div className="bill-item-row"><span>Base Freight:</span> <span>₹{totals.baseFreight.toFixed(2)}</span></div>
                  <div className="bill-item-row"><span>GST (18%):</span> <span>₹{totals.gst.toFixed(2)}</span></div>
                  <div className="bill-total-row"><span>TOTAL:</span> <span>₹{totals.total.toFixed(2)}</span></div>
                  <button className="final-booking-btn" onClick={generateBooking} disabled={isProcessing}>
                    {isProcessing ? "PROCESSING..." : "GENERATE DOCKET"}
                  </button>
                </section>
              </div>
            </div>
          </div>
        )}

        {/* TRACKING VIEW */}
        {view === 'tracking' && (
           <div className="tracking-results-pro animate-fade">
              <input className="entry-input" placeholder="Enter LR Number" value={trackId} onChange={e => setTrackId(e.target.value.toUpperCase())} />
              <button className="final-booking-btn" onClick={handleTrack}>TRACK SHIPMENT</button>
              {trackResult && <div style={{marginTop: '20px'}}>Status: <strong>{trackResult.status}</strong></div>}
           </div>
        )}

        {/* PRINT OVERLAY */}
        {bookingConfirmed && (
          <div className="overlay no-print">
            <div className="booking-modal">
              <CheckCircle size={50} color="#10b981" />
              <h2>LR GENERATED: {lrNumber}</h2>
              <button className="final-booking-btn" onClick={() => window.print()}><Printer size={18}/> PRINT COPIES</button>
              <button onClick={() => window.location.reload()}>NEW ENTRY</button>
            </div>
          </div>
        )}

        {/* PRINT ENGINE */}
        <div className="print-engine">
          <ShipmentDocket data={{consignor, consignee, cargo, invoices, ewayBill}} lrNumber={lrNumber} totals={totals} mode={mode} copyType="CONSIGNOR" />
          <ShipmentDocket data={{consignor, consignee, cargo, invoices, ewayBill}} lrNumber={lrNumber} totals={totals} mode={mode} copyType="CONSIGNEE" />
          <ShipmentDocket data={{consignor, consignee, cargo, invoices, ewayBill}} lrNumber={lrNumber} totals={totals} mode={mode} copyType="OFFICE" />
        </div>
      </main>
    </div>
  );
}