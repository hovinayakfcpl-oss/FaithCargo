import React, { useState, useEffect } from "react";
import "./CreateOrder.css";

const BASE_URL = "https://faithcargo.onrender.com/api";

export default function CreateOrder() {

  const [showPickupModal, setShowPickupModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showBoxForm, setShowBoxForm] = useState(false);

  const [locations, setLocations] = useState([]);
  const [pickupId, setPickupId] = useState("");
  const [deliveryId, setDeliveryId] = useState("");

  const [creating, setCreating] = useState(false);

  const [newPickup, setNewPickup] = useState({
    name: "", contact: "", address: "", pincode: "", state: ""
  });

  const [newDelivery, setNewDelivery] = useState({
    name: "", contact: "", address: "", pincode: "", state: ""
  });

  const [boxes, setBoxes] = useState([]);
  const [newBox, setNewBox] = useState({
    length: "", width: "", height: "", weight: ""
  });

  const [invoices, setInvoices] = useState([
    { invoice_no: "", invoice_value: "" }
  ]);

  const [formData, setFormData] = useState({
    lr_mode: "manual",
    lr_number: "",
    material: "",
    hsn: "",
    reference_id: "",
    payment_mode: "prepaid",
    eway_bill: "",
    invoice_document: null,
    secondary_document: null,
    secondary_document_type: "",
    insurance_type: "owner_risk",
    shipping_mode: "SURFACE"
  });

  const [rate, setRate] = useState(null);

  // 🔹 LOAD LOCATIONS
  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const res = await fetch(`${BASE_URL}/get-locations/`);
      const data = await res.json();
      setLocations(data || []);
    } catch {
      showToast("Failed to load locations", "error");
    }
  };

  // 🔹 PINCODE → STATE
  const fetchState = async (pin, type) => {
    if (pin.length === 6) {
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const data = await res.json();
        const state = data[0]?.PostOffice?.[0]?.State || "";

        if (type === "pickup") {
          setNewPickup(prev => ({ ...prev, state }));
        } else {
          setNewDelivery(prev => ({ ...prev, state }));
        }
      } catch {}
    }
  };

  // 🔹 SAVE LOCATION
  const saveLocation = async (data, type) => {
    try {
      const res = await fetch(`${BASE_URL}/add-location/`, {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ ...data, type })
      });

      const result = await res.json();

      setLocations(prev => [result, ...prev]);

      if (type === "pickup") {
        setPickupId(String(result.id));
        setShowPickupModal(false);
        setNewPickup({ name:"",contact:"",address:"",pincode:"",state:"" });
      } else {
        setDeliveryId(String(result.id));
        setShowDeliveryModal(false);
        setNewDelivery({ name:"",contact:"",address:"",pincode:"",state:"" });
      }

      showToast("Location added ✅");

    } catch {
      showToast("Save failed ❌","error");
    }
  };

  // 🔹 BOX
  const addBox = () => {
    if (!newBox.length || !newBox.width || !newBox.height || !newBox.weight) {
      return showToast("Fill all box fields","error");
    }

    setBoxes(prev => [...prev, {
      length: +newBox.length,
      width: +newBox.width,
      height: +newBox.height,
      weight: +newBox.weight
    }]);

    setNewBox({ length:"",width:"",height:"",weight:"" });
    setShowBoxForm(false);
    showToast("Box Added 📦");
  };

  const removeBox = (i) => {
    setBoxes(prev => prev.filter((_,index)=>index!==i));
  };

  // 🔹 INVOICE
  const handleInvoiceChange = (i, field, value) => {
    const updated = [...invoices];
    updated[i][field] = value;
    setInvoices(updated);
  };

  const addInvoice = () => setInvoices([...invoices,{invoice_no:"",invoice_value:""}]);
  const removeInvoice = (i) => invoices.length>1 && setInvoices(prev=>prev.filter((_,index)=>index!==i));

  // 🔹 TOTAL
  const totalValue = invoices.reduce((s,i)=>s+Number(i.invoice_value||0),0);
  const totalWeight = boxes.reduce((s,b)=>s+b.weight,0);

  // 🔹 CREATE ORDER
  const createOrder = async () => {

    if (!pickupId || !deliveryId)
      return showToast("Select locations","error");

    if (boxes.length === 0)
      return showToast("Add at least 1 box","error");

    if (totalValue >= 50000 && formData.eway_bill.length !== 14)
      return showToast("Eway bill must be 14 digit","error");

    setCreating(true);

    try {

      const res = await fetch(`${BASE_URL}/create-order/`,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          pickup_id: pickupId,
          delivery_id: deliveryId,
          material: formData.material,
          hsn: formData.hsn,
          boxes: boxes.length,
          weight: totalWeight,
          total_value: totalValue,
          eway_bill: formData.eway_bill,
          invoices
        })
      });

      const data = await res.json().catch(()=>({}));

      if (data.lr_number) {

        showToast(`✅ Order Created! LR: ${data.lr_number}`);

        // RESET
        setPickupId("");
        setDeliveryId("");
        setBoxes([]);
        setInvoices([{ invoice_no:"",invoice_value:"" }]);
        setFormData({
          lr_mode:"manual",
          lr_number:"",
          material:"",
          hsn:"",
          reference_id:"",
          payment_mode:"prepaid",
          eway_bill:"",
          invoice_document:null,
          secondary_document:null,
          secondary_document_type:"",
          insurance_type:"owner_risk",
          shipping_mode:"SURFACE"
        });

        window.scrollTo({top:0,behavior:"smooth"});

      } else {
        showToast("Create failed ❌","error");
      }

    } catch {
      showToast("Server error ❌","error");
    }

    setCreating(false);
  };

  // 🔹 TOAST
  const showToast = (msg,type="success") => {
    const t = document.createElement("div");
    t.className = `toast ${type}`;
    t.innerText = msg;
    document.body.appendChild(t);

    setTimeout(()=>t.classList.add("show"),100);
    setTimeout(()=>{t.remove()},3000);
  };

  return (
    <div className="create-order-page">

      <h1>Create Order</h1>

      {/* LOCATION */}
      <div className="card">
        <h3>📍 Delivery Details</h3>

        <select value={pickupId} onChange={e=>setPickupId(e.target.value)}>
          <option value="">Pickup Location</option>
          {locations.map(l=>(
            <option key={l.id} value={l.id}>{l.name} ({l.pincode})</option>
          ))}
        </select>

        <button onClick={()=>setShowPickupModal(true)}>+ Add Pickup</button>

        <select value={deliveryId} onChange={e=>setDeliveryId(e.target.value)}>
          <option value="">Drop Location</option>
          {locations.map(l=>(
            <option key={l.id} value={l.id}>{l.name} ({l.pincode})</option>
          ))}
        </select>

        <button onClick={()=>setShowDeliveryModal(true)}>+ Add Delivery</button>
      </div>

      {/* BOX */}
      <div className="card">
        <h3>📦 Boxes</h3>

        <button onClick={()=>setShowBoxForm(true)}>+ Add Box</button>

        {showBoxForm && (
          <div>
            <input placeholder="L" value={newBox.length} onChange={e=>setNewBox({...newBox,length:e.target.value})}/>
            <input placeholder="W" value={newBox.width} onChange={e=>setNewBox({...newBox,width:e.target.value})}/>
            <input placeholder="H" value={newBox.height} onChange={e=>setNewBox({...newBox,height:e.target.value})}/>
            <input placeholder="Weight" value={newBox.weight} onChange={e=>setNewBox({...newBox,weight:e.target.value})}/>
            <button onClick={addBox}>Save</button>
          </div>
        )}

        <p>{boxes.length} boxes | {totalWeight} kg</p>
      </div>

      {/* INVOICE */}
      <div className="card">
        <h3>💳 Invoice</h3>

        {invoices.map((inv,i)=>(
          <div key={i}>
            <input placeholder="Invoice No" value={inv.invoice_no} onChange={e=>handleInvoiceChange(i,"invoice_no",e.target.value)}/>
            <input placeholder="Amount" value={inv.invoice_value} onChange={e=>handleInvoiceChange(i,"invoice_value",e.target.value)}/>
            {i>0 && <button onClick={()=>removeInvoice(i)}>❌</button>}
          </div>
        ))}

        <button onClick={addInvoice}>+ Add</button>

        <h4>Total ₹ {totalValue}</h4>

        {totalValue>=50000 && (
          <input
            placeholder="Eway Bill"
            value={formData.eway_bill}
            onChange={(e)=>{
              const val = e.target.value.replace(/\D/g,"").slice(0,14);
              setFormData({...formData,eway_bill:val});
            }}
          />
        )}
      </div>

      <button className="submit-btn" onClick={createOrder} disabled={creating}>
        {creating ? "Creating..." : "Create Order"}
      </button>

    </div>
  );
}