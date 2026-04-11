import React, { useState, useMemo, useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { 
  Truck, MapPin, Package, FileText, Plus, Trash2, 
  Calculator, CheckCircle, Printer, ChevronRight, AlertCircle, 
  ShieldCheck, Box, Info, Navigation, CreditCard, Search
} from "lucide-react";
// Note: Apne folder structure ke hisaab se logo path sahi kar lena
import logo from "../assets/logo.png"; 
import "./CreateOrder.css";

// --- SYSTEM CONSTANTS ---
const SYSTEM_CONFIG = {
  VERSION: "5.0.2-ENTERPRISE-PRO",
  BRANCH: "NEW DELHI (HQ)",
  COMPANY_NAME: "FAITH CARGO PVT LTD",
  GST_RATE: 0.18,
  FOV_RATE: 0.002, // 0.2% insurance
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
        console.error("Barcode generation failed", e);
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
            <h2>{SYSTEM_CONFIG.COMPANY_NAME}</h2>
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
  const [loading, setLoading] = useState(false);
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
  const totals = useMemo(() => {
    const totalInvoiceVal = invoices.reduce((s, i) => s + (parseFloat(i.value) || 0), 0);
    const volWeight = dims.reduce((acc, d) => 
      acc + (parseFloat(d.l || 0) * parseFloat(d.w || 0) * parseFloat(d.h || 0)) / 1728, 0) * 10;
    
    const chargedWeight = Math.max(parseFloat(cargo.weight || 0), volWeight).toFixed(2);
    
    return {
      totalInvoiceVal, volWeight: volWeight.toFixed(2), chargedWeight,
      needsEway: totalInvoiceVal >= 50000
    };
  }, [invoices, dims, cargo.weight]);

  // --- API SIMULATIONS (Pincode & Booking) ---
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

  const generateBooking = () => {
    if (totals.needsEway && !ewayBill) {
      alert("⚠️ E-WAY BILL REQUIRED: Consignment value exceeds ₹50,000.");
      return;
    }
    if (!consignor.name || !consignee.name || !cargo.weight) {
      alert("⚠️ INCOMPLETE DATA: Fill Sender, Receiver, and Weight fields.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setGeneratedLR("FC" + Math.floor(1000000 + Math.random() * 8999999));
      setBookingConfirmed(true);
      setLoading(false);
    }, 2000);
  };

  return (
    <div className="faith-app-root dark-enterprise-theme">
      {/* SIDEBAR NAVIGATION */}
      <aside className="app-sidebar no-print">
        <div className="sidebar-brand">
          <img src={logo} alt="Faith Cargo" />
          <div className="version-pill">v{SYSTEM_CONFIG.VERSION}</div>
        </div>
        <nav className="sidebar-nav">
          <button className="active"><Truck size={18}/> New Booking</button>
          <button><Navigation size={18}/> Live Tracking</button>
          <button><FileText size={18}/> E-Manifest Ledger</button>
          <button><Settings size={18}/> Configuration</button>
        </nav>
        <div className="sidebar-footer">
           <User size={16}/> Admin_Delhi_HQ
        </div>
      </aside>

      <main className="app-main">
        {/* HEADER */}
        <header className="app-header no-print">
          <div className="header-left">
            <h1>Logistics Command Center</h1>
            <p>Branch: <strong>{SYSTEM_CONFIG.BRANCH}</strong> | Date: {new Date().toLocaleDateString('en-IN')}</p>
          </div>
          <div className="header-right">
            <div className="header-stat">
              <ClipboardCheck size={16} color="#d32f2f" />
              <div><span>Status</span><strong>Connected</strong></div>
            </div>
            <div className="header-stat">
              <Settings size={16} color="#d32f2f" />
              <div><span>Instance</span><strong>PROD_Central</strong></div>
            </div>
          </div>
        </header>

        {/* BOOKING INTERFACE */}
        <div className="booking-layout animate-fade">
          <div className="booking-columns">
            {/* SENDER & RECEIVER */}
            <div className="column-left">
              <div className="grid-2-cols">
                <section className="ui-card red-top">
                  <div className="card-header"><MapPin size={18}/> <h3>Origin (Consignor)</h3></div>
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
                  <div className="card-header"><Truck size={18}/> <h3>Destination (Consignee)</h3></div>
                  <div className="card-body">
                    <input className="input-field primary" placeholder="Recipient / Company Name" onChange={e => setConsignee({...consignee, name: e.target.value.toUpperCase()})} />
                    <div className="flex-row">
                      <input className="input-field" placeholder="GST (Optional)" onChange={e => setConsignee({...consignee, gst: e.target.value.toUpperCase()})} />
                      <input className="input-field" placeholder="Mobile" maxLength={10} onChange={e => setConsignee({...consignee, contact: e.target.value})} />
                    </div>
                    <textarea className="input-field" placeholder="Full Delivery Address" rows={2} onChange={e => setConsignee({...consignee, address: e.target.value})} />
                    <div className="input-flex">
                      <input className="input-field" placeholder="Pincode" maxLength={6} onChange={e => {setConsignee({...consignee, pincode: e.target.value}); handlePincodeSearch(e.target.value, 'receiver')}} />
                      <input className="input-field locked" readOnly value={consignee.city} placeholder="City (Auto)" />
                    </div>
                  </div>
                </section>
              </div>

              <section className="ui-card">
                <div className="card-header"><Package size={18}/> <h3>Cargo Particulars & Volumetric</h3></div>
                <div className="card-body">
                  <div className="flex-row">
                    <input className="input-field flex-2" placeholder="Material Type (e.g. Spare Parts, Textiles)" onChange={e => setCargo({...cargo, material: e.target.value.toUpperCase()})} />
                    <select className="input-field" onChange={e => setShipMode(e.target.value)}>
                      <option value="SURFACE">Surface Express</option>
                      <option value="AIR">Air प्रीमियम</option>
                      <option value="EXPRESS">Express</option>
                    </select>
                  </div>
                  <div className="flex-row">
                    <div className="field-group">
                      <label>Actual Weight (KG)</label>
                      <input type="number" className="input-field" onChange={e => setCargo({...cargo, weight: e.target.value})} />
                    </div>
                    <div className="field-group">
                      <label>Total Packages (PKGS)</label>
                      <input type="number" className="input-field" onChange={e => {
                        const n = parseInt(e.target.value) || 0;
                        setCargo({...cargo, pkgs: n});
                        setDims(Array.from({length: n}, (_, i) => ({id: i, l:0, w:0, h:0})));
                      }} />
                    </div>
                  </div>
                  
                  {dims.length > 0 && (
                    <div className="vol-panel">
                      <div className="vol-header">
                        <span>Volumetric Calculation (Inch)</span>
                        <span className="badge">Total Vol: {totals.volWeight} KG</span>
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

            {/* FINANCIALS & SUBMIT */}
            <div className="column-right">
              <section className="ui-card">
                <div className="card-header between">
                  <div className="flex-center gap-2"><FileText size={18}/> <h3>Invoice Ledger</h3></div>
                  <button className="add-row-btn" onClick={() => setInvoices([...invoices, {id: Date.now(), no: "", value: ""}])}><Plus size={14}/></button>
                </div>
                <div className="card-body">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="inv-flex-row animate-fade">
                      <input placeholder="Invoice No" className="input-field" onChange={e => setInvoices(invoices.map(i => i.id === inv.id ? {...i, no: e.target.value.toUpperCase()} : i))} />
                      <input placeholder="Value ₹" type="number" className="input-field" onChange={e => setInvoices(invoices.map(i => i.id === inv.id ? {...i, value: e.target.value} : i))} />
                      <button className="row-del" onClick={() => setInvoices(invoices.filter(i => i.id !== inv.id))}><Trash2 size={14}/></button>
                    </div>
                  ))}
                  
                  {totals.needsEway && (
                    <div className="eway-box pulse-red">
                      <ShieldAlert size={18} />
                      <input placeholder="ENTER 12-DIGIT E-WAY BILL" maxLength={12} onChange={e => setEwayBill(e.target.value)} />
                    </div>
                  )}
                </div>
              </section>

              <section className="billing-summary-card shadow-premium">
                <div className="bill-title">Shipment Summary</div>
                <div className="bill-items">
                  <div className="b-row"><span>Charged Weight:</span> <strong>{totals.chargedWeight} KG</strong></div>
                  <div className="b-row"><span>Booking Branch:</span> <span>{SYSTEM_CONFIG.BRANCH}</span></div>
                  <div className="b-row"><span>Rate Mode:</span> <span>{shipMode}</span></div>
                </div>
                <div className="b-total">
                  <span>Invoice Total:</span>
                  <span>₹{totals.totalInvoiceVal.toLocaleString()}</span>
                </div>
                <button className={`booking-btn ${loading ? 'loading' : ''}`} onClick={generateBooking} disabled={loading}>
                  {loading ? "TRANSMITTING DATA..." : "GENERATE FCPL NOTE"}
                </button>
              </section>
            </div>
          </div>
        </div>

        {/* PRINT ENGINE */}
        <div className="print-area">
          <ShipmentDocket data={{consignor, consignee, cargo, invoices, ewayBill}} lrNumber={generatedLR} totals={totals} mode={shipMode} copyType="CONSIGNOR" />
          <ShipmentDocket data={{consignor, consignee, cargo, invoices, ewayBill}} lrNumber={generatedLR} totals={calculation} mode={shipMode} copyType="CONSIGNEE" />
          <ShipmentDocket data={{consignor, consignee, cargo, invoices, ewayBill}} lrNumber={generatedLR} totals={calculation} mode={shipMode} copyType="OFFICE" />
        </div>

        {/* CONFIRMATION MODAL */}
        {bookingConfirmed && (
          <div className="modal-overlay no-print">
            <div className="confirmation-modal animate-zoom">
              <CheckCircle size={60} color="#10b981" />
              <h2>LR GENERATED SUCCESSFULLY</h2>
              <div className="lr-display">{generatedLR}</div>
              <p>Consignment Note is ready for printing. Please select action:</p>
              <div className="modal-actions">
                <button className="btn-print" onClick={() => window.print()}><Printer size={18}/> PRINT ALL COPIES</button>
                <button className="btn-close" onClick={() => window.location.reload()}>DONE & NEW ENTRY</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}