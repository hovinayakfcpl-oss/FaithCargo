import React, { useState, useEffect } from "react";
import { 
  Truck, MapPin, Weight, Package, CreditCard, 
  Shield, Clock, TrendingUp, DollarSign,
  Plus, Trash2, ChevronDown, ChevronUp, CheckCircle,
  Zap, Award, Star, Users, Phone, Mail, Calculator,
  ArrowRight, Building, FileText, User, LogOut
} from "lucide-react";
import "./B2BRateCalculator.css";

function BaB2bRateCalculator() {
  // ========== CLIENT AUTHENTICATION STATE ==========
  const [currentUser, setCurrentUser] = useState(null);
  const [clientRates, setClientRates] = useState(null);
  const [clientPolicy, setClientPolicy] = useState(null);
  const [isClientLoggedIn, setIsClientLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginCredentials, setLoginCredentials] = useState({ clientId: "", password: "" });
  const [loginError, setLoginError] = useState("");

  const [form, setForm] = useState({
    origin: "",
    destination: "",
    weight: "",
    invoiceValue: "",
    codAmount: "",
    paymentMode: "", 
    insurance: false,
    appointment: false,
    fragile: false,
    express: false
  });

  const [originDetails, setOriginDetails] = useState({ city: "", state: "" });
  const [destinationDetails, setDestinationDetails] = useState({ city: "", state: "" });
  const [dimensions, setDimensions] = useState([
    { qty: 1, length: "", width: "", height: "" }
  ]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [activeTab, setActiveTab] = useState("surface");
  const [zones, setZones] = useState(["N1","N2","N3","C1","W1","W2","S1","S2","E1","NE1","NE2"]);
  const [zoneMapping, setZoneMapping] = useState({});

  // ========== CLIENT LOGIN FUNCTIONS ==========
  const handleClientLogin = async () => {
    setLoginError("");
    try {
      const response = await fetch("https://faithcargo.onrender.com/api/auth/client-login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: loginCredentials.clientId,
          password: loginCredentials.password
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCurrentUser(data.user);
        localStorage.setItem("clientToken", data.token);
        localStorage.setItem("clientId", loginCredentials.clientId);
        setIsClientLoggedIn(true);
        setShowLoginModal(false);
        setLoginCredentials({ clientId: "", password: "" });
        
        // Fetch client-specific rates
        await fetchClientSpecificRates(loginCredentials.clientId);
      } else {
        setLoginError(data.error || "Invalid credentials");
      }
    } catch (error) {
      console.error("Login error:", error);
      setLoginError("Server error. Please try again.");
    }
  };

  const fetchClientSpecificRates = async (clientId) => {
    try {
      const response = await fetch(`https://faithcargo.onrender.com/api/rates/client/${clientId}/`);
      const data = await response.json();
      setClientRates(data.zone_rates || []);
      setClientPolicy(data.policy || null);
      
      // Build zone mapping for rate lookup
      const mapping = {};
      if (data.zone_rates) {
        data.zone_rates.forEach(rate => {
          if (!mapping[rate.from_zone]) mapping[rate.from_zone] = {};
          mapping[rate.from_zone][rate.to_zone] = rate.rate;
        });
      }
      setZoneMapping(mapping);
    } catch (error) {
      console.error("Error fetching client rates:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("clientToken");
    localStorage.removeItem("clientId");
    setCurrentUser(null);
    setIsClientLoggedIn(false);
    setClientRates(null);
    setClientPolicy(null);
    setZoneMapping({});
    resetForm();
  };

  // Check for existing session on load
  useEffect(() => {
    const savedClientId = localStorage.getItem("clientId");
    if (savedClientId) {
      setIsClientLoggedIn(true);
      fetchClientSpecificRates(savedClientId);
      // Fetch user details
      fetch(`https://faithcargo.onrender.com/api/auth/client/${savedClientId}/`)
        .then(res => res.json())
        .then(data => {
          if (data.success) setCurrentUser(data.user);
        })
        .catch(console.error);
    }
  }, []);

  // Fetch pincode details
  const fetchPincodeDetails = async (pincode, type) => {
    if (pincode && pincode.length === 6) {
      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
        const data = await response.json();
        if (data[0]?.Status === "Success") {
          const postOffice = data[0].PostOffice[0];
          const details = {
            city: postOffice.District,
            state: postOffice.State,
            name: postOffice.Name
          };
          if (type === "origin") {
            setOriginDetails(details);
          } else {
            setDestinationDetails(details);
          }
        }
      } catch (error) {
        console.error("Error fetching pincode:", error);
      }
    }
  };

  // Get zone from pincode (simplified - in production, use actual zone mapping)
  const getZoneFromPincode = (pincode) => {
    const firstDigit = pincode.charAt(0);
    const zoneMap = {
      '1': 'N1', '2': 'N2', '3': 'N3',
      '4': 'C1', '5': 'W1', '6': 'W2',
      '7': 'S1', '8': 'S2', '9': 'E1',
      '0': 'NE1'
    };
    return zoneMap[firstDigit] || 'NE2';
  };

  // Get rate from client-specific rates or use default
  const getRateFromZones = (originZone, destZone, defaultRate) => {
    if (zoneMapping[originZone] && zoneMapping[originZone][destZone]) {
      return zoneMapping[originZone][destZone];
    }
    return defaultRate;
  };

  // Handle pincode change
  const handlePincodeChange = (e, type) => {
    const value = e.target.value;
    setForm({ ...form, [type]: value });
    if (value.length === 6) {
      fetchPincodeDetails(value, type);
    } else {
      if (type === "origin") {
        setOriginDetails({ city: "", state: "" });
      } else {
        setDestinationDetails({ city: "", state: "" });
      }
    }
  };

  // INPUT HANDLER
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value
    });
  };

  // DIMENSION CHANGE HANDLER
  const handleDimChange = (i, e) => {
    const { name, value } = e.target;
    const newDims = [...dimensions];
    newDims[i][name] = value;
    setDimensions(newDims);
  };

  // ADD BOX
  const addBox = () => {
    setDimensions([...dimensions, { qty: 1, length: "", width: "", height: "" }]);
  };

  // REMOVE BOX
  const removeBox = (index) => {
    setDimensions(dimensions.filter((_, i) => i !== index));
  };

  // CALCULATE VOLUMETRIC WEIGHT
  const calculateVolumetric = () => {
    let volumetric = 0;
    dimensions.forEach(b => {
      const l = parseFloat(b.length) || 0;
      const w = parseFloat(b.width) || 0;
      const h = parseFloat(b.height) || 0;
      const qty = parseInt(b.qty) || 0;
      volumetric += (l * w * h * qty) / 4000;
    });
    return volumetric;
  };

  // Get client-specific rate per kg
  const getClientRatePerKg = () => {
    if (!clientPolicy) {
      // Default rates
      return activeTab === 'air' ? 45 : (activeTab === 'express' ? 25 : 18);
    }
    
    switch(activeTab) {
      case 'air': return clientPolicy.air_rate_per_kg || 45;
      case 'express': return clientPolicy.express_rate_per_kg || 25;
      default: return clientPolicy.surface_rate_per_kg || 18;
    }
  };

  // Get client-specific charges
  const getClientCharges = () => {
    if (!clientPolicy) {
      return {
        minFreight: 650,
        docketCharge: 100,
        fuelPercent: 10,
        fovCharge: 75,
        codCharge: 150,
        fragileCharge: 250,
        appointmentCharge: 1500,
        insurancePercent: 2,
        expressExtra: 5,
        gstPercent: 18
      };
    }
    
    return {
      minFreight: clientPolicy.minFreight || 650,
      docketCharge: clientPolicy.docketCharge || 100,
      fuelPercent: clientPolicy.fuelPercent || 10,
      fovCharge: clientPolicy.fovCharge || 75,
      codCharge: clientPolicy.codCharge || 150,
      fragileCharge: clientPolicy.fragileCharge || 250,
      appointmentCharge: clientPolicy.appointmentCharge || 1500,
      insurancePercent: clientPolicy.insurancePercent || 2,
      expressExtra: clientPolicy.expressExtra || 5,
      gstPercent: clientPolicy.gstPercent || 18
    };
  };

  // CALCULATE RATE LOGIC with Client-Specific Rates
  const calculateRate = async () => {
    if (!form.origin || !form.destination || !form.weight) {
      alert("Please enter Origin, Destination, and Weight!");
      return;
    }

    setLoading(true);
    setResult(null);

    const volumetric = calculateVolumetric();
    const actualWeight = parseFloat(form.weight) || 0;
    const chargeableWeight = Math.max(actualWeight, volumetric);
    const totalQty = dimensions.reduce((sum, b) => sum + (parseInt(b.qty) || 0), 0);
    
    // Get client-specific rates
    const ratePerKg = getClientRatePerKg();
    const charges = getClientCharges();
    
    // Get zone-based rate if available
    const originZone = getZoneFromPincode(form.origin);
    const destZone = getZoneFromPincode(form.destination);
    const zoneRate = getRateFromZones(originZone, destZone, ratePerKg);
    
    const freight = chargeableWeight * zoneRate;
    const gst = freight * (charges.gstPercent / 100);
    const fuel = freight * (charges.fuelPercent / 100);
    const docket = charges.docketCharge;
    const fov = charges.fovCharge;
    const odaCharge = 0; // Will be fetched from API if needed
    
    let cod = (form.paymentMode === "COD" || form.paymentMode === "ToPay") ? charges.codCharge : 0;
    let handling = (totalQty === 1 && chargeableWeight > 70) ? 750 : 0;
    let fragileCharge = form.fragile ? charges.fragileCharge : 0;
    let expressCharge = (form.express || activeTab === 'express') ? chargeableWeight * charges.expressExtra : 0;
    let insuranceVal = form.insurance ? (parseFloat(form.invoiceValue) || 0) * (charges.insurancePercent / 100) : 0;
    let appointmentVal = form.appointment ? charges.appointmentCharge : 0;

    let total = freight + gst + fuel + docket + fov + odaCharge + cod + handling + fragileCharge + expressCharge + insuranceVal + appointmentVal;

    if (total < charges.minFreight) total = charges.minFreight;

    const transportType = activeTab === 'air' ? 'Air Cargo' : (activeTab === 'express' ? 'Express Delivery' : 'Surface Transport');
    const transitTime = activeTab === 'air' ? '1-2 days' : (activeTab === 'express' ? '1-3 days' : '2-5 days');

    setResult({
      actualWeight,
      volumetric: volumetric.toFixed(2),
      chargeable: chargeableWeight.toFixed(2),
      ratePerKg: zoneRate.toFixed(2),
      freight: freight.toFixed(2),
      fuel: fuel.toFixed(2),
      gst: gst.toFixed(2),
      odaCharge,
      cod,
      handling,
      fragileCharge,
      expressCharge,
      insurance: insuranceVal.toFixed(2),
      appointment: appointmentVal,
      total: total.toFixed(2),
      totalQty,
      paymentMode: form.paymentMode,
      transitTime: transitTime,
      transportType: transportType,
      originCity: originDetails.city,
      originState: originDetails.state,
      destCity: destinationDetails.city,
      destState: destinationDetails.state,
      originZone,
      destZone,
      zoneRate: zoneRate
    });

    setLoading(false);
  };

  const resetForm = () => {
    setForm({
      origin: "",
      destination: "",
      weight: "",
      invoiceValue: "",
      codAmount: "",
      paymentMode: "", 
      insurance: false,
      appointment: false,
      fragile: false,
      express: false
    });
    setOriginDetails({ city: "", state: "" });
    setDestinationDetails({ city: "", state: "" });
    setDimensions([{ qty: 1, length: "", width: "", height: "" }]);
    setResult(null);
  };

  const quickFillExample = () => {
    setForm({
      origin: "110001",
      destination: "400001",
      weight: "25.5",
      invoiceValue: "50000",
      codAmount: "",
      paymentMode: "Prepaid", 
      insurance: false,
      appointment: false,
      fragile: false,
      express: false
    });
    fetchPincodeDetails("110001", "origin");
    fetchPincodeDetails("400001", "destination");
    setDimensions([{ qty: 2, length: "50", width: "40", height: "30" }]);
  };

  // Login Modal Component
  const LoginModal = () => (
    <div className="login-modal-overlay" onClick={() => setShowLoginModal(false)}>
      <div className="login-modal" onClick={(e) => e.stopPropagation()}>
        <div className="login-modal-header">
          <User size={24} />
          <h3>Client Login</h3>
          <button className="login-modal-close" onClick={() => setShowLoginModal(false)}>×</button>
        </div>
        <div className="login-modal-body">
          <div className="login-form-group">
            <label>Client ID</label>
            <input
              type="text"
              placeholder="Enter your Client ID"
              value={loginCredentials.clientId}
              onChange={(e) => setLoginCredentials({...loginCredentials, clientId: e.target.value})}
            />
          </div>
          <div className="login-form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={loginCredentials.password}
              onChange={(e) => setLoginCredentials({...loginCredentials, password: e.target.value})}
            />
          </div>
          {loginError && <div className="login-error">{loginError}</div>}
        </div>
        <div className="login-modal-footer">
          <button className="login-btn-cancel" onClick={() => setShowLoginModal(false)}>Cancel</button>
          <button className="login-btn-submit" onClick={handleClientLogin}>Login</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="b2b-container">
      {/* Header Section */}
      <div className="b2b-header">
        <div className="header-content">
          <div className="logo-area">
            <div className="logo-icon">FC</div>
            <div className="logo-text">
              <h1>Faith Cargo</h1>
              <span>Logistics Pvt. Ltd.</span>
            </div>
          </div>
          <div className="header-badges">
            <div className="badge"><Award size={16} /><span>ISO 9001:2015</span></div>
            <div className="badge"><Star size={16} /><span>4.9 Rating</span></div>
            <div className="badge"><Users size={16} /><span>500+ Clients</span></div>
          </div>
        </div>
        <div className="header-title">
          <h2>BA & B2B Rate Calculator</h2>
          <p>Get instant freight quotes for your business shipments</p>
        </div>
      </div>

      {/* Client Login/Profile Bar */}
      <div className="client-bar">
        {isClientLoggedIn && currentUser ? (
          <div className="client-profile">
            <div className="client-info">
              <User size={16} />
              <span>{currentUser.companyName || currentUser.username}</span>
              <span className="client-id">({currentUser.clientId})</span>
            </div>
            {clientPolicy && (
              <div className="client-rate-badge">
                <span>Custom Rates Active</span>
              </div>
            )}
            <button className="logout-btn" onClick={handleLogout}>
              <LogOut size={14} /> Logout
            </button>
          </div>
        ) : (
          <div className="client-login-prompt">
            <span>Get your custom rates!</span>
            <button className="login-prompt-btn" onClick={() => setShowLoginModal(true)}>
              Client Login
            </button>
          </div>
        )}
      </div>

      {/* Login Modal */}
      {showLoginModal && <LoginModal />}

      {/* Tabs */}
      <div className="b2b-tabs">
        <button 
          className={`tab-btn ${activeTab === 'surface' ? 'active' : ''}`}
          onClick={() => setActiveTab('surface')}
        >
          <Truck size={18} />
          Surface Transport
        </button>
        <button 
          className={`tab-btn ${activeTab === 'express' ? 'active' : ''}`}
          onClick={() => setActiveTab('express')}
        >
          <Zap size={18} />
          Express Delivery
        </button>
        <button 
          className={`tab-btn ${activeTab === 'air' ? 'active' : ''}`}
          onClick={() => setActiveTab('air')}
        >
          <TrendingUp size={18} />
          Air Cargo
        </button>
      </div>

      {/* Main Calculator Card */}
      <div className="calculator-main-card">
        <div className="calculator-grid">
          {/* Left Side - Input Form */}
          <div className="input-section">
            <div className="section-title">
              <Calculator size={20} />
              <h3>Shipment Details</h3>
              <button className="quick-fill-btn" onClick={quickFillExample}>
                <Zap size={14} /> Quick Fill
              </button>
            </div>

            {/* Route Section */}
            <div className="form-row-2">
              <div className="form-group">
                <label><MapPin size={16} /> Origin Pincode *</label>
                <input 
                  type="text" 
                  name="origin" 
                  placeholder="Enter 6-digit pincode" 
                  value={form.origin}
                  onChange={(e) => handlePincodeChange(e, "origin")}
                  maxLength="6"
                />
                {originDetails.city && (
                  <div className="location-detail">
                    <Building size={14} />
                    <span>{originDetails.city}, {originDetails.state}</span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label><MapPin size={16} /> Destination Pincode *</label>
                <input 
                  type="text" 
                  name="destination" 
                  placeholder="Enter 6-digit pincode" 
                  value={form.destination}
                  onChange={(e) => handlePincodeChange(e, "destination")}
                  maxLength="6"
                />
                {destinationDetails.city && (
                  <div className="location-detail">
                    <Building size={14} />
                    <span>{destinationDetails.city}, {destinationDetails.state}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Payment, Weight & Invoice Value */}
            <div className="form-row-3">
              <div className="form-group">
                <label><CreditCard size={16} /> Payment Mode</label>
                <select name="paymentMode" value={form.paymentMode} onChange={handleChange}>
                  <option value="" disabled>Select</option>
                  <option value="Prepaid">Prepaid</option>
                  <option value="COD">COD</option>
                  <option value="ToPay">To Pay</option>
                </select>
              </div>
              <div className="form-group">
                <label><Weight size={16} /> Weight (Kg) *</label>
                <input 
                  type="number" 
                  name="weight" 
                  placeholder="Enter weight" 
                  value={form.weight}
                  onChange={handleChange}
                  step="0.1"
                />
              </div>
              <div className="form-group half-width">
                <label><FileText size={16} /> Invoice Value (₹)</label>
                <input 
                  type="number" 
                  name="invoiceValue" 
                  placeholder="Value" 
                  value={form.invoiceValue}
                  onChange={handleChange}
                />
              </div>
            </div>

            {(form.paymentMode === "COD" || form.paymentMode === "ToPay") && (
              <div className="form-group">
                <label><DollarSign size={16} /> COD Amount (₹)</label>
                <input 
                  type="number" 
                  name="codAmount" 
                  placeholder="Enter COD amount" 
                  value={form.codAmount}
                  onChange={handleChange}
                />
              </div>
            )}

            {/* Dimensions Section */}
            <div className="dimensions-section">
              <div className="dimensions-header">
                <label><Package size={16} /> Package Dimensions</label>
                <button className="add-dim-btn" onClick={addBox}>
                  <Plus size={14} /> Add Package
                </button>
              </div>
              
              {dimensions.map((d, i) => (
                <div key={i} className="dimension-row">
                  <div className="dim-input">
                    <span className="dim-label">Qty</span>
                    <input 
                      type="number" 
                      name="qty" 
                      value={d.qty} 
                      onChange={(e) => handleDimChange(i, e)} 
                      placeholder="Qty"
                      min="1"
                    />
                  </div>
                  <div className="dim-input">
                    <span className="dim-label">L (cm)</span>
                    <input 
                      type="number" 
                      name="length" 
                      value={d.length} 
                      onChange={(e) => handleDimChange(i, e)} 
                      placeholder="Length"
                      step="0.1"
                    />
                  </div>
                  <div className="dim-input">
                    <span className="dim-label">W (cm)</span>
                    <input 
                      type="number" 
                      name="width" 
                      value={d.width} 
                      onChange={(e) => handleDimChange(i, e)} 
                      placeholder="Width"
                      step="0.1"
                    />
                  </div>
                  <div className="dim-input">
                    <span className="dim-label">H (cm)</span>
                    <input 
                      type="number" 
                      name="height" 
                      value={d.height} 
                      onChange={(e) => handleDimChange(i, e)} 
                      placeholder="Height"
                      step="0.1"
                    />
                  </div>
                  {dimensions.length > 1 && (
                    <button className="remove-dim-btn" onClick={() => removeBox(i)}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Services */}
            <div className="services-section">
              <label><Shield size={16} /> Value Added Services</label>
              <div className="checkbox-group">
                <label><input type="checkbox" name="insurance" checked={form.insurance} onChange={handleChange} /> Insurance (2% of Invoice Value)</label>
                <label><input type="checkbox" name="appointment" checked={form.appointment} onChange={handleChange} /> Appointment Delivery</label>
                <label><input type="checkbox" name="fragile" checked={form.fragile} onChange={handleChange} /> Fragile Handling</label>
                <label><input type="checkbox" name="express" checked={form.express} onChange={handleChange} /> Express Priority</label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              <button className="btn-calculate" onClick={calculateRate} disabled={loading}>
                {loading ? "Calculating..." : "Get Live Quote"}
              </button>
              <button className="btn-reset" onClick={resetForm}>Reset</button>
            </div>
          </div>

          {/* Right Side - Results */}
          <div className="result-section">
            {result ? (
              <div className="result-content">
                <div className="result-header">
                  <div className="quote-badge">
                    <Zap size={18} />
                    <span>{result.transportType}</span>
                    {isClientLoggedIn && <span className="custom-rate-badge">Custom Rate</span>}
                  </div>
                  <div className="total-amount">
                    <small>Total Amount</small>
                    <h2>₹{result.total}</h2>
                    {result.total === "650.00" && <span className="min-badge">Min ₹650 Applied</span>}
                  </div>
                </div>

                <div className="route-info">
                  <div className="route-point">
                    <div className="point-icon"><MapPin size={16} /></div>
                    <div className="point-details">
                      <strong>Origin</strong>
                      <p>{result.originCity || form.origin}</p>
                      <small>{result.originState}</small>
                    </div>
                  </div>
                  <div className="route-arrow">→</div>
                  <div className="route-point">
                    <div className="point-icon"><Truck size={16} /></div>
                    <div className="point-details">
                      <strong>Destination</strong>
                      <p>{result.destCity || form.destination}</p>
                      <small>{result.destState}</small>
                    </div>
                  </div>
                </div>

                {/* Zone Info if available */}
                {result.originZone && result.destZone && (
                  <div className="zone-info">
                    <span>Zone: {result.originZone} → {result.destZone}</span>
                    <span>Rate: ₹{result.zoneRate}/kg</span>
                  </div>
                )}

                {/* Weight Summary */}
                <div className="weight-summary">
                  <div className="weight-item dark-text">
                    <span>Actual Weight:</span>
                    <strong>{result.actualWeight} Kg</strong>
                  </div>
                  <div className="weight-item dark-text">
                    <span>Volumetric Weight:</span>
                    <strong>{result.volumetric} Kg</strong>
                  </div>
                  <div className="weight-item dark-text">
                    <span>Chargeable Weight:</span>
                    <strong>{result.chargeable} Kg</strong>
                  </div>
                </div>

                <div className="rate-transit-row">
                  <div className="rate-item">
                    <span>Rate per Kg:</span>
                    <strong>₹{result.ratePerKg}</strong>
                  </div>
                  <div className="transit-item">
                    <span>Transit Time:</span>
                    <strong>{result.transitTime}</strong>
                  </div>
                </div>

                <div className="breakdown-toggle" onClick={() => setShowBreakdown(!showBreakdown)}>
                  <span>Charges Breakdown</span>
                  {showBreakdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>

                {showBreakdown && (
                  <div className="breakdown-list">
                    <div className="breakdown-item"><span>Basic Freight</span><span>₹{result.freight}</span></div>
                    <div className="breakdown-item"><span>Fuel Surcharge</span><span>₹{result.fuel}</span></div>
                    <div className="breakdown-item"><span>Docket / Waybill Charge</span><span>₹100</span></div>
                    <div className="breakdown-item"><span>FOV Charges</span><span>₹75</span></div>
                    {result.odaCharge > 0 && <div className="breakdown-item oda"><span>ODA Charges</span><span>₹{result.odaCharge}</span></div>}
                    {result.cod > 0 && <div className="breakdown-item"><span>COD/ToPay Fee</span><span>₹{result.cod}</span></div>}
                    {result.handling > 0 && <div className="breakdown-item"><span>Special Handling</span><span>₹{result.handling}</span></div>}
                    {result.fragileCharge > 0 && <div className="breakdown-item"><span>Fragile Handling</span><span>₹{result.fragileCharge}</span></div>}
                    {result.expressCharge > 0 && <div className="breakdown-item"><span>Express Priority</span><span>₹{result.expressCharge}</span></div>}
                    {form.insurance && <div className="breakdown-item"><span>Insurance</span><span>₹{result.insurance}</span></div>}
                    {form.appointment && <div className="breakdown-item"><span>Appointment Delivery</span><span>₹{result.appointment}</span></div>}
                    <div className="breakdown-item gst"><span>GST</span><span>₹{result.gst}</span></div>
                    <div className="breakdown-total"><span>Total Net Amount</span><span>₹{result.total}</span></div>
                  </div>
                )}

                <div className="result-footer">
                  <div className="footer-note">
                    <CheckCircle size={14} />
                    <span>All taxes included. No hidden charges.</span>
                  </div>
                  <button className="btn-proceed" onClick={() => window.location.href = '/create-order'}>
                    Proceed to Booking <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="empty-result">
                <Calculator size={48} />
                <h3>Ready to calculate?</h3>
                <p>Fill in the shipment details on the left and click "Get Live Quote" to see your freight estimate.</p>
                <div className="features">
                  <span>✓ Real-time rates</span>
                  <span>✓ Transparent pricing</span>
                  <span>✓ No hidden charges</span>
                </div>
                <button className="example-btn" onClick={quickFillExample}>
                  <Zap size={14} /> Try Example
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="b2b-footer">
        <div className="footer-content">
          <div className="footer-logo">
            <div className="logo-icon-small">FC</div>
            <span>Faith Cargo Logistics Pvt. Ltd.</span>
          </div>
          <div className="footer-links">
            <a href="#">Terms & Conditions</a>
            <a href="#">Privacy Policy</a>
            <a href="#">Contact Support</a>
          </div>
          <div className="footer-contact">
            <Phone size={14} /><span>+91 9818641504</span>
            <Mail size={14} /><span>care@faithcargo.com</span>
          </div>
        </div>
        <div className="footer-copyright">
          <p>&copy; 2024 Faith Cargo Logistics Pvt. Ltd. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

export default BaB2bRateCalculator;