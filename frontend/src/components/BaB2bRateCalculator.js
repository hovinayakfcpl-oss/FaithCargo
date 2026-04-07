import React, { useState } from "react";
import "./B2BRateCalculator.css";

function B2BRateCalculator() {
  const [form, setForm] = useState({
    origin: "",
    destination: "",
    weight: "",
    invoiceValue: "",
    codAmount: "",
    paymentMode: "", 
    insurance: false,
    appointment: false
  });

  const [dimensions, setDimensions] = useState([
    { qty: 1, length: "", width: "", height: "" }
  ]);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(true);

  // INPUT HANDLER
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value
    });
  };

  // DIMENSION CHANGE HANDLER
  const handleDimChange = (i, e) => {
    const { name, value } = e.target;
    const newDims = [...dimensions];
    newDims[i][name] = value;
    setDimensions(newDims);
  };

  // ADD BOX
  const addBox = () => {
    setDimensions([...dimensions, { qty: 1, length: "", width: "", height: "" }]);
  };

  // REMOVE BOX
  const removeBox = (index) => {
    setDimensions(dimensions.filter((_, i) => i !== index));
  };

  // CALCULATE RATE LOGIC
  const calculateRate = async () => {
    // Basic Validation
    if (!form.origin || !form.destination || !form.weight) {
      alert("Please enter Origin, Destination, and Weight!");
      return;
    }

    setLoading(true);
    setResult(null);

    let volumetric = 0;
    let totalQty = 0;

    dimensions.forEach(b => {
      const v = (Number(b.length) * Number(b.width) * Number(b.height) * Number(b.qty)) / 4000;
      volumetric += Number(v || 0);
      totalQty += Number(b.qty || 0);
    });

    try {
      const res = await fetch("https://faithcargo.onrender.com/api/rates/b2b/calculate/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: form.origin,
          destination: form.destination,
          weight: Number(form.weight),
          invoiceValue: Number(form.invoiceValue),
          insurance: form.insurance,
          appointment: form.appointment,
          dimensions: dimensions
        })
      });

      const data = await res.json();

      if (data.error) {
        alert(data.error);
        setLoading(false);
        return;
      }

      const actual = Number(form.weight);
      const chargeable = Math.max(actual, volumetric);

      const perKg = chargeable > 0
        ? (Number(data.freight_charge) / chargeable).toFixed(2)
        : 0;

      const freight = Number(data.freight_charge);
      const gst = freight * 0.18;
      const fuel = freight * 0.10;
      const docket = 100;
      const fov = 75;

      let cod = (form.paymentMode === "COD" || form.paymentMode === "ToPay") ? 150 : 0;
      let handling = (totalQty === 1 && chargeable > 70) ? 750 : 0;
      let insuranceVal = form.insurance ? Number(form.invoiceValue) * 0.02 : 0;
      let appointmentVal = form.appointment ? 1500 : 0;

      let total = freight + gst + fuel + docket + fov + cod + handling + insuranceVal + appointmentVal;

      // Minimum Billing Check
      if (total < 650) {
        total = 650;
      }

      setResult({
        ...data,
        actual,
        volumetric: volumetric.toFixed(2),
        chargeable: chargeable.toFixed(2),
        perKg,
        freight,
        fuel: fuel.toFixed(2),
        gst: gst.toFixed(2),
        cod,
        handling,
        insurance: insuranceVal,
        appointment: appointmentVal,
        final: total.toFixed(2)
      });

    } catch (err) {
      alert("Server Error! Please check your internet or Render backend status.");
      console.error(err);
    }

    setLoading(false);
  };

  return (
    <div className="main">
      {/* --- TOP HEADING --- */}
      <div className="header-section">
        <h1>FCPL RATE CALCULATOR</h1>
        <p>Faith Cargo Logistics Pvt. Ltd. - B2B & BA Surface Pricing</p>
      </div>

      <div className="layout">
        {/* LEFT CARD: INPUT FORM */}
        <div className="card shadow-card">
          <div className="grid2">
            <input placeholder="Origin (City/Pincode)" name="origin" onChange={handleChange} />
            <input placeholder="Destination (City/Pincode)" name="destination" onChange={handleChange} />
          </div>

          <div className="grid2">
            <select name="paymentMode" value={form.paymentMode} onChange={handleChange}>
              <option value="" disabled>Select Payment Mode</option>
              <option value="Prepaid">Prepaid</option>
              <option value="COD">COD</option>
              <option value="ToPay">ToPay</option>
            </select>

            {(form.paymentMode === "COD" || form.paymentMode === "ToPay") && (
              <input placeholder="COD Amount (₹)" name="codAmount" type="number" onChange={handleChange} />
            )}
          </div>

          <div className="grid2">
            <input placeholder="Actual Weight (Kg)" name="weight" type="number" onChange={handleChange} />
            <input placeholder="Invoice Value (₹)" name="invoiceValue" type="number" onChange={handleChange} />
          </div>

          <div className="dim-section">
            <div className="dim-header">
              <h4>Shipment Dimensions</h4>
              <button className="add-btn-small" onClick={addBox}>+ Add Row</button>
            </div>

            {dimensions.map((d, i) => (
              <div key={i} className="dim-row">
                <input placeholder="Qty" value={d.qty} name="qty" type="number" onChange={(e) => handleDimChange(i, e)} />
                <input placeholder="L (cm)" value={d.length} name="length" type="number" onChange={(e) => handleDimChange(i, e)} />
                <input placeholder="W (cm)" value={d.width} name="width" type="number" onChange={(e) => handleDimChange(i, e)} />
                <input placeholder="H (cm)" value={d.height} name="height" type="number" onChange={(e) => handleDimChange(i, e)} />

                {dimensions.length > 1 && (
                  <button className="remove-btn" onClick={() => removeBox(i)}>×</button>
                )}
              </div>
            ))}
          </div>

          <div className="check-group">
            <label><input type="checkbox" name="insurance" onChange={handleChange} /> Insurance (FOV)</label>
            <label><input type="checkbox" name="appointment" onChange={handleChange} /> Appointment Delivery</label>
          </div>

          <button className="calc-btn" onClick={calculateRate} disabled={loading}>
            {loading ? "Calculating..." : "Get Live Quote"}
          </button>
        </div>

        {/* RIGHT CARD: RESULT PANEL */}
        <div className="card shadow-card result-side">
          {result ? (
            <div className="result-premium">
              <div className="rp-header">
                <div className="rp-logo">FCPL</div>
                <div className="rp-info">
                  <h3>FCPL Surface Express</h3>
                  <p>Chargeable Wt: {result.chargeable} Kg</p>
                </div>
                <div className="rp-price">
                  ₹ {result.final}
                  <span>{result.final === "650.00" ? "Min ₹650 Applied" : "Incl. All Charges"}</span>
                </div>
              </div>

              <div className="rp-toggle" onClick={() => setShow(!show)}>
                Charges Breakdown {show ? "▲" : "▼"}
              </div>

              {show && (
                <div className="rp-body">
                  <div className="rp-row"><span>Route</span><span>{result.from_zone} → {result.to_zone}</span></div>
                  <div className="rp-row"><span>Actual Weight</span><span>{result.actual} Kg</span></div>
                  <div className="rp-row"><span>Volumetric Weight</span><span>{result.volumetric} Kg</span></div>
                  <div className="rp-row highlighted"><span>Chargeable Weight</span><span>{result.chargeable} Kg</span></div>
                  <hr />
                  <div className="rp-row"><span>Basic Freight (@ ₹{result.perKg})</span><span>₹ {result.freight}</span></div>
                  <div className="rp-row"><span>Fuel Surcharge (10%)</span><span>₹ {result.fuel}</span></div>
                  <div className="rp-row"><span>Docket / Waybill Charge</span><span>₹ 100</span></div>
                  <div className="rp-row"><span>FOV Charges</span><span>₹ 75</span></div>
                  
                  {result.is_oda && <div className="rp-row oda"><span>ODA Charges</span><span>₹ {result.oda_charge}</span></div>}
                  {result.cod > 0 && <div className="rp-row"><span>COD/ToPay Fee</span><span>₹ 150</span></div>}
                  {result.handling > 0 && <div className="rp-row"><span>Special Handling</span><span>₹ 750</span></div>}
                  {form.insurance && <div className="rp-row"><span>Insurance Policy</span><span>₹ {result.insurance}</span></div>}
                  {form.appointment && <div className="rp-row"><span>Appointment Delivery</span><span>₹ {result.appointment}</span></div>}
                  
                  <div className="rp-row gst"><span>GST (18% on Freight)</span><span>₹ {result.gst}</span></div>
                  <div className="rp-total-final">
                    <span>Total Net Amount</span>
                    <span>₹ {result.final}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="placeholder-content">
              <i className="fas fa-calculator" style={{fontSize: '40px', color: '#ddd', marginBottom: '15px'}}></i>
              <p>Enter shipment details and click calculate to see the professional quote for <b>Faith Cargo</b>.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default B2BRateCalculator;