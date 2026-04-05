import React, { useEffect, useState } from "react";
import "./Shipment.css";

function ShipmentDetail() {

  const BASE_URL = "https://faithcargo.onrender.com";

  const [shipments, setShipments] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchShipments();
  }, []);

  const fetchShipments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/api/shipments/`);
      const data = await res.json();
      setShipments(data || []);
    } catch (err) {
      console.error(err);
      alert("❌ Failed to load shipments");
    }
    setLoading(false);
  };

  const filtered = shipments.filter((s) =>
    s.lr?.toString().includes(search)
  );

  // 🧾 DOCKET PRINT
  const printDocket = async (lr) => {
    try {
      const res = await fetch(`${BASE_URL}/api/shipment/${lr}/`);
      const data = await res.json();

      const html = `
      <html>
      <head>
        <style>
          body{font-family:Arial;padding:20px}
          .box{border:2px solid #000;padding:15px}
          .header{display:flex;justify-content:space-between}
          .section{margin-top:10px}
          .barcode{text-align:center;margin-top:15px}
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
          <div><b>LR:</b> ${data.lr}</div>
        </div>

        <hr/>

        <div class="section">
          <b>Consignor:</b> ${data.pickup?.name || "-"}<br/>
          ${data.pickup?.address || "-"}
        </div>

        <div class="section">
          <b>Consignee:</b> ${data.delivery?.name || "-"}<br/>
          ${data.delivery?.address || "-"}
        </div>

        <div class="section">
          Boxes: ${data.shipment?.boxes || 0} |
          Weight: ${data.shipment?.weight || 0} kg
        </div>

        <div class="section">
          <b>Total:</b> ₹ ${data.totalValue || 0}
        </div>

        <div class="section">
          <b>E-Way:</b> ${data.ewayBill || "-"}
        </div>

        <div class="section">
          <b>Invoices:</b><br/>
          ${(data.invoices || []).map(i => `
            <div>${i.invoiceNo} - ₹${i.invoiceValue}</div>
          `).join("")}
        </div>

        <div class="barcode">
          <img src="https://barcode.tec-it.com/barcode.ashx?data=${data.lr}&code=Code128"/>
        </div>

      </div>
      </body>
      </html>
      `;

      const win = window.open("");
      win.document.write(html);
      win.print();

    } catch (err) {
      alert("❌ Print failed");
    }
  };

  // 🏷️ THERMAL LABEL (4x6 EXACT)
  const printLabel = async (lr) => {
    try {
      const res = await fetch(`${BASE_URL}/api/shipment/${lr}/`);
      const data = await res.json();

      let html = "";

      for (let i = 1; i <= (data.shipment?.boxes || 1); i++) {

        html += `
        <div style="
          width:4in;
          height:6in;
          border:2px solid black;
          padding:10px;
          font-family:Arial;
          page-break-after:always;
        ">

          <h2 style="text-align:center">FAITH CARGO</h2>

          <div style="text-align:center">
            <img src="https://barcode.tec-it.com/barcode.ashx?data=${data.lr}&code=Code128"/>
            <div>LR: ${data.lr}</div>
          </div>

          <hr/>

          <b>FROM:</b><br/>
          ${data.pickup?.name || "-"}<br/>
          ${data.pickup?.address || "-"}

          <hr/>

          <b>TO:</b><br/>
          ${data.delivery?.name || "-"}<br/>
          ${data.delivery?.address || "-"}

          <hr/>

          <div style="display:flex;justify-content:space-between">
            <b>BOX:</b> ${i}/${data.shipment?.boxes || 1}
            <b>AWB:</b> ${data.lr}
          </div>

          <hr/>

          <div style="text-align:center;color:red;font-weight:bold">
            ⚠️ HANDLE WITH CARE
          </div>

        </div>
        `;
      }

      const win = window.open("");
      win.document.write(html);
      win.print();

    } catch {
      alert("❌ Label print error");
    }
  };

  // ✏️ EDIT
  const handleEdit = async (lr) => {
    const res = await fetch(`${BASE_URL}/api/shipment/${lr}/`);
    const data = await res.json();

    localStorage.setItem("editData", JSON.stringify(data));
    window.location.href = "/create-order";
  };

  // 🗑️ DELETE
  const handleDelete = async (lr) => {
    if (!window.confirm("Delete this shipment?")) return;

    try {
      const res = await fetch(`${BASE_URL}/api/delete/${lr}/`, {
        method: "DELETE"
      });

      if (res.ok) {
        alert("Deleted ✅");
        fetchShipments();
      } else {
        alert("Delete failed ❌");
      }
    } catch {
      alert("Server error ❌");
    }
  };

  return (
    <div className="main">

      <div className="card">

        <h2>Shipment Details</h2>

        <input
          className="search"
          placeholder="Search LR"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loading ? (
          <p>Loading...</p>
        ) : (
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
                    <button onClick={() => printDocket(s.lr)}>🧾</button>
                    <button onClick={() => printLabel(s.lr)}>🏷️</button>
                    <button onClick={() => handleEdit(s.lr)}>✏️</button>
                    <button onClick={() => handleDelete(s.lr)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

      </div>
    </div>
  );
}

export default ShipmentDetail;