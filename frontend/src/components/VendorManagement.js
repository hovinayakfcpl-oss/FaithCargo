import React, { useState } from "react";
import "./VendorRateCalculator.css";

function VendorRateCalculator() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [paymentMode, setPaymentMode] = useState("Prepaid");
  const [weight, setWeight] = useState("");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [qty, setQty] = useState(1);
  const [insurance, setInsurance] = useState(false);
  const [appointment, setAppointment] = useState(false);
  const [results, setResults] = useState([]);

  // Dummy vendor data
  const vendors = [
    { name: "VXPRESS", rate: 16, docket: 75, fuel: 10, oda: true },
    { name: "PDLOGISTICS", rate: 15, docket: 75, fuel: 10, oda: true },
    { name: "GATIALLCARGO", rate: 14, docket: 80, fuel: 12, oda: false },
    { name: "RIVIGO", rate: 13, docket: 70, fuel: 8, oda: true },
    { name: "DELIHVERY", rate: 18, docket: 85, fuel: 11, oda: false },
    { name: "KAROLRATE", rate: 12, docket: 65, fuel: 9, oda: true }
  ];

  const calculate = () => {
    if (!origin || !destination || !weight) {
      alert("Please fill all required fields!");
      return;
    }

    const calcResults = vendors.map(vendor => {
      const weightCharge = vendor.rate * weight;
      const docketCharge = vendor.docket;
      const baseFreight = weightCharge + docketCharge;
      const fuelSurcharge = (vendor.fuel / 100) * baseFreight;
      const total = baseFreight + fuelSurcharge;
      const gst = total * 0.18;
      const grandTotal = total + gst;

      return {
        vendor: vendor.name,
        weightCharge,
        docketCharge,
        fuelSurcharge,
        gst,
        grandTotal,
        oda: vendor.oda ? "Yes" : "No"
      };
    });

    setResults(calcResults);
  };

  const resetForm = () => {
    setOrigin("");
    setDestination("");
    setPaymentMode("Prepaid");
    setWeight("");
    setLength("");
    setWidth("");
    setHeight("");
    setQty(1);
    setInsurance(false);
    setAppointment(false);
    setResults([]);
  };

  return (
    <div className="vendor-rate-page">
      <h2 className="title">📦 Vendor Rate Calculator</h2>

      {/* Form */}
      <div className="form-card">
        <label>Origin Pincode *</label>
        <input type="text" value={origin} onChange={(e) => setOrigin(e.target.value)} />

        <label>Destination Pincode *</label>
        <input type="text" value={destination} onChange={(e) => setDestination(e.target.value)} />

        <label>Payment Mode *</label>
        <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
          <option value="Prepaid">Prepaid</option>
          <option value="COD">COD</option>
        </select>

        <label>Approx Weight (Kg) *</label>
        <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />

        <label>Invoice Value</label>
        <input type="number" />

        <h4>Dimensions</h4>
        <label>Length</label>
        <input type="number" value={length} onChange={(e) => setLength(e.target.value)} />
        <label>Width</label>
        <input type="number" value={width} onChange={(e) => setWidth(e.target.value)} />
        <label>Height</label>
        <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} />
        <label>Qty</label>
        <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} />

        <label>
          <input type="checkbox" checked={insurance} onChange={() => setInsurance(!insurance)} />
          Insurance
        </label>
        <label>
          <input type="checkbox" checked={appointment} onChange={() => setAppointment(!appointment)} />
          Appointment Delivery
        </label>

        <div className="btn-group">
          <button className="calc-btn" onClick={calculate}>Calculate</button>
          <button className="reset-btn" onClick={resetForm}>Reset</button>
          <button className="back-btn">Back</button>
        </div>
      </div>

      {/* Results */}
      <div className="results-grid">
        {results.map((res, idx) => (
          <div key={idx} className="result-card">
            <h3>{res.vendor}</h3>
            <p><strong>Weight Charge:</strong> ₹{res.weightCharge}</p>
            <p><strong>Docket Charge:</strong> ₹{res.docketCharge}</p>
            <p><strong>Fuel Surcharge:</strong> ₹{res.fuelSurcharge.toFixed(2)}</p>
            <p><strong>GST (18%):</strong> ₹{res.gst.toFixed(2)}</p>
            <p><strong>Total:</strong> ₹{res.grandTotal.toFixed(2)}</p>
            <p><strong>ODA:</strong> {res.oda}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default VendorRateCalculator;
