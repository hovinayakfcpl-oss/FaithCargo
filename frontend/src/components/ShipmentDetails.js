import React, { useEffect, useState } from "react";
import "./ShipmentDetail.css";

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
    } finally {
      setLoading(false);
    }
  };

  // 🔍 Search filtering (FCPL logic ke saath)
  const filtered = shipments.filter((s) =>
    s.lr?.toString().toLowerCase().includes(search.toLowerCase())
  );

  // 🧾 DOCKET PRINT
  const printDocket = async (lr) => {
    try {
      const res = await fetch(`${BASE_URL}/api/shipment/${lr}/`);
      const data = await res.json();

      const html = `
      <html>
      <head>
        <title>Docket - ${data.lr}</title>
        <style>
          body{font-family:Arial, sans-serif;padding:20px; line-height:1.4}
          .container{border:2px solid #000;padding:20px; max-width:800px; margin:auto}
          .header{display:flex;justify-content:space-between; align-items:center}
          .logo{height:60px}
          .company{font-size:22px;font-weight:bold; color:#003366}
          .address{font-size:12px;color:#333}
          .section{margin-top:15px; border-bottom:1px solid #ddd; padding-bottom:10px}
          .row{display:flex;justify-content:space-between}
          .barcode{text-align:center;margin-top:20px}
          .lr-box{border:2px solid #000; padding:10px; text-align:center}
        </style>
      </head>
      <body>
      <div class="container">
        <div class="header">
          <div>
            <div class="company">FAITH CARGO PVT LTD</div>
            <div class="address">
              4/15 Kirti Nagar Industrial Area, New Delhi - 110015<br/>
              Contact: +91-XXXXXXXXXX
            </div>
          </div>
          <div class="lr-box">
            <b>LR NO:</b><br/>
            <span style="font-size:20px; font-weight:bold">${data.lr}</span>
          </div>
        </div>

        <div class="section row">
          <div style="width:48%">
            <b>Consignor (Sender):</b><br/>
            ${data.pickupName}<br/>
            ${data.pickupAddress}<br/>
            PIN: ${data.pickupPincode} | Ph: ${data.pickupContact}
          </div>
          <div style="width:48%">
            <b>Consignee (Receiver):</b><br/>
            ${data.deliveryName}<br/>
            ${data.deliveryAddress}<br/>
            PIN: ${data.deliveryPincode} | Ph: ${data.deliveryContact}
          </div>
        </div>

        <div class="section row">
          <div><b>Material:</b> ${data.material}</div>
          <div><b>Boxes:</b> ${data.boxes}</div>
          <div><b>Weight:</b> ${data.weight} kg</div>
        </div>

        <div class="section row">
          <div><b>Total Value:</b> ₹ ${data.totalValue}</div>
          <div><b>E-Way Bill:</b> ${data.ewayBill || "N/A"}</div>
        </div>

        <div class="section">
          <b>Invoices:</b><br/>
          <table width="100%" style="border-collapse:collapse; margin-top:5px">
            ${(data.invoices || []).map(i => `
              <tr>
                <td style="border:1px solid #ddd; padding:5px">${i.invoiceNo}</td>
                <td style="border:1px solid #ddd; padding:5px">₹ ${i.invoiceValue}</td>
              </tr>
            `).join("")}
          </table>
        </div>

        <div class="barcode">
          <img src="https://barcode.tec-it.com/barcode.ashx?data=${data.lr}&code=Code128&scale=2"/>
          <p>${data.lr}</p>
        </div>
      </div>
      </body>
      </html>
      `;

      const win = window.open("", "_blank");
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 500);

    } catch (err) {
      alert("❌ Print failed");
    }
  };

  // 🏷️ THERMAL LABEL (4x6)
  const printLabel = async (lr) => {
    try {
      const res = await fetch(`${BASE_URL}/api/shipment/${lr}/`);
      const data = await res.json();

      let html = "<html><body>";
      for (let i = 1; i <= (data.boxes || 1); i++) {
        html += `
        <div style="width:4in; height:6in; border:2px solid black; padding:15px; font-family:Arial; page-break-after:always;">
          <h2 style="text-align:center; margin:0">FAITH CARGO</h2>
          <hr/>
          <div style="text-align:center">
            <img src="https://barcode.tec-it.com/barcode.ashx?data=${data.lr}&code=Code128" style="width:80%"/>
            <div style="font-size:18px; font-weight:bold">LR: ${data.lr}</div>
          </div>
          <hr/>
          <div style="font-size:14px">
            <b>TO:</b><br/>
            <span style="font-size:16px; font-weight:bold">${data.deliveryName}</span><br/>
            ${data.deliveryAddress}<br/>
            <b>Ph:</b> ${data.deliveryContact}<br/>
            <b>PIN:</b> ${data.deliveryPincode}
          </div>
          <hr/>
          <div style="display:flex; justify-content:space-between; font-size:18px; font-weight:bold">
            <span>BOX: ${i} / ${data.boxes}</span>
          </div>
          <div style="text-align:center; margin-top:40px; border:1px dashed black; padding:5px">
            HANDLE WITH CARE
          </div>
        </div>
        `;
      }
      html += "</body></html>";

      const win = window.open("", "_blank");
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 500);

    } catch {
      alert("❌ Label print error");
    }
  };

  // ✏️ EDIT
  const handleEdit = async (lr) => {
    try {
        const res = await fetch(`${BASE_URL}/api/shipment/${lr}/`);
        const data = await res.json();
        localStorage.setItem("editData", JSON.stringify(data));
        window.location.href = "/create-order";
    } catch {
        alert("Error loading edit data");
    }
  };

  // 🗑️ DELETE
  const handleDelete = async (lr) => {
    if (!window.confirm(`Delete shipment ${lr}?`)) return;

    try {
      const res = await fetch(`${BASE_URL}/api/delete/${lr}/`, {
        method: "DELETE"
      });

      if (res.ok) {
        alert("Deleted ✅");
        fetchShipments(); // Refresh the list
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
          placeholder="Search by LR (e.g. FCPL0001)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loading ? (
          <p style={{ textAlign: "center", padding: "20px" }}>Loading Shipments...</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>LR Number</th>
                  <th>Route (Pincode)</th>
                  <th>Total Value</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((s, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: "bold", color: "#007bff" }}>{s.lr}</td>
                      <td>{s.route}</td>
                      <td>₹ {s.value.toLocaleString()}</td>
                      <td><span className="status-badge">{s.status}</span></td>
                      <td>
                        <button className="btn-icon" onClick={() => printDocket(s.lr)} title="Print Docket">🧾</button>
                        <button className="btn-icon" onClick={() => printLabel(s.lr)} title="Print Label">🏷️</button>
                        <button className="btn-icon" onClick={() => handleEdit(s.lr)} title="Edit">✏️</button>
                        <button className="btn-icon btn-delete" onClick={() => handleDelete(s.lr)} title="Delete">🗑️</button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="5" style={{ textAlign: "center" }}>No shipments found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default ShipmentDetail;