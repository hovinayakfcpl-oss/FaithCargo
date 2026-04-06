import React, { useState, useEffect } from "react";
import { 
  Truck, MapPin, Package, FileText, Upload, 
  Save, Calculator, CheckCircle, Printer 
} from "lucide-react";
import "./CreateOrder.css";

const API_BASE = "https://faithcargo.onrender.com/api";

export default function CreateOrder() {
  const [boxes, setBoxes] = useState([]);
  const [showLR, setShowLR] = useState(false);
  const [lrNumber, setLrNumber] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [freightData, setFreightData] = useState({ freight: 0, gst: 0, total: 0 });

  const [pickup, setPickup] = useState({ name: "", contact: "", address: "", pincode: "", state: "" });
  const [delivery, setDelivery] = useState({ name: "", contact: "", address: "", pincode: "", state: "" });
  const [orderDetails, setOrderDetails] = useState({ material: "", hsn: "1234", weight: "", boxesCount: 0 });
  const [invoice, setInvoice] = useState({ no: "", value: "", ewayBill: "" });

  // 📍 Pincode to State (Backend Sync)
  const fetchState = async (pin, type) => {
    if (pin.length === 6) {
      try {
        // Option: Aap apne backend ke 'get-locations' ka use bhi kar sakte hain
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const data = await res.json();
        const stateName = data[0]?.PostOffice?.[0]?.State || "Not Found";
        if (type === "pickup") setPickup(prev => ({ ...prev, state: stateName }));
        else setDelivery(prev => ({ ...prev, state: stateName }));
      } catch (err) { console.error("Pincode Error", err); }
    }
  };

  // 💰 1. CHECK FREIGHT
  const handleCheckFreight = async () => {
    if (!pickup.pincode || !delivery.pincode || !orderDetails.weight) {
      alert("Please enter Pickup, Delivery Pincode and Weight first!");
      return;
    }

    try {
      // Backend ke naye calculate-freight path par bhej rahe hain
      const res = await fetch(`${API_BASE}/shipments/calculate-freight/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          origin: pickup.pincode,
          destination: delivery.pincode,
          weight: orderDetails.weight
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFreightData({ 
          freight: data.freight_charge, 
          gst: data.gst, 
          total: data.total_charge + data.gst
        });
      } else {
        alert(data.error || "Rate not found for this route.");
      }
    } catch (err) {
      alert("Error connecting to Rate Calculator.");
    }
  };

  // 📦 2. CREATE ORDER
  const handleCreateOrder = async () => {
    if (!pickup.name || !delivery.name || !pickup.pincode || !delivery.pincode) {
      alert("Please fill all mandatory sender and receiver details!");
      return;
    }

    if (parseFloat(invoice.value) >= 50000 && !invoice.ewayBill) {
      alert("E-way bill is mandatory for invoice value above ₹50,000!");
      return;
    }

    setLoading(true);

    // Payload match with your views.py
    const payload = {
      pickupName: pickup.name,
      pickupContact: pickup.contact,
      pickupAddress: pickup.address,
      pickupPincode: pickup.pincode,
      deliveryName: delivery.name,
      deliveryContact: delivery.contact,
      deliveryAddress: delivery.address,
      deliveryPincode: delivery.pincode,
      material: orderDetails.material,
      hsn: orderDetails.hsn,
      boxes: orderDetails.boxesCount,
      weight: orderDetails.weight,
      total_value: invoice.value || 0,
      eway_bill: invoice.ewayBill,
      invoices: [{ invoice_no: invoice.no, invoice_value: invoice.value || 0 }]
    };

    try {
      const response = await fetch(`${API_BASE}/shipments/create-order/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        // Backend se formatted LR (FCPL0001) aayega
        setLrNumber(result.lr_number);
        setShowLR(true);
      } else {
        alert("Error: " + (result.error || "Failed to create order"));
      }
    } catch (error) {
      alert("Server error. Please check your connection.");
    } finally {
      setLoading(false);
    }
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
    <div className="order-wrapper">
      <header className="order-header">
        <div className="header-left">
          <Truck size={24} color="#2563eb" />
          <h1>Create New Shipment (Faith Cargo)</h1>
        </div>
      </header>

      <main className="order-container">
        <div className="form-grid">
          <div className="form-left">
            {/* Pickup Card */}
            <div className="section-card">
              <div className="card-head"><MapPin size={18} /> Pickup Details</div>
              <div className="inner-grid">
                <input type="text" placeholder="Sender Name" value={pickup.name} onChange={(e)=>setPickup({...pickup, name: e.target.value})} />
                <input type="text" placeholder="Contact No" value={pickup.contact} onChange={(e)=>setPickup({...pickup, contact: e.target.value})} />
                <input type="text" className="span-2" placeholder="Full Address" value={pickup.address} onChange={(e)=>setPickup({...pickup, address: e.target.value})} />
                <input type="text" placeholder="Pincode" maxLength="6" value={pickup.pincode} onChange={(e) => { setPickup({...pickup, pincode: e.target.value}); fetchState(e.target.value, "pickup"); }} />
                <input type="text" placeholder="State" value={pickup.state} readOnly className="readonly-input" />
              </div>
            </div>

            {/* Delivery Card */}
            <div className="section-card">
              <div className="card-head"><MapPin size={18} color="#10b981" /> Delivery Details</div>
              <div className="inner-grid">
                <input type="text" placeholder="Receiver Name" value={delivery.name} onChange={(e)=>setDelivery({...delivery, name: e.target.value})} />
                <input type="text" placeholder="Contact No" value={delivery.contact} onChange={(e)=>setDelivery({...delivery, contact: e.target.value})} />
                <input type="text" className="span-2" placeholder="Full Address" value={delivery.address} onChange={(e)=>setDelivery({...delivery, address: e.target.value})} />
                <input type="text" placeholder="Pincode" maxLength="6" value={delivery.pincode} onChange={(e) => { setDelivery({...delivery, pincode: e.target.value}); fetchState(e.target.value, "delivery"); }} />
                <input type="text" placeholder="State" value={delivery.state} readOnly className="readonly-input" />
              </div>
            </div>

            {/* Invoice Card */}
            <div className="section-card">
              <div className="card-head"><FileText size={18} /> Invoice & Documents</div>
              <div className="inner-grid">
                <input type="text" placeholder="Invoice No." value={invoice.no} onChange={(e)=>setInvoice({...invoice, no: e.target.value})} />
                <input type="number" placeholder="Invoice Value (₹)" value={invoice.value} onChange={(e)=>setInvoice({...invoice, value: e.target.value})} />
                {parseFloat(invoice.value) >= 50000 && (
                  <input type="text" className="span-2 highlight-input" placeholder="Enter E-way Bill Number (Mandatory)" value={invoice.ewayBill} onChange={(e)=>setInvoice({...invoice, ewayBill: e.target.value})} />
                )}
                <div className="upload-box span-2">
                  <Upload size={20} />
                  <p>Upload Invoice PDF (Optional)</p>
                  <input type="file" className="file-hidden" />
                </div>
              </div>
            </div>
          </div>

          <div className="form-right">
            <div className="section-card">
              <div className="card-head"><Package size={18} /> Box & Dimensions</div>
              <div className="inner-grid">
                <input type="text" placeholder="Material Type" className="span-2" value={orderDetails.material} onChange={(e)=>setOrderDetails({...orderDetails, material: e.target.value})} />
                <input type="number" placeholder="Total Weight (Kg)" value={orderDetails.weight} onChange={(e)=>setOrderDetails({...orderDetails, weight: e.target.value})} />
                <input type="number" placeholder="No. of Boxes" value={orderDetails.boxesCount} onChange={(e)=>handleBoxCountChange(e.target.value)} />
              </div>

              {boxes.length > 0 && (
                <div className="dimensions-list">
                  <p className="dim-label">Dimensions (Inch)</p>
                  {boxes.map((box, index) => (
                    <div key={index} className="dim-row">
                      <span>Box {index+1}</span>
                      <input type="number" placeholder="L" onChange={(e) => updateDim(index, 'l', e.target.value)} />
                      <input type="number" placeholder="W" onChange={(e) => updateDim(index, 'w', e.target.value)} />
                      <input type="number" placeholder="H" onChange={(e) => updateDim(index, 'h', e.target.value)} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="action-card">
              <div className="price-display">
                <span className="label">Estimated Total</span>
                <span className="value">₹ {freightData.total.toFixed(2)}</span>
                <small>(Freight: ₹{freightData.freight.toFixed(2)} + GST)</small>
              </div>
              <div className="btn-stack">
                <button className="btn-secondary" onClick={handleCheckFreight}><Calculator size={16} /> Calculate Price</button>
                <button className="btn-primary" onClick={handleCreateOrder} disabled={loading}>
                  {loading ? "Processing..." : "Generate LR Number"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Success Modal */}
      {showLR && (
        <div className="success-overlay">
          <div className="success-box">
            <CheckCircle size={48} color="#10b981" />
            <h3>Success! Order Saved</h3>
            <p className="lr-display">LR Number: <strong>{lrNumber}</strong></p>
            <div className="btn-group">
              <button className="btn-print" onClick={() => window.print()}><Printer size={16} /> Print Docket</button>
              <button className="btn-close" onClick={() => window.location.href = "/shipment-details"}>View List</button>
              <button className="btn-secondary" onClick={() => window.location.reload()}>Next Order</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}