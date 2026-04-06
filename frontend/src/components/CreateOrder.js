import React, { useState } from "react";
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
  
  const [pickup, setPickup] = useState({ name: "", contact: "", address: "", pincode: "", state: "" });
  const [delivery, setDelivery] = useState({ name: "", contact: "", address: "", pincode: "", state: "" });
  const [orderDetails, setOrderDetails] = useState({ material: "", hsn: "1234", weight: "", boxesCount: 0 });
  const [invoice, setInvoice] = useState({ no: "", value: "", ewayBill: "" });

  const fetchState = async (pin, type) => {
    if (pin.length === 6) {
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const data = await res.json();
        const stateName = data[0]?.PostOffice?.[0]?.State || "Not Found";
        if (type === "pickup") setPickup(prev => ({ ...prev, pincode: pin, state: stateName }));
        else setDelivery(prev => ({ ...prev, pincode: pin, state: stateName }));
      } catch (err) { console.error("Pincode Error", err); }
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

  // 🚀 BACKEND SUBMISSION LOGIC
  const handleCreateOrder = async () => {
    if (!pickup.pincode || !delivery.pincode || !orderDetails.weight) {
      alert("Please fill basic shipment details!");
      return;
    }

    setLoading(true);

    // Backend (Django) payload mapping
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
      insurance_type: "owner",
      
      // Backend expects a list of invoices
      invoices: [
        {
          invoice_no: invoice.no,
          invoice_value: invoice.value || 0
        }
      ]
    };

    try {
      const response = await fetch(`${API_BASE}/create-order/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.lr_number) {
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

  return (
    <div className="order-wrapper">
      <header className="order-header">
        <div className="header-left">
          <Truck size={24} color="#2563eb" />
          <h1>Create New Shipment</h1>
        </div>
      </header>

      <main className="order-container">
        <div className="form-grid">
          <div className="form-left">
            {/* Pickup */}
            <div className="section-card">
              <div className="card-head"><MapPin size={18} /> Pickup Details</div>
              <div className="inner-grid">
                <input type="text" placeholder="Sender Name" onChange={(e)=>setPickup({...pickup, name: e.target.value})} />
                <input type="text" placeholder="Contact No" onChange={(e)=>setPickup({...pickup, contact: e.target.value})} />
                <input type="text" className="span-2" placeholder="Full Address" onChange={(e)=>setPickup({...pickup, address: e.target.value})} />
                <input type="text" placeholder="Pincode" maxLength="6" onChange={(e) => fetchState(e.target.value, "pickup")} />
                <input type="text" placeholder="State" value={pickup.state} readOnly className="readonly-input" />
              </div>
            </div>

            {/* Delivery */}
            <div className="section-card">
              <div className="card-head"><MapPin size={18} color="#10b981" /> Delivery Details</div>
              <div className="inner-grid">
                <input type="text" placeholder="Receiver Name" onChange={(e)=>setDelivery({...delivery, name: e.target.value})} />
                <input type="text" placeholder="Contact No" onChange={(e)=>setDelivery({...delivery, contact: e.target.value})} />
                <input type="text" className="span-2" placeholder="Full Address" onChange={(e)=>setDelivery({...delivery, address: e.target.value})} />
                <input type="text" placeholder="Pincode" maxLength="6" onChange={(e) => fetchState(e.target.value, "delivery")} />
                <input type="text" placeholder="State" value={delivery.state} readOnly className="readonly-input" />
              </div>
            </div>

            {/* Invoice */}
            <div className="section-card">
              <div className="card-head"><FileText size={18} /> Invoice & Documents</div>
              <div className="inner-grid">
                <input type="text" placeholder="Invoice No." onChange={(e)=>setInvoice({...invoice, no: e.target.value})} />
                <input type="number" placeholder="Invoice Value (₹)" onChange={(e)=>setInvoice({...invoice, value: e.target.value})} />
                <input type="text" className="span-2" placeholder="E-way Bill Number (Optional)" onChange={(e)=>setInvoice({...invoice, ewayBill: e.target.value})} />
                <div className="upload-box span-2">
                  <Upload size={20} />
                  <p>Click to upload Invoice PDF</p>
                  <input type="file" className="file-hidden" />
                </div>
              </div>
            </div>
          </div>

          <div className="form-right">
            <div className="section-card">
              <div className="card-head"><Package size={18} /> Box & Dimensions</div>
              <div className="inner-grid">
                <input type="text" placeholder="Material Type" className="span-2" onChange={(e)=>setOrderDetails({...orderDetails, material: e.target.value})} />
                <input type="number" placeholder="Total Weight (Kg)" onChange={(e)=>setOrderDetails({...orderDetails, weight: e.target.value})} />
                <input type="number" placeholder="No. of Boxes" onChange={(e)=>handleBoxCountChange(e.target.value)} />
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
                <span className="label">Estimated Freight</span>
                <span className="value">₹ 0.00</span>
              </div>
              <div className="btn-stack">
                <button className="btn-secondary"><Calculator size={16} /> Check Freight</button>
                <button className="btn-primary" onClick={handleCreateOrder} disabled={loading}>
                  {loading ? "Processing..." : "Submit Order"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {showLR && (
        <div className="success-overlay">
          <div className="success-box">
            <CheckCircle size={48} color="#10b981" />
            <h3>Order Created!</h3>
            <p>LR Number: <strong>{lrNumber}</strong></p>
            <button className="btn-print" onClick={() => window.print()}><Printer size={16} /> Print Docket</button>
            <button className="btn-close" onClick={()=>setShowLR(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}