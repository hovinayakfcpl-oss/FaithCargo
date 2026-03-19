import React, { useState } from "react";
import "../styles/common.css";

function RateCalculator() {

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [weight, setWeight] = useState("");
  const [invoiceValue, setInvoiceValue] = useState("");
  const [insurance, setInsurance] = useState(false);
  const [appointment, setAppointment] = useState(false);

  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("");

  const calculateRate = async () => {

    setMessage("");
    setResult(null);

    if (!origin || !destination || !weight) {
      setMessage("Please fill Origin, Destination and Weight");
      return;
    }

    try {

      const response = await fetch("https://faithcargo.onrender.com/rates/fcpl-rate-calculate/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          origin: origin,
          destination: destination,
          weight: parseFloat(weight),
          invoiceValue: parseFloat(invoiceValue || 0),
          insurance: insurance,
          appointment: appointment,
          paymentMode: "Prepaid",
          dimensions: []
        })
      });

      if (!response.ok) {
        throw new Error("Server error: " + response.status);
      }

      const data = await response.json();

      console.log("API Response:", data);

      if (data.error) {
        setMessage(data.error);
      } else {
        setResult(data);
        setMessage("Rate calculated successfully");
      }

    } catch (error) {
      console.error("API Error:", error);
      setMessage("Backend API not responding. Please check Django server.");
    }
  };

  return (
    <section className="rate-section">

      <h3>⚡ FCPL Rate Calculator</h3>

      <div className="form-grid">

        <input
          type="text"
          placeholder="Origin Pincode"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
        />

        <input
          type="text"
          placeholder="Destination Pincode"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        />

        <input
          type="number"
          placeholder="Weight (kg)"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />

        <input
          type="number"
          placeholder="Invoice Value (₹)"
          value={invoiceValue}
          onChange={(e) => setInvoiceValue(e.target.value)}
        />

        <label>
          <input
            type="checkbox"
            checked={insurance}
            onChange={(e) => setInsurance(e.target.checked)}
          />
          Insurance
        </label>

        <label>
          <input
            type="checkbox"
            checked={appointment}
            onChange={(e) => setAppointment(e.target.checked)}
          />
          Appointment Delivery
        </label>

      </div>

      <button className="btn-primary" onClick={calculateRate}>
        Calculate
      </button>

      {message && <p className="message">{message}</p>}

      {result && (

        <div className="result-box">

          <h4>Calculation Result</h4>

          <p><b>Origin:</b> {result.origin}</p>
          <p><b>Destination:</b> {result.destination}</p>
          <p><b>Zone:</b> {result.zone}</p>
          <p><b>ODA:</b> {result.is_oda ? "Yes" : "No"}</p>
          <p><b>Chargeable Weight:</b> {result.chargeable_weight} kg</p>

          <hr/>

          <h3>Total Freight: ₹{result.rate}</h3>

        </div>

      )}

    </section>
  );
}

export default RateCalculator;