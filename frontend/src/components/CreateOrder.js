import React, { useState } from "react";

function CreateOrder() {

  const BASE_URL = "https://faithcargo.onrender.com";

  const [form, setForm] = useState({
    pickupName: "",
    pickupAddress: "",
    pickupPincode: "",
    pickupContact: "",

    deliveryName: "",
    deliveryAddress: "",
    deliveryPincode: "",
    deliveryContact: "",

    material: "",
    hsn: "",
    boxes: "",
    weight: "",
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
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok && data.lr_number) {
        alert("✅ Order Created! LR No: " + data.lr_number);

        // reset form
        setForm({
          pickupName: "",
          pickupAddress: "",
          pickupPincode: "",
          pickupContact: "",
          deliveryName: "",
          deliveryAddress: "",
          deliveryPincode: "",
          deliveryContact: "",
          material: "",
          hsn: "",
          boxes: "",
          weight: "",
          ewayBill: ""
        });

        setInvoices([{ invoiceNo: "", invoiceValue: "" }]);

      } else {
        alert("❌ " + (data.error || "Something went wrong"));
      }

    } catch (err) {
      console.error(err);
      alert("❌ Server Error");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Create Order</h2>

      <form onSubmit={handleSubmit}>

        <h3>Pickup</h3>
        <input name="pickupName" value={form.pickupName} onChange={handleChange} placeholder="Name" />
        <input name="pickupAddress" value={form.pickupAddress} onChange={handleChange} placeholder="Address" />
        <input name="pickupPincode" value={form.pickupPincode} onChange={handleChange} placeholder="Pincode" />
        <input name="pickupContact" value={form.pickupContact} onChange={handleChange} placeholder="Contact" />

        <h3>Delivery</h3>
        <input name="deliveryName" value={form.deliveryName} onChange={handleChange} placeholder="Name" />
        <input name="deliveryAddress" value={form.deliveryAddress} onChange={handleChange} placeholder="Address" />
        <input name="deliveryPincode" value={form.deliveryPincode} onChange={handleChange} placeholder="Pincode" />
        <input name="deliveryContact" value={form.deliveryContact} onChange={handleChange} placeholder="Contact" />

        <h3>Shipment</h3>
        <input name="material" value={form.material} onChange={handleChange} placeholder="Material" />
        <input name="hsn" value={form.hsn} onChange={handleChange} placeholder="HSN" />
        <input name="boxes" type="number" value={form.boxes} onChange={handleChange} placeholder="Boxes" />
        <input name="weight" type="number" value={form.weight} onChange={handleChange} placeholder="Weight" />

        <h3>Invoices</h3>

        {invoices.map((inv, index) => (
          <div key={index}>
            <input
              placeholder="Invoice No"
              value={inv.invoiceNo}
              onChange={(e) =>
                handleInvoiceChange(index, "invoiceNo", e.target.value)
              }
            />
            <input
              type="number"
              placeholder="Value"
              value={inv.invoiceValue}
              onChange={(e) =>
                handleInvoiceChange(index, "invoiceValue", e.target.value)
              }
            />

            {index > 0 && (
              <button type="button" onClick={() => removeInvoice(index)}>❌</button>
            )}
          </div>
        ))}

        <button type="button" onClick={addInvoice}>➕ Add Invoice</button>

        <h4>Total: ₹ {totalValue}</h4>

        {totalValue >= 50000 && (
          <input
            name="ewayBill"
            value={form.ewayBill}
            onChange={handleChange}
            placeholder="E-Way Bill"
          />
        )}

        <br /><br />
        <button type="submit">Save Order</button>

      </form>
    </div>
  );
}

export default CreateOrder;