import React, { useState, useEffect, useMemo } from "react";
import { 
  Truck, MapPin, Package, FileText, Upload, 
  Calculator, CheckCircle, Printer, Plus, Info, Scale
} from "lucide-react";
import "./CreateOrder.css";

const API_BASE = "https://faithcargo.onrender.com/api";

export default function CreateOrder() {
  const [boxes, setBoxes] = useState([]);
  const [showLR, setShowLR] = useState(false);
  const [lrNumber, setLrNumber] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [freightData, setFreightData] = useState({ freight: 0, gst: 0, total: 0 });

  const [pickup, setPickup] = useState({ name: "", contact: "", address: "", pincode: "", state: "", city: "" });
  const [delivery, setDelivery] = useState({ name: "", contact: "", address: "", pincode: "", state: "", city: "" });
  const [orderDetails, setOrderDetails] = useState({ material: "", hsn: "1234", weight: "", boxesCount: 0 });
  const [invoice, setInvoice] = useState({ no: "", value: "", ewayBill: "" });

  // 📍 1. Smart Pincode Fetch (City + State)
  const fetchLocation = async (pin, type) => {
    if (pin.length === 6) {
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const data = await res.json();
        if (data[0].Status === "Success") {
          const po = data[0].PostOffice[0];
          const update = { state: po.State, city: po.District };
          if (type === "pickup") setPickup(prev => ({ ...prev, ...update }));
          else setDelivery(prev => ({ ...prev, ...update }));
        }
      } catch (err) { console.error("Location Fetch Error"); }
    }
  };

  // 📦 2. Volumetric Weight Logic (L*W*H / 1728 * 10)
  const volWeight = useMemo(() => {
    const totalCft = boxes.reduce((acc, b) => {
      return acc + (parseFloat(b.l || 0) * parseFloat(b.w || 0) * parseFloat(b.h || 0)) / 1728;
    }, 0);
    return (totalCft * 10).toFixed(2);
  }, [boxes]);

  // ⚖️ 3. Final Charged Weight (Actual vs Volumetric)
  const chargedWeight = Math.max(parseFloat(orderDetails.weight || 0), parseFloat(volWeight));

  const handleCheckFreight = async () => {
    if (!pickup.pincode || !delivery.pincode || !chargedWeight) {
      alert("Pincode and Weight are required!"); return;
    }
    try {
      const res = await fetch(`${API_BASE}/shipments/calculate-freight/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          origin: pickup.pincode, 
          destination: delivery.pincode, 
          weight: chargedWeight 
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFreightData({ freight: data.freight_charge, gst: data.gst, total: data.total_charge + data.gst });
      } else { alert(data.error); }
    } catch { alert("Rate calculation failed."); }
  };

  const handleCreateOrder = async () => {
    if (!pickup.name || !delivery.name) { alert("Mandatory fields missing!"); return; }
    setLoading(true);
    const payload = {
      pickupName: pickup.name, pickupContact: pickup.contact, pickupAddress: `${pickup.address}, ${pickup.city}`, pickupPincode: pickup.pincode,
      deliveryName: delivery.name, deliveryContact: delivery.contact, deliveryAddress: `${delivery.address}, ${delivery.city}`, deliveryPincode: delivery.pincode,
      material: orderDetails.material, boxes: orderDetails.boxesCount, weight: chargedWeight,
      total_value: invoice.value || 0, eway_bill: invoice.ewayBill,
      invoices: [{ invoice_no: invoice.no, invoice_value: invoice.value || 0 }]
    };

    try {
      const res = await fetch(`${API_BASE}/shipments/create-order/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.success) { setLrNumber(result.lr_number); setShowLR(true); }
      else { alert(result.error); }
    } catch { alert("Server error."); }
    finally { setLoading(false); }
  };

  const handleBoxCountChange = (count) => {
    const num = parseInt(count) || 0;
    setOrderDetails(prev => ({ ...prev, boxesCount: num }));
    setBoxes(Array.from({ length: num }, (_, i) => ({ id: i + 1, l: "", w: "", h: "" })));
  };

  const updateDim = (index, field, value) => {
    const updatedBoxes = [...boxes];
    updatedBoxes[index][field] = value;
    setBoxes(updatedBoxes);
  };

  return (
    <div className="order-page-dark">
      {/* ⚡ Sticky Summary Header */}
      <nav className="summary-bar">
        <div className="brand"><Truck size={24} className="red-text" /> <span>FAITH CARGO</span></div>
        <div className="pills">
          <div className="pill">Charged Wt: <strong>{chargedWeight} Kg</strong></div>
          <div className="pill red-pill">Price: <strong>₹{freightData.total.toFixed(2)}</strong></div>
        </div>
      </nav>

      <div className="main-grid">
        {/* Left Side: Forms */}
        <div className="form-sections">
          <section className="premium-card">
            <div className="card-header"><MapPin size={18} /> Pickup Details</div>
            <div className="grid-2">
              <input placeholder="Sender Name" value={pickup.name} onChange={e=>setPickup({...pickup, name: e.target.value})} />
              <input placeholder="Contact No" value={pickup.contact} onChange={e=>setPickup({...pickup, contact: e.target.value})} />
              <input className="span-full" placeholder="Street Address" value={pickup.address} onChange={e=>setPickup({...pickup, address: e.target.value})} />
              <input placeholder="Pincode" maxLength="6" onChange={e=>{setPickup({...pickup, pincode: e.target.value}); fetchLocation(e.target.value, "pickup")}} />
              <input placeholder="City/State" value={pickup.city ? `${pickup.city}, ${pickup.state}` : ""} readOnly className="locked-input" />
            </div>
          </section>

          <section className="premium-card">
            <div className="card-header"><MapPin size={18} className="green-text" /> Delivery Details</div>
            <div className="grid-2">
              <input placeholder="Receiver Name" value={delivery.name} onChange={e=>setDelivery({...delivery, name: e.target.value})} />
              <input placeholder="Contact No" value={delivery.contact} onChange={e=>setDelivery({...delivery, contact: e.target.value})} />
              <input className="span-full" placeholder="Street Address" value={delivery.address} onChange={e=>setDelivery({...delivery, address: e.target.value})} />
              <input placeholder="Pincode" maxLength="6" onChange={e=>{setDelivery({...delivery, pincode: e.target.value}); fetchLocation(e.target.value, "delivery")}} />
              <input placeholder="City/State" value={delivery.city ? `${delivery.city}, ${delivery.state}` : ""} readOnly className="locked-input" />
            </div>
          </section>

          <section className="premium-card">
            <div className="card-header"><FileText size={18} /> Documents & Invoice</div>
            <div className="grid-2">
              <input placeholder="Invoice No." value={invoice.no} onChange={e=>setInvoice({...invoice, no: e.target.value})} />
              <input type="number" placeholder="Value (₹)" onChange={e=>setInvoice({...invoice, value: e.target.value})} />
              {parseFloat(invoice.value) >= 50000 && (
                <input className="span-full warning-border" placeholder="E-way Bill Number (Mandatory)" onChange={e=>setInvoice({...invoice, ewayBill: e.target.value})} />
              )}
              <label className="file-upload span-full">
                <Upload size={20} />
                <span>Upload Invoice PDF</span>
                <input type="file" hidden />
              </label>
            </div>
          </section>
        </div>

        {/* Right Side: Weight & Action */}
        <div className="sticky-sidebar">
          <section className="premium-card">
            <div className="card-header"><Package size={18} /> Box & Weight</div>
            <div className="grid-1">
              <input placeholder="Material Description" onChange={e=>setOrderDetails({...orderDetails, material: e.target.value})} />
              <div className="weight-input-group">
                <input type="number" placeholder="Actual Wt (Kg)" onChange={e=>setOrderDetails({...orderDetails, weight: e.target.value})} />
                <input type="number" placeholder="No. of Boxes" onChange={e=>handleBoxCountChange(e.target.value)} />
              </div>
            </div>

            {boxes.length > 0 && (
              <div className="dim-list">
                <header>Dimensions (Inch) <span>Vol. Wt: {volWeight} Kg</span></header>
                {boxes.map((box, i) => (
                  <div key={i} className="dim-row-new">
                    <span className="box-label">#{i+1}</span>
                    <input placeholder="L" onChange={e=>updateDim(i, 'l', e.target.value)} />
                    <input placeholder="W" onChange={e=>updateDim(i, 'w', e.target.value)} />
                    <input placeholder="H" onChange={e=>updateDim(i, 'h', e.target.value)} />
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="action-box">
            <div className="final-price">
              <span>Total Estimated Price</span>
              <h1>₹ {freightData.total.toFixed(2)}</h1>
              <p>Inc. GST @ 18%</p>
            </div>
            <div className="btn-stack-new">
              <button className="secondary-btn" onClick={handleCheckFreight}><Calculator size={18} /> Calculate</button>
              <button className="primary-btn" onClick={handleCreateOrder} disabled={loading || !freightData.freight}>
                {loading ? "Processing..." : "Generate LR Number"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showLR && (
        <div className="premium-modal-overlay">
          <div className="premium-modal">
            <div className="success-icon-wrap"><CheckCircle size={60} /></div>
            <h2>Order Created!</h2>
            <div className="lr-badge">{lrNumber}</div>
            <div className="modal-actions">
              <button className="btn-print" onClick={() => window.print()}><Printer size={18} /> Print Docket</button>
              <button className="btn-close" onClick={() => window.location.reload()}>Book Next</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}