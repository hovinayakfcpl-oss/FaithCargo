import React, { useState, useEffect } from "react";
import "./CreateOrder.css";

const BASE_URL = "http://127.0.0.1:8000";

export default function CreateOrder() {
  const [locations, setLocations] = useState([]);
  const [pickupId, setPickupId] = useState("");
  const [deliveryId, setDeliveryId] = useState("");
  
  const [form, setForm] = useState({
    lr_type: "Manual",
    lr_number: "",
    description: "",
    reference_id: "",
    boxes: "",
    weight: "",
    payment_mode: "Prepaid",
    eway_bill: "",
    invoice_number: "",
    amount: "",
    insurance: "owner",
  });

  // Load Locations
  useEffect(() => {
    fetch(`${BASE_URL}/get-locations/`)
      .then(res => res.json())
      .then(data => setLocations(data))
      .catch(err => console.log("Error fetching locations", err));
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const createOrder = async () => {
    // Apka existing createOrder logic yahan aayega
    console.log("Order Data:", { ...form, pickupId, deliveryId });
    alert("Order data logged in console!");
  };

  return (
    <div className="create-order-container">
      {/* Header */}
      <div className="header">
        <button className="back-btn">←</button>
        <h2>Create New Order</h2>
      </div>

      {/* Main Content Layout */}
      <div className="order-grid">
        
        {/* LEFT COLUMN */}
        <div className="column-left">
          
          {/* Upload Invoice Banner */}
          <div className="card banner-card">
            <div className="banner-text">
              <h3>Upload your invoice <span className="badge">new</span></h3>
              <p>Autofill order details from your invoice in seconds.</p>
            </div>
            <button className="upload-btn-outline">📤 Upload file</button>
          </div>

          {/* LR Details */}
          <div className="card">
            <h4><i className="icon-lr"></i> LR Details</h4>
            <div className="radio-group">
              <label>
                <input type="radio" name="lr_type" value="Manual" checked={form.lr_type === "Manual"} onChange={handleInputChange} /> Manual
              </label>
              <label>
                <input type="radio" name="lr_type" value="Automatic" checked={form.lr_type === "Automatic"} onChange={handleInputChange} /> Automatic
              </label>
            </div>
            <input 
              type="text" 
              name="lr_number" 
              placeholder="Enter LR number" 
              className="full-input"
              onChange={handleInputChange} 
            />
          </div>

          {/* Order Details */}
          <div className="card">
            <h4><i className="icon-order"></i> Order Details</h4>
            <div className="input-group">
              <label>Description</label>
              <input type="text" name="description" placeholder="Enter order description" className="full-input" onChange={handleInputChange}/>
            </div>
            <div className="row">
              <div className="input-field">
                <label>Your reference ID / order ID</label>
                <input type="text" name="reference_id" placeholder="Enter ID" onChange={handleInputChange}/>
              </div>
              <div className="input-field">
                <label>No. of boxes</label>
                <input type="number" name="boxes" placeholder="Enter no. of boxes" onChange={handleInputChange}/>
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="card">
            <h4><i className="icon-invoice"></i> Invoice Details</h4>
            <div className="radio-group">
              <label><input type="radio" checked readOnly /> Prepaid</label>
            </div>
            <div className="row">
              <div className="input-field">
                <label>E-Way Bill Number</label>
                <input type="text" name="eway_bill" placeholder="Enter E-Way Bill" onChange={handleInputChange}/>
              </div>
              <div className="input-field">
                <label>Invoice Number</label>
                <input type="text" name="invoice_number" placeholder="Enter invoice number" onChange={handleInputChange}/>
              </div>
              <div className="input-field">
                <label>Amount</label>
                <div className="amount-input">
                    <span>₹</span>
                    <input type="number" name="amount" placeholder="Enter amount" onChange={handleInputChange}/>
                </div>
              </div>
            </div>
            <div className="checkbox-row">
              <input type="checkbox" id="eway-later" />
              <label htmlFor="eway-later">I will add E-Way Bill later/not required</label>
            </div>
          </div>

          {/* Insurance */}
          <div className="card">
            <h4><i className="icon-insure"></i> Insure your shipment</h4>
            <p className="sub-text">Are you sure you want to ship the item at your own risk?</p>
            <div className="radio-group">
              <label>
                <input type="radio" name="insurance" value="owner" checked={form.insurance === "owner"} onChange={handleInputChange} /> Yes, Ship with Owners Risk
              </label>
              <label>
                <input type="radio" name="insurance" value="carrier" checked={form.insurance === "carrier"} onChange={handleInputChange} /> Get Delhivery's Insurance
              </label>
            </div>
          </div>

          <button className="primary-submit-btn" onClick={createOrder}>Create Order</button>
        </div>

        {/* RIGHT COLUMN */}
        <div className="column-right">
          
          {/* Delivery Details */}
          <div className="card">
            <h4><i className="icon-delivery"></i> Delivery Details</h4>
            <div className="location-selects">
                <select className="select-box" value={pickupId} onChange={(e)=>setPickupId(e.target.value)}>
                    <option value="">Select Pickup Location</option>
                    {locations.filter(l=>l.type==="pickup").map(l=>(
                        <option key={l.id} value={l.id}>{l.name} ({l.pincode})</option>
                    ))}
                </select>
                <div className="location-line"></div>
                <select className="select-box" value={deliveryId} onChange={(e)=>setDeliveryId(e.target.value)}>
                    <option value="">Select Drop Location</option>
                    {locations.filter(l=>l.type==="delivery").map(l=>(
                        <option key={l.id} value={l.id}>{l.name} ({l.pincode})</option>
                    ))}
                </select>
            </div>
          </div>

          {/* Weights & Dimensions */}
          <div className="card">
            <h4><i className="icon-weight"></i> Weights & Dimensions</h4>
            <button className="add-box-btn">+ Add Box Size</button>
            <p className="centered-info">0 boxes left</p>
            <hr />
            <div className="row-space">
                <span>Total shipment weight</span>
                <div className="weight-input">
                    <input type="number" name="weight" onChange={handleInputChange}/>
                    <span>Kgs</span>
                </div>
            </div>
            <div className="row-space">
                <span>Total no. of boxes</span>
                <strong>{form.boxes || 0}</strong>
            </div>
          </div>

          {/* Upload Documents */}
          <div className="card">
            <h4><i className="icon-docs"></i> Upload Documents</h4>
            <div className="upload-zone">
                <p>Invoice Document (Mandatory)</p>
                <div className="drop-area">
                    <p>Upload Document (PNG, JPG, PDF)</p>
                </div>
            </div>
          </div>

          {/* Shipping Mode */}
          <div className="card shipping-mode">
             <div className="row-space">
                <div>
                    <h4>Shipping Mode</h4>
                    <p>SURFACE</p>
                </div>
                <i className="icon-truck"></i>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}