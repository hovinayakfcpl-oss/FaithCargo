import React, { useState, useMemo, useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { 
  Truck, MapPin, Package, FileText, Plus, Trash2,
  Calculator, CheckCircle, Printer, ChevronRight, AlertCircle, 
  ShieldCheck, Box, Info, Navigation, CreditCard, Tag, RefreshCw, 
  Scale, Building2, User, Phone, Globe, Download
} from "lucide-react";
import logo from "../assets/logo.png";
import "./CreateOrder.css";

// --- PROFESSIONAL DOCKET COMPONENT (A4 MULTI-COPY) ---
const ShipmentDocket = ({ data, lrNumber, totalValue, ewayBill, freight, copyType }) => {
  const barcodeRef = useRef(null);
  
  useEffect(() => {
    if (lrNumber && barcodeRef.current) {
      JsBarcode(barcodeRef.current, lrNumber, { 
        format: "CODE128", width: 2, height: 45, displayValue: false, margin: 0 
      });
    }
  }, [lrNumber]);

  return (
    <div className="docket-page-wrapper">
      <div className="docket-container">
        <div className="copy-indicator">{copyType} COPY</div>
        
        {/* Header Section */}
        <div className="docket-header">
          <div className="docket-brand-section">
            <img src={logo} alt="FCPL" className="docket-logo-img" />
            <div className="docket-brand-name">
              <h2>FAITH CARGO PVT LTD</h2>
              <p className="docket-tagline">AN ISO 9001:2015 CERTIFIED LOGISTICS COMPANY</p>
              <p className="docket-address-mini">Regd. Office: 4/15, Kirti Nagar Industrial Area, New Delhi - 110015</p>
            </div>
          </div>
          <div className="docket-lr-meta">
            <div className="lr-header-box">CONSIGNMENT NOTE</div>
            <div className="barcode-box"><canvas ref={barcodeRef}></canvas></div>
            <div className="lr-number-display">{lrNumber || "DRAFT-000000"}</div>
            <div className="lr-date-row">DATE: <strong>{new Date().toLocaleDateString('en-IN')}</strong></div>
          </div>
        </div>

        {/* Address Grid */}
        <div className="docket-address-grid">
          <div className="address-box border-right">
            <div className="box-label"><User size={12}/> CONSIGNOR (SENDER)</div>
            <div className="address-content">
              <h3>{data.pickup.name || "_________________________________"}</h3>
              <p className="main-addr">{data.pickup.address || "No address provided"}</p>
              <p><strong>GSTIN:</strong> {data.pickup.gst || "URD"}</p>
              <p><strong>CITY:</strong> {data.pickup.city} ({data.pickup.pincode})</p>
              <p><strong>MOBILE:</strong> +91 {data.pickup.contact}</p>
            </div>
          </div>
          <div className="address-box">
            <div className="box-label"><MapPin size={12}/> CONSIGNEE (RECEIVER)</div>
            <div className="address-content">
              <h3>{data.delivery.name || "_________________________________"}</h3>
              <p className="main-addr">{data.delivery.address || "No address provided"}</p>
              <p><strong>GSTIN:</strong> {data.delivery.gst || "URD"}</p>
              <p><strong>CITY:</strong> {data.delivery.city} ({data.delivery.pincode})</p>
              <p><strong>MOBILE:</strong> +91 {data.delivery.contact}</p>
            </div>
          </div>
        </div>

        {/* Goods Table */}
        <table className="docket-main-table">
          <thead>
            <tr>
              <th width="8%">PKGS</th>
              <th width="42%">DESCRIPTION OF GOODS (SAID TO CONTAIN)</th>
              <th width="15%">ACTUAL WT</th>
              <th width="15%">CHARGED WT</th>
              <th width="20%">AMOUNT (INR)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="main-data-row">
              <td className="text-center font-bold">{data.orderDetails.boxesCount}</td>
              <td className="desc-cell">
                <span className="material-bold">{data.orderDetails.material || "GENERAL MERCHANDISE"}</span>
                <div className="extra-info">Method: Surface Transport | Risk: Owner's Risk</div>
              </td>
              <td className="text-center">{data.orderDetails.weight} Kg</td>
              <td className="text-center font-bold">{data.chargedWeight} Kg</td>
              <td className="text-center font-bold">₹ {freight}</td>
            </tr>
            {/* Empty rows for professional look */}
            {[1, 2].map(i => <tr key={i} className="empty-row"><td></td><td></td><td></td><td></td><td></td></tr>)}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="2" className="terms-cell">
                <strong>E-WAY BILL:</strong> {ewayBill || "EXEMPTED / NOT PROVIDED"}
              </td>
              <td colSpan="2" className="text-right"><strong>TOTAL FREIGHT:</strong></td>
              <td className="text-center font-bold">₹ {freight}</td>
            </tr>
          </tfoot>
        </table>

        {/* Bottom Details */}
        <div className="docket-info-footer">
          <div className="info-item"><span>GST PAYABLE BY:</span> <strong>{data.gstPayableBy || "CONSIGNOR"}</strong></div>
          <div className="info-item"><span>BOOKING BRANCH:</span> <strong>DELHI HQ</strong></div>
          <div className="info-item"><span>INVOICE VALUE:</span> <strong>₹ {totalValue}</strong></div>
        </div>

        {/* Signatures */}
        <div className="docket-footer-grid">
          <div className="footer-notes">
            <h4>CONDITIONS OF CARRIAGE:</h4>
            <ul>
              <li>Goods are carried at Owner's risk. Insurance to be arranged by Sender.</li>
              <li>We are not responsible for leakage, breakage or damage in transit.</li>
              <li>All disputes are subject to DELHI JURISDICTION only.</li>
            </ul>
          </div>
          <div className="signature-grid">
            <div className="sig-box">
              <div className="sig-line"></div>
              <p>Consignor's Signature</p>
            </div>
            <div className="sig-box">
              <p className="stamp-title">For FAITH CARGO PVT LTD</p>
              <div className="stamp-placeholder">OFFICE STAMP</div>
              <p className="auth-sign">Authorized Signatory</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- SMALL SHIPMENT LABEL (FOR STICKERS) ---
const ShipmentLabel = ({ data, lrNumber }) => {
  const labelRef = useRef(null);
  useEffect(() => {
    if (lrNumber && labelRef.current) {
      JsBarcode(labelRef.current, lrNumber, { 
        format: "CODE128", width: 3, height: 60, displayValue: true, fontSize: 20, fontOptions: "bold" 
      });
    }
  }, [lrNumber]);

  return (
    <div className="label-sticker-wrapper">
      <div className="label-sticker">
        <div className="label-header-brand">FAITH CARGO PVT LTD</div>
        <div className="label-barcode-container"><canvas ref={labelRef}></canvas></div>
        <div className="label-route-grid">
          <div className="route-box"><span>ORIGIN:</span><strong>{data.pickup.city}</strong></div>
          <div className="route-box"><span>DEST:</span><strong>{data.delivery.city}</strong></div>
        </div>
        <div className="label-meta-grid">
          <div className="meta-box">PKGS: <strong>{data.orderDetails.boxesCount}</strong></div>
          <div className="meta-box">WEIGHT: <strong>{data.chargedWeight} KG</strong></div>
        </div>
        <div className="label-footer-note">Handled with Care - Faith Cargo</div>
      </div>
    </div>
  );
};

// --- MAIN APPLICATION COMPONENT ---
export default function CreateOrder() {
  // Global States
  const [boxes, setBoxes] = useState([]);
  const [showLR, setShowLR] = useState(false);
  const [lrNumber, setLrNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [ewayBill, setEwayBill] = useState("");
  const [freight, setFreight] = useState(0);
  const [printType, setPrintType] = useState("docket"); 
  const [gstPayableBy, setGstPayableBy] = useState("CONSIGNOR");

  // Party States
  const [pickup, setPickup] = useState({ name: "", contact: "", address: "", pincode: "", state: "", city: "", gst: "" });
  const [delivery, setDelivery] = useState({ name: "", contact: "", address: "", pincode: "", state: "", city: "", gst: "" });
  
  // Cargo States
  const [orderDetails, setOrderDetails] = useState({ material: "", weight: "", boxesCount: 0 });
  const [invoices, setInvoices] = useState([{ id: Date.now(), no: "", value: "" }]);

  // Calculations
  const totalInvoiceValue = useMemo(() => 
    invoices.reduce((sum, inv) => sum + (parseFloat(inv.value) || 0), 0), 
  [invoices]);

  const volWeight = useMemo(() => {
    const totalCft = boxes.reduce((acc, b) => 
      acc + (parseFloat(b.l||0) * parseFloat(b.w||0) * parseFloat(b.h||0)) / 4000, 0);
    return (totalCft * 10).toFixed(2);
  }, [boxes]);

  const chargedWeight = Math.max(parseFloat(orderDetails.weight || 0), parseFloat(volWeight));
  const needsEwayBill = totalInvoiceValue >= 50000;

  // Logic: Auto Pincode
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

  // Logic: Freight Calculation
  const calculateFreightAction = () => {
    if (!chargedWeight) return alert("⚠️ Weight details missing!");
    // Logic: 18 Rs per kg for premium service
    const amount = (chargedWeight * 18) + (orderDetails.boxesCount * 25);
    setFreight(amount.toFixed(2));
  };

  // Logic: Final Submission
  const handleCreateOrder = () => {
    if (needsEwayBill && !ewayBill) return alert("🛑 E-WAY BILL REQUIRED: For values above ₹50,000");
    if (!pickup.name || !delivery.name || !orderDetails.weight) return alert("❌ ERR: Missing Mandatory Fields");

    setLoading(true);
    setTimeout(() => {
      setLrNumber("FC" + Math.floor(1000000 + Math.random() * 9000000));
      setShowLR(true);
      setLoading(false);
    }, 1500);
  };

  const triggerPrint = (type) => {
    setPrintType(type);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  return (
    <div className={`order-app-wrapper ${printType === 'label' ? 'print-label-active' : 'print-docket-active'}`}>
      
      {/* SIDE NAVIGATION */}
      <aside className="app-sidebar no-print">
        <div className="brand-header">
          <img src={logo} alt="Faith" />
          <div className="status-indicator">● ONLINE</div>
        </div>
        <nav className="nav-links">
          <div className="nav-item active"><Plus size={18}/> New LR Booking</div>
          <div className="nav-item"><Truck size={18}/> Manifest List</div>
          <div className="nav-item"><Navigation size={18}/> Tracking</div>
          <div className="nav-item"><Building2 size={18}/> Vendor Rates</div>
          <div className="nav-item"><FileText size={18}/> Reports</div>
        </nav>
        <div className="sidebar-footer">
           <p>Faith Cargo OS v5.0</p>
           <span>Support: 9818641504</span>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="app-main-content">
        <header className="main-top-bar no-print">
          <div className="top-text">
            <h1>Create Consignment Note</h1>
            <p>Faith Cargo Pvt Ltd - Logistics Management System</p>
          </div>
          <div className="top-actions">
             <div className="stats-box">
                <span className="label">CHARGED WT</span>
                <span className="value">{chargedWeight} Kg</span>
             </div>
             <div className="stats-box highlight">
                <span className="label">EST. FREIGHT</span>
                <span className="value">₹{freight}</span>
             </div>
          </div>
        </header>

        <div className="form-container-grid no-print">
          <div className="form-left-col">
            {/* PARTY SECTION */}
            <div className="form-card animate-slide-in">
              <div className="card-header blue-theme"><MapPin size={18}/> SENDER & RECEIVER DETAILS</div>
              <div className="card-body">
                 <div className="party-split">
                    <div className="party-block">
                       <label>Consignor Name (Sender)</label>
                       <input value={pickup.name} onChange={e=>setPickup({...pickup, name:e.target.value.toUpperCase()})} placeholder="Sender Company Name" />
                       <div className="row-2">
                          <input placeholder="GSTIN (Optional)" onChange={e=>setPickup({...pickup, gst:e.target.value.toUpperCase()})} />
                          <input placeholder="Mobile" maxLength={10} onChange={e=>setPickup({...pickup, contact:e.target.value})} />
                       </div>
                       <textarea placeholder="Complete Pickup Address" rows="2" onChange={e=>setPickup({...pickup, address:e.target.value})} />
                       <div className="row-2">
                          <input placeholder="Pincode" maxLength={6} onChange={e=>{setPickup({...pickup, pincode:e.target.value}); fetchLocation(e.target.value, 'pickup')}} />
                          <input placeholder="City" value={pickup.city} readOnly className="locked" />
                       </div>
                    </div>
                    <div className="party-divider"></div>
                    <div className="party-block">
                       <label>Consignee Name (Receiver)</label>
                       <input value={delivery.name} onChange={e=>setDelivery({...delivery, name:e.target.value.toUpperCase()})} placeholder="Receiver Name" />
                       <div className="row-2">
                          <input placeholder="GSTIN (Optional)" onChange={e=>setDelivery({...delivery, gst:e.target.value.toUpperCase()})} />
                          <input placeholder="Mobile" maxLength={10} onChange={e=>setDelivery({...delivery, contact:e.target.value})} />
                       </div>
                       <textarea placeholder="Complete Delivery Address" rows="2" onChange={e=>setDelivery({...delivery, address:e.target.value})} />
                       <div className="row-2">
                          <input placeholder="Pincode" maxLength={6} onChange={e=>{setDelivery({...delivery, pincode:e.target.value}); fetchLocation(e.target.value, 'delivery')}} />
                          <input placeholder="City" value={delivery.city} readOnly className="locked" />
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          </div>

          <div className="form-right-col">
            {/* GOODS SECTION */}
            <div className="form-card animate-slide-in">
              <div className="card-header red-theme"><Package size={18}/> CARGO & WEIGHT</div>
              <div className="card-body">
                <label>Material Content</label>
                <input placeholder="e.g. Spare Parts, Cloth, Medical Equipment" onChange={e=>setOrderDetails({...orderDetails, material:e.target.value.toUpperCase()})} />
                <div className="row-2 mt-2">
                   <div className="input-with-label">
                      <label>Actual Weight (Kg)</label>
                      <input type="number" onChange={e=>setOrderDetails({...orderDetails, weight:e.target.value})} />
                   </div>
                   <div className="input-with-label">
                      <label>Packages (Qty)</label>
                      <input type="number" onChange={e=>{
                        const n = parseInt(e.target.value)||0;
                        setOrderDetails({...orderDetails, boxesCount:n});
                        setBoxes(Array.from({length:n}, (_,i)=>({id:i+1, l:"", w:"", h:""})));
                      }} />
                   </div>
                </div>
                {boxes.length > 0 && (
                   <div className="vol-calc-section mt-3">
                      <p>Dimensional Calculator (L x W x H in Inch)</p>
                      <div className="vol-scroll-box">
                        {boxes.slice(0, 10).map((b,i) => (
                           <div key={i} className="vol-entry">
                              <span>Box {i+1}</span>
                              <input placeholder="L" onChange={e=>{let x=[...boxes]; x[i].l=e.target.value; setBoxes(x)}} />
                              <input placeholder="W" onChange={e=>{let x=[...boxes]; x[i].w=e.target.value; setBoxes(x)}} />
                              <input placeholder="H" onChange={e=>{let x=[...boxes]; x[i].h=e.target.value; setBoxes(x)}} />
                           </div>
                        ))}
                      </div>
                   </div>
                )}
              </div>
            </div>

            {/* BILLING SECTION */}
            <div className="form-card animate-slide-in">
              <div className="card-header dark-theme"><FileText size={18}/> BILLING & E-WAY BILL</div>
              <div className="card-body">
                <div className="invoice-manager">
                   <div className="flex-between">
                      <label>Invoice Details</label>
                      <button className="add-inv-btn" onClick={()=>setInvoices([...invoices, {id:Date.now(), no:"", value:""}])}>+ Add</button>
                   </div>
                   {invoices.map((inv) => (
                     <div key={inv.id} className="inv-row-grid mt-1">
                        <input placeholder="Invoice No" onChange={e=>setInvoices(invoices.map(i=>i.id===inv.id?{...i, no:e.target.value.toUpperCase()}:i))} />
                        <input type="number" placeholder="Value ₹" onChange={e=>setInvoices(invoices.map(i=>i.id===inv.id?{...i, value:e.target.value}:i))} />
                        <button className="del-inv-btn" onClick={()=>setInvoices(invoices.filter(i=>i.id!==inv.id))}><Trash2 size={14}/></button>
                     </div>
                   ))}
                </div>
                {needsEwayBill && (
                   <div className="eway-alert-box mt-3">
                      <AlertCircle size={20}/>
                      <input placeholder="ENTER 12-DIGIT E-WAY BILL NUMBER" maxLength={12} onChange={e=>setEwayBill(e.target.value)} />
                   </div>
                )}
              </div>
            </div>

            {/* FINAL ACTION SECTION */}
            <div className="final-action-block">
               <button className="btn-calc-large" onClick={calculateFreightAction}>
                 <Calculator size={20}/> CALC FREIGHT
               </button>
               <button className="btn-submit-large" onClick={handleCreateOrder} disabled={loading}>
                 {loading ? <RefreshCw className="spin-anim"/> : <><ShieldCheck size={20}/> GENERATE CONSIGNMENT</>}
               </button>
            </div>
          </div>
        </div>

        {/* SUCCESS MODAL */}
        {showLR && (
          <div className="modal-overlay no-print">
            <div className="modal-window animate-pop">
              <div className="modal-header">
                <CheckCircle size={50} color="#10b981" />
                <h2>LR GENERATED SUCCESSFULLY</h2>
                <div className="lr-number-pill">{lrNumber}</div>
              </div>
              <div className="modal-print-grid">
                <div className="print-card" onClick={() => triggerPrint('docket')}>
                   <Printer size={30}/>
                   <span>PRINT DOCKET (A4)</span>
                   <p>3 Copies (Consignor/Consignee/Office)</p>
                </div>
                <div className="print-card label-card" onClick={() => triggerPrint('label')}>
                   <Tag size={30}/>
                   <span>PRINT BOX LABEL</span>
                   <p>Thermal Sticker (4x6 Size)</p>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-restart" onClick={()=>window.location.reload()}>Next LR Booking <ChevronRight size={16}/></button>
              </div>
            </div>
          </div>
        )}

        {/* PRINT ENGINE (HIDDEN) */}
        <div className="print-engine-container">
          {printType === 'docket' ? (
            <>
              <ShipmentDocket data={{pickup, delivery, orderDetails, invoices, chargedWeight, gstPayableBy}} lrNumber={lrNumber} totalValue={totalInvoiceValue} ewayBill={ewayBill} freight={freight} copyType="CONSIGNOR" />
              <ShipmentDocket data={{pickup, delivery, orderDetails, invoices, chargedWeight, gstPayableBy}} lrNumber={lrNumber} totalValue={totalInvoiceValue} ewayBill={ewayBill} freight={freight} copyType="CONSIGNEE" />
              <ShipmentDocket data={{pickup, delivery, orderDetails, invoices, chargedWeight, gstPayableBy}} lrNumber={lrNumber} totalValue={totalInvoiceValue} ewayBill={ewayBill} freight={freight} copyType="OFFICE" />
            </>
          ) : (
            <ShipmentLabel data={{pickup, delivery, orderDetails, chargedWeight}} lrNumber={lrNumber} />
          )}
        </div>
      </main>
    </div>
  );
}