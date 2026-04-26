import React, { useState, useEffect } from "react";
import "./VendorRateCalculator.css";

// API Base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || "https://faithcargo.onrender.com";

// Zones list
const ZONES = ["N1", "N2", "N3", "C1", "W1", "W2", "S1", "S2", "E1", "NE1", "NE2", "NE3"];

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
  const [calculationDetails, setCalculationDetails] = useState(null);

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
          { vendor_name: "DELHIVERY", is_active: true, charges: { docket_charge: 75, fsc: "10%", gst: "18%", min_freight: 400, min_weight: 20 } },
          { vendor_name: "GATI", is_active: true, charges: { docket_charge: 100, fsc: "15%", gst: "18%", min_freight: 350, min_weight: 20 } },
          { vendor_name: "PD", is_active: true, charges: { docket_charge: 75, fsc: "10%", gst: "18%", min_freight: 400, min_weight: 20 } },
          { vendor_name: "RIVIGO", is_active: true, charges: { docket_charge: 100, fsc: "10%", gst: "18%", min_freight: 350, min_weight: 20 } },
          { vendor_name: "VXPRESS", is_active: true, charges: { docket_charge: 50, fsc: "8%", gst: "18%", min_freight: 450, min_weight: 25 } },
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
        totalVolCM += (l * w * h * qty) / 5000;
        totalVolCFT += (l * w * h * qty) / (30.48 * 30.48 * 30.48);
      }
    });
    
    return { volumetricWeight: totalVolCM, volumeCFT: totalVolCFT };
  };

  const getZoneFromPincode = (pincode) => {
    const firstDigit = pincode?.charAt(0);
    const zoneMap = {
      '1': 'N1', '2': 'N2', '3': 'N3',
      '4': 'C1', '5': 'W1', '6': 'W2',
      '7': 'S1', '8': 'S2', '9': 'E1',
      '0': 'NE1'
    };
    return zoneMap[firstDigit] || 'N1';
  };

  const calculateRateForVendor = (vendor, fromZone, toZone, weight, volumeCFT, invoiceValue, mode) => {
    const vendorName = vendor.vendor_name;
    const charges = vendor.charges || {};
    let ratePerKg = 0;
    let cftType = null;
    let rates = vendor.rates || {};
    
    // For Delhivery, check CFT rates
    if (vendorName === "DELHIVERY") {
      if (volumeCFT <= 6 && vendor.delhivery_6cft) {
        rates = vendor.delhivery_6cft;
        cftType = "6 CFT";
      } else if (volumeCFT <= 10 && vendor.delhivery_10cft) {
        rates = vendor.delhivery_10cft;
        cftType = "10 CFT";
      } else {
        rates = vendor.rates || {};
        cftType = "Standard";
      }
    }
    
    // Get rate from matrix
    ratePerKg = rates[fromZone]?.[toZone] || 0;
    
    // Fallback if rate not found
    if (ratePerKg === 0) {
      // Use default rates based on vendor
      const defaultRates = {
        "DELHIVERY": 28, "GATI": 25, "PD": 22, "RIVIGO": 24, "VXPRESS": 20
      };
      ratePerKg = defaultRates[vendorName] || 22;
    }
    
    // Calculate charges
    const docketCharge = parseFloat(charges.docket_charge) || 100;
    const fscPercent = parseFloat(String(charges.fsc || "10%").replace("%", "")) || 10;
    const gstPercent = parseFloat(String(charges.gst || "18%").replace("%", "")) || 18;
    const minFreight = parseFloat(charges.min_freight) || 350;
    const minWeight = parseFloat(charges.min_weight) || 20;
    
    // Apply minimum weight
    const effectiveWeight = Math.max(weight, minWeight);
    
    // Calculate base freight
    const baseFreight = effectiveWeight * ratePerKg;
    
    // Fuel surcharge
    const fscAmount = baseFreight * (fscPercent / 100);
    
    // GST
    const gstAmount = (baseFreight + fscAmount + docketCharge) * (gstPercent / 100);
    
    // Mode charges (COD/ToPay)
    let modeCharge = 0;
    if (mode === "COD") modeCharge = 125;
    if (mode === "ToPay") modeCharge = 200;
    
    // FOV/Insurance (0.1% of invoice value or min 100)
    let fovCharge = 0;
    if (invoiceValue && invoiceValue > 0) {
      fovCharge = Math.max(invoiceValue * 0.001, 100);
    }
    
    // Total freight
    let totalFreight = baseFreight + fscAmount + docketCharge + gstAmount + modeCharge + fovCharge;
    totalFreight = Math.max(totalFreight, minFreight);
    
    return {
      vendor_name: vendorName,
      rate_per_kg: ratePerKg,
      cft_type: cftType,
      effective_weight: effectiveWeight,
      base_freight: baseFreight,
      docket_charge: docketCharge,
      fsc_percent: fscPercent,
      fsc_amount: fscAmount,
      gst_percent: gstPercent,
      gst_amount: gstAmount,
      mode_charge: modeCharge,
      fov_charge: fovCharge,
      min_freight: minFreight,
      total_freight: totalFreight,
      breakdown: {
        base_freight: baseFreight,
        docket_charge: docketCharge,
        fsc_percent: fscPercent,
        fsc_amount: fscAmount,
        gst_percent: gstPercent,
        gst_amount: gstAmount,
        mode_charge: modeCharge,
        fov_charge: fovCharge,
        min_freight: minFreight
      }
    };
  };

  const handleCalculate = async () => {
    if (!pickup || !destination || !weight) {
      alert("Please fill mandatory fields: Origin, Destination, and Weight!");
      return;
    }

    setLoading(true);
    
    const { volumetricWeight, volumeCFT: calculatedVolumeCFT } = calculateVolumetricWeight();
    const finalChargeableWeight = Math.max(Number(weight), volumetricWeight);
    setChargedWeight(finalChargeableWeight);
    setVolumeCFT(calculatedVolumeCFT);
    
    // Get zones
    const fromZone = getZoneFromPincode(pickup);
    const toZone = getZoneFromPincode(destination);
    setOriginZone(fromZone);
    setDestZone(toZone);
    
    // Filter active vendors
    const activeVendors = vendors.filter(v => 
      (showAllVendors || selectedVendors.includes(v.vendor_name)) && v.is_active !== false
    );
    
    // Calculate rates for each vendor
    const calculatedResults = activeVendors.map(vendor => 
      calculateRateForVendor(vendor, fromZone, toZone, finalChargeableWeight, calculatedVolumeCFT, parseFloat(invoiceValue) || 0, mode)
    );
    
    // Sort by total freight
    calculatedResults.sort((a, b) => a.total_freight - b.total_freight);
    
    setResults(calculatedResults);
    setCalculationDetails({
      from_zone: fromZone,
      to_zone: toZone,
      volumetric_weight: volumetricWeight,
      charged_weight: finalChargeableWeight,
      volume_cft: calculatedVolumeCFT
    });
    
    setLoading(false);
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
    setCalculationDetails(null);
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
    return results[0];
  };

  const bestVendor = getBestVendor();

  return (
    <div className="vendor-rate-page">
      <div className="page-header-calc">
        <h1>🚚 Vendor Rate Calculator</h1>
        <p>Compare rates across multiple logistics vendors in real-time</p>
      </div>

      <div className="big-card">
        <div className="calculator-container">
          {/* Input Form */}
          <div className="form-card">
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
                  step="0.1"
                  placeholder="0.00" 
                  value={weight} 
                  onChange={(e) => setWeight(e.target.value)} 
                />
              </div>
            </div>

            <div className="form-group">
              <label>Invoice Value (₹)</label>
              <input 
                type="number" 
                placeholder="0" 
                value={invoiceValue} 
                onChange={(e) => setInvoiceValue(e.target.value)} 
              />
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
                    placeholder="L" 
                    value={dim.length} 
                    onChange={(e) => updateDimension(idx, "length", e.target.value)} 
                  />
                  <input 
                    type="number" 
                    placeholder="W" 
                    value={dim.width} 
                    onChange={(e) => updateDimension(idx, "width", e.target.value)} 
                  />
                  <input 
                    type="number" 
                    placeholder="H" 
                    value={dim.height} 
                    onChange={(e) => updateDimension(idx, "height", e.target.value)} 
                  />
                  {dimensions.length > 1 && (
                    <button className="remove-dim-btn" onClick={() => removeDimension(idx)}>✕</button>
                  )}
                </div>
              ))}
              <button className="add-dim-btn" onClick={addDimension}>
                + Add Package
              </button>
            </div>

            {/* Vendor Filter */}
            <div className="vendor-filter">
              <label className="filter-label">
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

            <div className="btn-group">
              <button className="calc-btn" onClick={handleCalculate} disabled={loading}>
                {loading ? "⏳ Calculating..." : "🔍 Calculate Rates"}
              </button>
              <button className="reset-btn" onClick={handleReset}>🔄 Reset</button>
            </div>
          </div>

          {/* Results Section */}
          <div className="main-result-card">
            <div className="results-header">
              <h3>📊 Rate Comparison</h3>
              {calculationDetails && (
                <div className="calc-info">
                  <span>Zone: <strong>{calculationDetails.from_zone} → {calculationDetails.to_zone}</strong></span>
                  <span>Charged Wt: <strong>{calculationDetails.charged_weight?.toFixed(2)} kg</strong></span>
                  {calculationDetails.volume_cft > 0 && (
                    <span>Volume: <strong>{calculationDetails.volume_cft?.toFixed(2)} CFT</strong></span>
                  )}
                </div>
              )}
            </div>

            {loading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
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
                  <div className="best-vendor-highlight">
                    <div className="best-badge">🏆 BEST RATE</div>
                    <div className="best-content">
                      <div className="best-vendor">{bestVendor.vendor_name}</div>
                      <div className="best-price">₹{bestVendor.total_freight?.toFixed(2)}</div>
                      <div className="best-rate">₹{bestVendor.rate_per_kg?.toFixed(2)}/kg</div>
                    </div>
                  </div>
                )}

                {/* All Vendors Results */}
                <div className="results-list">
                  {results.map((vendor, idx) => (
                    <div key={idx} className={`vendor-result ${bestVendor?.vendor_name === vendor.vendor_name ? 'is-best' : ''}`}>
                      <div className="vendor-result-header">
                        <div className="vendor-name">
                          {vendor.vendor_name}
                          {vendor.cft_type && <span className="cft-badge">{vendor.cft_type}</span>}
                        </div>
                        <div className="vendor-total">₹{vendor.total_freight?.toFixed(2)}</div>
                      </div>
                      <div className="vendor-breakdown">
                        <div className="breakdown-row">
                          <span>Rate/kg:</span>
                          <strong>₹{vendor.rate_per_kg?.toFixed(2)}</strong>
                        </div>
                        <div className="breakdown-row">
                          <span>Base Freight:</span>
                          <span>₹{vendor.base_freight?.toFixed(2)}</span>
                        </div>
                        <div className="breakdown-row">
                          <span>Docket Charge:</span>
                          <span>₹{vendor.docket_charge?.toFixed(2)}</span>
                        </div>
                        <div className="breakdown-row">
                          <span>FSC ({vendor.fsc_percent}%):</span>
                          <span>₹{vendor.fsc_amount?.toFixed(2)}</span>
                        </div>
                        <div className="breakdown-row">
                          <span>GST ({vendor.gst_percent}%):</span>
                          <span>₹{vendor.gst_amount?.toFixed(2)}</span>
                        </div>
                        {vendor.mode_charge > 0 && (
                          <div className="breakdown-row">
                            <span>Mode Charge:</span>
                            <span>₹{vendor.mode_charge?.toFixed(2)}</span>
                          </div>
                        )}
                        {vendor.fov_charge > 0 && (
                          <div className="breakdown-row">
                            <span>FOV/Insurance:</span>
                            <span>₹{vendor.fov_charge?.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="breakdown-row total">
                          <span>Total Freight:</span>
                          <strong>₹{vendor.total_freight?.toFixed(2)}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="disclaimer">
                  <small>* Rates are indicative. Final rates may vary based on actual weight, dimensions, and vendor policies.</small>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default VendorRateCalculator;