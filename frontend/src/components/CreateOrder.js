import React, { useState, useMemo, useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import axios from "axios";
import { 
  Truck, MapPin, Package, FileText, Plus, Trash2, CheckCircle, Printer, 
  ChevronRight, AlertCircle, ShieldCheck, Navigation, IndianRupee, Search, 
  X, Upload, Info, CreditCard, Box, Layout, Settings, LogOut, ArrowRight, 
  Activity, Clock, Layers, Filter, Download, ExternalLink, MousePointer2, 
  Briefcase, Globe, RefreshCw, Smartphone, BarChart3, Scan, Circle, Eye, User
} from "lucide-react";
import logo from "../assets/logo.png";
import "./CreateOrder.css";

/* ==========================================================================
   CONFIG & API CONSTANTS
   ========================================================================== */
const TRUXCARGO_API = "https://b2b.truxcargo.com/api/order/tracking";
const API_KEY = "YOUR_KEY_HERE"; 

/* ==========================================================================
   COMPONENT: PROFESSIONAL A4 DOCKET (PRINT PREVIEW)
   ========================================================================== */
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
    <div className="docket-container printable">
      <div className="docket-header">
        <div className="docket-brand">
          <img src={logo} alt="Faith Cargo" className="docket-logo" />
          <div className="brand-info">
            <h2>FAITH CARGO PVT LTD</h2>
            <p>ISO 9001:2015 | GST: 07AAFCF2947K1ZD</p>
          </div>
        </div>
        <div className="docket-lr-meta">
          <canvas ref={barcodeRef}></canvas>
          <div className="lr-text">LR: {lrNumber}</div>
          <div className="date-text">DATE: {new Date().toLocaleDateString('en-IN')}</div>
        </div>
      </div>

      <div className="address-section">
        <div className="addr-box">
          <div className="addr-label">CONSIGNOR (SENDER)</div>
          <h3>{data.pickup?.name || "N/A"}</h3>
          <p>{data.pickup?.address}</p>
          <p><strong>PH:</strong> {data.pickup?.contact}</p>
        </div>
        <div className="addr-box">
          <div className="addr-label">CONSIGNEE (RECEIVER)</div>
          <h3>{data.delivery?.name || "N/A"}</h3>
          <p>{data.delivery?.address}</p>
          <p><strong>PH:</strong> {data.delivery?.contact}</p>
        </div>
      </div>

      <table className="docket-table">
        <thead>
          <tr>
            <th>PKGS</th>
            <th>DESCRIPTION</th>
            <th>ACTUAL WT</th>
            <th>CHARGED WT</th>
            <th>INV DETAILS</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{data.orderDetails?.boxesCount}</td>
            <td>{data.orderDetails?.material}</td>
            <td>{data.orderDetails?.weight} Kg</td>
            <td>{data.chargedWeight} Kg</td>
            <td>
              INV: {data.invoices?.[0]?.no} <br/> 
              VAL: ₹{totalValue}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="docket-footer">
        <div className="disclaimer">
          <p>* All disputes under Delhi Jurisdiction only.</p>
          <p>* Carrier not responsible for damage due to poor packing.</p>
        </div>
        <div className="sig-area">
          <div className="sig-line">Auth. Signatory</div>
        </div>
      </div>
    </div>
  );
};

/* ==========================================================================
   MAIN SYSTEM CONTROLLER
   ========================================================================== */
export default function CreateOrder() {
  // Navigation & Control
  const [activeTab, setActiveTab] = useState("booking");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Form States
  const [pickup, setPickup] = useState({ name: "", contact: "", address: "", pincode: "", state: "", city: "" });
  const [delivery, setDelivery] = useState({ name: "", contact: "", address: "", pincode: "", state: "", city: "" });
  const [orderDetails, setOrderDetails] = useState({ material: "", weight: "", boxesCount: 0 });
  const [boxes, setBoxes] = useState([]);
  const [invoices, setInvoices] = useState([{ id: Date.now(), no: "", value: "" }]);
  const [ewayBill, setEwayBill] = useState("");

  // Storage & Tracking
  const [generatedLR, setGeneratedLR] = useState("");
  const [trackResult, setTrackResult] = useState(null);
  const [shipments, setShipments] = useState(() => JSON.parse(localStorage.getItem("fc_ledger") || "[]"));

  // Computed Values
  const totalValue = useMemo(() => invoices.reduce((s, i) => s + (parseFloat(i.value) || 0), 0), [invoices]);
  const volumetricWeight = useMemo(() => {
    const total = boxes.reduce((acc, b) => acc + ((parseFloat(b.l || 0) * parseFloat(b.w || 0) * parseFloat(b.h || 0)) / 4000), 0);
    return total.toFixed(2);
  }, [boxes]);
  const chargedWeight = Math.max(parseFloat(orderDetails.weight || 0), parseFloat(volumetricWeight));

  /* -----------------------------------------------------------
      LOGIC: PINCODE LOOKUP
      ----------------------------------------------------------- */
  const handlePincode = async (pin, type) => {
    if (pin.length === 6) {
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const data = await res.json();
        if (data[0].Status === "Success") {
          const loc = { state: data[0].PostOffice[0].State, city: data[0].PostOffice[0].District };
          type === "pickup" ? setPickup(p => ({...p, ...loc})) : setDelivery(d => ({...d, ...loc}));
        }
      } catch (e) { console.error("Pincode API Error"); }
    }
  };

  /* -----------------------------------------------------------
      LOGIC: TRUXCARGO API TRACKING
      ----------------------------------------------------------- */
  const trackLiveShipment = async (lr) => {
    setLoading(true);
    try {
      const res = await axios.post(TRUXCARGO_API, { key: API_KEY, lrnum: lr });
      if (res.data.status) {
        setTrackResult(res.data.data.shipment);
      } else {
        alert("LR Not Found: " + res.data.remark);
      }
    } catch (err) {
      alert("API Connection Error");
    }
    setLoading(false);
  };

  /* -----------------------------------------------------------
      LOGIC: GENERATE SHIPMENT & SAVE
      ----------------------------------------------------------- */
  const generateConsignment = () => {
    if (!pickup.name || !delivery.name) return alert("Pehle basic details bharo!");
    
    setLoading(true);
    setTimeout(() => {
      const lr = "FC" + Math.floor(10000000 + Math.random() * 90000000);
      const payload = { 
        id: lr, pickup, delivery, orderDetails, invoices, 
        chargedWeight, totalValue, ewayBill, date: new Date().toISOString() 
      };
      
      const newLedger = [payload, ...shipments];
      setShipments(newLedger);
      localStorage.setItem("fc_ledger", JSON.stringify(newLedger));
      
      setGeneratedLR(lr);
      setLoading(false);
      setShowModal(true); 
    }, 1500);
  };

  return (
    <div className="fc-enterprise-wrapper">
      <aside className="enterprise-sidebar no-print">
        <div className="sidebar-brand">
          <img src={logo} alt="Faith Cargo" />
          <div className="brand-meta">
            <h2>FAITH CARGO</h2>
            <div className="live-badge"><div className="pulse"></div> System Active</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className={`nav-item ${activeTab === 'booking' ? 'active' : ''}`} onClick={() => setActiveTab('booking')}>
            <Plus size={20}/> <span>New Consignment</span>
          </div>
          <div className={`nav-item ${activeTab === 'tracking' ? 'active' : ''}`} onClick={() => setActiveTab('tracking')}>
            <Navigation size={20}/> <span>Live Tracking</span>
          </div>
          <div className={`nav-item ${activeTab === 'ledger' ? 'active' : ''}`} onClick={() => setActiveTab('ledger')}>
            <Briefcase size={20}/> <span>Client Ledger</span>
          </div>
          <div className="nav-item"><Activity size={20}/> <span>Performance</span></div>
          <div className="nav-item"><Settings size={20}/> <span>Configuration</span></div>
        </nav>

        <div className="sidebar-footer">
          <div className="admin-pill">
            <div className="pill-avatar">AD</div>
            <div className="pill-text"><b>Admin</b><p>v4.0.2-Stable</p></div>
            <LogOut size={16} />
          </div>
        </div>
      </aside>

      <main className="enterprise-main">
        {activeTab === 'booking' && (
          <div className="booking-view animate-fade">
            <header className="main-header no-print">
              <h1>Shipment Console <small>Create New Entry</small></h1>
              <div className="header-stats">
                <div className="stat">Weight: <b>{chargedWeight} Kg</b></div>
                <div className="stat red">Value: <b>₹{totalValue}</b></div>
              </div>
            </header>

            <div className="booking-grid no-print">
              <div className="grid-left">
                <section className="booking-card">
                  <div className="card-header"><MapPin size={18}/> Origin Details</div>
                  <div className="card-body">
                    <input placeholder="Consignor Name" onChange={e => setPickup({...pickup, name: e.target.value.toUpperCase()})} />
                    <input placeholder="Contact Phone" maxLength={10} onChange={e => setPickup({...pickup, contact: e.target.value})} />
                    <textarea placeholder="Detailed Address" onChange={e => setPickup({...pickup, address: e.target.value})} />
                    <div className="row">
                      <input placeholder="Pincode" maxLength={6} onChange={e => {
                        setPickup({...pickup, pincode: e.target.value});
                        handlePincode(e.target.value, "pickup");
                      }} />
                      <input className="read-only" value={pickup.city ? `${pickup.city}, ${pickup.state}` : "Auto-Location"} readOnly />
                    </div>
                  </div>
                </section>

                <section className="booking-card">
                  <div className="card-header"><Truck size={18}/> Destination Details</div>
                  <div className="card-body">
                    <input placeholder="Consignee Name" onChange={e => setDelivery({...delivery, name: e.target.value.toUpperCase()})} />
                    <input placeholder="Contact Phone" maxLength={10} onChange={e => setDelivery({...delivery, contact: e.target.value})} />
                    <textarea placeholder="Drop Address" onChange={e => setDelivery({...delivery, address: e.target.value})} />
                    <div className="row">
                      <input placeholder="Pincode" maxLength={6} onChange={e => {
                        setDelivery({...delivery, pincode: e.target.value});
                        handlePincode(e.target.value, "delivery");
                      }} />
                      <input className="read-only" value={delivery.city ? `${delivery.city}, ${delivery.state}` : "Auto-Location"} readOnly />
                    </div>
                  </div>
                </section>
              </div>

              <div className="grid-right">
                <section className="booking-card black-card">
                  <div className="card-header"><Box size={18}/> Volumetric Audit</div>
                  <div className="card-body">
                    <div className="row">
                      <input placeholder="Material Desc" className="flex-2" onChange={e => setOrderDetails({...orderDetails, material: e.target.value})} />
                      <input type="number" placeholder="Weight" onChange={e => setOrderDetails({...orderDetails, weight: e.target.value})} />
                    </div>
                    <div className="pkg-input">
                      <label>Total Packages:</label>
                      <input type="number" onChange={e => {
                        const n = parseInt(e.target.value) || 0;
                        setOrderDetails({...orderDetails, boxesCount: n});
                        setBoxes(Array.from({length: n}, (_, i) => ({id: i+1, l: "", w: "", h: ""})));
                      }} />
                    </div>
                    <div className="boxes-scroller">
                      {boxes.map((box, i) => (
                        <div key={i} className="box-row">
                          <span>Pkg {i+1}</span>
                          <input placeholder="L" onChange={e => { let b = [...boxes]; b[i].l = e.target.value; setBoxes(b); }} />
                          <input placeholder="W" onChange={e => { let b = [...boxes]; b[i].w = e.target.value; setBoxes(b); }} />
                          <input placeholder="H" onChange={e => { let b = [...boxes]; b[i].h = e.target.value; setBoxes(b); }} />
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <button className="final-btn" onClick={generateConsignment}>
                  {loading ? "PROCESSING..." : "GENERATE & SAVE DOCKET"}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ledger' && (
          <div className="ledger-view animate-fade">
              <header className="main-header">
                <h1>Client Ledger <small>Consignment Archive</small></h1>
                <button className="export-btn"><Download size={16}/> Export Excel</button>
              </header>
              <table className="enterprise-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>LR Number</th>
                    <th>Receiver</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {shipments.map((s, idx) => (
                    <tr key={idx}>
                      <td>{new Date(s.date).toLocaleDateString()}</td>
                      <td><b>{s.id}</b></td>
                      <td>{s.delivery.name}</td>
                      <td><span className="badge">Manifested</span></td>
                      <td>
                         <button className="icon-btn" onClick={() => {
                           setGeneratedLR(s.id);
                           setPickup(s.pickup);
                           setDelivery(s.delivery);
                           setOrderDetails(s.orderDetails);
                           setInvoices(s.invoices);
                           setShowModal(true);
                         }}><Printer size={16}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>
        )}

        {activeTab === 'tracking' && (
          <div className="tracking-view animate-fade">
            <header className="main-header">
              <h1>Truxcargo Live Trace</h1>
            </header>
            <div className="search-giant-box">
              <Search size={24}/>
              <input placeholder="Enter Truxcargo LR Number" id="lrTrackInput" />
              <button onClick={() => trackLiveShipment(document.getElementById('lrTrackInput').value)}>TRACE NOW</button>
            </div>

            {trackResult && (
              <div className="track-card animate-up">
                  <div className="track-header">
                    <h3>Current Status: <span>{trackResult.status}</span></h3>
                    <p>Manifest Date: {trackResult.manifestDate}</p>
                  </div>
                  <div className="track-steps">
                    <div className="step done"><CheckCircle size={14}/> Booked</div>
                    <div className="step done"><CheckCircle size={14}/> Manifested</div>
                    <div className="step current"><Clock size={14}/> In Transit</div>
                    <div className="step"><Circle size={14}/> Delivered</div>
                  </div>
              </div>
            )}
          </div>
        )}
      </main>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-zoom">
             <div className="modal-header">
               <h2><ShieldCheck size={20} color="#d32f2f"/> DOCKET PREVIEW</h2>
               <button onClick={() => setShowModal(false)}><X size={24}/></button>
             </div>
             
             <div className="preview-container">
                <ShipmentDocket 
                  data={{pickup, delivery, orderDetails, invoices, chargedWeight}} 
                  lrNumber={generatedLR} 
                  totalValue={totalValue} 
                  ewayBill={ewayBill} 
                />
             </div>

             <div className="modal-actions no-print">
                <button className="print-btn" onClick={() => window.print()}>
                  <Printer size={18}/> PRINT HARDCOPY (A4)
                </button>
                <button className="new-btn" onClick={() => window.location.reload()}>
                  <Plus size={18}/> CREATE NEW SHIPMENT
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}