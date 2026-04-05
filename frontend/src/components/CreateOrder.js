import React, { useState } from "react";
import "./CreateOrder.css";

function CreateOrder() {

  const BASE_URL = "https://faithcargo.onrender.com";

  const [form, setForm] = useState({

    // Pickup
    pickupCompany: "",
    pickupName: "",
    pickupAddress: "",
    pickupPincode: "",
    pickupContact: "",
    pickupAppointment: "",

    // Delivery
    deliveryCompany: "",
    deliveryName: "",
    deliveryAddress: "",
    deliveryPincode: "",
    deliveryContact: "",
    deliveryAppointment: "",

    // Shipment
    material: "",
    hsn: "",
    boxes: "",
    weight: "",
    insurance: "",
    ewayBill: ""
  });

  const [invoices, setInvoices] = useState([
    { invoiceNo: "", invoiceValue: "" }
  ]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleInvoiceChange = (index, field, value) => {
    const updated = [...invoices];
    updated[index][field] = value;
    setInvoices(updated);
  };

  const addInvoice = () => {
    setInvoices([...invoices, { invoiceNo: "", invoiceValue: "" }]);
  };

  const removeInvoice = (index) => {
    setInvoices(invoices.filter((_, i) => i !== index));
  };

  const totalValue = invoices.reduce(
    (sum, inv) => sum + Number(inv.invoiceValue || 0),
    0
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      ...form,
      boxes: Number(form.boxes),
      weight: Number(form.weight),
      totalValue,
      invoices: invoices.map(i => ({
        invoiceNo: i.invoiceNo,
        invoiceValue: Number(i.invoiceValue)
      }))
    };

    try {
      const res = await fetch(`${BASE_URL}/api/create-order/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok && data.lr_number) {
        alert("✅ Order Created! LR No: " + data.lr_number);
      } else {
        alert("❌ " + (data.error || "Error"));
      }

    } catch {
      alert("❌ Server Error");
    }
  };

  return (
    <div className="main">

      <div className="card">

        <div className="logo">
          <img src="/logo.png" alt="logo" />
        </div>

        <h2>Create Order</h2>

        <form onSubmit={handleSubmit}>

          {/* PICKUP */}
          <h3>Pickup Details</h3>

          <div className="grid">
            <input name="pickupCompany" placeholder="Company Name" onChange={handleChange}/>
            <input name="pickupName" placeholder="Contact Person" onChange={handleChange}/>
            <input name="pickupContact" placeholder="Mobile" onChange={handleChange}/>
            <input name="pickupPincode" placeholder="Pincode" onChange={handleChange}/>
          </div>

          <textarea name="pickupAddress" placeholder="Pickup Address" onChange={handleChange}></textarea>

          <input name="pickupAppointment" type="date" onChange={handleChange} />

          {/* DELIVERY */}
          <h3>Delivery Details</h3>

          <div className="grid">
            <input name="deliveryCompany" placeholder="Company Name" onChange={handleChange}/>
            <input name="deliveryName" placeholder="Contact Person" onChange={handleChange}/>
            <input name="deliveryContact" placeholder="Mobile" onChange={handleChange}/>
            <input name="deliveryPincode" placeholder="Pincode" onChange={handleChange}/>
          </div>

          <textarea name="deliveryAddress" placeholder="Delivery Address" onChange={handleChange}></textarea>

          <input name="deliveryAppointment" type="date" onChange={handleChange} />

          {/* SHIPMENT */}
          <h3>Shipment Details</h3>

          <div className="grid">
            <input name="material" placeholder="Material" onChange={handleChange}/>
            <input name="hsn" placeholder="HSN Code" onChange={handleChange}/>
            <input name="boxes" type="number" placeholder="Boxes" onChange={handleChange}/>
            <input name="weight" type="number" placeholder="Weight (kg)" onChange={handleChange}/>
            <input name="insurance" placeholder="Insurance Value" onChange={handleChange}/>
          </div>

          {/* INVOICE */}
          <h3>Invoices</h3>

          {invoices.map((inv, index) => (
            <div className="invoiceRow" key={index}>
              <input
                placeholder="Invoice No"
                value={inv.invoiceNo}
                onChange={(e)=>handleInvoiceChange(index,"invoiceNo",e.target.value)}
              />
              <input
                type="number"
                placeholder="Value"
                value={inv.invoiceValue}
                onChange={(e)=>handleInvoiceChange(index,"invoiceValue",e.target.value)}
              />

              {index > 0 && (
                <button type="button" onClick={()=>removeInvoice(index)}>❌</button>
              )}
            </div>
          ))}

          <button type="button" onClick={addInvoice}>➕ Add Invoice</button>

          <h4>Total: ₹ {totalValue}</h4>

          {totalValue >= 50000 && (
            <input name="ewayBill" placeholder="E-Way Bill" onChange={handleChange}/>
          )}

          <button className="submitBtn">Save Order</button>

        </form>
      </div>
    </div>
  );
}

export default CreateOrder;