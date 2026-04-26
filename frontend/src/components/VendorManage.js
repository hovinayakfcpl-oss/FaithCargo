import React, { useState, useEffect } from "react";
import "./VendorManage.css";

// Zones for rate matrix
const ZONES = [
  "N1", "N2", "N3", "C1", "W1", "W2", "S1", "S2", "E1",
  "NE1", "NE2", "NE3"
];

// API Base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || "https://faithcargo.onrender.com";

function VendorManage() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    vendor_name: "",
    rates: {},
    delhivery_6cft: {},
    delhivery_10cft: {},
    charges: {},
    is_active: true
  });
  const [activeTab, setActiveTab] = useState("standard");
  const [saveLoading, setSaveLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });

  // Fetch all vendors on load
  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/vendors/vendor-rates/`);
      if (response.ok) {
        const data = await response.json();
        setVendors(data);
        updateStats(data);
      } else {
        loadLocalData();
      }
    } catch (err) {
      console.error("Error fetching vendors:", err);
      loadLocalData();
    } finally {
      setLoading(false);
    }
  };

  const updateStats = (vendorData) => {
    const total = vendorData.length;
    const active = vendorData.filter(v => v.is_active !== false).length;
    const inactive = total - active;
    setStats({ total, active, inactive });
  };

  const loadLocalData = () => {
    const defaultVendors = [
      { id: 1, vendor_name: "DELHIVERY", rates: {}, delhivery_6cft: {}, delhivery_10cft: {}, charges: { docket_charge: 75, fsc: "10%", gst: "18%", min_freight: 400, fov: 100, min_weight: 20, cft_conversion: 6 }, is_active: true },
      { id: 2, vendor_name: "GATI", rates: {}, charges: { docket_charge: 100, fsc: "15%", gst: "18%", min_freight: 350, fov: 100, min_weight: 20 }, is_active: true },
      { id: 3, vendor_name: "PD", rates: {}, delhivery_6cft: {}, delhivery_10cft: {}, charges: { docket_charge: 75, fsc: "10%", gst: "18%", min_freight: 400, fov: 100 }, is_active: true },
      { id: 4, vendor_name: "RIVIGO", rates: {}, delhivery_6cft: {}, delhivery_10cft: {}, charges: { docket_charge: 100, fsc: "10%", gst: "18%", min_freight: 350, fov: 100 }, is_active: true },
      { id: 5, vendor_name: "VXPRESS", rates: {}, charges: { docket_charge: 50, fsc: "8%", gst: "18%", min_freight: 450, fov: 50 }, is_active: true },
    ];
    setVendors(defaultVendors);
    updateStats(defaultVendors);
  };

  const handleEditVendor = (vendor) => {
    setSelectedVendor(vendor);
    setFormData({
      vendor_name: vendor.vendor_name,
      rates: vendor.rates || {},
      delhivery_6cft: vendor.delhivery_6cft || {},
      delhivery_10cft: vendor.delhivery_10cft || {},
      charges: vendor.charges || {},
      is_active: vendor.is_active !== false
    });
    setEditMode(true);
    setShowModal(true);
    setActiveTab("standard");
  };

  const handleAddVendor = () => {
    setSelectedVendor(null);
    setFormData({
      vendor_name: "",
      rates: {},
      delhivery_6cft: {},
      delhivery_10cft: {},
      charges: {
        docket_charge: 100,
        fsc: "10%",
        gst: "18%",
        min_freight: 350,
        fov: 75,
        min_weight: 20,
        cft_conversion: 6
      },
      is_active: true
    });
    setEditMode(false);
    setShowModal(true);
    setActiveTab("standard");
  };

  const handleRateChange = (rateType, fromZone, toZone, value) => {
    setFormData(prev => ({
      ...prev,
      [rateType]: {
        ...prev[rateType],
        [fromZone]: {
          ...prev[rateType][fromZone],
          [toZone]: parseFloat(value) || 0
        }
      }
    }));
  };

  const handleChargeChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      charges: {
        ...prev.charges,
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    setSaveLoading(true);
    try {
      const url = editMode 
        ? `${API_BASE_URL}/api/vendors/vendor-rates/${formData.vendor_name}/`
        : `${API_BASE_URL}/api/vendors/vendor-rates/`;
      
      const method = editMode ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        alert(`✅ ${formData.vendor_name} rates ${editMode ? 'updated' : 'created'} successfully!`);
        setShowModal(false);
        fetchVendors();
      } else {
        const errorData = await response.json();
        alert("❌ Error: " + (errorData.error || "Failed to save"));
      }
    } catch (err) {
      alert("❌ Network error: " + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteVendor = async (vendor) => {
    if (window.confirm(`⚠️ Are you sure you want to delete ${vendor.vendor_name}? This action cannot be undone.`)) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/vendors/vendor-rates/${vendor.vendor_name}/`, {
          method: "DELETE"
        });
        
        if (response.ok) {
          alert(`✅ ${vendor.vendor_name} deleted successfully!`);
          fetchVendors();
        } else {
          alert("❌ Failed to delete vendor");
        }
      } catch (err) {
        alert("❌ Network error: " + err.message);
      }
    }
  };

  const getRateValue = (rates, fromZone, toZone) => {
    return rates?.[fromZone]?.[toZone] || "";
  };

  const filteredVendors = vendors.filter(vendor => 
    vendor.vendor_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderRateMatrix = (rateType, title) => {
    const rates = formData[rateType] || {};
    
    return (
      <div className="rate-matrix-container">
        <div className="matrix-header">
          <h3>{title}</h3>
          <span className="matrix-note">* All rates are in ₹ per kg</span>
        </div>
        <div className="table-wrapper">
          <table className="rate-matrix-table">
            <thead>
              <tr>
                <th className="from-zone-cell">From \\ To</th>
                {ZONES.map(zone => <th key={zone}>{zone}</th>)}
              </tr>
            </thead>
            <tbody>
              {ZONES.map(fromZone => (
                <tr key={fromZone}>
                  <td className="zone-cell from-zone">{fromZone}</td>
                  {ZONES.map(toZone => (
                    <td key={toZone}>
                      <input
                        type="number"
                        step="0.01"
                        className="rate-input"
                        value={getRateValue(rates, fromZone, toZone)}
                        onChange={(e) => handleRateChange(rateType, fromZone, toZone, e.target.value)}
                        placeholder="0.00"
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
  };

  const renderChargesSection = () => {
    const charges = formData.charges || {};
    const isDelhivery = formData.vendor_name === "DELHIVERY";
    const isRivigo = formData.vendor_name === "RIVIGO";
    const isVxpress = formData.vendor_name === "VXPRESS";
    
    return (
      <div className="charges-section">
        <h3>📋 Additional Charges & Settings</h3>
        <div className="charges-grid">
          <div className="charge-card">
            <div className="charge-icon">📄</div>
            <div className="charge-field">
              <label>Docket Charge (₹)</label>
              <input
                type="number"
                className="charge-input"
                value={charges.docket_charge || 0}
                onChange={(e) => handleChargeChange("docket_charge", parseFloat(e.target.value))}
              />
            </div>
          </div>
          
          <div className="charge-card">
            <div className="charge-icon">⛽</div>
            <div className="charge-field">
              <label>Fuel Surcharge (%)</label>
              <input
                type="text"
                className="charge-input"
                value={charges.fsc || "10%"}
                onChange={(e) => handleChargeChange("fsc", e.target.value)}
              />
            </div>
          </div>
          
          <div className="charge-card">
            <div className="charge-icon">💰</div>
            <div className="charge-field">
              <label>GST (%)</label>
              <input
                type="text"
                className="charge-input"
                value={charges.gst || "18%"}
                onChange={(e) => handleChargeChange("gst", e.target.value)}
              />
            </div>
          </div>
          
          <div className="charge-card">
            <div className="charge-icon">📦</div>
            <div className="charge-field">
              <label>Minimum Freight (₹)</label>
              <input
                type="number"
                className="charge-input"
                value={charges.min_freight || 350}
                onChange={(e) => handleChargeChange("min_freight", parseFloat(e.target.value))}
              />
            </div>
          </div>
          
          <div className="charge-card">
            <div className="charge-icon">⚖️</div>
            <div className="charge-field">
              <label>Minimum Weight (kg)</label>
              <input
                type="number"
                className="charge-input"
                value={charges.min_weight || 20}
                onChange={(e) => handleChargeChange("min_weight", parseFloat(e.target.value))}
              />
            </div>
          </div>
          
          <div className="charge-card">
            <div className="charge-icon">🛡️</div>
            <div className="charge-field">
              <label>FOV/Insurance (₹)</label>
              <input
                type="number"
                className="charge-input"
                value={charges.fov || 75}
                onChange={(e) => handleChargeChange("fov", parseFloat(e.target.value))}
              />
            </div>
          </div>
          
          <div className="charge-card">
            <div className="charge-icon">🚚</div>
            <div className="charge-field">
              <label>ODA Charges (₹/kg)</label>
              <input
                type="number"
                className="charge-input"
                value={charges.oda || 0}
                onChange={(e) => handleChargeChange("oda", parseFloat(e.target.value))}
              />
            </div>
          </div>
          
          <div className="charge-card">
            <div className="charge-icon">📐</div>
            <div className="charge-field">
              <label>CFT Conversion (kg)</label>
              <input
                type="number"
                className="charge-input"
                value={charges.cft_conversion || 6}
                onChange={(e) => handleChargeChange("cft_conversion", parseFloat(e.target.value))}
              />
            </div>
          </div>
        </div>
        
        {(isDelhivery || isRivigo) && (
          <div className="info-note">
            <span className="info-icon">ℹ️</span>
            <span>This vendor supports 6 CFT and 10 CFT rate slabs. Switch tabs above to edit them.</span>
          </div>
        )}
        
        {isVxpress && (
          <div className="info-note special">
            <span className="info-icon">⭐</span>
            <span>V-Xpress has special contract rates. Please verify with the latest contract.</span>
          </div>
        )}
      </div>
    );
  };

  const renderVendorCard = (vendor) => {
    const isDelhivery = vendor.vendor_name === "DELHIVERY";
    const has6CFT = vendor.delhivery_6cft && Object.keys(vendor.delhivery_6cft).length > 0;
    const has10CFT = vendor.delhivery_10cft && Object.keys(vendor.delhivery_10cft).length > 0;
    
    return (
      <div className={`vendor-card ${!vendor.is_active ? 'inactive-card' : ''}`} key={vendor.id}>
        <div className="vendor-card-header">
          <div className="vendor-name-section">
            <div className="vendor-icon">
              {vendor.vendor_name.charAt(0)}
            </div>
            <h3>{vendor.vendor_name}</h3>
          </div>
          <div className="vendor-card-actions">
            <button className="edit-btn" onClick={() => handleEditVendor(vendor)} title="Edit Vendor">
              ✏️
            </button>
            <button className="delete-btn" onClick={() => handleDeleteVendor(vendor)} title="Delete Vendor">
              🗑️
            </button>
          </div>
        </div>
        
        <div className="vendor-card-body">
          <div className="vendor-stats">
            <div className="stat">
              <span>Docket</span>
              <strong>₹{vendor.charges?.docket_charge || 100}</strong>
            </div>
            <div className="stat">
              <span>FSC</span>
              <strong>{vendor.charges?.fsc || "10%"}</strong>
            </div>
            <div className="stat">
              <span>GST</span>
              <strong>{vendor.charges?.gst || "18%"}</strong>
            </div>
            <div className="stat">
              <span>Min Freight</span>
              <strong>₹{vendor.charges?.min_freight || 350}</strong>
            </div>
            <div className="stat">
              <span>Min Weight</span>
              <strong>{vendor.charges?.min_weight || 20} kg</strong>
            </div>
          </div>
          
          {(isDelhivery || has6CFT || has10CFT) && (
            <div className="vendor-badges">
              {isDelhivery && <span className="badge delhivery-badge">🚚 Delhivery Partner</span>}
              {has6CFT && <span className="badge cft-badge">📦 6 CFT Support</span>}
              {has10CFT && <span className="badge cft-badge">📦 10 CFT Support</span>}
            </div>
          )}
          
          <div className="vendor-status">
            <span className={`status-badge ${vendor.is_active ? "active" : "inactive"}`}>
              {vendor.is_active ? "● Active" : "○ Inactive"}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderModal = () => {
    if (!showModal) return null;
    
    const isDelhivery = formData.vendor_name === "DELHIVERY";
    const hasCFT = isDelhivery || formData.vendor_name === "RIVIGO" || formData.vendor_name === "PD";
    
    return (
      <div className="modal-overlay" onClick={() => setShowModal(false)}>
        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>{editMode ? `✏️ Edit ${formData.vendor_name} Rates` : "➕ Add New Vendor"}</h2>
            <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
          </div>
          
          <div className="modal-body">
            {!editMode && (
              <div className="form-group">
                <label>Vendor Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.vendor_name}
                  onChange={(e) => setFormData({...formData, vendor_name: e.target.value.toUpperCase()})}
                  placeholder="Enter vendor name (e.g., DELHIVERY)"
                />
              </div>
            )}
            
            <div className="tabs">
              <button className={`tab ${activeTab === "standard" ? "active" : ""}`} onClick={() => setActiveTab("standard")}>
                📊 Standard Rates
              </button>
              {hasCFT && (
                <>
                  <button className={`tab ${activeTab === "6cft" ? "active" : ""}`} onClick={() => setActiveTab("6cft")}>
                    📦 6 CFT Rates
                  </button>
                  <button className={`tab ${activeTab === "10cft" ? "active" : ""}`} onClick={() => setActiveTab("10cft")}>
                    📦 10 CFT Rates
                  </button>
                </>
              )}
              <button className={`tab ${activeTab === "charges" ? "active" : ""}`} onClick={() => setActiveTab("charges")}>
                ⚙️ Charges
              </button>
            </div>
            
            <div className="tab-content">
              {activeTab === "standard" && renderRateMatrix("rates", "Zone to Zone Rates (₹/kg)")}
              {activeTab === "6cft" && renderRateMatrix("delhivery_6cft", "6 CFT Rates (₹/kg)")}
              {activeTab === "10cft" && renderRateMatrix("delhivery_10cft", "10 CFT Rates (₹/kg)")}
              {activeTab === "charges" && renderChargesSection()}
            </div>
          </div>
          
          <div className="modal-footer">
            <button className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="save-btn" onClick={handleSave} disabled={saveLoading}>
              {saveLoading ? "💾 Saving..." : "💾 Save Changes"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="vendor-manage-page">
      <div className="page-header">
        <div className="header-content">
          <h1>🚚 Vendor Rate Management</h1>
          <p>Manage zone-to-zone rates, CFT rates, and charges for all logistics vendors</p>
        </div>
        <button className="add-vendor-btn" onClick={handleAddVendor}>
          + Add New Vendor
        </button>
      </div>
      
      <div className="stats-container">
        <div className="stat-card total">
          <div className="stat-icon">📦</div>
          <div className="stat-info">
            <h3>{stats.total}</h3>
            <p>Total Vendors</p>
          </div>
        </div>
        <div className="stat-card active">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <h3>{stats.active}</h3>
            <p>Active Vendors</p>
          </div>
        </div>
        <div className="stat-card inactive">
          <div className="stat-icon">⏸️</div>
          <div className="stat-info">
            <h3>{stats.inactive}</h3>
            <p>Inactive Vendors</p>
          </div>
        </div>
      </div>
      
      <div className="filters-bar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="stats-info">
          <span>Showing {filteredVendors.length} of {vendors.length} vendors</span>
        </div>
        <button className="refresh-btn" onClick={fetchVendors} title="Refresh">
          🔄
        </button>
      </div>
      
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading vendor rates...</p>
        </div>
      ) : error ? (
        <div className="error-state">
          <p>⚠️ {error}</p>
          <button onClick={fetchVendors}>Retry</button>
        </div>
      ) : (
        <div className="vendors-grid">
          {filteredVendors.length === 0 ? (
            <div className="no-results">
              <p>No vendors found matching "{searchTerm}"</p>
            </div>
          ) : (
            filteredVendors.map(vendor => renderVendorCard(vendor))
          )}
        </div>
      )}
      
      {renderModal()}
    </div>
  );
}

export default VendorManage;