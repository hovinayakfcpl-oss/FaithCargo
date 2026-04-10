import React, { useState, useMemo, useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { 
  Truck, MapPin, Package, FileText, Plus, Trash2,
  CheckCircle, Printer, ChevronRight, AlertCircle, 
  ShieldCheck, Navigation, IndianRupee, Search, X, 
  Upload, Info, CreditCard, Box, Layout, Settings, LogOut,
  ArrowRight, Activity, Clock, Layers, Filter, Download,
  ExternalLink, MousePointer2, Briefcase
} from "lucide-react";
import logo from "../assets/logo.png";
import "./CreateOrder.css";

/* ==========================================================================
   COMPONENT: PROFESSIONAL DOCKET (A4 PRECISION)
   ========================================================================== */
const ShipmentDocket = ({ data, lrNumber, totalValue, ewayBill }) => {
  const barcodeRef = useRef(null);
  
  useEffect(() => {
    if (lrNumber && barcodeRef.current) {
      JsBarcode(barcodeRef.current, lrNumber, {
        format: "CODE128", width: 2, height: 45, displayValue: false, margin: 0
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
            <p><strong>Support:</strong> +91 9818641504 | <strong>Web:</strong> www.faithcargo.com</p>
          </div>
        </div>
        
        <div className="docket-lr-meta">
          <div className="lr-header-box">CONSIGNMENT NOTE</div>
          <div className="barcode-area"><canvas ref={barcodeRef}></canvas></div>
          <div className="lr-number-display">{lrNumber || "DRAFT COPY"}</div>
          <div className="lr-date-row">BOOKING DATE: <strong>{new Date().toLocaleDateString('en-IN')}</strong></div>
        </div>
      </div>

      <div className="docket-address-grid">
        <div className="address-box sender-theme">
          <div className="box-label">CONSIGNOR (SENDER)</div>
          <div className="address-content">
            <h3>{data.pickup?.name || "__________________________"}</h3>
            <p className="addr-text">{data.pickup?.address || "Address details not provided"}</p>
            <p><strong>City/State:</strong> {data.pickup?.city}, {data.pickup?.state} - {data.pickup?.pincode}</p>
            <p className="contact-line"><strong>Mobile:</strong> +91 {data.pickup?.contact}</p>
          </div>
        </div>
        <div className="address-box receiver-theme">
          <div className="box-label">CONSIGNEE (RECEIVER)</div>
          <div className="address-content">
            <h3>{data.delivery?.name || "__________________________"}</h3>
            <p className="addr-text">{data.delivery?.address || "Address details not provided"}</p>
            <p><strong>City/State:</strong> {data.delivery?.city}, {data.delivery?.state} - {data.delivery?.pincode}</p>
            <p className="contact-line"><strong>Mobile:</strong> +91 {data.delivery?.contact}</p>
          </div>
        </div>
      </div>

      <table className="docket-main-table">
        <thead>
          <tr>
            <th width="10%">PKGS</th>
            <th width="40%">DESCRIPTION OF GOODS</th>
            <th width="15%">ACTUAL WT</th>
            <th width="15%">CHARGED WT</th>
            <th width="20%">DOCUMENTS</th>
          </tr>
        </thead>
        <tbody>
          <tr className="main-row">
            <td className="text-center font-bold">{data.orderDetails?.boxesCount}</td>
            <td className="desc-cell">
              <span className="material-bold">{data.orderDetails?.material || "GENERAL MERCHANDISE"}</span>
              <div className="dimension-summary">Route: Surface | Status: Secure-Pack</div>
            </td>
            <td className="text-center">{data.orderDetails?.weight} Kg</td>
            <td className="text-center font-bold">{data.chargedWeight} Kg</td>
            <td className="inv-cell">
               <div>INV: {data.invoices?.[0]?.no || "N/A"}</div>
               <div>VAL: ₹{totalValue}</div>
               {ewayBill && <div className="eway-tag">EWB: {ewayBill}</div>}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="docket-footer-grid">
        <div className="footer-notes">
          <h4>LEGAL COMPLIANCE:</h4>
          <ul>
            <li>Carriage is subject to standard terms at Owner's risk.</li>
            <li>Insurance coverage is the responsibility of the Consignor.</li>
            <li>All disputes are strictly under Delhi Jurisdiction.</li>
          </ul>
        </div>
        <div className="signature-grid">
          <div className="sig-box">
            <div className="sig-line"></div>
            <p>Consignor's Signature</p>
          </div>
          <div className="sig-box">
            <p className="stamp-title">For FAITH CARGO PVT LTD</p>
            <div className="stamp-placeholder">OFFICIAL STAMP</div>
            <p className="auth-sign">Authorized Signatory</p>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ==========================================================================
   MAIN CONTROLLER: FAITH CARGO ENTERPRISE UI
   ========================================================================== */
export default function CreateOrder() {
  const [activeTab, setActiveTab] = useState("booking");
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);

  // --- Booking States ---
  const [pickup, setPickup] = useState({ name: "", contact: "", address: "", pincode: "", state: "", city: "" });
  const [delivery, setDelivery] = useState({ name: "", contact: "", address: "", pincode: "", state: "", city: "" });
  const [orderDetails, setOrderDetails] = useState({ material: "", weight: "", boxesCount: 0 });
  const [boxes, setBoxes] = useState([]);
  const [invoices, setInvoices] = useState([{ id: Date.now(), no: "", value: "" }]);
  const [ewayBill, setEwayBill] = useState("");
  
  // --- UI Control States ---
  const [showLR, setShowLR] = useState(false);
  const [generatedLR, setGeneratedLR] = useState("");
  const [searchLR, setSearchLR] = useState("");
  const [trackResult, setTrackResult] = useState(null);

  // --- Calculations Engine ---
  const totalValue = useMemo(() => invoices.reduce((s, i) => s + (parseFloat(i.value) || 0), 0), [invoices]);
  
  const volumetricWeight = useMemo(() => {
    const total = boxes.reduce((acc, b) => {
      const vol = (parseFloat(b.l || 0) * parseFloat(b.w || 0) * parseFloat(b.h || 0)) / 4000;
      return acc + vol;
    }, 0);
    return total.toFixed(2);
  }, [boxes]);

  const chargedWeight = Math.max(parseFloat(orderDetails.weight || 0), parseFloat(volumetricWeight));

  const freightEstimation = useMemo(() => {
    const base = chargedWeight * 14.5; // Premium rate
    const total = base + (base * 0.12) + 250; // + Fuel + Handling
    return total < 750 ? 750 : total.toFixed(2);
  }, [chargedWeight]);

  // --- API Integrations ---
  const handlePincodeLookup = async (pincode, type) => {
    if (pincode.length === 6) {
      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
        const result = await response.json();
        if (result[0].Status === "Success") {
          const location = {
            state: result[0].PostOffice[0].State,
            city: result[0].PostOffice[0].District
          };
          type === "pickup" ? setPickup(p => ({...p, ...location})) : setDelivery(d => ({...d, ...location}));
        }
      } catch (e) { console.error("Pincode API Error"); }
    }
  };

  const executeGeneration = () => {
    if (totalValue >= 50000 && !ewayBill) return alert("E-Way Bill Compliance Required!");
    setLoading(true);
    setTimeout(() => {
      const lr = "FC" + Math.floor(10000000 + Math.random() * 90000000);
      const payload = { pickup, delivery, orderDetails, invoices, chargedWeight, totalValue, ewayBill, date: new Date().toLocaleDateString() };
      localStorage.setItem(lr, JSON.stringify(payload));
      setGeneratedLR(lr);
      setShowLR(true);
      setLoading(false);
    }, 2000);
  };

  const executeTracking = () => {
    setLoading(true);
    setTimeout(() => {
      const data = localStorage.getItem(searchLR);
      if (data) setTrackResult(JSON.parse(data));
      else alert("LR Number not found in Enterprise Ledger.");
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="order-wrapper">
      {/* SIDEBAR NAVIGATION */}
      <aside className={`nav-sidebar no-print ${!isSidebarOpen ? 'collapsed' : ''}`}>
        <div className="logo-brand">
          <img src={logo} alt="Faith Cargo" />
          <div className="brand-text">
            <h2>FAITH CARGO</h2>
            <div className="status-indicator">
              <div className="status-dot"></div>
              <span>System Online</span>
            </div>
          </div>
        </div>

        <nav className="side-menu">
          <div className={`menu-link ${activeTab === 'booking' ? 'active' : ''}`} onClick={() => setActiveTab('booking')}>
            <Plus size={22} /> <span>New Consignment</span>
          </div>
          <div className={`menu-link ${activeTab === 'tracking' ? 'active' : ''}`} onClick={() => setActiveTab('tracking')}>
            <Navigation size={22} /> <span>Live Tracking</span>
          </div>
          <div className="menu-link">
            <Briefcase size={22} /> <span>Client Ledger</span>
          </div>
          <div className="menu-link">
            <Activity size={22} /> <span>Performance</span>
          </div>
          <div className="menu-divider"></div>
          <div className="menu-link">
            <Settings size={22} /> <span>Configuration</span>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="avatar">AD</div>
            <div className="user-info">
              <p>Admin Control</p>
              <span>Verified Node</span>
            </div>
            <LogOut size={18} className="logout-btn" />
          </div>
        </div>
      </aside>

      {/* MAIN CONSOLE */}
      <main className="main-content">
        <header className="page-header no-print">
          <div className="header-text">
            <h1 className="text-gradient-red">{activeTab === 'booking' ? "Shipment Console" : "Tracking Center"}</h1>
            <p>Enterprise Logistics Management System v4.0</p>
          </div>

          {activeTab === 'booking' && (
            <div className="realtime-stats">
              <div className="stat-pill">
                <div className="stat-label">Payload</div>
                <div className="stat-value">{chargedWeight} <small>Kg</small></div>
              </div>
              <div className="stat-pill red-pill">
                <div className="stat-label">Value</div>
                <div className="stat-value">₹{totalValue}</div>
              </div>
              <div className="stat-pill">
                <div className="stat-label">Freight</div>
                <div className="stat-value">₹{freightEstimation}</div>
              </div>
            </div>
          )}
        </header>

        {activeTab === 'booking' ? (
          <div className="form-layout no-print animate-fade-in">
            {/* LEFT COMPONENT: ADDRESS FLOW */}
            <div className="address-flow">
              <section className="premium-card">
                <div className="card-top red-accent">
                  <div className="card-title-group">
                    <div className="icon-badge"><MapPin size={18} /></div>
                    <h3>Origin (Consignor)</h3>
                  </div>
                  <Filter size={16} color="#64748b" />
                </div>
                <div className="card-body">
                  <div className="input-row">
                    <div className="input-group">
                      <label>Consignor Name *</label>
                      <input 
                        placeholder="Company or Individual" 
                        value={pickup.name}
                        onChange={e => setPickup({...pickup, name: e.target.value.toUpperCase()})}
                      />
                    </div>
                    <div className="input-group">
                      <label>Contact Phone *</label>
                      <input 
                        placeholder="+91 XXXXX XXXXX" 
                        maxLength={10}
                        value={pickup.contact}
                        onChange={e => setPickup({...pickup, contact: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="input-group full-width">
                    <label>Pickup Point Address *</label>
                    <textarea 
                      placeholder="Detailed address with landmark..." 
                      rows="2"
                      value={pickup.address}
                      onChange={e => setPickup({...pickup, address: e.target.value})}
                    />
                  </div>
                  <div className="input-row">
                    <div className="input-group">
                      <label>Zip/Pincode</label>
                      <input 
                        placeholder="6-Digit Code" 
                        maxLength={6}
                        onChange={e => {
                          setPickup({...pickup, pincode: e.target.value});
                          handlePincodeLookup(e.target.value, "pickup");
                        }}
                      />
                    </div>
                    <div className="input-group">
                      <label>State & District</label>
                      <input 
                        className="locked-input" 
                        readOnly 
                        value={pickup.city ? `${pickup.city}, ${pickup.state}` : "Auto-fetching..."} 
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="premium-card">
                <div className="card-top dark-accent">
                  <div className="card-title-group">
                    <div className="icon-badge dark"><Truck size={18} /></div>
                    <h3>Destination (Consignee)</h3>
                  </div>
                </div>
                <div className="card-body">
                  <div className="input-row">
                    <div className="input-group">
                      <label>Consignee Name *</label>
                      <input 
                        placeholder="Receiver Name" 
                        value={delivery.name}
                        onChange={e => setDelivery({...delivery, name: e.target.value.toUpperCase()})}
                      />
                    </div>
                    <div className="input-group">
                      <label>Receiver Phone *</label>
                      <input 
                        placeholder="Contact Number" 
                        maxLength={10}
                        value={delivery.contact}
                        onChange={e => setDelivery({...delivery, contact: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="input-group full-width">
                    <label>Drop-off Point Address *</label>
                    <textarea 
                      placeholder="Final destination details..." 
                      rows="2"
                      value={delivery.address}
                      onChange={e => setDelivery({...delivery, address: e.target.value})}
                    />
                  </div>
                  <div className="input-row">
                    <div className="input-group">
                      <label>Zip/Pincode</label>
                      <input 
                        placeholder="6-Digit Code" 
                        maxLength={6}
                        onChange={e => {
                          setDelivery({...delivery, pincode: e.target.value});
                          handlePincodeLookup(e.target.value, "delivery");
                        }}
                      />
                    </div>
                    <div className="input-group">
                      <label>State & District</label>
                      <input 
                        className="locked-input" 
                        readOnly 
                        value={delivery.city ? `${delivery.city}, ${delivery.state}` : "Auto-fetching..."} 
                      />
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* RIGHT COMPONENT: VOLUMETRIC & BILLING */}
            <div className="billing-flow">
              <section className="volumetric-calculator animate-slide-in">
                <div className="vol-header">
                  <div className="flex-center gap-2">
                    <Box size={20} color="#d32f2f" />
                    <span className="font-bold">Dimensional Audit</span>
                  </div>
                  <div className="vol-badge">VOL WT: {volumetricWeight} Kg</div>
                </div>

                <div className="vol-controls mb-20">
                   <div className="input-group">
                      <label style={{color: '#94a3b8'}}>Description</label>
                      <input 
                        className="dark-style-input" 
                        placeholder="Items type..." 
                        onChange={e => setOrderDetails({...orderDetails, material: e.target.value.toUpperCase()})}
                      />
                   </div>
                </div>

                <div className="input-row mb-20">
                  <div className="input-group">
                    <label style={{color: '#94a3b8'}}>Actual (Kg)</label>
                    <input 
                      type="number" 
                      className="dark-style-input"
                      onChange={e => setOrderDetails({...orderDetails, weight: e.target.value})}
                    />
                  </div>
                  <div className="input-group">
                    <label style={{color: '#94a3b8'}}>Total PKGS</label>
                    <input 
                      type="number" 
                      className="dark-style-input"
                      onChange={e => {
                        const n = parseInt(e.target.value) || 0;
                        setOrderDetails({...orderDetails, boxesCount: n});
                        setBoxes(Array.from({length: n}, (_, i) => ({id: i+1, l: "", w: "", h: ""})));
                      }}
                    />
                  </div>
                </div>

                <div className="vol-grid-scroll custom-scroll">
                  {boxes.map((box, i) => (
                    <div key={i} className="vol-input-row">
                      <span className="box-index">{i+1}</span>
                      <input placeholder="L" type="number" onChange={e => { let b = [...boxes]; b[i].l = e.target.value; setBoxes(b); }} />
                      <input placeholder="W" type="number" onChange={e => { let b = [...boxes]; b[i].w = e.target.value; setBoxes(b); }} />
                      <input placeholder="H" type="number" onChange={e => { let b = [...boxes]; b[i].h = e.target.value; setBoxes(b); }} />
                    </div>
                  ))}
                </div>
              </section>

              <section className="premium-card mt-30">
                <div className="card-top justify-between">
                  <h3>Compliance & Invoices</h3>
                  <button className="mini-add-btn" onClick={() => setInvoices([...invoices, {id: Date.now(), no: "", value: "" }])}>
                    <Plus size={14} /> Add
                  </button>
                </div>
                <div className="card-body">
                   <div className="dynamic-container">
                      {invoices.map((inv) => (
                        <div key={inv.id} className="dynamic-inv-row">
                          <input 
                            placeholder="INV No" 
                            onChange={e => setInvoices(invoices.map(i => i.id === inv.id ? {...i, no: e.target.value.toUpperCase()} : i))}
                          />
                          <input 
                            placeholder="Value ₹" 
                            type="number"
                            onChange={e => setInvoices(invoices.map(i => i.id === inv.id ? {...i, value: e.target.value} : i))}
                          />
                          <button className="row-del-btn" onClick={() => setInvoices(invoices.filter(i => i.id !== inv.id))}>×</button>
                        </div>
                      ))}
                   </div>

                   {totalValue >= 50000 && (
                     <div className="eway-critical-box animate-pulse-red">
                        <div className="alert-header mb-10">
                          <ShieldCheck size={20} color="#d32f2f" />
                          <span className="font-black text-red">GST E-WAY BILL REQUIRED</span>
                        </div>
                        <input 
                          className="eway-main-input" 
                          placeholder="0000 0000 0000"
                          maxLength={12}
                          onChange={e => setEwayBill(e.target.value)}
                        />
                     </div>
                   )}
                </div>
              </section>

              <div className="action-wrapper">
                <button className={`final-submit-btn ${loading ? 'btn-loading' : ''}`} onClick={executeGeneration}>
                  {loading ? "COMMITTING DATA..." : "GENERATE CONSIGMENT"}
                  <ChevronRight size={24} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* TRACKING MODULE */
          <div className="tracking-center no-print animate-fade-in">
             <div className="tracking-hero">
                <div className="search-giant-box shadow-premium">
                  <Search size={30} color="#d32f2f" />
                  <input 
                    placeholder="Search Global Consignment Index (e.g., FC100293)" 
                    value={searchLR}
                    onChange={e => setSearchLR(e.target.value.toUpperCase())}
                  />
                  <button onClick={executeTracking}>TRACE SHIPMENT</button>
                </div>
             </div>

             {trackResult ? (
               <div className="tracking-dashboard mt-50">
                  <div className="status-timeline-box premium-card">
                    <div className="p-40">
                      <div className="flex-justify mb-40">
                         <div>
                            <p className="label">LR NUMBER</p>
                            <h2 className="text-32 font-black">{searchLR}</h2>
                         </div>
                         <div className="live-status-badge">IN TRANSIT</div>
                      </div>
                      
                      <div className="enterprise-stepper">
                        <div className="step-point completed">
                          <div className="check"><CheckCircle size={16} /></div>
                          <p>Booked</p>
                          <span>{trackResult.date}</span>
                        </div>
                        <div className="step-point current">
                          <div className="check"><Clock size={16} /></div>
                          <p>Dispatched</p>
                          <span>Delhi Hub</span>
                        </div>
                        <div className="step-point">
                          <div className="check"></div>
                          <p>In-Transit</p>
                          <span>Rail/Air</span>
                        </div>
                        <div className="step-point">
                          <div className="check"></div>
                          <p>Delivered</p>
                          <span>-</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-40">
                    <h3 className="mb-20 font-black uppercase">Consignment Metadata</h3>
                    <ShipmentDocket 
                      data={trackResult} 
                      lrNumber={searchLR} 
                      totalValue={trackResult.totalValue} 
                      ewayBill={trackResult.ewayBill} 
                    />
                  </div>
               </div>
             ) : (
               <div className="empty-state-tracker">
                  <div className="radar-animation"></div>
                  <h3>Waiting for Query</h3>
                  <p>Enter a valid Faith Cargo LR number to fetch real-time telemetry.</p>
               </div>
             )}
          </div>
        )}

        {/* MODAL SYSTEM */}
        {showLR && (
          <div className="modal-overlay no-print">
            <div className="modal-content">
              <div className="modal-close" onClick={() => setShowLR(false)}><X size={30} /></div>
              <div className="success-banner">
                 <div className="success-circle"><CheckCircle size={60} /></div>
                 <h1 className="font-black">LEDGER ENTRY SUCCESSFUL</h1>
                 <p className="lr-copy-box" onClick={() => navigator.clipboard.writeText(generatedLR)}>
                    ID: {generatedLR} <MousePointer2 size={16} />
                 </p>
              </div>

              <div className="modal-preview-scroll">
                 <ShipmentDocket 
                    data={{pickup, delivery, orderDetails, invoices, chargedWeight}} 
                    lrNumber={generatedLR} 
                    totalValue={totalValue} 
                    ewayBill={ewayBill} 
                  />
              </div>

              <div className="modal-footer-actions">
                 <button className="btn-print-main" onClick={() => window.print()}>
                   <Printer size={20} /> PRINT HARDCOPY
                 </button>
                 <button className="btn-secondary" onClick={() => window.location.reload()}>
                   <Plus size={20} /> CREATE NEW
                 </button>
              </div>
            </div>
          </div>
        )}

        {/* HIDDEN PRINT COMPONENT */}
        <div className="print-only">
           <ShipmentDocket 
              data={{pickup, delivery, orderDetails, invoices, chargedWeight}} 
              lrNumber={generatedLR || searchLR} 
              totalValue={totalValue || (trackResult?.totalValue)} 
              ewayBill={ewayBill || (trackResult?.ewayBill)} 
            />
        </div>
      </main>
    </div>
  );
}