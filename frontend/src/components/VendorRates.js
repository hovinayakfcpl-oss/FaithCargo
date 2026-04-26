import React, { useState, useEffect } from "react";
import "./VendorRateCalculator.css";

// API Base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || "https://faithcargo.onrender.com";

function VendorRateCalculator() {
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [mode, setMode] = useState("Prepaid");
  const [weight, setWeight] = useState("");
  const [invoiceValue, setInvoiceValue] = useState("");
  const [dimensions, setDimensions] = useState([{ qty: 1, length: "", width: "", height: "" }]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [showAllVendors, setShowAllVendors] = useState(true);
  const [originZone, setOriginZone] = useState("");
  const [destZone, setDestZone] = useState("");
  const [volumeCFT, setVolumeCFT] = useState(0);
  const [chargedWeight, setChargedWeight] = useState(0);

  // Fetch all vendors on load
  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/vendors/vendor-rates/`);
      if (response.ok) {
        const data = await response.json();
        setVendors(data);
        setSelectedVendors(data.map(v => v.vendor_name));
      } else {
        // Fallback to default vendors
        setVendors([
          { vendor_name: "DELHIVERY", is_active: true },
          { vendor_name: "GATI", is_active: true },
          { vendor_name: "PD", is_active: true },
          { vendor_name: "RIVIGO", is_active: true },
          { vendor_name: "VXPRESS", is_active: true },
        ]);
        setSelectedVendors(["DELHIVERY", "GATI", "PD", "RIVIGO", "VXPRESS"]);
      }
    } catch (err) {
      console.error("Error fetching vendors:", err);
    }
  };

  const addDimension = () => {
    setDimensions([...dimensions, { qty: 1, length: "", width: "", height: "" }]);
  };

  const removeDimension = (index) => {
    const newDims = dimensions.filter((_, i) => i !== index);
    setDimensions(newDims);
  };

  const updateDimension = (index, field, value) => {
    const newDims = [...dimensions];
    newDims[index][field] = value;
    setDimensions(newDims);
  };

  const calculateVolumetricWeight = () => {
    let totalVolCM = 0;
    let totalVolCFT = 0;
    
    dimensions.forEach((dim) => {
      const qty = Number(dim.qty) || 0;
      const l = Number(dim.length) || 0;
      const w = Number(dim.width) || 0;
      const h = Number(dim.height) || 0;
      
      if (l && w && h && qty) {
        // Volumetric weight in kg (5000 cm³ = 1 kg for air)
        totalVolCM += (l * w * h * qty) / 5000;
        // Volume in CFT (for Delhivery)
        totalVolCFT += (l * w * h * qty) / (30.48 * 30.48 * 30.48);
      }
    });
    
    return { volumetricWeight: totalVolCM, volumeCFT: totalVolCFT };
  };

  const handleCalculate = async () => {
    if (!pickup || !destination || !weight) {
      alert("Please fill mandatory fields: Origin, Destination, and Weight!");
      return;
    }

    setLoading(true);
    
    const { volumetricWeight, volumeCFT } = calculateVolumetricWeight();
    const finalChargeableWeight = Math.max(Number(weight), volumetricWeight);
    setChargedWeight(finalChargeableWeight);
    setVolumeCFT(volumeCFT);

    try {
      const response = await fetch(`${API_BASE_URL}/api/vendors/calculate-all-vendor-rates/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin_pincode: pickup,
          destination_pincode: destination,
          weight: finalChargeableWeight,
          length: dimensions[0]?.length || 0,
          width: dimensions[0]?.width || 0,
          height: dimensions[0]?.height || 0,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setOriginZone(data.from_zone || "N/A");
        setDestZone(data.to_zone || "N/A");
        
        // Filter vendors based on selection
        let vendorResults = data.vendor_rates || [];
        if (!showAllVendors) {
          vendorResults = vendorResults.filter(v => selectedVendors.includes(v.vendor_name));
        }
        
        setResults(vendorResults);
      } else {
        // Fallback to local calculation
        calculateLocalRates(finalChargeableWeight, volumeCFT);
      }
    } catch (err) {
      console.error("Error calculating rates:", err);
      calculateLocalRates(finalChargeableWeight, volumeCFT);
    } finally {
      setLoading(false);
    }
  };

  const calculateLocalRates = (chargeableWeight, volumeCFT) => {
    // Local calculation logic as fallback
    const localResults = [
      {
        vendor_name: "DELHIVERY",
        rate_per_kg: 28,
        total_freight: chargeableWeight * 28 + 100,
        cft_type: volumeCFT <= 6 ? "6CFT" : volumeCFT <= 10 ? "10CFT" : "Standard",
        breakdown: {
          base_freight: chargeableWeight * 28,
          docket_charge: 100,
          fsc_amount: (chargeableWeight * 28) * 0.1,
          gst_amount: (chargeableWeight * 28) * 0.18,
          total: (chargeableWeight * 28) * 1.28 + 100
        }
      },
      {
        vendor_name: "GATI",
        rate_per_kg: 25,
        total_freight: chargeableWeight * 25 + 100,
        breakdown: {
          base_freight: chargeableWeight * 25,
          docket_charge: 100,
          fsc_amount: (chargeableWeight * 25) * 0.1,
          gst_amount: (chargeableWeight * 25) * 0.18,
          total: (chargeableWeight * 25) * 1.28 + 100
        }
      },
      {
        vendor_name: "RIVIGO",
        rate_per_kg: 22,
        total_freight: chargeableWeight * 22 + 100,
        breakdown: {
          base_freight: chargeableWeight * 22,
          docket_charge: 100,
          fsc_amount: (chargeableWeight * 22) * 0.1,
          gst_amount: (chargeableWeight * 22) * 0.18,
          total: (chargeableWeight * 22) * 1.28 + 100
        }
      },
      {
        vendor_name: "VXPRESS",
        rate_per_kg: 20,
        total_freight: chargeableWeight * 20 + 100,
        breakdown: {
          base_freight: chargeableWeight * 20,
          docket_charge: 100,
          fsc_amount: (chargeableWeight * 20) * 0.1,
          gst_amount: (chargeableWeight * 20) * 0.18,
          total: (chargeableWeight * 20) * 1.28 + 100
        }
      },
      {
        vendor_name: "PD",
        rate_per_kg: 18,
        total_freight: chargeableWeight * 18 + 100,
        breakdown: {
          base_freight: chargeableWeight * 18,
          docket_charge: 100,
          fsc_amount: (chargeableWeight * 18) * 0.1,
          gst_amount: (chargeableWeight * 18) * 0.18,
          total: (chargeableWeight * 18) * 1.28 + 100
        }
      }
    ];
    
    localResults.sort((a, b) => a.total_freight - b.total_freight);
    setResults(localResults);
    setOriginZone("N1");
    setDestZone("S1");
  };

  const handleReset = () => {
    setPickup("");
    setDestination("");
    setMode("Prepaid");
    setWeight("");
    setInvoiceValue("");
    setDimensions([{ qty: 1, length: "", width: "", height: "" }]);
    setResults([]);
    setChargedWeight(0);
    setVolumeCFT(0);
  };

  const toggleVendorSelection = (vendorName) => {
    if (selectedVendors.includes(vendorName)) {
      setSelectedVendors(selectedVendors.filter(v => v !== vendorName));
    } else {
      setSelectedVendors([...selectedVendors, vendorName]);
    }
  };

  const getBestVendor = () => {
    if (results.length === 0) return null;
    return results.reduce((min, curr) => 
      curr.total_freight < min.total_freight ? curr : min, results[0]
    );
  };

  const bestVendor = getBestVendor();

  return (
    <div className="vendor-rate-page">
      <div className="page-header">
        <h1>🚚 Vendor Rate Calculator</h1>
        <p>Compare rates across multiple logistics vendors in real-time</p>
      </div>

      <div className="calculator-wrapper">
        {/* Input Form */}
        <div className="input-card">
          <h3>📋 Shipment Details</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>Origin Pincode *</label>
              <input 
                type="text" 
                placeholder="e.g., 110001" 
                value={pickup} 
                onChange={(e) => setPickup(e.target.value)} 
              />
            </div>
            <div className="form-group">
              <label>Destination Pincode *</label>
              <input 
                type="text" 
                placeholder="e.g., 400001" 
                value={destination} 
                onChange={(e) => setDestination(e.target.value)} 
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Payment Mode</label>
              <select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="Prepaid">Prepaid</option>
                <option value="COD">COD</option>
                <option value="ToPay">ToPay</option>
              </select>
            </div>
            <div className="form-group">
              <label>Actual Weight (kg) *</label>
              <input 
                type="number" 
                placeholder="0.00" 
                value={weight} 
                onChange={(e) => setWeight(e.target.value)} 
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Invoice Value (₹)</label>
              <input 
                type="number" 
                placeholder="0" 
                value={invoiceValue} 
                onChange={(e) => setInvoiceValue(e.target.value)} 
              />
            </div>
          </div>

          <div className="dimensions-section">
            <label>Package Dimensions (cm)</label>
            {dimensions.map((dim, idx) => (
              <div key={idx} className="dimension-row">
                <input 
                  type="number" 
                  placeholder="Qty" 
                  value={dim.qty} 
                  onChange={(e) => updateDimension(idx, "qty", e.target.value)} 
                />
                <input 
                  type="number" 
                  placeholder="Length" 
                  value={dim.length} 
                  onChange={(e) => updateDimension(idx, "length", e.target.value)} 
                />
                <input 
                  type="number" 
                  placeholder="Width" 
                  value={dim.width} 
                  onChange={(e) => updateDimension(idx, "width", e.target.value)} 
                />
                <input 
                  type="number" 
                  placeholder="Height" 
                  value={dim.height} 
                  onChange={(e) => updateDimension(idx, "height", e.target.value)} 
                />
                {dimensions.length > 1 && (
                  <button className="remove-btn" onClick={() => removeDimension(idx)}>✕</button>
                )}
              </div>
            ))}
            <button className="add-dimension-btn" onClick={addDimension}>
              + Add Package
            </button>
          </div>

          {/* Vendor Filter */}
          <div className="vendor-filter">
            <label>
              <input 
                type="checkbox" 
                checked={showAllVendors} 
                onChange={(e) => setShowAllVendors(e.target.checked)} 
              />
              Show All Vendors
            </label>
            {!showAllVendors && (
              <div className="vendor-selector">
                {vendors.map(vendor => (
                  <label key={vendor.vendor_name}>
                    <input 
                      type="checkbox" 
                      checked={selectedVendors.includes(vendor.vendor_name)} 
                      onChange={() => toggleVendorSelection(vendor.vendor_name)} 
                    />
                    {vendor.vendor_name}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="button-group">
            <button className="calculate-btn" onClick={handleCalculate} disabled={loading}>
              {loading ? "Calculating..." : "Calculate Rates"}
            </button>
            <button className="reset-btn" onClick={handleReset}>Reset</button>
          </div>
        </div>

        {/* Results Section */}
        <div className="results-card">
          <div className="results-header">
            <h3>📊 Rate Comparison</h3>
            {chargedWeight > 0 && (
              <div className="shipment-info">
                <span>Charged Weight: <strong>{chargedWeight.toFixed(2)} kg</strong></span>
                {volumeCFT > 0 && <span>Volume: <strong>{volumeCFT.toFixed(2)} CFT</strong></span>}
                <span>Zone: <strong>{originZone} → {destZone}</strong></span>
              </div>
            )}
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Fetching vendor rates...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="empty-state">
              <p>📦 Enter shipment details and click "Calculate Rates"</p>
            </div>
          ) : (
            <>
              {/* Best Vendor Highlight */}
              {bestVendor && (
                <div className="best-vendor-card">
                  <div className="best-badge">⭐ BEST RATE</div>
                  <div className="best-content">
                    <div className="best-vendor-name">{bestVendor.vendor_name}</div>
                    <div className="best-price">₹{bestVendor.total_freight?.toFixed(2)}</div>
                    <div className="best-rate">₹{bestVendor.rate_per_kg?.toFixed(2)}/kg</div>
                  </div>
                </div>
              )}

              {/* All Vendors Results */}
              <div className="results-grid">
                {results.map((vendor, idx) => (
                  <div key={idx} className={`vendor-result-card ${bestVendor?.vendor_name === vendor.vendor_name ? 'best' : ''}`}>
                    <div className="vendor-result-header">
                      <h4>{vendor.vendor_name}</h4>
                      {vendor.cft_type && <span className="cft-badge">{vendor.cft_type}</span>}
                    </div>
                    <div className="vendor-total">
                      ₹{vendor.total_freight?.toFixed(2)}
                      <span>Total Freight</span>
                    </div>
                    <div className="vendor-details">
                      <div className="detail-row">
                        <span>Rate/kg:</span>
                        <strong>₹{vendor.rate_per_kg?.toFixed(2)}</strong>
                      </div>
                      <div className="detail-row">
                        <span>Base Freight:</span>
                        <strong>₹{vendor.breakdown?.base_freight?.toFixed(2) || 0}</strong>
                      </div>
                      <div className="detail-row">
                        <span>Docket Charge:</span>
                        <strong>₹{vendor.breakdown?.docket_charge?.toFixed(2) || 0}</strong>
                      </div>
                      <div className="detail-row">
                        <span>Fuel Surcharge:</span>
                        <strong>₹{vendor.breakdown?.fsc_amount?.toFixed(2) || 0}</strong>
                      </div>
                      <div className="detail-row">
                        <span>GST (18%):</span>
                        <strong>₹{vendor.breakdown?.gst_amount?.toFixed(2) || 0}</strong>
                      </div>
                      {vendor.breakdown?.mode_charge > 0 && (
                        <div className="detail-row">
                          <span>Mode Charge:</span>
                          <strong>₹{vendor.breakdown.mode_charge.toFixed(2)}</strong>
                        </div>
                      )}
                      <div className="detail-row oda-row">
                        <span>ODA:</span>
                        <strong className={vendor.oda === "Yes" ? "oda-yes" : "oda-no"}>
                          {vendor.oda || "No"}
                        </strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="disclaimer">
                <small>* Rates are indicative and subject to change. Final rates may vary based on actual weight and volume.</small>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default VendorRateCalculator;