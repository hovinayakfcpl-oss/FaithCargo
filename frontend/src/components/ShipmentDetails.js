import React, { useEffect, useState } from "react";

function ShipmentDetail() {

  const BASE_URL = "https://faithcargo.onrender.com";

  const [shipments, setShipments] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchShipments();
  }, []);

  const fetchShipments = async () => {
    const res = await fetch(`${BASE_URL}/api/shipments/`);
    const data = await res.json();
    setShipments(data);
  };

  const filtered = shipments.filter((s) =>
    s.lr.toString().includes(search)
  );

  const printDocket = async (lr) => {
    const res = await fetch(`${BASE_URL}/api/shipment/${lr}/`);
    const data = await res.json();

    const html = `
      <h2>Faith Cargo</h2>
      <hr/>
      <p><b>LR:</b> ${data.lr}</p>
      <p><b>Pickup:</b> ${data.pickup.address}</p>
      <p><b>Delivery:</b> ${data.delivery.address}</p>
      <p><b>Total:</b> ₹${data.totalValue}</p>
      <p><b>Eway:</b> ${data.ewayBill || "-"}</p>
      <h3>Invoices</h3>
      ${data.invoices.map(i => `<p>${i.invoiceNo} - ₹${i.invoiceValue}</p>`).join("")}
    `;

    const win = window.open("");
    win.document.write(html);
    win.print();
  };

  const printLabel = async (lr) => {
    const res = await fetch(`${BASE_URL}/api/shipment/${lr}/`);
    const data = await res.json();

    let labels = "";

    for (let i = 1; i <= data.shipment.boxes; i++) {
      labels += `
        <div style="border:1px solid #000;margin:10px;padding:10px">
          <h3>LR: ${data.lr}</h3>
          <p>${data.delivery.address}</p>
          <p>${data.delivery.contact}</p>
          <p>Box ${i}/${data.shipment.boxes}</p>
        </div>
      `;
    }

    const win = window.open("");
    win.document.write(labels);
    win.print();
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Shipment Details</h2>

      <input
        placeholder="Search LR"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <table border="1" width="100%" style={{ marginTop: "20px" }}>
        <thead>
          <tr>
            <th>LR</th>
            <th>Route</th>
            <th>Value</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {filtered.map((s, i) => (
            <tr key={i}>
              <td>{s.lr}</td>
              <td>{s.route}</td>
              <td>₹ {s.value}</td>
              <td>
                <button onClick={() => printDocket(s.lr)}>🧾 Docket</button>
                <button onClick={() => printLabel(s.lr)}>🏷️ Label</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ShipmentDetail;