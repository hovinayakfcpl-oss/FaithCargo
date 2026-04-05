import React, { useState } from "react";
import "./CreateOrder.css";

function CreateOrder() {

  const [showModal, setShowModal] = useState(false);
  const [type, setType] = useState(""); // pickup / delivery

  const [location, setLocation] = useState({
    company: "",
    name: "",
    address: "",
    pincode: "",
    state: "",
    mobile: ""
  });

  const [pickup, setPickup] = useState(null);
  const [delivery, setDelivery] = useState(null);

  // PINCODE → STATE
  const fetchState = async (pincode) => {
    if (pincode.length === 6) {
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
        const data = await res.json();
        const state = data[0]?.PostOffice?.[0]?.State || "";

        setLocation(prev => ({ ...prev, state }));
      } catch {}
    }
  };

  // INPUT HANDLE
  const handleChange = (e) => {
    let { name, value } = e.target;

    if (name === "pincode") {
      value = value.replace(/\D/g, "").slice(0, 6);
      fetchState(value);
    }

    if (name === "mobile") {
      value = value.replace(/\D/g, "").slice(0, 10);
    }

    setLocation({ ...location, [name]: value });
  };

  // SAVE LOCATION
  const saveLocation = () => {
    if (type === "pickup") setPickup(location);
    else setDelivery(location);

    setShowModal(false);

    setLocation({
      company: "",
      name: "",
      address: "",
      pincode: "",
      state: "",
      mobile: ""
    });
  };

  return (
    <div className="container">

      {/* LEFT */}
      <div className="left">
        <h2>Create Order</h2>
      </div>

      {/* RIGHT PANEL */}
      <div className="right">

        {/* DELIVERY CARD */}
        <div className="card deliveryCard">

          <h3>📍 Delivery Details</h3>

          <button
            className="selectBtn"
            onClick={() => {
              setType("pickup");
              setShowModal(true);
            }}
          >
            {pickup ? pickup.company : "Select Pickup Location"}
          </button>

          <button
            className="selectBtn gray"
            onClick={() => {
              setType("delivery");
              setShowModal(true);
            }}
          >
            {delivery ? delivery.company : "Select Drop Location"}
          </button>

        </div>

      </div>

      {/* MODAL */}
      {showModal && (
        <div className="modal">

          <div className="modalContent">

            <h3>{type === "pickup" ? "Pickup Location" : "Delivery Location"}</h3>

            <input name="company" placeholder="Company Name" onChange={handleChange} />
            <input name="name" placeholder="Contact Person" onChange={handleChange} />
            <input name="mobile" placeholder="Mobile" onChange={handleChange} />
            <input name="pincode" placeholder="Pincode" onChange={handleChange} />

            <input value={location.state} placeholder="State" disabled />

            <textarea name="address" placeholder="Full Address" onChange={handleChange}></textarea>

            <div className="modalBtns">
              <button onClick={saveLocation}>Save</button>
              <button className="cancel" onClick={() => setShowModal(false)}>Cancel</button>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default CreateOrder;