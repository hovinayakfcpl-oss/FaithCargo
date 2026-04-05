import React, { useState } from "react";
import "./CreateOrder.css";

export default function CreateOrder() {

  const [dark, setDark] = useState(false);
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);

  const [pickup, setPickup] = useState({});
  const [delivery, setDelivery] = useState({});

  const [form, setForm] = useState({
    description: "",
    boxes: "",
    weight: "",
    ewayBill: ""
  });

  const [invoices, setInvoices] = useState([{ no: "", value: "" }]);
  const total = invoices.reduce((s, i) => s + Number(i.value || 0), 0);

  // PINCODE API
  const fetchState = async (pin, type) => {
    if (pin.length === 6) {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await res.json();
      const state = data[0]?.PostOffice?.[0]?.State || "";

      if (type === "pickup") setPickup(prev => ({ ...prev, state }));
      else setDelivery(prev => ({ ...prev, state }));
    }
  };

  return (
    <div className={dark ? "app dark" : "app"}>

      {/* HEADER */}
      <div className="header">
        <h2>Create New Order</h2>
        <button onClick={() => setDark(!dark)}>🌙</button>
      </div>

      <div className="layout">

        {/* LEFT SIDE */}
        <div className="left">

          {/* UPLOAD */}
          <div className="card upload">
            <h3>Upload your invoice</h3>
            <div className="uploadBox">
              Drag & Drop PDF or Click
              <input type="file" />
            </div>
          </div>

          {/* LR */}
          <div className="card">
            <h3>LR Details</h3>
            <input placeholder="Enter LR number"/>
          </div>

          {/* ORDER */}
          <div className="card">
            <h3>Order Details</h3>
            <input placeholder="Description"
              onChange={(e)=>setForm({...form, description:e.target.value})}
            />
            <div className="row">
              <input placeholder="Boxes"/>
              <input placeholder="Weight"/>
            </div>
          </div>

          {/* INVOICE */}
          <div className="card">
            <h3>Invoice Details</h3>

            {invoices.map((inv, i) => (
              <div className="row" key={i}>
                <input placeholder="Invoice No"
                  onChange={(e)=>{
                    let arr=[...invoices]; arr[i].no=e.target.value; setInvoices(arr);
                  }}
                />
                <input placeholder="Amount"
                  onChange={(e)=>{
                    let arr=[...invoices]; arr[i].value=e.target.value; setInvoices(arr);
                  }}
                />
              </div>
            ))}

            <button onClick={()=>setInvoices([...invoices,{no:"",value:""}])}>
              + Add
            </button>

            <p>Total ₹ {total}</p>

            {total >= 50000 && (
              <input placeholder="E-way bill"/>
            )}
          </div>

        </div>

        {/* RIGHT SIDE */}
        <div className="right">

          <div className="card">
            <h3>Delivery Details</h3>

            <button onClick={()=>setShowPickupModal(true)}>
              {pickup.name || "Select Pickup Location"}
            </button>

            <button onClick={()=>setShowDeliveryModal(true)}>
              {delivery.name || "Select Drop Location"}
            </button>
          </div>

          <div className="card">
            <h3>Weights & Dimensions</h3>
            <p>Total Boxes: {form.boxes}</p>
            <p>Weight: {form.weight} kg</p>
          </div>

        </div>

      </div>

      {/* PICKUP MODAL */}
      {showPickupModal && (
        <div className="modal">
          <div className="modalBox">

            <h2>Add Pickup Address</h2>

            <input placeholder="Facility Name"
              onChange={(e)=>setPickup({...pickup, name:e.target.value})}
            />

            <input placeholder="Mobile"
              onChange={(e)=>setPickup({...pickup, contact:e.target.value})}
            />

            <input placeholder="Pincode"
              onChange={(e)=>{
                setPickup({...pickup, pincode:e.target.value});
                fetchState(e.target.value,"pickup");
              }}
            />

            <input value={pickup.state || ""} placeholder="State" disabled/>

            <button onClick={()=>setShowPickupModal(false)}>Save</button>

          </div>
        </div>
      )}

      {/* DELIVERY MODAL */}
      {showDeliveryModal && (
        <div className="modal">
          <div className="modalBox">

            <h2>Add Delivery Address</h2>

            <input placeholder="Name"
              onChange={(e)=>setDelivery({...delivery, name:e.target.value})}
            />

            <input placeholder="Mobile"
              onChange={(e)=>setDelivery({...delivery, contact:e.target.value})}
            />

            <input placeholder="Pincode"
              onChange={(e)=>{
                setDelivery({...delivery, pincode:e.target.value});
                fetchState(e.target.value,"delivery");
              }}
            />

            <input value={delivery.state || ""} placeholder="State" disabled/>

            <button onClick={()=>setShowDeliveryModal(false)}>Save</button>

          </div>
        </div>
      )}

    </div>
  );
}