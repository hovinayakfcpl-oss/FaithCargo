import React, { useState } from "react";
import "./CreateOrder.css";

export default function CreateOrder() {

  const [showPickup, setShowPickup] = useState(false);
  const [showDelivery, setShowDelivery] = useState(false);

  const [pickup, setPickup] = useState({});
  const [delivery, setDelivery] = useState({});

  const [invoice, setInvoice] = useState({
    invoiceNo: "",
    amount: "",
    eway: ""
  });

  // PINCODE → STATE
  const fetchState = async (pin, type) => {
    if (pin.length === 6) {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await res.json();
      const state = data[0]?.PostOffice?.[0]?.State || "";

      if (type === "pickup") setPickup(p => ({ ...p, state }));
      else setDelivery(d => ({ ...d, state }));
    }
  };

  return (
    <div className="main">

      {/* HEADER */}
      <div className="topbar">
        <h2>Create New Order</h2>
      </div>

      {/* UPLOAD */}
      <div className="card upload">
        <div>
          <h3>Upload your invoice</h3>
          <p>Autofill order details from your invoice in seconds.</p>
        </div>
        <button className="linkBtn">Upload file</button>
      </div>

      <div className="layout">

        {/* LEFT */}
        <div className="left">

          {/* LR */}
          <div className="card">
            <h4>LR Details</h4>
            <div className="row">
              <label><input type="radio" checked readOnly/> Manual</label>
              <label><input type="radio"/> Automatic</label>
            </div>
            <input placeholder="Enter LR number"/>
          </div>

          {/* ORDER */}
          <div className="card">
            <h4>Order Details</h4>
            <input placeholder="Enter order description"/>
            <div className="row">
              <input placeholder="Reference ID"/>
              <input placeholder="No. of boxes"/>
            </div>
          </div>

          {/* INVOICE */}
          <div className="card">
            <h4>Invoice Details</h4>

            <label>Payment Mode</label>
            <div className="row">
              <label><input type="radio" checked readOnly/> Prepaid</label>
            </div>

            <div className="row">
              <input placeholder="E-Way Bill"
                onChange={(e)=>setInvoice({...invoice, eway:e.target.value})}
              />
              <input placeholder="Invoice No"
                onChange={(e)=>setInvoice({...invoice, invoiceNo:e.target.value})}
              />
              <input placeholder="Amount"
                onChange={(e)=>setInvoice({...invoice, amount:e.target.value})}
              />
            </div>

            <p className="total">Total ₹ {invoice.amount || 0}</p>
          </div>

          {/* INSURANCE */}
          <div className="card">
            <h4>Insure your shipment</h4>
            <p>Are you sure you want to ship at your own risk?</p>

            <div className="row">
              <label><input type="radio"/> Owner Risk</label>
              <label><input type="radio"/> Carrier Risk</label>
            </div>
          </div>

        </div>

        {/* RIGHT */}
        <div className="right">

          {/* DELIVERY */}
          <div className="card">
            <h4>Delivery Details</h4>

            <button onClick={()=>setShowPickup(true)}>
              {pickup.name || "Select Pickup Location"}
            </button>

            <button onClick={()=>setShowDelivery(true)}>
              {delivery.name || "Select Drop Location"}
            </button>
          </div>

          {/* WEIGHT */}
          <div className="card">
            <h4>Weights & Dimensions</h4>
            <p>Total shipment weight</p>
            <input placeholder="Kgs"/>
            <p>Total boxes: 0</p>
          </div>

          {/* UPLOAD DOC */}
          <div className="card">
            <h4>Upload Documents</h4>

            <div className="uploadBox">
              Upload Document (PNG, JPG, PDF)
            </div>

            <div className="uploadBox">
              Secondary Document
            </div>
          </div>

        </div>

      </div>

      {/* PICKUP MODAL */}
      {showPickup && (
        <div className="modal">
          <div className="modalBox">
            <h2>Add Pickup Address</h2>

            <input placeholder="Facility Name"
              onChange={(e)=>setPickup({...pickup, name:e.target.value})}
            />

            <input placeholder="Mobile"
              onChange={(e)=>setPickup({...pickup, mobile:e.target.value})}
            />

            <input placeholder="Address"
              onChange={(e)=>setPickup({...pickup, address:e.target.value})}
            />

            <input placeholder="Pincode"
              onChange={(e)=>{
                setPickup({...pickup, pincode:e.target.value});
                fetchState(e.target.value,"pickup");
              }}
            />

            <input value={pickup.state || ""} placeholder="State" disabled/>

            <div className="modalBtns">
              <button onClick={()=>setShowPickup(false)}>Cancel</button>
              <button onClick={()=>setShowPickup(false)}>Add Pickup Address</button>
            </div>

          </div>
        </div>
      )}

      {/* DELIVERY MODAL */}
      {showDelivery && (
        <div className="modal">
          <div className="modalBox">
            <h2>Add Delivery Address</h2>

            <input placeholder="Name"
              onChange={(e)=>setDelivery({...delivery, name:e.target.value})}
            />

            <input placeholder="Mobile"
              onChange={(e)=>setDelivery({...delivery, mobile:e.target.value})}
            />

            <input placeholder="Address"
              onChange={(e)=>setDelivery({...delivery, address:e.target.value})}
            />

            <input placeholder="Pincode"
              onChange={(e)=>{
                setDelivery({...delivery, pincode:e.target.value});
                fetchState(e.target.value,"delivery");
              }}
            />

            <input value={delivery.state || ""} placeholder="State" disabled/>

            <div className="modalBtns">
              <button onClick={()=>setShowDelivery(false)}>Cancel</button>
              <button onClick={()=>setShowDelivery(false)}>Add Delivery Address</button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}