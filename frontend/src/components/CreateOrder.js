import React, { useState } from "react";
import "./CreateOrder.css";

function CreateOrder() {

  const BASE_URL = "https://faithcargo.onrender.com";

  const [form, setForm] = useState({
    pickupCompany: "",
    pickupName: "",
    pickupAddress: "",
    pickupPincode: "",
    pickupState: "",
    pickupContact: "",

    deliveryCompany: "",
    deliveryName: "",
    deliveryAddress: "",
    deliveryPincode: "",
    deliveryState: "",
    deliveryContact: "",

    material: "",
    hsn: "",
    boxes: "",
    weight: "",
    insurance: "",
    ewayBill: ""
  });

  const [invoices, setInvoices] = useState([{ invoiceNo: "", invoiceValue: "" }]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // PINCODE → STATE
  const fetchState = async (pincode, type) => {
    if (pincode.length === 6) {
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
        const data = await res.json();
        const state = data[0]?.PostOffice?.[0]?.State || "";

        setForm(prev => ({ ...prev, [type]: state }));
      } catch {}
    }
  };

  // INPUT HANDLER
  const handleChange = (e) => {
    let { name, value } = e.target;

    if (name.includes("Pincode")) {
      value = value.replace(/\D/g, "").slice(0, 6);
      fetchState(value, name === "pickupPincode" ? "pickupState" : "deliveryState");
    }

    if (name.includes("Contact")) {
      value = value.replace(/\D/g, "").slice(0, 10);
    }

    if (name === "ewayBill") {
      value = value.replace(/\D/g, "").slice(0, 14);
    }

    setForm({ ...form, [name]: value });
  };

  // INVOICE
  const handleInvoiceChange = (index, field, value) => {
    const updated = [...invoices];
    updated[index][field] = value;
    setInvoices(updated);
  };

  const addInvoice = () => setInvoices([...invoices, { invoiceNo: "", invoiceValue: "" }]);
  const removeInvoice = (index) => setInvoices(invoices.filter((_, i) => i !== index));

  const totalValue = invoices.reduce((sum, i) => sum + Number(i.invoiceValue || 0), 0);

  // SUBMIT
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const payload = {
      ...form,
      boxes: Number(form.boxes),
      weight: Number(form.weight),
      total_value: totalValue,
      invoices: invoices.map(i => ({
        invoice_no: i.invoiceNo,
        invoice_value: Number(i.invoiceValue)
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

        // ✅ SUCCESS
        setSuccess(`✅ Order Created Successfully! LR: ${data.lr_number}`);
        alert(`Order Created ✅\nLR No: ${data.lr_number}`);

        // RESET
        setForm({
          pickupCompany: "", pickupName: "", pickupAddress: "", pickupPincode: "", pickupState: "", pickupContact: "",
          deliveryCompany: "", deliveryName: "", deliveryAddress: "", deliveryPincode: "", deliveryState: "", deliveryContact: "",
          material: "", hsn: "", boxes: "", weight: "", insurance: "", ewayBill: ""
        });

        setInvoices([{ invoiceNo: "", invoiceValue: "" }]);

      } else {
        setError(data.error || "Error ❌");
      }

    } catch {
      setError("Server Error ❌");
    }

    setLoading(false);
  };

  return (
    <div className="main">

      <div className="card wide">

        <div className="logo">
          <img src="/logo.png" alt="logo" />
        </div>

        <h2>Create Shipment</h2>

        {success && <p className="success">{success}</p>}
        {error && <p className="error">{error}</p>}

        <form onSubmit={handleSubmit}>

          {/* PICKUP */}
          <h3>Pickup Details</h3>
          <div className="row">
            <input name="pickupCompany" placeholder="Company" value={form.pickupCompany} onChange={handleChange}/>
            <input name="pickupName" placeholder="Contact" value={form.pickupName} onChange={handleChange}/>
            <input name="pickupContact" placeholder="Mobile" value={form.pickupContact} onChange={handleChange}/>
            <input name="pickupPincode" placeholder="Pincode" value={form.pickupPincode} onChange={handleChange}/>
            <input value={form.pickupState} placeholder="State" disabled/>
          </div>
          <textarea name="pickupAddress" placeholder="Pickup Address" value={form.pickupAddress} onChange={handleChange}></textarea>

          {/* DELIVERY */}
          <h3>Delivery Details</h3>
          <div className="row">
            <input name="deliveryCompany" placeholder="Company" value={form.deliveryCompany} onChange={handleChange}/>
            <input name="deliveryName" placeholder="Contact" value={form.deliveryName} onChange={handleChange}/>
            <input name="deliveryContact" placeholder="Mobile" value={form.deliveryContact} onChange={handleChange}/>
            <input name="deliveryPincode" placeholder="Pincode" value={form.deliveryPincode} onChange={handleChange}/>
            <input value={form.deliveryState} placeholder="State" disabled/>
          </div>
          <textarea name="deliveryAddress" placeholder="Delivery Address" value={form.deliveryAddress} onChange={handleChange}></textarea>

          {/* SHIPMENT */}
          <h3>Shipment Info</h3>
          <div className="row">
            <input name="material" placeholder="Material" value={form.material} onChange={handleChange}/>
            <input name="hsn" placeholder="HSN" value={form.hsn} onChange={handleChange}/>
            <input name="boxes" type="number" placeholder="Boxes" value={form.boxes} onChange={handleChange}/>
            <input name="weight" type="number" placeholder="Weight" value={form.weight} onChange={handleChange}/>
            <input name="insurance" placeholder="Insurance" value={form.insurance} onChange={handleChange}/>
          </div>

          {/* INVOICES */}
          <h3>Invoices</h3>
          {invoices.map((inv, i) => (
            <div className="invoiceRow" key={i}>
              <input placeholder="Invoice No" value={inv.invoiceNo} onChange={(e)=>handleInvoiceChange(i,"invoiceNo",e.target.value)}/>
              <input type="number" placeholder="Value" value={inv.invoiceValue} onChange={(e)=>handleInvoiceChange(i,"invoiceValue",e.target.value)}/>
              {i>0 && <button type="button" onClick={()=>removeInvoice(i)}>❌</button>}
            </div>
          ))}

          <button type="button" onClick={addInvoice}>➕ Add Invoice</button>

          <h4>Total: ₹ {totalValue}</h4>

          {totalValue >= 50000 && (
            <input name="ewayBill" placeholder="E-Way Bill (14 digit)" value={form.ewayBill} onChange={handleChange}/>
          )}

          <button className="submitBtn" disabled={loading}>
            {loading ? "Saving..." : "Create Order"}
          </button>

        </form>
      </div>
    </div>
  );
}

export default CreateOrder;