import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/common.css";

function PickupAssign() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    pickupId: "",
    driver: "",
    vehicle: "",
    date: "",
  });
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const assignPickup = async () => {
    try {
      const response = await fetch("/pickup/assign/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (data.error) {
        alert(data.error);
        setMessage("");
      } else {
        setMessage("Pickup assigned successfully!");
      }
    } catch (error) {
      console.error("Error assigning pickup:", error);
      alert("Backend API not responding. Please check Django server.");
    }
  };

  return (
    <div className="pickup-assign-page">
      <h2>Pickup Request Assignment</h2>

      <div className="form-grid">
        <label>
          Pickup ID *
          <input type="text" name="pickupId" value={formData.pickupId} onChange={handleChange} />
        </label>
        <label>
          Driver Name *
          <input type="text" name="driver" value={formData.driver} onChange={handleChange} />
        </label>
        <label>
          Vehicle Number *
          <input type="text" name="vehicle" value={formData.vehicle} onChange={handleChange} />
        </label>
        <label>
          Date *
          <input type="date" name="date" value={formData.date} onChange={handleChange} />
        </label>
      </div>

      <div className="buttons">
        <button onClick={assignPickup}>Assign Pickup</button>
        <button onClick={() => navigate("/admin")}>Back to Dashboard</button>
      </div>

      {message && (
        <div className="result-box">
          <h3>Status</h3>
          <p>{message}</p>
        </div>
      )}
    </div>
  );
}

export default PickupAssign;
