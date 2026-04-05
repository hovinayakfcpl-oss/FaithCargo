import React, { useEffect, useState } from "react";
import "./Shipment.css";

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

  // 📦 DOCKET PRINT (PRO)
  const printDocket = async (lr) => {
    const res = await fetch(`${BASE_URL}/api/shipment/${lr}/`);
    const data = await res.json();

    const html = `
    <html>
    <head>
      <title>Docket</title>
      <style>
        body{font-family:Arial;padding:20px}
        .box{border:2px solid #000;padding:15px}
        .header{display:flex;justify-content:space-between}
        .title{font-size:22px;font-weight:bold}
        .row{display:flex;justify-content:space-between;margin-top:10px}
        .section{margin-top:15px}
        .barcode{text-align:center;margin-top:10px}
      </style>
    </head>

    <body>

    <div class="box">

      <div class="header">
        <div>
          <h2>FAITH CARGO PVT LTD</h2>
          <p>4/15 Kirti Nagar Industrial Area</p>
          <p>New Delhi - 110015</p>
        </div>
        <div>
          <b>LR NO:</b> ${data.lr}
        </div>
      </div>

      <hr/>

      <div class="section">
        <b>Consignor:</b> ${data.pickup.name} <br/>
        ${data.pickup.address}
      </div>

      <div class="section">
        <b>Consignee:</b> ${data.delivery.name} <br/>
        ${data.delivery.address}
      </div>

      <div class="row">
        <div>Boxes: ${data.shipment.boxes}</div>
        <div>Weight: ${data.shipment.weight} kg</div>
      </div>

      <div class="section">
        <b>Total Value:</b> ₹ ${data.totalValue}
      </div>

      <div class="section">
        <b>E-Way Bill:</b> ${data.ewayBill || "-"}
      </div>

      <div class="section">
        <h4>Invoices</h4>
        ${data.invoices.map(i => `
          <div>${i.invoiceNo} - ₹${i.invoiceValue}</div>
        `).join("")}
      </div>

      <div class="barcode">
        <img src="https://barcode.tec-it.com/barcode.ashx?data=${data.lr}&code=Code128&translate-esc=true"/>
      </div>

    </div>

    </body>
    </html>
    `;

    const win = window.open("");
    win.document.write(html);
    win.print();
  };

  // 🏷️ LABEL PRINT (PRO IMAGE STYLE)
  const printLabel = async (lr) => {
    const res = await fetch(`${BASE_URL}/api/shipment/${lr}/`);
    const data = await res.json();

    let labels = "";

    for (let i = 1; i <= data.shipment.boxes; i++) {
      labels += `
      <div style="border:2px solid #000;margin:10px;padding:15px;width:350px;display:inline-block">

        <h3>FAITH CARGO</h3>

        <div style="text-align:center">
          <img src="https://barcode.tec-it.com/barcode.ashx?data=${data.lr}&code=Code128"/>
          <div>LR: ${data.lr}</div>
        </div>

        <hr/>

        <b>FROM:</b><br/>
        ${data.pickup.name}<br/>
        ${data.pickup.address}

        <hr/>

        <b>TO:</b><br/>
        ${data.delivery.name}<br/>
        ${data.delivery.address}

        <hr/>

        <b>BOX:</b> ${i} / ${data.shipment.boxes}

      </div>
      `;
    }

    const win = window.open("");
    win.document.write(labels);
    win.print();
  };

  return (
    <div className="main">

      <div className="card">

        <h2>Shipment Details</h2>

        <input
          className="search"
          placeholder="Search LR Number"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <table>
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

    </div>
  );
}

export default ShipmentDetail;