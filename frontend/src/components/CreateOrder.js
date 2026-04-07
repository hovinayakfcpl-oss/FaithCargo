import React, { useState, useEffect, useMemo } from "react";
import { 
  Truck, MapPin, Package, FileText, Upload, 
  Save, Calculator, CheckCircle, Printer, Info, Trash2, Plus
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
  const [orderDetails, setOrderDetails] = useState({ material: "", hsn: "1234", actualWeight: "", chargedWeight: "", boxesCount: 0 });
  const [invoice, setInvoice] = useState({ no: "", value: "", ewayBill: "" });

  // 📍 1. Advanced Pincode Fetch (State + City)
  const fetchLocation = async (pin, type) => {
    if (pin.length === 6) {
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const data = await res.json();
        if (data[0].Status === "Success") {
          const postOffice = data[0].PostOffice[0];
          const stateName = postOffice.State;
          const cityName = postOffice.District;
          
          if (type === "pickup") setPickup(prev => ({ ...prev, state: stateName, city: cityName }));
          else setDelivery(prev => ({ ...prev, state: stateName, city: cityName }));
        }
      } catch (err) { console.error("Pincode Error", err); }
    }
  };

  // 📦 2. Auto Volumetric Weight Calculation
  const volumetricWeight = useMemo(() => {
    const totalVol = boxes.reduce((acc, box) => {
      const vol = (parseFloat(box.l || 0) * parseFloat(box.w || 0) * parseFloat(box.h || 0)) / 1728; // Inch to CFT
      return acc + vol;
    }, 0);
    return (totalVol * 10).toFixed(2); // Standard Conversion Factor
  }, [boxes]);

  // Sync Volumetric to Charged Weight
  useEffect(() => {
    const actual = parseFloat(orderDetails.actualWeight) || 0;
    const vol = parseFloat(volumetricWeight) || 0;
    setOrderDetails(prev => ({ ...prev, chargedWeight: Math.max(actual, vol) }));
  }, [volumetricWeight, orderDetails.actualWeight]);

  // 💰 3. CHECK FREIGHT
  const handleCheckFreight = async () => {
    if (!pickup.pincode || !delivery.pincode || !orderDetails.chargedWeight) {
      alert("Please enter full details and weighment first!");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/shipments/calculate-freight/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          origin: pickup.pincode,
          destination: delivery.pincode,
          weight: orderDetails.chargedWeight
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
        alert(data.error || "Rate not found.");
      }
    } catch (err) { alert("Rate service currently unavailable."); }
  };

  // 📦 4. CREATE ORDER
  const handleCreateOrder = async () => {
    if (!pickup.name || !delivery.name) {
      alert("Name fields are mandatory!");
      return;
    }
    setLoading(true);

    const payload = {
      pickupName: pickup.name,
      pickupContact: pickup.contact,
      pickupAddress: `${pickup.address}, ${pickup.city}`,
      pickupPincode: pickup.pincode,
      deliveryName: delivery.name,
      deliveryContact: delivery.contact,
      deliveryAddress: `${delivery.address}, ${delivery.city}`,
      deliveryPincode: delivery.pincode,
      material: orderDetails.material,
      boxes: orderDetails.boxesCount,
      weight: orderDetails.chargedWeight,
      total_value: invoice.value || 0,
      eway_bill: invoice.ewayBill,
      dimensions: boxes // Sending dimensions array to backend
    };

    try {
      const response = await fetch(`${API_BASE}/shipments/create-order/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (result.success) {
        setLrNumber(result.lr_number);
        setShowLR(true);
      } else { alert(result.error); }
    } catch (error) { alert("Critical Server Error."); }
    finally { setLoading(false); }
  };

  const handleBoxCountChange = (count) => {
    const num = Math.min(parseInt(count) || 0, 50); // Limit to 50 boxes
    setOrderDetails(prev => ({ ...prev, boxesCount: num }));
    setBoxes(Array.from({ length: num }, (_, i) => ({ id: i + 1, l: "", w: "", h: "" })));
  };

  return (
    <div className="order-wrapper">
      {/* Dynamic Summary Bar */}
      <div className="sticky-summary">
        <div className="summary-item">
            <span>Charged Weight:</span>
            <strong>{orderDetails.chargedWeight} Kg</strong>
        </div>
        <div className="summary-item price">
            <span>Estimated Total:</span>
            <strong>₹ {freightData.total.toFixed(2)}</strong>
        </div>
      </div>

      <header className="order-header">
        <div className="header-left">
          <Truck size={28} className="icon-main" />
          <div>
            <h1>Faith Cargo Booking</h1>
            <p>Generate dockets and manifest in real-time</p>
          </div>
        </div>
      </header>

      <main className="order-container">
        <div className="form-grid">
          <div className="form-left">
            {/* Pickup Details */}
            <div className="section-card">
              <div className="card-head"><MapPin size={18} /> Pickup (Origin)</div>
              <div className="inner-grid">
                <input type="text" placeholder="Sender Name" value={pickup.name} onChange={(e)=>setPickup({...pickup, name: e.target.value})} />
                <input type="text" placeholder="Contact No" value={pickup.contact} onChange={(e)=>setPickup({...pickup, contact: e.target.value})} />
                <input type="text" className="span-2" placeholder="Full Address" value={pickup.address} onChange={(e)=>setPickup({...pickup, address: e.target.value})} />
                <input type="text" placeholder="Pincode" maxLength="6" value={pickup.pincode} onChange={(e) => { setPickup({...pickup, pincode: e.target.value}); fetchLocation(e.target.value, "pickup"); }} />
                <input type="text" placeholder="City/State" value={pickup.city ? `${pickup.city}, ${pickup.state}` : ""} readOnly className="readonly-input" />
              </div>
            </div>

            {/* Delivery Details */}
            <div className="section-card">
              <div className="card-head"><MapPin size={18} color="#10b981" /> Delivery (Destination)</div>
              <div className="inner-grid">
                <input type="text" placeholder="Receiver Name" value={delivery.name} onChange={(e)=>setDelivery({...delivery, name: e.target.value})} />
                <input type="text" placeholder="Contact No" value={delivery.contact} onChange={(e)=>setDelivery({...delivery, contact: e.target.value})} />
                <input type="text" className="span-2" placeholder="Full Address" value={delivery.address} onChange={(e)=>setDelivery({...delivery, address: e.target.value})} />
                <input type="text" placeholder="Pincode" maxLength="6" value={delivery.pincode} onChange={(e) => { setDelivery({...delivery, pincode: e.target.value}); fetchLocation(e.target.value, "delivery"); }} />
                <input type="text" placeholder="City/State" value={delivery.city ? `${delivery.city}, ${delivery.state}` : ""} readOnly className="readonly-input" />
              </div>
            </div>

            {/* Documents */}
            <div className="section-card">
              <div className="card-head"><FileText size={18} /> Documentation</div>
              <div className="inner-grid">
                <input type="text" placeholder="Invoice No." value={invoice.no} onChange={(e)=>setInvoice({...invoice, no: e.target.value})} />
                <input type="number" placeholder="Invoice Value (₹)" value={invoice.value} onChange={(e)=>setInvoice({...invoice, value: e.target.value})} />
                {parseFloat(invoice.value) >= 50000 && (
                  <div className="span-2 warning-input">
                    <Info size={14} />
                    <input type="text" placeholder="E-way Bill (Mandatory)" value={invoice.ewayBill} onChange={(e)=>setInvoice({...invoice, ewayBill: e.target.value})} />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="form-right">
            {/* Box Weighment */}
            <div className="section-card">
              <div className="card-head"><Package size={18} /> Packaging & Weight</div>
              <div className="inner-grid">
                <input type="text" placeholder="Material Type" className="span-2" value={orderDetails.material} onChange={(e)=>setOrderDetails({...orderDetails, material: e.target.value})} />
                <input type="number" placeholder="Actual Weight (Kg)" value={orderDetails.actualWeight} onChange={(e)=>setOrderDetails({...orderDetails, actualWeight: e.target.value})} />
                <input type="number" placeholder="No. of Boxes" value={orderDetails.boxesCount} onChange={(e)=>handleBoxCountChange(e.target.value)} />
              </div>

              {boxes.length > 0 && (
                <div className="dimensions-list">
                  <div className="dim-header">
                    <span>Box Dimensions (L x W x H Inch)</span>
                    <span className="vol-badge">Vol. Weight: {volumetricWeight} Kg</span>
                  </div>
                  {boxes.map((box, index) => (
                    <div key={index} className="dim-row animate-in">
                      <span className="box-idx">{index+1}</span>
                      <input type="number" placeholder="L" value={box.l} onChange={(e) => updateDim(index, 'l', e.target.value)} />
                      <input type="number" placeholder="W" value={box.w} onChange={(e) => updateDim(index, 'w', e.target.value)} />
                      <input type="number" placeholder="H" value={box.h} onChange={(e) => updateDim(index, 'h', e.target.value)} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="action-card">
              <div className="final-details">
                <div className="detail-row">
                    <span>Charged Weight</span>
                    <strong>{orderDetails.chargedWeight} Kg</strong>
                </div>
                <div className="detail-row">
                    <span>Freight Cost</span>
                    <span>₹{freightData.freight.toFixed(2)}</span>
                </div>
              </div>
              <div className="btn-stack">
                <button className="btn-secondary pulse" onClick={handleCheckFreight}><Calculator size={16} /> Fetch Best Rate</button>
                <button className="btn-primary" onClick={handleCreateOrder} disabled={loading || !freightData.freight}>
                  {loading ? "Saving Order..." : "Confirm & Generate LR"}
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
            <div className="icon-circle"><CheckCircle size={48} /></div>
            <h3>Shipment Booked!</h3>
            <p>Your LR Number has been generated</p>
            <div className="lr-card">{lrNumber}</div>
            <div className="btn-group">
              <button className="btn-print" onClick={() => window.print()}><Printer size={16} /> Print LR Copy</button>
              <button className="btn-secondary" onClick={() => window.location.reload()}><Plus size={16} /> New Booking</button>
            </div>
            <button className="text-btn" onClick={() => window.location.href = "/shipment-details"}>Go to All Shipments</button>
          </div>
        </div>
      )}
    </div>
  );

  function updateDim(index, field, value) {
    const updatedBoxes = [...boxes];
    updatedBoxes[index][field] = value;
    setBoxes(updatedBoxes);
  }
}