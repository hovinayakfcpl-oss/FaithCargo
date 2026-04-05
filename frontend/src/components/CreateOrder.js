import React, { useState } from "react";
import "./CreateOrder.css";

function CreateOrder() {

  const BASE_URL = "https://faithcargo.onrender.com";

  const [form, setForm] = useState({
    pickupCompany: "",
    pickupName: "",
    pickupAddress: "",
    pickupPincode: "",
    pickupContact: "",
    pickupAppointment: "",

    deliveryCompany: "",
    deliveryName: "",
    deliveryAddress: "",
    deliveryPincode: "",
    deliveryContact: "",
    deliveryAppointment: "",

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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // INPUT CHANGE
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // INVOICE CHANGE
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

  // TOTAL
  const totalValue = invoices.reduce(
    (sum, inv) => sum + Number(inv.invoiceValue || 0),
    0
  );

  // VALIDATION
  const validate = () => {
    if (!form.pickupName) return "Pickup Name required";
    if (!form.deliveryName) return "Delivery Name required";
    if (!form.boxes) return "Boxes required";
    if (!form.weight) return "Weight required";
    return "";
  };

  // SUBMIT
  const handleSubmit = async (e) => {
    e.preventDefault();

    const err = validate();
    if (err) {
      setError(err);
      return;
    }

    setLoading(true);
    setError("");

    const payload = {
      pickup_name: form.pickupName,
      pickup_company: form.pickupCompany,
      pickup_address: form.pickupAddress,
      pickup_pincode: form.pickupPincode,
      pickup_contact: form.pickupContact,
      pickup_appointment: form.pickupAppointment,

      delivery_name: form.deliveryName,
      delivery_company: form.deliveryCompany,
      delivery_address: form.deliveryAddress,
      delivery_pincode: form.deliveryPincode,
      delivery_contact: form.deliveryContact,
      delivery_appointment: form.deliveryAppointment,

      material: form.material,
      hsn: form.hsn,
      boxes: Number(form.boxes),
      weight: Number(form.weight),
      insurance: form.insurance,
      eway_bill: form.ewayBill,

      total_value: totalValue,

      invoices: invoices.map(i => ({
        invoice_no: i.invoiceNo,
        invoice_value: Number(i.invoiceValue)
      }))
    };

    try {
      const res = await fetch(`${BASE_URL}/api/create-order/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      console.log("API RESPONSE:", data);

      if (res.ok && data.lr_number) {
        alert("✅ Order Created! LR No: " + data.lr_number);

        // RESET FORM
        setForm({
          pickupCompany: "",
          pickupName: "",
          pickupAddress: "",
          pickupPincode: "",
          pickupContact: "",
          pickupAppointment: "",

          deliveryCompany: "",
          deliveryName: "",
          deliveryAddress: "",
          deliveryPincode: "",
          deliveryContact: "",
          deliveryAppointment: "",

          material: "",
          hsn: "",
          boxes: "",
          weight: "",
          insurance: "",
          ewayBill: ""
        });

        setInvoices([{ invoiceNo: "", invoiceValue: "" }]);

      } else {
        setError(data.error || "Something went wrong");
      }

    } catch (err) {
      console.error(err);
      setError("Server Error ❌");
    }

    setLoading(false);
  };

  return (
    <div className="main">

      <div className="card">

        <div className="logo">
          <img src="/logo.png" alt="logo" />
        </div>

        <h2>Create Order</h2>

        {error && <p style={{ color: "red" }}>{error}</p>}

        <form onSubmit={handleSubmit}>

          {/* PICKUP */}
          <h3>Pickup Details</h3>

          <div className="grid">
            <input name="pickupCompany" placeholder="Company Name" value={form.pickupCompany} onChange={handleChange}/>
            <input name="pickupName" placeholder="Contact Person" value={form.pickupName} onChange={handleChange}/>
            <input name="pickupContact" placeholder="Mobile" value={form.pickupContact} onChange={handleChange}/>
            <input name="pickupPincode" placeholder="Pincode" value={form.pickupPincode} onChange={handleChange}/>
          </div>

          <textarea name="pickupAddress" placeholder="Pickup Address" value={form.pickupAddress} onChange={handleChange}></textarea>

          <input name="pickupAppointment" type="date" value={form.pickupAppointment} onChange={handleChange} />

          {/* DELIVERY */}
          <h3>Delivery Details</h3>

          <div className="grid">
            <input name="deliveryCompany" placeholder="Company Name" value={form.deliveryCompany} onChange={handleChange}/>
            <input name="deliveryName" placeholder="Contact Person" value={form.deliveryName} onChange={handleChange}/>
            <input name="deliveryContact" placeholder="Mobile" value={form.deliveryContact} onChange={handleChange}/>
            <input name="deliveryPincode" placeholder="Pincode" value={form.deliveryPincode} onChange={handleChange}/>
          </div>

          <textarea name="deliveryAddress" placeholder="Delivery Address" value={form.deliveryAddress} onChange={handleChange}></textarea>

          <input name="deliveryAppointment" type="date" value={form.deliveryAppointment} onChange={handleChange} />

          {/* SHIPMENT */}
          <h3>Shipment Details</h3>

          <div className="grid">
            <input name="material" placeholder="Material" value={form.material} onChange={handleChange}/>
            <input name="hsn" placeholder="HSN Code" value={form.hsn} onChange={handleChange}/>
            <input name="boxes" type="number" placeholder="Boxes" value={form.boxes} onChange={handleChange}/>
            <input name="weight" type="number" placeholder="Weight (kg)" value={form.weight} onChange={handleChange}/>
            <input name="insurance" placeholder="Insurance Value" value={form.insurance} onChange={handleChange}/>
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
            <input name="ewayBill" placeholder="E-Way Bill" value={form.ewayBill} onChange={handleChange}/>
          )}

          <button className="submitBtn" disabled={loading}>
            {loading ? "Saving..." : "Save Order"}
          </button>

        </form>
      </div>
    </div>
  );
}

export default CreateOrder;