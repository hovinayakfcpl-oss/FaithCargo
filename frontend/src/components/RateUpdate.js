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

  // Fetch all clients from database
  const fetchClients = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      if (!token) {
        console.log("No token found");
        setClients([]);
        return;
      }
      
      const response = await fetch('https://faithcargo.onrender.com/api/user/clients/', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("✅ Clients fetched:", data);
        setClients(Array.isArray(data) ? data : []);
      } else {
        console.error("Failed to fetch clients:", response.status);
        setClients([]);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch client-specific rates from database
  const fetchClientRates = async (clientId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      console.log(`🔍 Fetching rates for client: ${clientId}`);
      
      const response = await fetch(`https://faithcargo.onrender.com/api/rates/client/${clientId}/`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });
      
      let matrix = createEmptyMatrix();
      
      if (response.ok) {
        const data = await response.json();
        console.log("✅ Client rates response:", data);
        
        if (data.zone_rates && data.zone_rates.length > 0) {
          // Load existing custom rates
          data.zone_rates.forEach(r => {
            if (matrix[r.from_zone]) {
              matrix[r.from_zone][r.to_zone] = r.rate;
            }
          });
          setMessage(`✅ Loaded ${data.zone_rates.length} custom rates for ${clientId}`);
        } else {
          // No custom rates - show master rates as template for easy editing
          if (Object.keys(masterRates).length > 0) {
            matrix = JSON.parse(JSON.stringify(masterRates));
            setMessage(`ℹ️ No custom rates for ${clientId}. Using master rates as template. Enter values and click Save.`);
          } else {
            setMessage(`ℹ️ No rates found for ${clientId}. Enter rates and click Save.`);
          }
        }
        setTimeout(() => setMessage(""), 4000);
      } else {
        console.error("Failed to fetch client rates:", response.status);
        // Use master rates as fallback
        if (Object.keys(masterRates).length > 0) {
          matrix = JSON.parse(JSON.stringify(masterRates));
        }
      }
      
      setClientRates(matrix);
      
    } catch (error) {
      console.error('Error fetching client rates:', error);
      if (Object.keys(masterRates).length > 0) {
        setClientRates(JSON.parse(JSON.stringify(masterRates)));
      } else {
        setClientRates(createEmptyMatrix());
      }
      setMessage(`⚠️ Using master rates as template`);
      setTimeout(() => setMessage(""), 3000);
    }
    setLoading(false);
  };

  // Fetch Master Matrix From Backend
  const fetchMasterMatrix = async () => {
    try {
      const response = await fetch("https://faithcargo.onrender.com/api/rates/matrix/");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      
      let matrix = createEmptyMatrix();
      data.forEach(r => {
        if (matrix[r.from_zone]) {
          matrix[r.from_zone][r.to_zone] = r.rate;
        }
      });
      setMasterRates(matrix);
      setRates(matrix);
      console.log("✅ Master rates fetched");
    } catch (error) {
      console.error('Error fetching master matrix:', error);
    }
  };

  // Initial Load
  useEffect(() => {
    setRates(createEmptyMatrix());
    fetchClients();
    fetchMasterMatrix();
  }, []);

  useEffect(() => {
    if (selectedOption === "b2b") {
      fetchMasterMatrix();
    } else if (selectedOption === "fcpl") {
      setRates(createEmptyMatrix());
    }
  }, [selectedOption]);

  const handleChange = (from, to, value) => {
    setRates(prev => ({
      ...prev,
      [from]: { ...prev[from], [to]: value }
    }));
  };

  const handleClientRateChange = (from, to, value) => {
    setClientRates(prev => ({
      ...prev,
      [from]: { ...prev[from], [to]: value }
    }));
  };

  // Update Master Matrix
  const updateRate = async () => {
    setLoading(true);
    
    let payload = [];
    zones.forEach(f => {
      zones.forEach(t => {
        if (rates[f][t] !== "" && rates[f][t] !== null) {
          payload.push({ from_zone: f, to_zone: t, rate: Number(rates[f][t]) });
        }
      });
    });

    if (payload.length === 0) {
      setMessage("⚠️ No rates to update!");
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("https://faithcargo.onrender.com/api/rates/matrix/update/", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (res.ok) {
        setMessage("✅ Master Rates Updated Successfully");
        fetchMasterMatrix();
      } else {
        setMessage(data.error || "❌ Failed to update master rates");
      }
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("❌ Server Error: " + error.message);
    }
    setLoading(false);
  };

  // ✅ FIXED: Save Client-Specific Rates to Database
  const updateClientRates = async () => {
    if (!selectedClient) {
      setMessage("❌ No client selected");
      return;
    }
    
    setLoading(true);
    
    // Collect all rates that have values
    let zonePayload = [];
    zones.forEach(f => {
      zones.forEach(t => {
        const rateValue = clientRates[f]?.[t];
        if (rateValue !== "" && rateValue !== null && rateValue !== undefined && rateValue !== '') {
          zonePayload.push({
            from_zone: f,
            to_zone: t,
            rate: Number(rateValue)
          });
        }
      });
    });

    if (zonePayload.length === 0) {
      setMessage("⚠️ No rates to update! Please enter at least one rate value.");
      setLoading(false);
      return;
    }

    console.log("🟡 Saving rates for client:", selectedClient);
    console.log("🟡 Number of rates:", zonePayload.length);
    console.log("🟡 Sample rates (first 3):", zonePayload.slice(0, 3));

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`https://faithcargo.onrender.com/api/rates/client/${selectedClient}/update/`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          zone_rates: zonePayload
        })
      });
      
      const data = await res.json();
      console.log("🟢 Server response:", data);
      
      if (res.ok && data.success) {
        setMessage(`✅ ${data.message || `Rates saved successfully for ${selectedClient}`} (${data.stats?.created || zonePayload.length} rates saved)`);
        setShowClientRates(false);
        
        // Wait a moment then refresh to verify save
        setTimeout(async () => {
          await fetchClientRates(selectedClient);
          setMessage(`✅ Rates verified! ${selectedClient} now has custom rates.`);
          setTimeout(() => setMessage(""), 3000);
        }, 1000);
      } else {
        setMessage(data.error || "❌ Failed to save client rates");
        console.error("Save failed:", data);
      }
      setTimeout(() => setMessage(""), 4000);
    } catch (error) {
      console.error("🔴 Error:", error);
      setMessage("❌ Server Error: " + error.message);
    }
    setLoading(false);
  };

  const updateGlobalPolicy = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("https://faithcargo.onrender.com/api/rates/policy/update/", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(ratePolicy)
      });
      const data = await res.json();
      
      if (res.ok) {
        setMessage("✅ Rate Policy Updated Successfully");
        setEditingPolicy(false);
      } else {
        setMessage(data.error || "❌ Failed to update policy");
      }
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("❌ Server Error: " + error.message);
    }
    setLoading(false);
  };

  const renderRateTable = (rateData, onChangeHandler, title, showPlaceholder = true) => (
    <div className="matrix-card">
      <h3>{title}</h3>
      <div className="table-wrapper" style={{ overflowX: "auto" }}>
        <table className="rate-table" style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ backgroundColor: "#f2f2f2" }}>
              <th style={{ padding: "8px", border: "1px solid #ddd" }}>Zone</th>
              {zones.map(z => <th key={z} style={{ padding: "8px", border: "1px solid #ddd" }}>{z}</th>)}
            </tr>
          </thead>
          <tbody>
            {zones.map(from => (
              <tr key={from}>
                <td style={{ padding: "8px", border: "1px solid #ddd", fontWeight: "bold", backgroundColor: "#f9f9f9" }}>{from}</td>
                {zones.map(to => (
                  <td key={to} style={{ padding: "4px", border: "1px solid #ddd" }}>
                    <input
                      type="number"
                      step="0.5"
                      value={rateData[from]?.[to] || ""}
                      onChange={(e) => onChangeHandler(from, to, e.target.value)}
                      placeholder={showPlaceholder && masterRates[from]?.[to] ? String(masterRates[from][to]) : "0"}
                      style={{
                        width: "70px",
                        padding: "6px",
                        textAlign: "center",
                        border: "1px solid #ccc",
                        borderRadius: "4px"
                      }}
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

  const renderPolicyCard = () => (
    <div className="policy-card" style={{ marginTop: "20px", padding: "15px", border: "1px solid #ddd", borderRadius: "8px" }}>
      <div className="policy-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3>Faith Cargo Rate Policy</h3>
        <button onClick={() => { setTempPolicy({...ratePolicy}); setEditingPolicy(true); }} style={{ padding: "5px 10px", cursor: "pointer" }}>✏️ Edit Policy</button>
      </div>
      <div className="policy-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "10px", marginTop: "10px" }}>
        <div className="policy-box"><h4>Surface Rate</h4>{editingPolicy ? <input type="number" step="0.5" value={tempPolicy.surface_rate_per_kg} onChange={(e) => setTempPolicy({...tempPolicy, surface_rate_per_kg: parseFloat(e.target.value)})} /> : <p>₹{ratePolicy.surface_rate_per_kg}/kg</p>}</div>
        <div className="policy-box"><h4>Express Rate</h4>{editingPolicy ? <input type="number" step="0.5" value={tempPolicy.express_rate_per_kg} onChange={(e) => setTempPolicy({...tempPolicy, express_rate_per_kg: parseFloat(e.target.value)})} /> : <p>₹{ratePolicy.express_rate_per_kg}/kg</p>}</div>
        <div className="policy-box"><h4>Air Rate</h4>{editingPolicy ? <input type="number" step="0.5" value={tempPolicy.air_rate_per_kg} onChange={(e) => setTempPolicy({...tempPolicy, air_rate_per_kg: parseFloat(e.target.value)})} /> : <p>₹{ratePolicy.air_rate_per_kg}/kg</p>}</div>
        <div className="policy-box"><h4>Min Freight</h4>{editingPolicy ? <input type="number" value={tempPolicy.minFreight} onChange={(e) => setTempPolicy({...tempPolicy, minFreight: parseFloat(e.target.value)})} /> : <p>₹{ratePolicy.minFreight}</p>}</div>
        <div className="policy-box"><h4>Docket Charge</h4>{editingPolicy ? <input type="number" value={tempPolicy.docketCharge} onChange={(e) => setTempPolicy({...tempPolicy, docketCharge: parseFloat(e.target.value)})} /> : <p>₹{ratePolicy.docketCharge}</p>}</div>
        <div className="policy-box"><h4>Fuel Surcharge</h4>{editingPolicy ? <input type="number" step="0.5" value={tempPolicy.fuelPercent} onChange={(e) => setTempPolicy({...tempPolicy, fuelPercent: parseFloat(e.target.value)})} /> : <p>{ratePolicy.fuelPercent}%</p>}</div>
        <div className="policy-box"><h4>GST</h4>{editingPolicy ? <input type="number" step="0.5" value={tempPolicy.gstPercent} onChange={(e) => setTempPolicy({...tempPolicy, gstPercent: parseFloat(e.target.value)})} /> : <p>{ratePolicy.gstPercent}%</p>}</div>
        <div className="policy-box"><h4>ODA Charge</h4>{editingPolicy ? <input type="number" step="0.5" value={tempPolicy.odaCharge} onChange={(e) => setTempPolicy({...tempPolicy, odaCharge: parseFloat(e.target.value)})} /> : <p>₹{ratePolicy.odaCharge}/kg</p>}</div>
        <div className="policy-box"><h4>COD Charge</h4>{editingPolicy ? <input type="number" value={tempPolicy.codCharge} onChange={(e) => setTempPolicy({...tempPolicy, codCharge: parseFloat(e.target.value)})} /> : <p>₹{ratePolicy.codCharge}</p>}</div>
        <div className="policy-box"><h4>Fragile Charge</h4>{editingPolicy ? <input type="number" value={tempPolicy.fragileCharge} onChange={(e) => setTempPolicy({...tempPolicy, fragileCharge: parseFloat(e.target.value)})} /> : <p>₹{ratePolicy.fragileCharge}</p>}</div>
        <div className="policy-box"><h4>Appointment Charge</h4>{editingPolicy ? <input type="number" value={tempPolicy.appointmentCharge} onChange={(e) => setTempPolicy({...tempPolicy, appointmentCharge: parseFloat(e.target.value)})} /> : <p>₹{ratePolicy.appointmentCharge}</p>}</div>
        <div className="policy-box"><h4>Insurance</h4>{editingPolicy ? <input type="number" step="0.5" value={tempPolicy.insurancePercent} onChange={(e) => setTempPolicy({...tempPolicy, insurancePercent: parseFloat(e.target.value)})} /> : <p>{ratePolicy.insurancePercent}%</p>}</div>
      </div>
      {editingPolicy && (
        <div className="policy-actions" style={{ marginTop: "15px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button onClick={() => setEditingPolicy(false)}>Cancel</button>
          <button onClick={() => { setRatePolicy(tempPolicy); updateGlobalPolicy(); }} style={{ backgroundColor: "#28a745", color: "white", border: "none", padding: "5px 10px", borderRadius: "4px" }}>Save Policy</button>
        </div>
      )}
    </div>
  );

  const renderClientSelector = () => (
    <div className="client-selector" style={{ marginBottom: "20px", padding: "10px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
      <label><strong>Select Client for Custom Rates:</strong></label>
      <select 
        value={selectedClient || ""} 
        onChange={(e) => {
          const clientId = e.target.value;
          setSelectedClient(clientId);
          if (clientId) fetchClientRates(clientId);
        }}
        style={{ padding: "8px", marginLeft: "10px", borderRadius: "4px", minWidth: "250px" }}
      >
        <option value="">-- Master Rates (Default) --</option>
        {clients.map(client => (
          <option key={client.clientId || client.id} value={client.clientId || client.id}>
            {client.companyName || client.username} ({client.clientId || client.id})
          </option>
        ))}
      </select>
      {selectedClient && (
        <button onClick={() => setShowClientRates(true)} style={{ marginLeft: "10px", padding: "8px 16px", cursor: "pointer", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px" }}>✏️ Edit Client Rates</button>
      )}
      <button onClick={() => { fetchClients(); setMessage("🔄 Refreshing client list..."); setTimeout(() => setMessage(""), 2000); }} style={{ marginLeft: "10px", padding: "8px 16px", cursor: "pointer", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "4px" }}>🔄 Refresh Clients</button>
    </div>
  );

  return (
    <div className="rate-page" style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
      <h2 className="title" style={{ textAlign: "center", marginBottom: "20px" }}>Faith Cargo Rate Update</h2>

      <div className="checkbox-select" style={{ display: "flex", gap: "20px", justifyContent: "center", marginBottom: "20px" }}>
        <label style={{ cursor: "pointer", padding: "10px 20px", backgroundColor: selectedOption === "fcpl" ? "#007bff" : "#e9ecef", borderRadius: "5px" }}>
          <input type="checkbox" checked={selectedOption === "fcpl"} onChange={() => setSelectedOption("fcpl")} /> FCPL Rate
        </label>
        <label style={{ cursor: "pointer", padding: "10px 20px", backgroundColor: selectedOption === "b2b" ? "#007bff" : "#e9ecef", borderRadius: "5px" }}>
          <input type="checkbox" checked={selectedOption === "b2b"} onChange={() => setSelectedOption("b2b")} /> BA / B2B Rate
        </label>
      </div>

      {selectedOption === "b2b" && renderClientSelector()}

      {selectedOption === "b2b" && !showClientRates && (
        <>
          {renderRateTable(rates, handleChange, "📊 Master Zone Rate Matrix", true)}
          <div className="buttons" style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "20px" }}>
            <button onClick={updateRate} disabled={loading} style={{ padding: "10px 20px", background: loading ? "#ccc" : "#007bff", color: "white", border: "none", borderRadius: "4px" }}>{loading ? "⏳ Updating..." : "💾 Update Master Rates"}</button>
            <button onClick={() => navigate("/admin-dashboard")} style={{ padding: "10px 20px", background: "#6c757d", color: "white", border: "none", borderRadius: "4px" }}>📋 Dashboard</button>
          </div>
        </>
      )}

      {showClientRates && selectedClient && (
        <div className="modal-overlay" onClick={() => setShowClientRates(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ background: "white", padding: "20px", borderRadius: "8px", maxWidth: "95%", maxHeight: "85%", overflow: "auto" }}>
            <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3>⭐ Custom Rates for: {selectedClient}</h3>
              <button onClick={() => setShowClientRates(false)} style={{ background: "red", color: "white", border: "none", borderRadius: "50%", width: "30px", height: "30px", cursor: "pointer" }}>×</button>
            </div>
            {renderRateTable(clientRates, handleClientRateChange, "🎯 Client Zone Rate Matrix", false)}
            <div className="modal-buttons" style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "15px" }}>
              <button onClick={() => setShowClientRates(false)}>Cancel</button>
              <button onClick={updateClientRates} disabled={loading} style={{ background: loading ? "#ccc" : "#28a745", color: "white", border: "none", padding: "8px 16px", borderRadius: "4px" }}>{loading ? "💾 Saving..." : "✅ Save Client Rates"}</button>
            </div>
          </div>
        </div>
      )}

      {renderPolicyCard()}

      {message && (
        <div className="message" style={{ position: "fixed", bottom: "20px", right: "20px", background: message.includes("✅") ? "#d4edda" : message.includes("⚠️") ? "#fff3cd" : "#f8d7da", color: message.includes("✅") ? "#155724" : message.includes("⚠️") ? "#856404" : "#721c24", padding: "12px 20px", borderRadius: "4px", zIndex: 1001 }}>
          {message}
          <button onClick={() => setMessage("")} style={{ marginLeft: "10px", background: "none", border: "none", cursor: "pointer" }}>×</button>
        </div>
      )}
    </div>
  );
}

export default RateUpdate;