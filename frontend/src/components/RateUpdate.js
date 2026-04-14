import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./RateUpdate.css";

const zones = ["N1","N2","N3","C1","W1","W2","S1","S2","E1","NE1","NE2"];

function RateUpdate() {
  const navigate = useNavigate();
  
  const [selectedOption, setSelectedOption] = useState("");
  const [rates, setRates] = useState({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  
  // ========== NEW: Client Management State ==========
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showClientRates, setShowClientRates] = useState(false);
  const [clientRates, setClientRates] = useState({});
  const [masterRates, setMasterRates] = useState({});
  
  // ========== Rate Policy Default Values ==========
  const [ratePolicy, setRatePolicy] = useState({
    minFreight: 600,
    docketCharge: 50,
    fuelPercent: 15,
    fovCharge: 75,
    odaCharge: 3, // per kg or 650 per docket
    codCharge: 150,
    codPercent: 2.5,
    handlingCharge: 2, // per kg above 101kg
    appointmentCharge: 4, // per kg or 1250
    cft: 4500,
    gstPercent: 18
  });
  
  // ========== NEW: Edit Policy State ==========
  const [editingPolicy, setEditingPolicy] = useState(false);
  const [tempPolicy, setTempPolicy] = useState({});

  // Create Empty Matrix
  const createEmptyMatrix = () => {
    let matrix = {};
    zones.forEach(f => {
      matrix[f] = {};
      zones.forEach(t => {
        matrix[f][t] = "";
      });
    });
    return matrix;
  };

  // Fetch all clients for dropdown
  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('https://faithcargo.onrender.com/api/users/clients/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setClients(data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  // Fetch client-specific rates
  const fetchClientRates = async (clientId) => {
    setLoading(true);
    try {
      const response = await fetch(`https://faithcargo.onrender.com/api/rates/client/${clientId}/`);
      const data = await response.json();
      
      // Create matrix from client rates
      let matrix = createEmptyMatrix();
      if (data.zone_rates) {
        data.zone_rates.forEach(r => {
          if (matrix[r.from_zone]) {
            matrix[r.from_zone][r.to_zone] = r.rate;
          }
        });
      }
      setClientRates(matrix);
      
      // Set client policy if exists
      if (data.policy) {
        setRatePolicy(data.policy);
      }
      
    } catch (error) {
      console.error('Error fetching client rates:', error);
      setClientRates(createEmptyMatrix());
    }
    setLoading(false);
  };

  // Fetch Master Matrix From Backend
  const fetchMasterMatrix = async () => {
    try {
      const response = await fetch("https://faithcargo.onrender.com/api/rates/matrix/");
      const data = await response.json();
      
      let matrix = createEmptyMatrix();
      data.forEach(r => {
        if (matrix[r.from_zone]) {
          matrix[r.from_zone][r.to_zone] = r.rate;
        }
      });
      setMasterRates(matrix);
      setRates(matrix);
    } catch (error) {
      console.error('Error fetching master matrix:', error);
    }
  };

  // Initial Load
  useEffect(() => {
    setRates(createEmptyMatrix());
    fetchClients();
  }, []);

  // Fetch matrix based on selection
  useEffect(() => {
    if (selectedOption === "b2b") {
      fetchMasterMatrix();
    } else if (selectedOption === "fcpl") {
      // FCPL rates logic
      setRates(createEmptyMatrix());
    }
  }, [selectedOption]);

  // Handle Input Change
  const handleChange = (from, to, value) => {
    setRates(prev => ({
      ...prev,
      [from]: {
        ...prev[from],
        [to]: value
      }
    }));
  };

  // Handle Client Rate Change
  const handleClientRateChange = (from, to, value) => {
    setClientRates(prev => ({
      ...prev,
      [from]: {
        ...prev[from],
        [to]: value
      }
    }));
  };

  // Update Master Matrix
  const updateRate = async () => {
    setLoading(true);
    
    let payload = [];
    zones.forEach(f => {
      zones.forEach(t => {
        if (rates[f][t] !== "") {
          payload.push({
            from_zone: f,
            to_zone: t,
            rate: Number(rates[f][t])
          });
        }
      });
    });

    try {
      const res = await fetch("https://faithcargo.onrender.com/api/rates/matrix/update/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setMessage(data.message || "Master Rates Updated Successfully");
    } catch {
      setMessage("Server Error");
    }
    setLoading(false);
  };

  // Update Client-Specific Rates
  const updateClientRates = async () => {
    setLoading(true);
    
    let zonePayload = [];
    zones.forEach(f => {
      zones.forEach(t => {
        if (clientRates[f] && clientRates[f][t] !== "") {
          zonePayload.push({
            from_zone: f,
            to_zone: t,
            rate: Number(clientRates[f][t])
          });
        }
      });
    });

    try {
      const res = await fetch(`https://faithcargo.onrender.com/api/rates/client/${selectedClient}/update/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zone_rates: zonePayload,
          policy: ratePolicy
        })
      });
      const data = await res.json();
      setMessage(data.message || `Rates updated for ${selectedClient}`);
      setShowClientRates(false);
    } catch {
      setMessage("Server Error");
    }
    setLoading(false);
  };

  // Update Global Rate Policy
  const updateGlobalPolicy = async () => {
    setLoading(true);
    try {
      const res = await fetch("https://faithcargo.onrender.com/api/rates/policy/update/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ratePolicy)
      });
      const data = await res.json();
      setMessage(data.message || "Rate Policy Updated Successfully");
      setEditingPolicy(false);
    } catch {
      setMessage("Server Error");
    }
    setLoading(false);
  };

  // Handle Policy Change
  const handlePolicyChange = (field, value) => {
    setRatePolicy(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }));
  };

  // Render Rate Table
  const renderRateTable = (rateData, onChangeHandler, title) => (
    <div className="matrix-card">
      <h3>{title}</h3>
      <div className="table-wrapper">
        <table className="rate-table">
          <thead>
            <tr>
              <th>Zone</th>
              {zones.map(z => <th key={z}>{z}</th>)}
            </tr>
          </thead>
          <tbody>
            {zones.map(from => (
              <tr key={from}>
                <td className="zone">{from}</td>
                {zones.map(to => (
                  <td key={to}>
                    <input
                      type="number"
                      value={rateData[from]?.[to] || ""}
                      onChange={(e) => onChangeHandler(from, to, e.target.value)}
                      placeholder="Rate"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Render Rate Policy Card with Edit Option
  const renderPolicyCard = () => (
    <div className="policy-card">
      <div className="policy-header">
        <h3>Faith Cargo Rate Policy</h3>
        <button 
          className="edit-policy-btn"
          onClick={() => {
            setTempPolicy({...ratePolicy});
            setEditingPolicy(true);
          }}
        >
          ✏️ Edit Policy
        </button>
      </div>
      
      <div className="policy-grid">
        <div className="policy-box">
          <h4>Min Freight</h4>
          {editingPolicy ? (
            <input
              type="number"
              value={tempPolicy.minFreight}
              onChange={(e) => setTempPolicy({...tempPolicy, minFreight: parseFloat(e.target.value)})}
            />
          ) : <p>₹{ratePolicy.minFreight}</p>}
        </div>
        
        <div className="policy-box">
          <h4>Docket Charge</h4>
          {editingPolicy ? (
            <input
              type="number"
              value={tempPolicy.docketCharge}
              onChange={(e) => setTempPolicy({...tempPolicy, docketCharge: parseFloat(e.target.value)})}
            />
          ) : <p>₹{ratePolicy.docketCharge}</p>}
        </div>
        
        <div className="policy-box">
          <h4>Fuel Surcharge</h4>
          {editingPolicy ? (
            <input
              type="number"
              value={tempPolicy.fuelPercent}
              onChange={(e) => setTempPolicy({...tempPolicy, fuelPercent: parseFloat(e.target.value)})}
            />
          ) : <p>{ratePolicy.fuelPercent}%</p>}
        </div>
        
        <div className="policy-box">
          <h4>FOV Charge</h4>
          {editingPolicy ? (
            <input
              type="number"
              value={tempPolicy.fovCharge}
              onChange={(e) => setTempPolicy({...tempPolicy, fovCharge: parseFloat(e.target.value)})}
            />
          ) : <p>₹{ratePolicy.fovCharge}</p>}
        </div>
        
        <div className="policy-box">
          <h4>ODA Charge</h4>
          {editingPolicy ? (
            <input
              type="number"
              value={tempPolicy.odaCharge}
              onChange={(e) => setTempPolicy({...tempPolicy, odaCharge: parseFloat(e.target.value)})}
            />
          ) : <p>₹{ratePolicy.odaCharge}/kg OR ₹650/docket</p>}
        </div>
        
        <div className="policy-box">
          <h4>COD Charge</h4>
          {editingPolicy ? (
            <input
              type="number"
              value={tempPolicy.codCharge}
              onChange={(e) => setTempPolicy({...tempPolicy, codCharge: parseFloat(e.target.value)})}
            />
          ) : <p>₹{ratePolicy.codCharge} OR {ratePolicy.codPercent}%</p>}
        </div>
        
        <div className="policy-box">
          <h4>Handling Charge</h4>
          {editingPolicy ? (
            <input
              type="number"
              value={tempPolicy.handlingCharge}
              onChange={(e) => setTempPolicy({...tempPolicy, handlingCharge: parseFloat(e.target.value)})}
            />
          ) : <p>₹{ratePolicy.handlingCharge}/kg (101kg+)</p>}
        </div>
        
        <div className="policy-box">
          <h4>Appointment Delivery</h4>
          {editingPolicy ? (
            <input
              type="number"
              value={tempPolicy.appointmentCharge}
              onChange={(e) => setTempPolicy({...tempPolicy, appointmentCharge: parseFloat(e.target.value)})}
            />
          ) : <p>₹{ratePolicy.appointmentCharge}/kg OR ₹1250</p>}
        </div>
        
        <div className="policy-box">
          <h4>GST</h4>
          {editingPolicy ? (
            <input
              type="number"
              value={tempPolicy.gstPercent}
              onChange={(e) => setTempPolicy({...tempPolicy, gstPercent: parseFloat(e.target.value)})}
            />
          ) : <p>{ratePolicy.gstPercent}%</p>}
        </div>
        
        <div className="policy-box">
          <h4>CFT</h4>
          {editingPolicy ? (
            <input
              type="number"
              value={tempPolicy.cft}
              onChange={(e) => setTempPolicy({...tempPolicy, cft: parseFloat(e.target.value)})}
            />
          ) : <p>{ratePolicy.cft}</p>}
        </div>
      </div>
      
      {editingPolicy && (
        <div className="policy-actions">
          <button onClick={() => setEditingPolicy(false)}>Cancel</button>
          <button onClick={() => {
            setRatePolicy(tempPolicy);
            updateGlobalPolicy();
          }}>Save Policy</button>
        </div>
      )}
    </div>
  );

  // Client Selector Dropdown
  const renderClientSelector = () => (
    <div className="client-selector">
      <label>Select Client for Custom Rates:</label>
      <select 
        value={selectedClient || ""} 
        onChange={(e) => {
          setSelectedClient(e.target.value);
          if (e.target.value) {
            fetchClientRates(e.target.value);
          }
        }}
      >
        <option value="">-- Master Rates (Default) --</option>
        {clients.filter(c => c.role === 'client').map(client => (
          <option key={client.clientId} value={client.clientId}>
            {client.companyName} ({client.clientId})
          </option>
        ))}
      </select>
      {selectedClient && (
        <button onClick={() => setShowClientRates(true)}>
          Edit Client Rates
        </button>
      )}
    </div>
  );

  return (
    <div className="rate-page">
      <h2 className="title">Faith Cargo Rate Update</h2>

      {/* Selection Tabs */}
      <div className="checkbox-select">
        <label>
          <input
            type="checkbox"
            checked={selectedOption === "fcpl"}
            onChange={() => setSelectedOption("fcpl")}
          />
          FCPL Rate
        </label>
        <label>
          <input
            type="checkbox"
            checked={selectedOption === "b2b"}
            onChange={() => setSelectedOption("b2b")}
          />
          BA / B2B Rate
        </label>
      </div>

      {/* Client Selector - Shows when B2B is selected */}
      {selectedOption === "b2b" && renderClientSelector()}

      {/* Master Rate Matrix */}
      {selectedOption === "b2b" && !showClientRates && (
        <>
          {renderRateTable(rates, handleChange, "Master Zone Rate Matrix")}
          
          <div className="buttons">
            <button onClick={updateRate} disabled={loading}>
              {loading ? "Updating..." : "Update Master Rates"}
            </button>
            <button onClick={() => navigate("/admin")}>
              Dashboard
            </button>
          </div>
        </>
      )}

      {/* Client-Specific Rate Matrix Modal */}
      {showClientRates && selectedClient && (
        <div className="modal-overlay" onClick={() => setShowClientRates(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Custom Rates for: {selectedClient}</h3>
              <button className="close-btn" onClick={() => setShowClientRates(false)}>×</button>
            </div>
            
            {renderRateTable(clientRates, handleClientRateChange, "Client Zone Rate Matrix")}
            
            <div className="modal-buttons">
              <button onClick={() => setShowClientRates(false)}>Cancel</button>
              <button onClick={updateClientRates} disabled={loading}>
                {loading ? "Saving..." : "Save Client Rates"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rate Policy Card */}
      {renderPolicyCard()}

      {/* Message Display */}
      {message && (
        <div className="message">
          {message}
          <button onClick={() => setMessage("")}>×</button>
        </div>
      )}
    </div>
  );
}

export default RateUpdate;