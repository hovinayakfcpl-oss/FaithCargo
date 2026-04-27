import React, { useState, useEffect, useCallback } from "react";
import "./VendorRateCalculator.css";

// API Base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || "https://faithcargo.onrender.com";

// Zones list
const ZONES = ["N1", "N2", "N3", "C1", "W1", "W2", "S1", "S2", "E1", "NE1", "NE2", "NE3"];

// ODA Categories 
const ODA_CATEGORIES = {
  'A': { rate: 2, min: 200, name: 'ODA A (₹2/kg, Min ₹200)', color: '#10b981' },
  'B': { rate: 4, min: 400, name: 'ODA B (₹4/kg, Min ₹400)', color: '#f59e0b' },
  'C': { rate: 7, min: 700, name: 'ODA C (₹7/kg, Min ₹700)', color: '#ef4444' },
  'D': { rate: 10, min: 1000, name: 'ODA D (₹10/kg, Min ₹1000)', color: '#8b5cf6' },
  'DEFAULT': { rate: 4, min: 400, name: 'ODA Default (₹4/kg, Min ₹400)', color: '#6b7280' }
};

function VendorRateCalculator() {
  // State declarations
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
  const [originLocation, setOriginLocation] = useState("");
  const [destLocation, setDestLocation] = useState("");
  const [odaCache, setOdaCache] = useState({});
  const [apiStatus, setApiStatus] = useState({ online: true, lastCheck: null });
  const [expandedVendor, setExpandedVendor] = useState(null);
  const [odaDebug, setOdaDebug] = useState([]);

  // Dimension functions
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

  // Fetch all vendors on load
  useEffect(() => {
    fetchVendors();
    checkApiStatus();
  }, []);

  useEffect(() => {
    if (pickup && pickup.length === 6) {
      fetchPincodeLocation(pickup, "origin");
    }
    if (destination && destination.length === 6) {
      fetchPincodeLocation(destination, "dest");
      // Clear ODA cache when destination changes
      setOdaCache({});
    }
  }, [pickup, destination]);

  const checkApiStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/vendors/vendor-rates/`);
      setApiStatus({ online: response.ok, lastCheck: new Date() });
    } catch (err) {
      setApiStatus({ online: false, lastCheck: new Date() });
      console.warn("API is offline, using fallback data");
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/vendors/vendor-rates/`);
      if (response.ok) {
        const data = await response.json();
        setVendors(data);
        setSelectedVendors(data.map(v => v.vendor_name));
      } else {
        setDefaultVendors();
      }
    } catch (err) {
      console.error("Error fetching vendors:", err);
      setDefaultVendors();
    }
  };

  const setDefaultVendors = () => {
    const defaultVendors = [
      { vendor_name: "DELHIVERY", is_active: true, rates: {}, delhivery_6cft: {}, delhivery_10cft: {}, charges: { docket_charge: 75, fsc: "10%", gst: "18%", min_freight: 400, min_weight: 20, oda_charge: 2 } },
      { vendor_name: "GATI", is_active: true, rates: {}, charges: { docket_charge: 100, fsc: "15%", gst: "18%", min_freight: 350, min_weight: 20, oda_charge: 3 } },
      { vendor_name: "PD LOGISTICS", is_active: true, rates: {}, delhivery_6cft: {}, delhivery_10cft: {}, charges: { docket_charge: 75, fsc: "10%", gst: "18%", min_freight: 400, min_weight: 20, oda_charge: 2.5 } },
      { vendor_name: "RIVIGO", is_active: true, rates: {}, delhivery_6cft: {}, delhivery_10cft: {}, charges: { docket_charge: 85, fsc: "12%", gst: "18%", min_freight: 380, min_weight: 20, oda_charge: 4 } },
      { vendor_name: "VXPRESS", is_active: true, rates: {}, charges: { docket_charge: 50, fsc: "8%", gst: "18%", min_freight: 450, min_weight: 25, oda_charge: 2 } },
    ];
    setVendors(defaultVendors);
    setSelectedVendors(["DELHIVERY", "GATI", "PD LOGISTICS", "RIVIGO", "VXPRESS"]);
  };

  const fetchPincodeLocation = async (pincode, type) => {
    if (!pincode || pincode.length !== 6) return;
    
    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await response.json();
      if (data?.[0]?.Status === "Success") {
        const postOffice = data[0].PostOffice[0];
        const location = `${postOffice.District}, ${postOffice.State}`;
        if (type === "origin") {
          setOriginLocation(location);
        } else {
          setDestLocation(location);
        }
      }
    } catch (err) {
      console.error("Error fetching location:", err);
    }
  };

  // ODA Check with retry logic and debugging
  const checkODA = useCallback(async (vendorName, pincode, retryCount = 0) => {
    const cacheKey = `${vendorName}_${pincode}`;
    
    if (odaCache[cacheKey]) {
      console.log(`📦 ODA Cache hit for ${vendorName} - ${pincode}:`, odaCache[cacheKey]);
      return odaCache[cacheKey];
    }
    
    try {
      console.log(`🔍 Checking ODA for ${vendorName} - ${pincode}...`);
      const response = await fetch(`${API_BASE_URL}/api/vendors/check-oda/${vendorName}/${pincode}/`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ ODA Response for ${vendorName} - ${pincode}:`, data);
        
        let result = {
          isODA: false,
          charge: 0,
          minCharge: 0,
          category: null,
          city: '',
          state: ''
        };
        
        if (data.is_oda === true) {
          result = {
            isODA: true,
            charge: parseFloat(data.oda_charge_per_kg) || 0,
            minCharge: parseFloat(data.oda_min_charge) || 0,
            category: data.oda_category,
            city: data.city || '',
            state: data.state || ''
          };
        } else if (data.is_oda === false && data.oda_charge_per_kg > 0) {
          // Handle default ODA from vendor charges
          result = {
            isODA: true,
            charge: parseFloat(data.oda_charge_per_kg) || 0,
            minCharge: parseFloat(data.oda_min_charge) || 0,
            category: 'DEFAULT',
            city: data.city || '',
            state: data.state || ''
          };
        }
        
        setOdaCache(prev => ({ ...prev, [cacheKey]: result }));
        setOdaDebug(prev => [...prev, { vendor: vendorName, pincode, result, timestamp: new Date() }]);
        return result;
      } else if (retryCount < 2) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return checkODA(vendorName, pincode, retryCount + 1);
      }
    } catch (err) {
      console.error(`ODA API error for ${vendorName}:`, err);
      if (retryCount < 2) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return checkODA(vendorName, pincode, retryCount + 1);
      }
    }
    
    return { isODA: false, charge: 0, minCharge: 0, category: null, city: '', state: '' };
  }, [odaCache]);

  // Validate pincode format
  const isValidPincode = (pincode) => {
    return pincode && pincode.length === 6 && /^\d+$/.test(pincode);
  };

  // Calculate volumetric weight
  const calculateVolumetricWeight = () => {
    let totalVolCM = 0;
    let totalVolCFT = 0;
    
    dimensions.forEach((dim) => {
      const qty = Number(dim.qty) || 0;
      const l = Number(dim.length) || 0;
      const w = Number(dim.width) || 0;
      const h = Number(dim.height) || 0;
      
      if (l > 0 && w > 0 && h > 0 && qty > 0) {
        totalVolCM += (l * w * h * qty) / 5000;
        totalVolCFT += (l * w * h * qty) / (30.48 * 30.48 * 30.48);
      }
    });
    
    return { volumetricWeight: totalVolCM, volumeCFT: totalVolCFT };
  };

  // Get zone from pincode
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

  // Calculate rate for a single vendor
  const calculateRateForVendor = async (vendor, fromZone, toZone, weight, volumeCFT, invoiceValue, mode, cftSize) => {
    const vendorName = vendor.vendor_name;
    const charges = vendor.charges || {};
    let ratePerKg = 0;
    let rates = vendor.rates || {};
    
    // Check ODA for destination
    const odaInfo = await checkODA(vendorName, destination);
    
    // Calculate ODA charge
    let finalODACharge = 0;
    let odaBreakdown = null;
    
    if (odaInfo.isODA && odaInfo.charge > 0) {
      const odaCalc = weight * odaInfo.charge;
      finalODACharge = Math.max(odaCalc, odaInfo.minCharge);
      odaBreakdown = {
        rate: odaInfo.charge,
        calculated: odaCalc,
        minCharge: odaInfo.minCharge,
        applied: finalODACharge,
        category: odaInfo.category
      };
      console.log(`✅ ODA Applied for ${vendorName}: ${odaInfo.category || 'ODA'} - ₹${finalODACharge} (₹${odaInfo.charge}/kg × ${weight}kg, Min ₹${odaInfo.minCharge})`);
    } else {
      console.log(`❌ No ODA for ${vendorName} - ${destination}`);
    }
    
    // Get rates based on CFT type
    if (cftSize === "6CFT" && vendor.delhivery_6cft) {
      rates = vendor.delhivery_6cft;
    } else if (cftSize === "10CFT" && vendor.delhivery_10cft) {
      rates = vendor.delhivery_10cft;
    }
    
    // Get rate from matrix
    ratePerKg = rates[fromZone]?.[toZone] || 0;
    
    // Fallback rates
    if (ratePerKg === 0) {
      const defaultRates = {
        "DELHIVERY": 28, "GATI": 25, "PD LOGISTICS": 22,
        "RIVIGO": 24, "VXPRESS": 20
      };
      ratePerKg = defaultRates[vendorName] || 22;
    }
    
    // Calculate charges
    const docketCharge = parseFloat(charges.docket_charge) || 100;
    const fscPercent = parseFloat(String(charges.fsc || "10%").replace("%", "")) || 10;
    const gstPercent = parseFloat(String(charges.gst || "18%").replace("%", "")) || 18;
    const minFreight = parseFloat(charges.min_freight) || 350;
    const minWeight = parseFloat(charges.min_weight) || 20;
    
    const effectiveWeight = Math.max(weight, minWeight);
    const baseFreight = effectiveWeight * ratePerKg;
    const fscAmount = baseFreight * (fscPercent / 100);
    const gstAmount = (baseFreight + fscAmount + docketCharge + finalODACharge) * (gstPercent / 100);
    
    // Mode charges
    let modeCharge = 0;
    if (mode === "COD") modeCharge = 125;
    if (mode === "ToPay") modeCharge = 200;
    
    // FOV charge
    let fovCharge = 0;
    if (invoiceValue && invoiceValue > 0) {
      fovCharge = Math.max(invoiceValue * 0.001, 100);
    }
    
    // Total freight
    let totalFreight = baseFreight + fscAmount + docketCharge + gstAmount + modeCharge + fovCharge + finalODACharge;
    totalFreight = Math.max(totalFreight, minFreight);
    
    return {
      vendor_name: vendorName,
      rate_per_kg: ratePerKg,
      cft_type: cftSize === "Standard" ? null : cftSize,
      effective_weight: effectiveWeight,
      base_freight: baseFreight,
      docket_charge: docketCharge,
      fsc_percent: fscPercent,
      fsc_amount: fscAmount,
      gst_percent: gstPercent,
      gst_amount: gstAmount,
      mode_charge: modeCharge,
      fov_charge: fovCharge,
      oda_charge: finalODACharge,
      oda_applicable: odaInfo.isODA && odaInfo.charge > 0,
      oda_category: odaInfo.category,
      oda_rate_per_kg: odaInfo.charge,
      oda_min_charge: odaInfo.minCharge,
      oda_breakdown: odaBreakdown,
      min_freight: minFreight,
      total_freight: totalFreight
    };
  };

  const handleCalculate = async () => {
    // Validation
    if (!pickup || !destination || !weight) {
      alert("❌ Please fill mandatory fields: Origin, Destination, and Weight!");
      return;
    }

    if (!isValidPincode(pickup)) {
      alert("❌ Please enter a valid 6-digit origin pincode!");
      return;
    }

    if (!isValidPincode(destination)) {
      alert("❌ Please enter a valid 6-digit destination pincode!");
      return;
    }

    if (parseFloat(weight) <= 0) {
      alert("❌ Weight must be greater than 0!");
      return;
    }

    setLoading(true);
    setOdaDebug([]);
    
    try {
      const { volumetricWeight, volumeCFT: calculatedVolumeCFT } = calculateVolumetricWeight();
      const finalChargeableWeight = Math.max(Number(weight), volumetricWeight);
      setChargedWeight(finalChargeableWeight);
      setVolumeCFT(calculatedVolumeCFT);
      
      const fromZone = getZoneFromPincode(pickup);
      const toZone = getZoneFromPincode(destination);
      setOriginZone(fromZone);
      setDestZone(toZone);
      
      // Fetch location names
      await Promise.all([
        fetchPincodeLocation(pickup, "origin"),
        fetchPincodeLocation(destination, "dest")
      ]);
      
      const activeVendors = vendors.filter(v => 
        (showAllVendors || selectedVendors.includes(v.vendor_name)) && v.is_active !== false
      );
      
      const calculatedResults = [];
      
      // Process vendors
      for (const vendor of activeVendors) {
        const vendorName = vendor.vendor_name;
        
        if (vendorName === "DELHIVERY") {
          const rate6CFT = await calculateRateForVendor(vendor, fromZone, toZone, finalChargeableWeight, calculatedVolumeCFT, parseFloat(invoiceValue) || 0, mode, "6CFT");
          if (rate6CFT.rate_per_kg > 0) calculatedResults.push(rate6CFT);
          
          const rate10CFT = await calculateRateForVendor(vendor, fromZone, toZone, finalChargeableWeight, calculatedVolumeCFT, parseFloat(invoiceValue) || 0, mode, "10CFT");
          if (rate10CFT.rate_per_kg > 0) calculatedResults.push(rate10CFT);
          
          const rateStandard = await calculateRateForVendor(vendor, fromZone, toZone, finalChargeableWeight, calculatedVolumeCFT, parseFloat(invoiceValue) || 0, mode, "Standard");
          if (rateStandard.rate_per_kg > 0) calculatedResults.push(rateStandard);
        } else {
          const rate = await calculateRateForVendor(vendor, fromZone, toZone, finalChargeableWeight, calculatedVolumeCFT, parseFloat(invoiceValue) || 0, mode, "Standard");
          if (rate.rate_per_kg > 0) calculatedResults.push(rate);
        }
      }
      
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
      
      // Log ODA debug info
      console.log("📊 ODA Debug Info:", odaDebug);
      
    } catch (error) {
      console.error("Calculation error:", error);
      alert("An error occurred while calculating rates. Please try again.");
    } finally {
      setLoading(false);
    }
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
    setOriginLocation("");
    setDestLocation("");
    setOdaCache({});
    setOdaDebug([]);
    setExpandedVendor(null);
  };

  const toggleVendorSelection = (vendorName) => {
    if (selectedVendors.includes(vendorName)) {
      setSelectedVendors(selectedVendors.filter(v => v !== vendorName));
    } else {
      setSelectedVendors([...selectedVendors, vendorName]);
    }
  };

  const toggleExpanded = (index) => {
    setExpandedVendor(expandedVendor === index ? null : index);
  };

  const getBestVendor = () => {
    if (results.length === 0) return null;
    return results[0];
  };

  const getODACategoryLabel = (category) => {
    if (!category) return null;
    const catInfo = ODA_CATEGORIES[category] || ODA_CATEGORIES['DEFAULT'];
    return catInfo.name;
  };

  const bestVendor = getBestVendor();

  return (
    <div className="vendor-rate-page">
      <div className="page-header-calc">
        <h1>🚚 Vendor Rate Calculator</h1>
        <p>Compare rates across multiple logistics vendors in real-time</p>
        {!apiStatus.online && (
          <div className="api-warning">
            ⚠️ Using offline data. Some rates may not be up to date.
          </div>
        )}
        {destination && (
          <div className="oda-status-info">
            🔍 Checking ODA for pincode: <strong>{destination}</strong>
          </div>
        )}
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
                  maxLength="6"
                  placeholder="e.g., 110001" 
                  value={pickup} 
                  onChange={(e) => setPickup(e.target.value.replace(/\D/g, ''))} 
                  className={pickup && !isValidPincode(pickup) && pickup.length > 0 ? 'error-input' : ''}
                />
                {originLocation && <small className="location-hint">📍 {originLocation}</small>}
                {pickup && !isValidPincode(pickup) && pickup.length > 0 && (
                  <small className="error-hint">❌ Enter 6-digit pincode</small>
                )}
              </div>
              <div className="form-group">
                <label>Destination Pincode *</label>
                <input 
                  type="text" 
                  maxLength="6"
                  placeholder="e.g., 212217" 
                  value={destination} 
                  onChange={(e) => setDestination(e.target.value.replace(/\D/g, ''))} 
                  className={destination && !isValidPincode(destination) && destination.length > 0 ? 'error-input' : ''}
                />
                {destLocation && <small className="location-hint">📍 {destLocation}</small>}
                {destination && !isValidPincode(destination) && destination.length > 0 && (
                  <small className="error-hint">❌ Enter 6-digit pincode</small>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Payment Mode</label>
                <select value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option value="Prepaid">Prepaid</option>
                  <option value="COD">COD (+₹125)</option>
                  <option value="ToPay">ToPay (+₹200)</option>
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
              <small className="input-hint">FOV: 0.1% (Min ₹100)</small>
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
                  <span>📍 {originLocation || pickup} → {destLocation || destination}</span>
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
                <p>Calculating rates...</p>
              </div>
            ) : results.length === 0 ? (
              <div className="empty-state">
                <p>📦 Enter shipment details and click "Calculate Rates"</p>
                <div className="example-inputs">
                  <p>💡 Try these examples:</p>
                  <button onClick={() => { setPickup("110001"); setDestination("212217"); setWeight("100"); }} className="example-btn">
                    Delhi → Allahabad (ODA Test)
                  </button>
                  <button onClick={() => { setPickup("400001"); setDestination("500001"); setWeight("50"); }} className="example-btn">
                    Mumbai → Hyderabad
                  </button>
                </div>
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
                      {bestVendor.cft_type && bestVendor.cft_type !== "Standard" && (
                        <div className="best-cft-badge">{bestVendor.cft_type}</div>
                      )}
                      {bestVendor.oda_applicable && (
                        <div className="oda-highlight-badge" style={{ backgroundColor: ODA_CATEGORIES[bestVendor.oda_category]?.color || '#f59e0b' }}>
                          🚚 {bestVendor.oda_category ? getODACategoryLabel(bestVendor.oda_category) : 'ODA Applied'} (+₹{bestVendor.oda_charge?.toFixed(2)})
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Results List */}
                <div className="results-list">
                  {results.map((vendor, idx) => (
                    <div 
                      key={idx} 
                      className={`vendor-result ${bestVendor?.vendor_name === vendor.vendor_name && bestVendor?.cft_type === vendor.cft_type ? 'is-best' : ''}`}
                    >
                      <div className="vendor-result-header" onClick={() => toggleExpanded(idx)}>
                        <div className="vendor-name">
                          {vendor.vendor_name}
                          {vendor.cft_type && vendor.cft_type !== "Standard" && (
                            <span className="cft-badge">{vendor.cft_type}</span>
                          )}
                          {vendor.oda_applicable ? (
                            <span className="oda-badge oda-yes" style={{ backgroundColor: ODA_CATEGORIES[vendor.oda_category]?.color || '#f59e0b' }}>
                              🚚 ODA {vendor.oda_category || 'Yes'} (+₹{vendor.oda_charge?.toFixed(2)})
                            </span>
                          ) : (
                            <span className="oda-badge oda-no">
                              ✅ No ODA
                            </span>
                          )}
                        </div>
                        <div className="vendor-total">₹{vendor.total_freight?.toFixed(2)}</div>
                      </div>
                      
                      <div className={`vendor-breakdown ${expandedVendor === idx ? 'expanded' : ''}`}>
                        <div className="breakdown-row">
                          <span>Rate/kg:</span>
                          <strong>₹{vendor.rate_per_kg?.toFixed(2)}</strong>
                        </div>
                        <div className="breakdown-row">
                          <span>Effective Weight:</span>
                          <span>{vendor.effective_weight?.toFixed(2)} kg</span>
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
                        {vendor.oda_applicable && (
                          <div className="breakdown-row oda-highlight">
                            <span>{vendor.oda_category ? `ODA ${vendor.oda_category} (${vendor.oda_rate_per_kg}/kg):` : 'ODA Charge:'}</span>
                            <span>₹{vendor.oda_charge?.toFixed(2)}</span>
                            {vendor.oda_breakdown && (
                              <small className="oda-detail">
                                (₹{vendor.oda_breakdown.rate} × {vendor.effective_weight?.toFixed(0)}kg = ₹{vendor.oda_breakdown.calculated?.toFixed(2)}, Min ₹{vendor.oda_breakdown.minCharge})
                              </small>
                            )}
                          </div>
                        )}
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
                      
                      {expandedVendor !== idx && (
                        <div className="expand-hint" onClick={() => toggleExpanded(idx)}>
                          <span>▼ Click to expand</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="disclaimer">
                  <small>* Rates are indicative. ODA (Out of Delivery Area) charges apply for remote locations. {destination && `Destination pincode: ${destination}`}</small>
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