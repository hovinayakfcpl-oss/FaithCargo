import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./FCPLRateCalculator.css";

function FcplRateCalculator() {
  // eslint-disable-next-line no-unused-vars
  navigate("/success");

  const [formData, setFormData] = useState({
    origin: "",
    destination: "",
    paymentMode: "Prepaid",
    weight: "",
    invoiceValue: "",
    codAmount: "",
    insurance: false,
    appointment: false,
    dimensions: [{ length: "", width: "", height: "", qty: 1 }],
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // INPUT
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // DIMENSION
  const handleDimensionChange = (index, e) => {
    const { name, value } = e.target;
    const newDims = [...formData.dimensions];
    newDims[index][name] = value;
    setFormData({ ...formData, dimensions: newDims });
  };

  // CALCULATE
  const calculateRate = async () => {
    setLoading(true);
    setResult(null);

    let volumetric = 0;
    let totalQty = 0;

    formData.dimensions.forEach((box) => {
      const v =
        (Number(box.length) *
          Number(box.width) *
          Number(box.height) *
          Number(box.qty)) /
        5000;

      volumetric += Number(v);
      totalQty += Number(box.qty || 0);
    });

    try {
      const res = await fetch(
        "https://faithcargo.onrender.com/api/rates/fcpl/calculate/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            weight: Number(formData.weight),
            invoiceValue: Number(formData.invoiceValue),
          }),
        }
      );

      const data = await res.json();

      console.log("🔥 FULL API RESPONSE:", data);

      if (!res.ok) {
        alert(data.error);
        return;
      }

      // =========================
      // WEIGHT
      // =========================
      data.actual_weight = Number(formData.weight).toFixed(2);
      data.volumetric_weight = volumetric.toFixed(2);

      const cw = Math.max(Number(formData.weight), volumetric);
      data.chargeable_weight = cw.toFixed(2);

      // =========================
      // RATE PER KG SAFE
      // =========================
      data.rate_per_kg =
        cw > 0 ? (data.freight_charge / cw).toFixed(2) : "0.00";

      // =========================
      // ✅ ODA FIX (backend value use karo)
      // =========================
      data.is_oda = data.is_oda ?? false;
      data.oda_charge = Number(data.oda_charge || 0);

      // =========================
      // GST + FOV
      // =========================
      const gst = Number(data.total_charge) * 0.18;
      const fov = 75;

      data.gst = gst.toFixed(2);
      data.fov_charge = fov;

      let total = Number(data.total_charge) + gst + fov;

      // =========================
      // COD
      // =========================
      let codCharge = 0;

      if (formData.paymentMode === "COD") {
        codCharge = 150;
      }

      data.cod_charge = codCharge;
      total += codCharge;

      // =========================
      // HANDLING
      // =========================
      let handling = 0;

      if (totalQty === 1 && cw > 70) {
        handling = 750;
      }

      data.handling_charge = handling;
      total += handling;

      // =========================
      // FINAL TOTAL
      // =========================
      data.total_final = total.toFixed(2);

      setResult(data);
    } catch (err) {
      console.error(err);
      alert("Server Error");
    }

    setLoading(false);
  };

  return (
    <div className="rate-page">
      <h2 className="title">FCPL Rate Calculator</h2>

      <div className="calculator-layout">

        {/* FORM */}
        <div className="form-section">

          <input placeholder="Origin" name="origin" value={formData.origin} onChange={handleChange} />
          <input placeholder="Destination" name="destination" value={formData.destination} onChange={handleChange} />

          <select name="paymentMode" value={formData.paymentMode} onChange={handleChange}>
            <option>Prepaid</option>
            <option>COD</option>
            <option>ToPay</option>
          </select>

          <input type="number" placeholder="Weight" name="weight" value={formData.weight} onChange={handleChange} />

          {/* COD INPUT */}
          {formData.paymentMode === "COD" && (
            <input
              type="number"
              placeholder="COD Amount"
              name="codAmount"
              value={formData.codAmount}
              onChange={handleChange}
            />
          )}

          <h4>Dimensions</h4>

          {formData.dimensions.map((dim, i) => (
            <div key={i} className="dimension-row">
              <input name="length" placeholder="L" value={dim.length} onChange={(e) => handleDimensionChange(i, e)} />
              <input name="width" placeholder="W" value={dim.width} onChange={(e) => handleDimensionChange(i, e)} />
              <input name="height" placeholder="H" value={dim.height} onChange={(e) => handleDimensionChange(i, e)} />
              <input name="qty" placeholder="Qty" value={dim.qty} onChange={(e) => handleDimensionChange(i, e)} />
            </div>
          ))}

          <button onClick={calculateRate}>
            {loading ? "Calculating..." : "Calculate"}
          </button>

        </div>

        {/* RESULT */}
        <div className="result-section">

          {result && (
            <div className="invoice-card">

              <h2>₹ {result.total_final}</h2>

              {result.is_oda && (
                <div className="oda-alert">⚠️ ODA Location</div>
              )}

              <table className="charges-table">
                <tbody>

                  <tr><td>Zone</td><td>{result.zone}</td></tr>
                  <tr><td>Actual Weight</td><td>{result.actual_weight}</td></tr>
                  <tr><td>Volumetric Weight</td><td>{result.volumetric_weight}</td></tr>
                  <tr><td>Chargeable Weight</td><td>{result.chargeable_weight}</td></tr>
                  <tr><td>Rate / Kg</td><td>{result.rate_per_kg}</td></tr>
                  <tr><td>Rate Charge</td><td>₹ {result.freight_charge}</td></tr>

                  <tr>
                    <td>ODA Charge</td>
                    <td>₹ {result.oda_charge}</td>
                  </tr>

                  <tr><td>Fuel (15%)</td><td>₹ {result.fuel_charge}</td></tr>
                  <tr><td>FOV</td><td>₹ {result.fov_charge}</td></tr>
                  <tr><td>GST (18%)</td><td>₹ {result.gst}</td></tr>

                  {formData.paymentMode === "COD" && (
                    <tr><td>COD Charge</td><td>₹ 150</td></tr>
                  )}

                  {result.handling_charge > 0 && (
                    <tr><td>Handling</td><td>₹ {result.handling_charge}</td></tr>
                  )}

                </tbody>
              </table>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}

export default FcplRateCalculator;