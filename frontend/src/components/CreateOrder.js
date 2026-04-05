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

  // 🔹 Input Change
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // 🔹 Invoice Change
  const handleInvoiceChange = (index, field, value) => {
    const updated = [...invoices];
    updated[index][field] = value;
    setInvoices(updated);
  };

  // ➕ Add Invoice
  const addInvoice = () => {
    setInvoices([...invoices, { invoiceNo: "", invoiceValue: "" }]);
  };

  // ❌ Remove Invoice
  const removeInvoice = (index) => {
    const updated = invoices.filter((_, i) => i !== index);
    setInvoices(updated);
  };

  // 💰 Total
  const totalValue = invoices.reduce(
    (sum, inv) => sum + Number(inv.invoiceValue || 0),
    0
  );

  // 🚀 Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      ...form,
      invoices,
      totalValue
    };

    try {
      const res = await fetch(`${BASE_URL}/create-order/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.lr_number) {
        alert("✅ Order Created! LR No: " + data.lr_number);
      } else {
        alert("❌ Error: " + data.error);
      }

    } catch (err) {
      alert("Server Error");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Create Order</h2>

      <form onSubmit={handleSubmit}>

        <h3>Pickup</h3>
        <input name="pickupName" placeholder="Name" onChange={handleChange} />
        <input name="pickupAddress" placeholder="Address" onChange={handleChange} />
        <input name="pickupPincode" placeholder="Pincode" onChange={handleChange} />
        <input name="pickupContact" placeholder="Contact" onChange={handleChange} />

        <h3>Delivery</h3>
        <input name="deliveryName" placeholder="Name" onChange={handleChange} />
        <input name="deliveryAddress" placeholder="Address" onChange={handleChange} />
        <input name="deliveryPincode" placeholder="Pincode" onChange={handleChange} />
        <input name="deliveryContact" placeholder="Contact" onChange={handleChange} />

        <h3>Shipment</h3>
        <input name="material" placeholder="Material" onChange={handleChange} />
        <input name="hsn" placeholder="HSN" onChange={handleChange} />
        <input name="boxes" type="number" placeholder="Boxes" onChange={handleChange} />
        <input name="weight" type="number" placeholder="Weight" onChange={handleChange} />

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
              <button type="button" onClick={() => removeInvoice(index)}>
                ❌
              </button>
            )}
          </div>
        ))}

        <button type="button" onClick={addInvoice}>
          ➕ Add Invoice
        </button>

        <h4>Total: ₹ {totalValue}</h4>

        {/* E-Way */}
        {totalValue >= 50000 && (
          <input
            name="ewayBill"
            placeholder="E-Way Bill"
            onChange={handleChange}
          />
        )}

        <br /><br />

        <button type="submit">Save Order</button>

      </form>
    </div>
  );
}

export default CreateOrder;