import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./FCPLRateCalculator.css";

function FcplRateCalculator() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    origin: "",
    destination: "",
    paymentMode: "Prepaid",
    weight: "",
    invoiceValue: "",
    insurance: false,
    appointment: false,
    dimensions: [{ length: "", width: "", height: "", qty: "" }],
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // 🔹 Handle normal input change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // 🔹 Handle dimension change
  const handleDimensionChange = (index, e) => {
    const { name, value } = e.target;
    const newDimensions = [...formData.dimensions];
    newDimensions[index][name] = value;
    setFormData({ ...formData, dimensions: newDimensions });
  };

  // 🔹 Add dimension row
  const addDimensionSet = () => {
    setFormData({
      ...formData,
      dimensions: [
        ...formData.dimensions,
        { length: "", width: "", height: "", qty: "" },
      ],
    });
  };

  // 🔹 Remove dimension row
  const removeDimensionSet = (index) => {
    const newDimensions = formData.dimensions.filter((_, i) => i !== index);
    setFormData({ ...formData, dimensions: newDimensions });
  };

  // 🔹 Calculate Rate (always uses latest backend rates)
  const calculateRate = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("http://localhost:8000/api/rates/fcpl/calculate/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          weight: parseFloat(formData.weight || 0),
          invoiceValue: parseFloat(formData.invoiceValue || 0),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Server error occurred");
      }

      setResult(data);

    } catch (error) {
      console.error("Error calculating rate:", error);
      alert("Backend API not responding. Please check Django server.");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Reset Form
  const resetForm = () => {
    setFormData({
      origin: "",
      destination: "",
      paymentMode: "Prepaid",
      weight: "",
      invoiceValue: "",
      insurance: false,
      appointment: false,
      dimensions: [{ length: "", width: "", height: "", qty: "" }],
    });
    setResult(null);
  };

  return (
    <div className="rate-page">
      <h2 className="title">FCPL Rate Calculator</h2>

      <div className="calculator-layout">

        {/* Form Section */}
        <div className="form-section">
          <div className="form-grid">
            <label>
              Origin Pincode *
              <input type="text" name="origin" value={formData.origin} onChange={handleChange} />
            </label>

            <label>
              Destination Pincode *
              <input type="text" name="destination" value={formData.destination} onChange={handleChange} />
            </label>

            <label>
              Payment Mode *
              <select name="paymentMode" value={formData.paymentMode} onChange={handleChange}>
                <option value="Prepaid">Prepaid</option>
                <option value="COD">COD</option>
              </select>
            </label>

            <label>
              Approx Weight (Kg) *
              <input type="number" name="weight" value={formData.weight} onChange={handleChange} />
            </label>

            <label>
              Invoice Value
              <input type="number" name="invoiceValue" value={formData.invoiceValue} onChange={handleChange} />
            </label>
          </div>

          {/* Dimensions */}
          <h4>Dimensions</h4>
          {formData.dimensions.map((dim, index) => (
            <div className="dimension-row" key={index}>
              <input type="number" name="length" placeholder="Length" value={dim.length} onChange={(e) => handleDimensionChange(index, e)} />
              <input type="number" name="width" placeholder="Width" value={dim.width} onChange={(e) => handleDimensionChange(index, e)} />
              <input type="number" name="height" placeholder="Height" value={dim.height} onChange={(e) => handleDimensionChange(index, e)} />
              <input type="number" name="qty" placeholder="Qty" value={dim.qty} onChange={(e) => handleDimensionChange(index, e)} />

              {formData.dimensions.length > 1 && (
                <button type="button" onClick={() => removeDimensionSet(index)}>❌</button>
              )}
            </div>
          ))}
          <button onClick={addDimensionSet}>+ Add Dimension</button>

          {/* Options */}
          <div className="options">
            <label>
              <input type="checkbox" name="insurance" checked={formData.insurance} onChange={handleChange} />
              Insurance
            </label>
            <label>
              <input type="checkbox" name="appointment" checked={formData.appointment} onChange={handleChange} />
              Appointment Delivery
            </label>
          </div>

          {/* Buttons */}
          <div className="buttons">
            <button onClick={calculateRate} disabled={loading}>
              {loading ? "Calculating..." : "Calculate"}
            </button>
            <button onClick={resetForm}>Reset</button>
            <button onClick={() => navigate("/admin")}>Back</button>
          </div>
        </div>

        {/* Result Section */}
        <div className="result-section">
          {result ? (
            <div className="result-box">
              <h3>Calculation Result</h3>
              <p>Rate: ₹{result.rate}</p>
              <p>Zone: {result.zone}</p>
              <p>ODA: {result.is_oda ? "Yes" : "No"}</p>
              <p>Chargeable Weight: {result.chargeable_weight} Kg</p>
            </div>
          ) : (
            <div className="result-box">
              <h3>Calculation Result</h3>
              <p>Enter shipment details and click Calculate</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FcplRateCalculator;
