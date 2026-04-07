import React, { useState, useMemo, useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { 
  Truck, MapPin, Package, FileText, Upload, Plus, Trash2,
  Calculator, CheckCircle, Printer, ChevronRight, AlertCircle, Info
} from "lucide-react";
import "./CreateOrder.css";

const API_BASE = "https://faithcargo.onrender.com/api";

// --- PROFESSIONAL DOCKET COMPONENT (Upgraded for Multi-Invoice) ---
const ShipmentDocket = ({ data, lrNumber, totalValue }) => {
  const barcodeRef = useRef(null);
  useEffect(() => {
    if (lrNumber && barcodeRef.current) {
      JsBarcode(barcodeRef.current, lrNumber, {
        format: "CODE128", width: 1.5, height: 45, displayValue: false, margin: 0
      });
    }
  }, [lrNumber]);

  return (
    <div id="printable-docket" className="docket-container">
      <div className="docket-header">
        <div className="docket-brand">
          <h2>FAITH CARGO PVT LTD</h2>
          <p className="docket-tagline">Reliable Logistics Solutions</p>
          <p>H.O: Plot No. 45, Okhla Phase III, New Delhi - 110020</p>
          <p>GSTIN: 07AAACF1234F1Z1 | Support: +91 9999-000-000</p>
        </div>
        <div className="docket-lr-info">
          <canvas ref={barcodeRef}></canvas>
          <div className="lr-text">{lrNumber}</div>
          <div className="lr-date">Booking Date: {new Date().toLocaleDateString('en-IN')}</div>
        </div>
      </div>

      <div className="docket-main-grid">
        <div className="docket-side">
          <div className="box-title">CONSIGNOR (SENDER)</div>
          <div className="docket-info">
            <strong>{data.pickup.name}</strong><br/>
            {data.pickup.address}<br/>
            {data.pickup.city}, {data.pickup.state} - {data.pickup.pincode}<br/>
            <strong>PH: {data.pickup.contact}</strong>
          </div>
        </div>
        <div className="docket-side">
          <div className="box-title">CONSIGNEE (RECEIVER)</div>
          <div className="docket-info">
            <strong>{data.delivery.name}</strong><br/>
            {data.delivery.address}<br/>
            {data.delivery.city}, {data.delivery.state} - {data.delivery.pincode}<br/>
            <strong>PH: {data.delivery.contact}</strong>
          </div>
        </div>
      </div>

      <table className="docket-table">
        <thead>
          <tr>
            <th>DESCRIPTION</th>
            <th>PKG</th>
            <th>ACTUAL WT</th>
            <th>CHARGED WT</th>
            <th>INV COUNT</th>
            <th>TOTAL VALUE</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{data.orderDetails.material || "General Cargo"}</td>
            <td>{data.orderDetails.boxesCount} Nos</td>
            <td>{data.orderDetails.weight} Kg</td>
            <td>{data.chargedWeight} Kg</td>
            <td>{data.invoices.length}</td>
            <td>₹{totalValue}</td>
          </tr>
        </tbody>
      </table>

      <div className="docket-footer">
        <div className="docket-notes">
          <strong>Instructions:</strong>
          <ul>
            <li>Non-negotiable Waybill. Goods carried at owner's risk.</li>
            <li>Subject to Delhi Jurisdiction only.</li>
          </ul>
        </div>
        <div className="docket-sigs">
          <div className="sig-area">Customer Signature</div>
          <div className="sig-area">Authorised Signatory</div>
        </div>
      </div>
      <div className="docket-copy">SYSTEM GENERATED ORIGINAL COPY</div>
    </div>
  );
};

export default function CreateOrder() {
  const [boxes, setBoxes] = useState([]);
  const [showLR, setShowLR] = useState(false);
  const [lrNumber, setLrNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [freightData, setFreightData] = useState({ freight: 0, gst: 0, total: 0 });

  // Basic Details States
  const [pickup, setPickup] = useState({ name: "", contact: "", address: "", pincode: "", state: "", city: "" });
  const [delivery, setDelivery] = useState({ name: "", contact: "", address: "", pincode: "", state: "", city: "" });
  const [orderDetails, setOrderDetails] = useState({ material: "", weight: "", boxesCount: 0 });
  
  // --- UPGRADED: Multiple Invoices State ---
  const [invoices, setInvoices] = useState([{ id: Date.now(), no: "", value: "", file: null }]);
  const [ewayBill, setEwayBill] = useState("");

  const addInvoice = () => setInvoices([...invoices, { id: Date.now(), no: "", value: "", file: null }]);
  const removeInvoice = (id) => {
    if (invoices.length > 1) setInvoices(invoices.filter(inv => inv.id !== id));
  };
  const updateInvoice = (id, field, val) => {
    setInvoices(invoices.map(inv => inv.id === id ? { ...inv, [field]: val } : inv));
  };

  // Logic: Total Value & E-Way Visibility
  const totalInvoiceValue = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + (parseFloat(inv.value) || 0), 0);
  }, [invoices]);

  const isEwayRequired = totalInvoiceValue >= 50000;

  // Weight Logics
  const volWeight = useMemo(() => {
    const totalCft = boxes.reduce((acc, b) => acc + (parseFloat(b.l||0)*parseFloat(b.w||0)*parseFloat(b.h||0))/1728, 0);
    return (totalCft * 10).toFixed(2);
  }, [boxes]);

  const chargedWeight = Math.max(parseFloat(orderDetails.weight || 0), parseFloat(volWeight));

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
      } catch (err) { console.error("Pincode error"); }
    }
  };

  const handleCheckFreight = async () => {
    if (!pickup.pincode || !delivery.pincode || !chargedWeight) {
      alert("Pincode and Weight are mandatory!"); return;
    }
    try {
      const res = await fetch(`${API_BASE}/shipments/calculate-freight/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin: pickup.pincode, destination: delivery.pincode, weight: chargedWeight }),
      });
      const data = await res.json();
      if (data.success) setFreightData({ freight: data.freight_charge, gst: data.gst, total: data.total_charge + data.gst });
    } catch { alert("Error calculating freight."); }
  };

  const handleCreateOrder = async () => {
    if (isEwayRequired && !ewayBill) {
      alert("E-Way Bill is mandatory for values above ₹50,000!"); return;
    }
    setLoading(true);
    
    // Payload for Backend
    const formData = new FormData();
    formData.append("pickup", JSON.stringify(pickup));
    formData.append("delivery", JSON.stringify(delivery));
    formData.append("order", JSON.stringify({ ...orderDetails, chargedWeight, totalInvoiceValue, ewayBill }));
    
    // Invoices logic
    invoices.forEach((inv, index) => {
      formData.append(`inv_no_${index}`, inv.no);
      formData.append(`inv_val_${index}`, inv.value);
      if (inv.file) formData.append(`inv_file_${index}`, inv.file);
    });

    try {
      const res = await fetch(`${API_BASE}/shipments/create-order/`, {
        method: "POST",
        body: formData, // Using FormData for file support
      });
      const result = await res.json();
      if (result.success) { setLrNumber(result.lr_number); setShowLR(true); }
    } catch { alert("Booking failed. Please check backend connection."); }
    finally { setLoading(false); }
  };

  return (
    <div className="order-wrapper">
      <header className="order-header no-print">
        <div className="header-brand">
          <Truck size={26} color="#d32f2f" />
          <div className="brand-text">
            <h1>FAITH CARGO</h1>
            <span>Smart Dispatch System</span>
          </div>
        </div>
        <div className="header-status">
          <div className="stat-item">Charged Wt: <strong>{chargedWeight} kg</strong></div>
          <div className="stat-item highlight">Total Value: <strong>₹{totalInvoiceValue}</strong></div>
        </div>
      </header>

      <main className="order-container no-print">
        <div className="form-grid">
          
          <div className="form-left-col">
            {/* Pickup & Delivery Sections */}
            <section className="section-card border-red">
              <div className="card-head"><MapPin size={18} color="#d32f2f" /> Consignor & Consignee Details</div>
              <div className="inner-grid">
                <input placeholder="Sender Name" onChange={e=>setPickup({...pickup, name:e.target.value})} />
                <input placeholder="Sender Contact" onChange={e=>setPickup({...pickup, contact:e.target.value})} />
                <input placeholder="Receiver Name" onChange={e=>setDelivery({...delivery, name:e.target.value})} />
                <input placeholder="Receiver Contact" onChange={e=>setDelivery({...delivery, contact:e.target.value})} />
                <input className="span-2" placeholder="Pickup Address" onChange={e=>setPickup({...pickup, address:e.target.value})} />
                <input placeholder="Pickup Pincode" maxLength={6} onChange={e=>{setPickup({...pickup, pincode:e.target.value}); fetchLocation(e.target.value, 'pickup')}} />
                <input className="readonly-input" value={pickup.city ? `${pickup.city}, ${pickup.state}` : ""} placeholder="Auto City" readOnly />
                <input className="span-2" placeholder="Delivery Address" onChange={e=>setDelivery({...delivery, address:e.target.value})} />
                <input placeholder="Delivery Pincode" maxLength={6} onChange={e=>{setDelivery({...delivery, pincode:e.target.value}); fetchLocation(e.target.value, 'delivery')}} />
                <input className="readonly-input" value={delivery.city ? `${delivery.city}, ${delivery.state}` : ""} placeholder="Auto City" readOnly />
              </div>
            </section>

            {/* UPGRADED: Multi-Invoice Card */}
            <section className="section-card">
              <div className="card-head">
                <FileText size={18} /> Invoices & Documentation
                <button className="btn-add-inv" onClick={addInvoice}><Plus size={14}/> Add Invoice</button>
              </div>
              <div className="invoice-list">
                {invoices.map((inv, idx) => (
                  <div key={inv.id} className="invoice-row-item">
                    <span className="inv-idx">#{idx+1}</span>
                    <input placeholder="Inv No." value={inv.no} onChange={e=>updateInvoice(inv.id, 'no', e.target.value)} />
                    <input type="number" placeholder="Value (₹)" value={inv.value} onChange={e=>updateInvoice(inv.id, 'value', e.target.value)} />
                    <div className="file-upload-zone">
                      <label>
                        <Upload size={16} />
                        <input type="file" hidden onChange={e=>updateInvoice(inv.id, 'file', e.target.files[0])} />
                        <span className="file-name">{inv.file ? "Attached" : "Upload PDF"}</span>
                      </label>
                    </div>
                    {invoices.length > 1 && (
                      <button className="btn-trash" onClick={() => removeInvoice(inv.id)}><Trash2 size={16}/></button>
                    )}
                  </div>
                ))}
              </div>

              {isEwayRequired && (
                <div className="eway-alert-box fadeIn">
                  <AlertCircle size={20} />
                  <div className="eway-content">
                    <label>E-Way Bill Required (Value {">"} ₹50,000)</label>
                    <input 
                      placeholder="Enter E-Way Bill Number" 
                      className="eway-input-field"
                      value={ewayBill} 
                      onChange={e=>setEwayBill(e.target.value)} 
                    />
                  </div>
                </div>
              )}
            </section>
          </div>

          <div className="form-right-col">
            <section className="section-card">
              <div className="card-head"><Package size={18} /> Material & Weight</div>
              <div className="inner-grid">
                <input className="span-2" placeholder="Material Description" onChange={e=>setOrderDetails({...orderDetails, material:e.target.value})} />
                <input type="number" placeholder="Actual Weight (kg)" onChange={e=>setOrderDetails({...orderDetails, weight:e.target.value})} />
                <input type="number" placeholder="No of Boxes" onChange={e=>{
                  const n = parseInt(e.target.value)||0;
                  setOrderDetails({...orderDetails, boxesCount:n});
                  setBoxes(Array.from({length:n}, (_,i)=>({id:i+1, l:"", w:"", h:""})));
                }} />
              </div>

              {boxes.length > 0 && (
                <div className="volumetric-box">
                  <div className="vol-header">
                    <span>Dimensions (Inch)</span>
                    <span className="vol-badge">Vol Weight: {volWeight} kg</span>
                  </div>
                  <div className="vol-rows">
                    {boxes.map((box, i) => (
                      <div key={i} className="vol-row">
                        <span>#{i+1}</span>
                        <input placeholder="L" onChange={e=>{let b=[...boxes]; b[i].l=e.target.value; setBoxes(b)}} />
                        <input placeholder="W" onChange={e=>{let b=[...boxes]; b[i].w=e.target.value; setBoxes(b)}} />
                        <input placeholder="H" onChange={e=>{let b=[...boxes]; b[i].h=e.target.value; setBoxes(b)}} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <div className="sticky-action-bar">
              <div className="pricing-summary">
                <div className="price-row"><span>Freight</span><span>₹{freightData.freight.toFixed(2)}</span></div>
                <div className="price-row"><span>GST (18%)</span><span>₹{freightData.gst.toFixed(2)}</span></div>
                <div className="price-total"><span>Total Payable</span><span>₹{freightData.total.toFixed(2)}</span></div>
              </div>
              <button className="btn-calc" onClick={handleCheckFreight}><Calculator size={18} /> Calculate Charges</button>
              <button className="btn-submit" onClick={handleCreateOrder} disabled={loading || !freightData.freight}>
                {loading ? "Processing..." : "Confirm & Generate LR"} <ChevronRight size={18} />
              </button>
            </div>
          </div>

        </div>
      </main>

      {showLR && (
        <div className="success-overlay no-print">
          <div className="success-modal">
            <div className="modal-header">
              <CheckCircle size={40} color="#10b981" />
              <h3>Order Booked Successfully!</h3>
            </div>
            <div className="lr-badge-large">{lrNumber}</div>
            
            <div className="mini-docket-preview">
               <ShipmentDocket data={{pickup, delivery, orderDetails, invoices, chargedWeight}} lrNumber={lrNumber} totalValue={totalInvoiceValue} />
            </div>

            <div className="modal-actions">
              <button className="btn-print-main" onClick={() => window.print()}><Printer size={18} /> Print Final Docket</button>
              <button className="btn-reset" onClick={() => window.location.reload()}>Next Booking</button>
            </div>
          </div>
        </div>
      )}

      <div className="print-only">
         <ShipmentDocket data={{pickup, delivery, orderDetails, invoices, chargedWeight}} lrNumber={lrNumber} totalValue={totalInvoiceValue} />
      </div>
    </div>
  );
}