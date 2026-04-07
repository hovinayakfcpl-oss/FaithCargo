import React, { useState, useMemo, useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { 
  Truck, MapPin, Package, FileText, Upload, 
  Calculator, CheckCircle, Printer, ChevronRight, AlertCircle, Info
} from "lucide-react";
import "./CreateOrder.css";

const API_BASE = "https://faithcargo.onrender.com/api";

// --- PROFESSIONAL DOCKET COMPONENT ---
const ShipmentDocket = ({ data, lrNumber }) => {
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
            <th>INVOICE NO</th>
            <th>INV VALUE</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{data.orderDetails.material || "General Cargo"}</td>
            <td>{data.orderDetails.boxesCount} Nos</td>
            <td>{data.orderDetails.weight} Kg</td>
            <td>{data.chargedWeight} Kg</td>
            <td>{data.invoice.no || "-"}</td>
            <td>₹{data.invoice.value || "0"}</td>
          </tr>
        </tbody>
      </table>

      <div className="docket-footer">
        <div className="docket-notes">
          <strong>Instructions:</strong>
          <ul>
            <li>Non-negotiable Waybill. Goods carried at owner's risk.</li>
            <li>No hazardous material or banned substances included.</li>
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

  // Form States
  const [pickup, setPickup] = useState({ name: "", contact: "", address: "", pincode: "", state: "", city: "" });
  const [delivery, setDelivery] = useState({ name: "", contact: "", address: "", pincode: "", state: "", city: "" });
  const [orderDetails, setOrderDetails] = useState({ material: "", weight: "", boxesCount: 0 });
  const [invoice, setInvoice] = useState({ no: "", value: "", ewayBill: "" });

  // --- Smart Logics ---
  
  // 1. Calculate Volumetric Weight (L*W*H/1728 * 10)
  const volWeight = useMemo(() => {
    const totalCft = boxes.reduce((acc, b) => acc + (parseFloat(b.l||0)*parseFloat(b.w||0)*parseFloat(b.h||0))/1728, 0);
    return (totalCft * 10).toFixed(2);
  }, [boxes]);

  // 2. Charged Weight (Maximum of Act or Vol)
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
    if (invoice.value >= 50000 && !invoice.ewayBill) {
      alert("E-Way Bill is mandatory for values above ₹50,000!"); return;
    }
    setLoading(true);
    const payload = {
      pickupName: pickup.name, pickupContact: pickup.contact, pickupAddress: pickup.address, pickupPincode: pickup.pincode,
      deliveryName: delivery.name, deliveryContact: delivery.contact, deliveryAddress: delivery.address, deliveryPincode: delivery.pincode,
      material: orderDetails.material, boxes: orderDetails.boxesCount, weight: chargedWeight,
      total_value: invoice.value || 0, eway_bill: invoice.ewayBill,
    };
    try {
      const res = await fetch(`${API_BASE}/shipments/create-order/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.success) { setLrNumber(result.lr_number); setShowLR(true); }
    } catch { alert("Server error. Booking failed."); }
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
          <div className="stat-item highlight">Total: <strong>₹{freightData.total.toFixed(2)}</strong></div>
        </div>
      </header>

      <main className="order-container no-print">
        <div className="form-grid">
          
          <div className="form-left-col">
            <section className="section-card">
              <div className="card-head"><MapPin size={18} /> Pickup (Consignor)</div>
              <div className="inner-grid">
                <input placeholder="Company / Sender Name" onChange={e=>setPickup({...pickup, name:e.target.value})} />
                <input placeholder="Contact (10 Digit)" onChange={e=>setPickup({...pickup, contact:e.target.value})} />
                <input className="span-2" placeholder="Full Address with Landmark" onChange={e=>setPickup({...pickup, address:e.target.value})} />
                <input placeholder="Pincode" maxLength={6} onChange={e=>{setPickup({...pickup, pincode:e.target.value}); fetchLocation(e.target.value, 'pickup')}} />
                <input className="readonly-input" value={pickup.city ? `${pickup.city}, ${pickup.state}` : ""} placeholder="City/State Auto" readOnly />
              </div>
            </section>

            <section className="section-card border-red">
              <div className="card-head"><MapPin size={18} color="#d32f2f" /> Delivery (Consignee)</div>
              <div className="inner-grid">
                <input placeholder="Company / Receiver Name" onChange={e=>setDelivery({...delivery, name:e.target.value})} />
                <input placeholder="Contact (10 Digit)" onChange={e=>setDelivery({...delivery, contact:e.target.value})} />
                <input className="span-2" placeholder="Delivery Address" onChange={e=>setDelivery({...delivery, address:e.target.value})} />
                <input placeholder="Pincode" maxLength={6} onChange={e=>{setDelivery({...delivery, pincode:e.target.value}); fetchLocation(e.target.value, 'delivery')}} />
                <input className="readonly-input" value={delivery.city ? `${delivery.city}, ${delivery.state}` : ""} placeholder="City/State Auto" readOnly />
              </div>
            </section>

            <section className="section-card">
              <div className="card-head"><FileText size={18} /> Invoice & Compliance</div>
              <div className="inner-grid">
                <input placeholder="Invoice No." onChange={e=>setInvoice({...invoice, no:e.target.value})} />
                <input type="number" placeholder="Value (₹)" onChange={e=>setInvoice({...invoice, value:e.target.value})} />
                <input className="span-2" placeholder="E-Way Bill Number" onChange={e=>setInvoice({...invoice, ewayBill:e.target.value})} />
              </div>
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
                <div className="price-row"><span>Freight Charge</span><span>₹{freightData.freight.toFixed(2)}</span></div>
                <div className="price-row"><span>GST (18%)</span><span>₹{freightData.gst.toFixed(2)}</span></div>
                <div className="price-total"><span>Total Amount</span><span>₹{freightData.total.toFixed(2)}</span></div>
              </div>
              <button className="btn-calc" onClick={handleCheckFreight}><Calculator size={18} /> Refresh Quote</button>
              <button className="btn-submit" onClick={handleCreateOrder} disabled={loading || !freightData.freight}>
                {loading ? "Processing..." : "Confirm & Generate LR"} <ChevronRight size={18} />
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* SUCCESS MODAL */}
      {showLR && (
        <div className="success-overlay no-print">
          <div className="success-modal">
            <div className="modal-header">
              <CheckCircle size={40} color="#10b981" />
              <h3>Order Booked Successfully!</h3>
            </div>
            <div className="lr-badge-large">{lrNumber}</div>
            
            <div className="mini-docket-preview">
               <ShipmentDocket data={{pickup, delivery, orderDetails, invoice, chargedWeight}} lrNumber={lrNumber} />
            </div>

            <div className="modal-actions">
              <button className="btn-print-main" onClick={() => window.print()}><Printer size={18} /> Print Final Docket</button>
              <button className="btn-reset" onClick={() => window.location.reload()}>Book Another Order</button>
            </div>
          </div>
        </div>
      )}

      {/* ACTUAL HIDDEN DOCKET FOR PRINTING */}
      <div className="print-only">
         <ShipmentDocket data={{pickup, delivery, orderDetails, invoice, chargedWeight}} lrNumber={lrNumber} />
      </div>

    </div>
  );
}