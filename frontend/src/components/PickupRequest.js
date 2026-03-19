import React, { useState } from "react";

function PickupRequest() {
  const [pickupPoint, setPickupPoint] = useState("");
  const [task, setTask] = useState("");

  const submitRequest = () => {
    alert(`Pickup Request Created:\nPoint: ${pickupPoint}\nTask: ${task}`);
    setPickupPoint("");
    setTask("");
  };

  return (
    <section>
      <h3>Pickup Request / Task</h3>
      <div>
        <input
          type="text"
          placeholder="Pickup Point"
          value={pickupPoint}
          onChange={(e) => setPickupPoint(e.target.value)}
        />
        <input
          type="text"
          placeholder="Task Details"
          value={task}
          onChange={(e) => setTask(e.target.value)}
        />
        <button onClick={submitRequest}>Submit Request</button>
      </div>
    </section>
  );
}

export default PickupRequest;

