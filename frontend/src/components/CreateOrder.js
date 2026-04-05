import React, { useState, useEffect } from "react";
import "./CreateOrder.css";

// ✅ FINAL BASE URL
const BASE_URL = "https://faithcargo.onrender.com/api";

export default function CreateOrder() {

  const [showPickup, setShowPickup] = useState(false);
  const [showDelivery, setShowDelivery] = useState(false);

  const [locations, setLocations] = useState([]);

  const [pickupId, setPickupId] = useState("");
  const [deliveryId, setDeliveryId] = useState("");

  const [pickup, setPickup] = useState({});
  const [delivery, setDelivery] = useState({});

  const [rate, setRate] = useState(null); // 🔥 RATE RESULT

  const [invoices, setInvoices] = useState([
    { invoice_no: "", invoice_value: "" }
  ]);

  const [form, setForm] = useState({
    material: "",
    hsn: "",
    boxes: "",
    weight: "",
    insurance: "owner",
    eway: ""
  });

  // 🔄 LOAD LOCATIONS
  useEffect(() => {
    fetch(`${BASE_URL}/get-locations/`)
      .then(res => res.json())
      .then(data => setLocations(data));
  }, []);

  // 📍 PINCODE → STATE
  const fetchState = async (pin, type) => {
    if (pin.length === 6) {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await res.json();
      const state = data[0]?.PostOffice?.[0]?.State || "";

      if (type === "pickup") setPickup(p => ({ ...p, state }));
      else setDelivery(d => ({ ...d, state }));
    }
  };

  // 📍 SAVE LOCATION
  const saveLocation = async (data, type) => {
    const res = await fetch(`${BASE_URL}/add-location/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, type })
    });

    const result = await res.json();

    setLocations(prev => [result, ...prev]);

    if (type === "pickup") {
      setPickupId(result.id);
      setShowPickup(false);
    } else {
      setDeliveryId(result.id);
      setShowDelivery(false);
    }
  };

  // 📦 INVOICE HANDLING
  const handleInvoiceChange = (i, field, value) => {
    const arr = [...invoices];
    arr[i][field] = value;
    setInvoices(arr);
  };

  const addInvoice = () => {
    setInvoices([...invoices, { invoice_no: "", invoice_value: "" }]);
  };

  const total = invoices.reduce(
    (sum, i) => sum + Number(i.invoice_value || 0),
    0
  );

  // 🚀 🔥 CALCULATE RATE (NEW)
  const calculateRate = async () => {

    if (!pickupId || !deliveryId || !form.weight) {
      alert("Select locations & weight first ❌");
      return;
    }

    const pickupLoc = locations.find(l => l.id == pickupId);
    const deliveryLoc = locations.find(l => l.id == deliveryId);

    const res = await fetch(`${BASE_URL}/rates/b2b/calculate/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        pickup_pincode: pickupLoc?.pincode,
        delivery_pincode: deliveryLoc?.pincode,
        weight: Number(form.weight),
        invoice_value: total
      })
    });

    const data = await res.json();
    setRate(data);
  };

  // 🚀 CREATE ORDER
  const createOrder = async () => {

    if (!pickupId || !deliveryId) {
      alert("Select Pickup & Delivery ❌");
      return;
    }

    if (total >= 50000 && !form.eway) {
      alert("E-way bill required above 50k ❌");
      return;
    }

    const res = await fetch(`${BASE_URL}/create-order/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        pickup_id: pickupId,
        delivery_id: deliveryId,
        material: form.material,
        hsn: form.hsn,
        boxes: Number(form.boxes),
        weight: Number(form.weight),
        total_value: total,
        eway_bill: form.eway,
        insurance_type: form.insurance,
        invoices: invoices
      })
    });

    const data = await res.json();

    if (data.lr_number) {
      alert(`Order Created ✅ LR: ${data.lr_number}`);
    } else {
      alert(data.error || "Error ❌");
    }
  };

  return (
    <div className="main">

      <h2>Create Shipment</h2>

      <div className="layout">

        {/* LEFT */}
        <div className="left">

          {/* PICKUP */}
          <div className="card">
            <h4>Pickup Location</h4>

            <select value={pickupId} onChange={(e)=>setPickupId(e.target.value)}>
              <option value="">Select Pickup</option>
              {locations.filter(l=>l.type==="pickup").map(l=>(
                <option key={l.id} value={l.id}>
                  {l.name} ({l.pincode})
                </option>
              ))}
            </select>

            <button onClick={()=>setShowPickup(true)}>+ Add Pickup</button>
          </div>

          {/* DELIVERY */}
          <div className="card">
            <h4>Delivery Location</h4>

            <select value={deliveryId} onChange={(e)=>setDeliveryId(e.target.value)}>
              <option value="">Select Delivery</option>
              {locations.filter(l=>l.type==="delivery").map(l=>(
                <option key={l.id} value={l.id}>
                  {l.name} ({l.pincode})
                </option>
              ))}
            </select>

            <button onClick={()=>setShowDelivery(true)}>+ Add Delivery</button>
          </div>

          {/* SHIPMENT */}
          <div className="card">
            <h4>Shipment</h4>
            <input placeholder="Material" onChange={(e)=>setForm({...form, material:e.target.value})}/>
            <input placeholder="HSN" onChange={(e)=>setForm({...form, hsn:e.target.value})}/>
            <input placeholder="Boxes" onChange={(e)=>setForm({...form, boxes:e.target.value})}/>
            <input placeholder="Weight" onChange={(e)=>setForm({...form, weight:e.target.value})}/>
          </div>

          {/* INVOICE */}
          <div className="card">
            <h4>Invoices</h4>

            {invoices.map((inv,i)=>(
              <div key={i} className="row">
                <input placeholder="Invoice No"
                  onChange={(e)=>handleInvoiceChange(i,"invoice_no",e.target.value)}
                />
                <input placeholder="Amount"
                  onChange={(e)=>handleInvoiceChange(i,"invoice_value",e.target.value)}
                />
              </div>
            ))}

            <button onClick={addInvoice}>+ Add Invoice</button>

            <p>Total ₹ {total}</p>

            {total >= 50000 && (
              <input placeholder="E-way Bill"
                onChange={(e)=>setForm({...form, eway:e.target.value})}
              />
            )}
          </div>

          {/* 🔥 RATE CALCULATOR */}
          <button className="calcBtn" onClick={calculateRate}>
            Calculate Freight
          </button>

          {rate && (
            <div className="card result">
              <h4>Freight Result</h4>
              <p>Zone: {rate.zone}</p>
              <p>Freight: ₹ {rate.freight}</p>
              <p>Fuel: ₹ {rate.fuel}</p>
              <p>GST: ₹ {rate.gst}</p>
              <h3>Total: ₹ {rate.total}</h3>
            </div>
          )}

          {/* SUBMIT */}
          <button className="submitBtn" onClick={createOrder}>
            Create Order
          </button>

        </div>

      </div>

      {/* MODALS SAME */}
      {showPickup && (
        <div className="modal">
          <div className="modalBox">
            <h3>Add Pickup</h3>
            <input placeholder="Name" onChange={(e)=>setPickup({...pickup,name:e.target.value})}/>
            <input placeholder="Contact" onChange={(e)=>setPickup({...pickup,contact:e.target.value})}/>
            <input placeholder="Address" onChange={(e)=>setPickup({...pickup,address:e.target.value})}/>
            <input placeholder="Pincode"
              onChange={(e)=>{
                setPickup({...pickup,pincode:e.target.value});
                fetchState(e.target.value,"pickup");
              }}
            />
            <input value={pickup.state||""} disabled/>

            <button onClick={()=>saveLocation(pickup,"pickup")}>
              Save
            </button>
          </div>
        </div>
      )}

      {showDelivery && (
        <div className="modal">
          <div className="modalBox">
            <h3>Add Delivery</h3>
            <input placeholder="Name" onChange={(e)=>setDelivery({...delivery,name:e.target.value})}/>
            <input placeholder="Contact" onChange={(e)=>setDelivery({...delivery,contact:e.target.value})}/>
            <input placeholder="Address" onChange={(e)=>setDelivery({...delivery,address:e.target.value})}/>
            <input placeholder="Pincode"
              onChange={(e)=>{
                setDelivery({...delivery,pincode:e.target.value});
                fetchState(e.target.value,"delivery");
              }}
            />
            <input value={delivery.state||""} disabled/>

            <button onClick={()=>saveLocation(delivery,"delivery")}>
              Save
            </button>
          </div>
        </div>
      )}

    </div>
  );
}