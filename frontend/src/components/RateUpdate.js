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
  
  // ========== Client Management State ==========
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showClientRates, setShowClientRates] = useState(false);
  const [clientRates, setClientRates] = useState({});
  const [masterRates, setMasterRates] = useState({});
  
  // ========== Rate Policy Default Values ==========
  const [ratePolicy, setRatePolicy] = useState({
    surface_rate_per_kg: 18,
    express_rate_per_kg: 25,
    air_rate_per_kg: 45,
    rail_rate_per_kg: 15,
    minFreight: 650,
    docketCharge: 100,
    fuelPercent: 10,
    fovCharge: 75,
    odaCharge: 3,
    codCharge: 150,
    codPercent: 2.5,
    fragileCharge: 250,
    appointmentCharge: 1500,
    handlingCharge: 2,
    insurancePercent: 2,
    expressExtra: 5,
    gstPercent: 18,
    cft: 4500
  });
  
  // ========== Edit Policy State ==========
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

  // ✅ FIXED: Fetch all clients for dropdown (Public endpoint)
  const fetchClients = async () => {
    try {
      setLoading(true);
      // Try multiple endpoints
      let data = [];
      
      // Try public endpoint first
      try {
        const response = await fetch('https://faithcargo.onrender.com/api/accounts/clients/public/');
        if (response.ok) {
          data = await response.json();
          console.log("✅ Clients fetched from public endpoint:", data);
        }
      } catch (e) {
        console.log("Public endpoint failed, trying alternative...");
      }
      
      // If no data, try with token
      if (!data || data.length === 0) {
        const token = localStorage.getItem("token");
        if (token) {
          const response = await fetch('https://faithcargo.onrender.com/api/users/clients/', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            data = await response.json();
            console.log("✅ Clients fetched from auth endpoint:", data);
          }
        }
      }
      
      // If still no data, try user endpoint
      if (!data || data.length === 0) {
        const token = localStorage.getItem("token");
        if (token) {
          const response = await fetch('https://faithcargo.onrender.com/api/user/users/', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const users = await response.json();
            data = users.filter(u => u.role === 'Client');
            console.log("✅ Clients fetched from users endpoint:", data);
          }
        }
      }
      
      setClients(data);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setClients([]);
    } finally {
      setLoading(false);
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
      setMessage(data.message || "✅ Master Rates Updated Successfully");
      setTimeout(() => setMessage(""), 3000);
    } catch {
      setMessage("❌ Server Error");
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
      setMessage(data.message || `✅ Rates updated for ${selectedClient}`);
      setShowClientRates(false);
      setTimeout(() => setMessage(""), 3000);
    } catch {
      setMessage("❌ Server Error");
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
      setMessage(data.message || "✅ Rate Policy Updated Successfully");
      setEditingPolicy(false);
      setTimeout(() => setMessage(""), 3000);
    } catch {
      setMessage("❌ Server Error");
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
                      step="0.5"
                      value={rateData[from]?.[to] || ""}
                      onChange={(e) => onChangeHandler(from, to, e.target.value)}
                      placeholder={masterRates[from]?.[to] || "0"}
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
          <h4>Surface Rate</h4>
          {editingPolicy ? (
            <input type="number" step="0.5" value={tempPolicy.surface_rate_per_kg} onChange={(e) => setTempPolicy({...tempPolicy, surface_rate_per_kg: parseFloat(e.target.value)})} />
          ) : <p>₹{ratePolicy.surface_rate_per_kg}/kg</p>}
        </div>
        
        <div className="policy-box">
          <h4>Express Rate</h4>
          {editingPolicy ? (
            <input type="number" step="0.5" value={tempPolicy.express_rate_per_kg} onChange={(e) => setTempPolicy({...tempPolicy, express_rate_per_kg: parseFloat(e.target.value)})} />
          ) : <p>₹{ratePolicy.express_rate_per_kg}/kg</p>}
        </div>
        
        <div className="policy-box">
          <h4>Air Rate</h4>
          {editingPolicy ? (
            <input type="number" step="0.5" value={tempPolicy.air_rate_per_kg} onChange={(e) => setTempPolicy({...tempPolicy, air_rate_per_kg: parseFloat(e.target.value)})} />
          ) : <p>₹{ratePolicy.air_rate_per_kg}/kg</p>}
        </div>
        
        <div className="policy-box">
          <h4>Min Freight</h4>
          {editingPolicy ? (
            <input type="number" value={tempPolicy.minFreight} onChange={(e) => setTempPolicy({...tempPolicy, minFreight: parseFloat(e.target.value)})} />
          ) : <p>₹{ratePolicy.minFreight}</p>}
        </div>
        
        <div className="policy-box">
          <h4>Docket Charge</h4>
          {editingPolicy ? (
            <input type="number" value={tempPolicy.docketCharge} onChange={(e) => setTempPolicy({...tempPolicy, docketCharge: parseFloat(e.target.value)})} />
          ) : <p>₹{ratePolicy.docketCharge}</p>}
        </div>
        
        <div className="policy-box">
          <h4>Fuel Surcharge</h4>
          {editingPolicy ? (
            <input type="number" step="0.5" value={tempPolicy.fuelPercent} onChange={(e) => setTempPolicy({...tempPolicy, fuelPercent: parseFloat(e.target.value)})} />
          ) : <p>{ratePolicy.fuelPercent}%</p>}
        </div>
        
        <div className="policy-box">
          <h4>GST</h4>
          {editingPolicy ? (
            <input type="number" step="0.5" value={tempPolicy.gstPercent} onChange={(e) => setTempPolicy({...tempPolicy, gstPercent: parseFloat(e.target.value)})} />
          ) : <p>{ratePolicy.gstPercent}%</p>}
        </div>
        
        <div className="policy-box">
          <h4>ODA Charge</h4>
          {editingPolicy ? (
            <input type="number" step="0.5" value={tempPolicy.odaCharge} onChange={(e) => setTempPolicy({...tempPolicy, odaCharge: parseFloat(e.target.value)})} />
          ) : <p>₹{ratePolicy.odaCharge}/kg</p>}
        </div>
        
        <div className="policy-box">
          <h4>COD Charge</h4>
          {editingPolicy ? (
            <input type="number" value={tempPolicy.codCharge} onChange={(e) => setTempPolicy({...tempPolicy, codCharge: parseFloat(e.target.value)})} />
          ) : <p>₹{ratePolicy.codCharge}</p>}
        </div>
        
        <div className="policy-box">
          <h4>Fragile Charge</h4>
          {editingPolicy ? (
            <input type="number" value={tempPolicy.fragileCharge} onChange={(e) => setTempPolicy({...tempPolicy, fragileCharge: parseFloat(e.target.value)})} />
          ) : <p>₹{ratePolicy.fragileCharge}</p>}
        </div>
        
        <div className="policy-box">
          <h4>Appointment Charge</h4>
          {editingPolicy ? (
            <input type="number" value={tempPolicy.appointmentCharge} onChange={(e) => setTempPolicy({...tempPolicy, appointmentCharge: parseFloat(e.target.value)})} />
          ) : <p>₹{ratePolicy.appointmentCharge}</p>}
        </div>
        
        <div className="policy-box">
          <h4>Insurance</h4>
          {editingPolicy ? (
            <input type="number" step="0.5" value={tempPolicy.insurancePercent} onChange={(e) => setTempPolicy({...tempPolicy, insurancePercent: parseFloat(e.target.value)})} />
          ) : <p>{ratePolicy.insurancePercent}%</p>}
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
        {clients.map(client => (
          <option key={client.clientId || client.id} value={client.clientId || client.id}>
            {client.companyName || client.username} ({client.clientId || client.username})
          </option>
        ))}
      </select>
      {selectedClient && (
        <button onClick={() => setShowClientRates(true)}>
          ✏️ Edit Client Rates
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
          {renderRateTable(rates, handleChange, "📊 Master Zone Rate Matrix")}
          
          <div className="buttons">
            <button onClick={updateRate} disabled={loading}>
              {loading ? "⏳ Updating..." : "💾 Update Master Rates"}
            </button>
            <button onClick={() => navigate("/admin-dashboard")}>
              📋 Dashboard
            </button>
          </div>
        </>
      )}

      {/* Client-Specific Rate Matrix Modal */}
      {showClientRates && selectedClient && (
        <div className="modal-overlay" onClick={() => setShowClientRates(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⭐ Custom Rates for: {selectedClient}</h3>
              <button className="close-btn" onClick={() => setShowClientRates(false)}>×</button>
            </div>
            
            {renderRateTable(clientRates, handleClientRateChange, "🎯 Client Zone Rate Matrix")}
            
            <div className="modal-buttons">
              <button onClick={() => setShowClientRates(false)}>Cancel</button>
              <button onClick={updateClientRates} disabled={loading}>
                {loading ? "💾 Saving..." : "✅ Save Client Rates"}
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