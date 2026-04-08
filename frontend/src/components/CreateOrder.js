import React, { useState, useMemo, useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { 
  Truck, MapPin, Package, FileText, Plus, Trash2,
  Calculator, CheckCircle, Printer, ChevronRight, AlertCircle, 
  ShieldCheck, Box, Info, Navigation, CreditCard, Upload, Phone,
  Settings, User, LogOut, Search, RefreshCw, Layers, FileUp, X,
  FileSearch, Download, ClipboardCheck, History, BarChart3
} from "lucide-react";
import logo from "../assets/logo.png";
import "./CreateOrder.css";

// ================================================================
// 1. PREMIUM DOCKET COMPONENT (PRINT VERSION)
// ================================================================
const ShipmentDocket = ({ data, lrNumber, totalValue, ewayBill, billing, showFreight, copyType }) => {
  const barcodeRef = useRef(null);
  
  useEffect(() => {
    if (lrNumber && barcodeRef.current) {
      JsBarcode(barcodeRef.current, lrNumber, {
        format: "CODE128", 
        width: 1.2, 
        height: 30, 
        displayValue: false, 
        margin: 0,
        lineColor: "#000"
      });
    }
  }, [lrNumber]);

  return (
    <div className="docket-page">
      <div className={`docket-inner-border ${copyType.toLowerCase()}`}>
        {/* Top Header Section */}
        <div className="docket-header-top">
          <div className="docket-logo-section">
            <img src={logo} alt="Faith Cargo Logo" className="docket-logo" />
            <div className="company-info">
              <h1 className="company-name">FAITH CARGO PVT. LTD.</h1>
              <p className="company-tagline">Excellence in Express & Logistics Solutions</p>
              <p className="company-meta">ISO 9001:2015 Certified | GSTIN: 07AAFCF2947K1ZD</p>
            </div>
          </div>
          
          <div className="docket-lr-section">
            <div className="copy-type-badge">{copyType} COPY</div>
            <div className="barcode-box">
              <canvas ref={barcodeRef}></canvas>
              <p className="lr-text">{lrNumber}</p>
            </div>
            <div className="lr-date-box">
              <div className="date-item">DATE: <strong>{new Date().toLocaleDateString('en-IN')}</strong></div>
              <div className="date-item">FROM: <strong>{data.pickup.city || "DELHI"}</strong></div>
            </div>
          </div>
        </div>

        <div className="ho-address-strip">
          H.O: 4/15, Kirti Nagar Industrial Area, New Delhi-110015 | Helpline: +91 9818641504 | Website: www.faithcargo.com
        </div>

        {/* Address Grid */}
        <div className="docket-address-grid">
          <div className="address-column sender">
            <div className="column-title"><MapPin size={12}/> CONSIGNOR (SENDER)</div>
            <div className="address-content">
              <h3>{data.pickup.name || "N/A"}</h3>
              <p className="addr-text">{data.pickup.address}</p>
              <p><strong>GST:</strong> {data.pickup.gst || "URD"}</p>
              <p><strong>PH:</strong> +91 {data.pickup.contact}</p>
              <p><strong>PIN:</strong> {data.pickup.pincode} ({data.pickup.city})</p>
            </div>
          </div>
          <div className="address-column receiver">
            <div className="column-title"><Truck size={12}/> CONSIGNEE (RECEIVER)</div>
            <div className="address-content">
              <h3>{data.delivery.name || "N/A"}</h3>
              <p className="addr-text">{data.delivery.address}</p>
              <p><strong>GST:</strong> {data.delivery.gst || "URD"}</p>
              <p><strong>PH:</strong> +91 {data.delivery.contact}</p>
              <p><strong>PIN:</strong> {data.delivery.pincode} ({data.delivery.city})</p>
            </div>
          </div>
        </div>

        {/* Shipment Details Table */}
        <table className="docket-main-table">
          <thead>
            <tr>
              <th width="8%">PKGS</th>
              <th width="45%">DESCRIPTION OF GOODS (SAID TO CONTAIN)</th>
              <th width="15%">ACTUAL WT.</th>
              <th width="15%">CHARGED WT.</th>
              <th width="17%">INV / E-WAY BILL</th>
            </tr>
          </thead>
          <tbody>
            <tr className="data-row">
              <td className="center-text"><strong>{data.orderDetails.boxesCount}</strong></td>
              <td>
                <div className="desc-flex">
                  <span className="material-type">{data.orderDetails.material || "GENERAL MERCHANDISE"}</span>
                  <div className="risk-tag">CARRIER'S RISK: NO (OWNER'S RISK)</div>
                </div>
              </td>
              <td className="center-text">{data.orderDetails.weight} Kg</td>
              <td className="center-text highlighted-wt">{data.chargedWeight} Kg</td>
              <td>
                <div className="inv-mini-list">
                  {data.invoices.map((inv, i) => (
                    <div key={i} className="inv-p">#{inv.no} (₹{inv.value})</div>
                  ))}
                  {ewayBill && <div className="ewb-badge">EWB: {ewayBill}</div>}
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Footer Billing Section */}
        <div className="docket-footer-grid">
          <div className="footer-terms">
            <h4>TERMS & CONDITIONS:</h4>
            <ol>
              <li>The company is not responsible for any leakage or breakage.</li>
              <li>Insurance of goods is the responsibility of the consignor.</li>
              <li>Subject to Delhi Jurisdiction only. Claims must be filed within 7 days.</li>
              <li>No claims will be entertained without an original booking receipt.</li>
            </ol>
            <div className="tracking-footer">Track at: <strong>www.faithcargo.com</strong></div>
          </div>

          <div className="footer-billing">
            <div className="bill-item">
              <span>FREIGHT CHARGES:</span>
              <strong>{showFreight ? `₹${billing.total}` : "AS PER AGMT"}</strong>
            </div>
            <div className="bill-item">
              <span>PAYMENT MODE:</span>
              <strong>{data.paymentMode}</strong>
            </div>
            <div className="bill-item total-row">
              <span>GRAND TOTAL:</span>
              <strong>{showFreight ? `₹${billing.total}` : "TO-PAY / TBB"}</strong>
            </div>
          </div>

          <div className="footer-signatures">
            <div className="sig-box">
              <div className="sig-line"></div>
              <span>CONSIGNOR SIGNATURE</span>
            </div>
            <div className="sig-box office-stamp">
              <p>For <strong>FAITH CARGO PVT LTD</strong></p>
              <div className="stamp-placeholder">AUTHORIZED SIGNATORY</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ================================================================
// 2. MAIN CREATE ORDER APPLICATION
// ================================================================
export default function CreateOrder() {
  // Application Control States
  const [lrSequence, setLrSequence] = useState(10521);
  const [loading, setLoading] = useState(false);
  const [showLR, setShowLR] = useState(false);
  const [lrNumber, setLrNumber] = useState("");
  const [activeTab, setActiveTab] = useState("booking");

  // Form Data States
  const [pickup, setPickup] = useState({ name: "", contact: "", address: "", pincode: "", state: "", city: "", gst: "" });
  const [delivery, setDelivery] = useState({ name: "", contact: "", address: "", pincode: "", state: "", city: "", gst: "" });
  const [orderDetails, setOrderDetails] = useState({ material: "CLOTHES", weight: "", boxesCount: 0 });
  const [boxes, setBoxes] = useState([]);
  const [invoices, setInvoices] = useState([{ id: Date.now(), no: "", value: "", file: null }]);
  const [ewayBill, setEwayBill] = useState("");
  const [paymentMode, setPaymentMode] = useState("CREDIT");
  const [showFreight, setShowFreight] = useState(true);

  // --- Calculations Logic ---
  const volWeight = useMemo(() => {
    const totalVol = boxes.reduce((acc, b) => acc + (parseFloat(b.l || 0) * parseFloat(b.w || 0) * parseFloat(b.h || 0)), 0);
    return (totalVol / 4500).toFixed(2); // Cargo Standard Factor
  }, [boxes]);

  const chargedWeight = Math.max(parseFloat(orderDetails.weight || 0), parseFloat(volWeight));

  const billingSummary = useMemo(() => {
    const perKg = 18.00;
    const docketFee = 150;
    const fuelSurcharge = 0.10; // 10%
    const base = chargedWeight * perKg;
    const withFuel = base + (base * fuelSurcharge) + docketFee;
    const gst = withFuel * 0.18;
    return {
      base: base.toFixed(2),
      fuel: (base * fuelSurcharge).toFixed(2),
      docket: docketFee.toFixed(2),
      gst: gst.toFixed(2),
      total: Math.round(withFuel + gst)
    };
  }, [chargedWeight]);

  const totalInvoiceVal = invoices.reduce((s, i) => s + (parseFloat(i.value) || 0), 0);

  // --- Handlers ---
  const handlePincode = async (val, target) => {
    if (val.length === 6) {
      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${val}`);
        const data = await response.json();
        if (data[0].Status === "Success") {
          const res = data[0].PostOffice[0];
          const update = { city: res.District, state: res.State };
          target === 'pickup' ? setPickup(p => ({ ...p, ...update })) : setDelivery(d => ({ ...d, ...update }));
        }
      } catch (e) { console.error("Pin API Fail"); }
    }
  };

  const addBoxRow = (count) => {
    const n = parseInt(count) || 0;
    setOrderDetails(prev => ({ ...prev, boxesCount: n }));
    setBoxes(Array.from({ length: n }, (_, i) => ({ id: i, l: "", w: "", h: "" })));
  };

  const handleInvoiceFile = (id, file) => {
    if (file) {
      setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, file: file } : inv));
    }
  };

  const submitOrder = () => {
    if (!pickup.name || !delivery.name || !orderDetails.weight) {
      alert("Please fill mandatory company and weight details.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const finalLR = `FCP${lrSequence}DEL`;
      setLrNumber(finalLR);
      setLrSequence(s => s + 1);
      setShowLR(true);
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="enterprise-layout">
      {/* 1. SIDE NAVIGATION */}
      <aside className="sidebar-nav no-print">
        <div className="sidebar-brand">
          <img src={logo} alt="Faith Cargo" />
          <div className="status-badge">
            <span className="dot"></span> NODE-01 ACTIVE
          </div>
        </div>

        <div className="nav-sections">
          <div className="section-label">OPERATIONS</div>
          <button className={`nav-btn ${activeTab === 'booking' ? 'active' : ''}`} onClick={() => setActiveTab('booking')}>
            <Plus size={18}/> New Booking
          </button>
          <button className="nav-btn"><Layers size={18}/> Manifest List</button>
          <button className="nav-btn"><Navigation size={18}/> DRS Management</button>
          
          <div className="section-label">REPORTS</div>
          <button className="nav-btn"><BarChart3 size={18}/> Sales Analytics</button>
          <button className="nav-btn"><FileSearch size={18}/> Audit Logs</button>
          <button className="nav-btn"><History size={18}/> History</button>
        </div>

        <div className="sidebar-user-card">
          <div className="u-info">
            <div className="u-avatar">AD</div>
            <div className="u-text">
              <p>Admin User</p>
              <span>Delhi Branch</span>
            </div>
          </div>
          <button className="logout-icon"><LogOut size={16}/></button>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <main className="main-viewport">
        <header className="viewport-header no-print">
          <div className="header-left">
            <h2>Create New Consignment</h2>
            <p>System Date: {new Date().toDateString()}</p>
          </div>
          <div className="header-right">
            <div className="global-search">
              <Search size={16}/>
              <input type="text" placeholder="Track LR Number..." />
            </div>
            <button className="icon-circle"><Settings size={18}/></button>
          </div>
        </header>

        <div className="content-container no-print">
          <div className="booking-grid">
            
            {/* LEFT COLUMN: Addresses */}
            <div className="booking-col">
              {/* Consignor Card */}
              <section className="card">
                <div className="card-top red-line">
                  <MapPin size={18} className="text-red-600"/>
                  <h3>Consignor Information</h3>
                </div>
                <div className="card-content grid-2">
                  <div className="field full">
                    <label>Company Name *</label>
                    <input type="text" value={pickup.name} onChange={e => setPickup({...pickup, name: e.target.value.toUpperCase()})} placeholder="Sender Company Ltd"/>
                  </div>
                  <div className="field">
                    <label>Pincode *</label>
                    <input type="text" maxLength={6} value={pickup.pincode} onChange={e => {setPickup({...pickup, pincode: e.target.value}); handlePincode(e.target.value, 'pickup')}}/>
                  </div>
                  <div className="field">
                    <label>Contact No *</label>
                    <input type="tel" maxLength={10} value={pickup.contact} onChange={e => setPickup({...pickup, contact: e.target.value})}/>
                  </div>
                  <div className="field">
                    <label>City</label>
                    <input type="text" value={pickup.city} readOnly className="read-only-input"/>
                  </div>
                  <div className="field">
                    <label>State</label>
                    <input type="text" value={pickup.state} readOnly className="read-only-input"/>
                  </div>
                  <div className="field full">
                    <label>Full Address *</label>
                    <textarea rows="2" value={pickup.address} onChange={e => setPickup({...pickup, address: e.target.value})}></textarea>
                  </div>
                </div>
              </section>

              {/* Consignee Card */}
              <section className="card mt-6">
                <div className="card-top blue-line">
                  <Truck size={18} className="text-blue-600"/>
                  <h3>Consignee Information</h3>
                </div>
                <div className="card-content grid-2">
                  <div className="field full">
                    <label>Receiver Name *</label>
                    <input type="text" value={delivery.name} onChange={e => setDelivery({...delivery, name: e.target.value.toUpperCase()})} placeholder="Receiver Pvt Ltd"/>
                  </div>
                  <div className="field">
                    <label>Pincode *</label>
                    <input type="text" maxLength={6} value={delivery.pincode} onChange={e => {setDelivery({...delivery, pincode: e.target.value}); handlePincode(e.target.value, 'delivery')}}/>
                  </div>
                  <div className="field">
                    <label>Contact No *</label>
                    <input type="tel" maxLength={10} value={delivery.contact} onChange={e => setDelivery({...delivery, contact: e.target.value})}/>
                  </div>
                  <div className="field">
                    <label>City</label>
                    <input type="text" value={delivery.city} readOnly className="read-only-input"/>
                  </div>
                  <div className="field">
                    <label>State</label>
                    <input type="text" value={delivery.state} readOnly className="read-only-input"/>
                  </div>
                  <div className="field full">
                    <label>Delivery Address *</label>
                    <textarea rows="2" value={delivery.address} onChange={e => setDelivery({...delivery, address: e.target.value})}></textarea>
                  </div>
                </div>
              </section>
            </div>

            {/* RIGHT COLUMN: Cargo & Billing */}
            <div className="booking-col">
              {/* Shipment Details */}
              <section className="card">
                <div className="card-top">
                  <Box size={18} className="text-gray-600"/>
                  <h3>Cargo & Dimension Details</h3>
                </div>
                <div className="card-content">
                  <div className="grid-3 mb-4">
                    <div className="field">
                      <label>Material Type</label>
                      <select value={orderDetails.material} onChange={e => setOrderDetails({...orderDetails, material: e.target.value})}>
                        <option>GENERAL MERCHANDISE</option>
                        <option>CLOTHES</option>
                        <option>ELECTRONICS</option>
                        <option>SPARE PARTS</option>
                        <option>FURNITURE</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>Actual Wt (Kg)</label>
                      <input type="number" value={orderDetails.weight} onChange={e => setOrderDetails({...orderDetails, weight: e.target.value})}/>
                    </div>
                    <div className="field">
                      <label>No. of PKGS</label>
                      <input type="number" onChange={e => addBoxRow(e.target.value)}/>
                    </div>
                  </div>

                  {boxes.length > 0 && (
                    <div className="volumetric-box">
                      <div className="vol-header">
                        <span>Box Dimensions (L x W x H) - CM</span>
                        <span className="vol-result">Vol. Wt: {volWeight} Kg</span>
                      </div>
                      <div className="vol-scroll">
                        {boxes.map((box, i) => (
                          <div key={i} className="vol-row">
                            <span className="box-idx">#{i+1}</span>
                            <input placeholder="L" type="number" onChange={e => {let b=[...boxes]; b[i].l=e.target.value; setBoxes(b)}}/>
                            <input placeholder="W" type="number" onChange={e => {let b=[...boxes]; b[i].w=e.target.value; setBoxes(b)}}/>
                            <input placeholder="H" type="number" onChange={e => {let b=[...boxes]; b[i].h=e.target.value; setBoxes(b)}}/>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Billing & Invoices */}
              <section className="card mt-6">
                <div className="card-top justify-between">
                  <div className="flex gap-2 items-center">
                    <Calculator size={18} className="text-green-600"/>
                    <h3>Invoicing & Billing</h3>
                  </div>
                  <button className="add-btn-small" onClick={() => setInvoices([...invoices, { id: Date.now(), no: "", value: "", file: null }])}>
                    <Plus size={14}/> Add Invoice
                  </button>
                </div>
                <div className="card-content">
                  <div className="invoice-scroller">
                    {invoices.map((inv) => (
                      <div key={inv.id} className="inv-row-premium">
                        <input placeholder="Inv No" className="inv-input" onChange={e => setInvoices(invoices.map(i => i.id === inv.id ? {...i, no: e.target.value} : i))}/>
                        <input placeholder="Value ₹" type="number" className="inv-input" onChange={e => setInvoices(invoices.map(i => i.id === inv.id ? {...i, value: e.target.value} : i))}/>
                        <label className="inv-upload">
                          {inv.file ? <ClipboardCheck size={16} className="text-green-500"/> : <Upload size={16}/>}
                          <input type="file" hidden onChange={e => handleInvoiceFile(inv.id, e.target.files[0])}/>
                        </label>
                        <button className="inv-del" onClick={() => setInvoices(invoices.filter(i => i.id !== inv.id))}><Trash2 size={14}/></button>
                      </div>
                    ))}
                  </div>

                  {totalInvoiceVal >= 50000 && (
                    <div className="eway-field animate-pulse">
                      <AlertCircle size={16} className="text-red-500"/>
                      <input placeholder="Enter Mandatory 12-Digit E-Way Bill Number" maxLength={12} value={ewayBill} onChange={e => setEwayBill(e.target.value)}/>
                    </div>
                  )}

                  <div className="billing-summary-premium">
                    <div className="b-row"><span>Charged Weight:</span> <strong>{chargedWeight} Kg</strong></div>
                    <div className="b-row"><span>Payment Mode:</span> 
                      <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
                        <option>CREDIT</option>
                        <option>TO-PAY</option>
                        <option>PAID</option>
                      </select>
                    </div>
                    <div className="b-total">
                      <div className="total-label">Grand Total (Incl. GST)</div>
                      <div className="total-val">₹{billingSummary.total}</div>
                    </div>
                  </div>
                </div>
              </section>

              <button className={`final-submit-btn ${loading ? 'loading' : ''}`} onClick={submitOrder} disabled={loading}>
                {loading ? <RefreshCw className="spin"/> : "GENERATE SHIPMENT DOCKET"}
              </button>
            </div>
          </div>
        </div>

        {/* 3. SUCCESS MODAL */}
        {showLR && (
          <div className="overlay-backdrop">
            <div className="modern-modal">
              <div className="modal-icon"><CheckCircle size={50}/></div>
              <h2>Shipment Registered!</h2>
              <div className="lr-display">
                <span>DOCKET NUMBER</span>
                <h1>{lrNumber}</h1>
              </div>
              <p>The shipment has been successfully queued for the next manifest.</p>
              <div className="modal-actions">
                <button className="print-main-btn" onClick={() => window.print()}><Printer size={18}/> PRINT ALL DOCKETS</button>
                <button className="reset-btn" onClick={() => window.location.reload()}>NEW BOOKING</button>
              </div>
            </div>
          </div>
        )}

        {/* 4. PRINT AREA (HIDDEN IN UI) */}
        <div className="print-only-area">
          {["CONSIGNOR", "CONSIGNEE", "OFFICE"].map((type) => (
            <React.Fragment key={type}>
              <ShipmentDocket 
                copyType={type}
                data={{pickup, delivery, orderDetails, invoices, chargedWeight, paymentMode}}
                lrNumber={lrNumber}
                ewayBill={ewayBill}
                billing={billingSummary}
                showFreight={showFreight}
              />
              <div className="page-break"></div>
            </React.Fragment>
          ))}
        </div>
      </main>
    </div>
  );
}