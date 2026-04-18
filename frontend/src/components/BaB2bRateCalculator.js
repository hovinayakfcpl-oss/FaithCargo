import React, { useState, useEffect } from "react";
import { 
  Truck, MapPin, Weight, Package, CreditCard, 
  Shield, Clock, TrendingUp, DollarSign,
  Plus, Trash2, ChevronDown, ChevronUp, CheckCircle,
  Zap, Award, Star, Users, Phone, Mail, Calculator,
  ArrowRight, Building, FileText, User, LogOut,
  AlertCircle
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

  const [originDetails, setOriginDetails] = useState({ city: "", state: "", zone: "", isODA: false });
  const [destinationDetails, setDestinationDetails] = useState({ city: "", state: "", zone: "", isODA: false });
  const [dimensions, setDimensions] = useState([
    { qty: 1, length: "", width: "", height: "" }
  ]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [activeTab, setActiveTab] = useState("surface");
  const [zoneMapping, setZoneMapping] = useState({});
  const [odaMessage, setOdaMessage] = useState("");
  const [isLoadingRates, setIsLoadingRates] = useState(false);

  // ========== FETCH DEFAULT RATE MATRIX FROM DATABASE ==========
  const fetchDefaultRateMatrix = async () => {
    try {
      console.log("📊 Fetching default rate matrix from API...");
      const response = await fetch(`https://faithcargo.onrender.com/api/rates/matrix/`);
      
      if (response.ok) {
        const rates = await response.json();
        console.log("✅ Default Rate Matrix from DB:", rates);
        
        const mapping = {};
        if (Array.isArray(rates)) {
          rates.forEach(rate => {
            if (!mapping[rate.from_zone]) mapping[rate.from_zone] = {};
            mapping[rate.from_zone][rate.to_zone] = rate.rate;
          });
        }
        return mapping;
      } else {
        console.log("⚠️ Rate matrix API returned status:", response.status);
        return getFallbackRateMatrix();
      }
    } catch (error) {
      console.error("Error fetching default rate matrix:", error);
      return getFallbackRateMatrix();
    }
  };

  // ========== FETCH CLIENT-SPECIFIC RATES ==========
  const fetchClientSpecificRates = async (clientId) => {
    setIsLoadingRates(true);
    try {
      console.log("📊 Fetching rates for client:", clientId || "MASTER");
      
      // First, get default rate matrix from database
      let finalMapping = await fetchDefaultRateMatrix();
      
      // If client is logged in, fetch and override client-specific rates
      if (clientId) {
        const response = await fetch(`https://faithcargo.onrender.com/api/rates/client/${clientId}/`);
        if (response.ok) {
          const data = await response.json();
          console.log("✅ Client Rates from DB:", data.zone_rates);
          
          setClientRates(data.zone_rates || []);
          setClientPolicy(data.policy || null);
          
          // Override default rates with client-specific rates
          if (data.zone_rates && data.zone_rates.length > 0) {
            data.zone_rates.forEach(rate => {
              if (!finalMapping[rate.from_zone]) finalMapping[rate.from_zone] = {};
              finalMapping[rate.from_zone][rate.to_zone] = rate.rate;
              console.log(`✅ Client Rate Applied: ${rate.from_zone} → ${rate.to_zone} = ₹${rate.rate}`);
            });
          }
        } else {
          console.log("⚠️ Client rates API failed, using master rates");
        }
      }
      
      console.log("🎯 Final Rate Matrix Ready");
      setZoneMapping(finalMapping);
    } catch (error) {
      console.error("Error fetching rates:", error);
      setZoneMapping(getFallbackRateMatrix());
    } finally {
      setIsLoadingRates(false);
    }
  };

  // ========== FALLBACK RATE MATRIX (if API fails) ==========
  const getFallbackRateMatrix = () => {
    return {
      'N1': { 'N1': 18, 'N2': 20, 'N3': 22, 'C1': 19, 'W1': 21, 'W2': 23, 'S1': 24, 'S2': 26, 'E1': 25, 'NE1': 30, 'NE2': 32 },
      'N2': { 'N1': 20, 'N2': 18, 'N3': 20, 'C1': 21, 'W1': 23, 'W2': 25, 'S1': 26, 'S2': 28, 'E1': 27, 'NE1': 32, 'NE2': 34 },
      'N3': { 'N1': 22, 'N2': 20, 'N3': 18, 'C1': 23, 'W1': 25, 'W2': 27, 'S1': 28, 'S2': 30, 'E1': 29, 'NE1': 34, 'NE2': 36 },
      'C1': { 'N1': 19, 'N2': 21, 'N3': 23, 'C1': 18, 'W1': 20, 'W2': 22, 'S1': 23, 'S2': 25, 'E1': 24, 'NE1': 30, 'NE2': 32 },
      'W1': { 'N1': 21, 'N2': 23, 'N3': 25, 'C1': 20, 'W1': 18, 'W2': 20, 'S1': 22, 'S2': 24, 'E1': 23, 'NE1': 32, 'NE2': 34 },
      'W2': { 'N1': 23, 'N2': 25, 'N3': 27, 'C1': 22, 'W1': 20, 'W2': 18, 'S1': 24, 'S2': 26, 'E1': 25, 'NE1': 34, 'NE2': 36 },
      'S1': { 'N1': 24, 'N2': 26, 'N3': 28, 'C1': 23, 'W1': 22, 'W2': 24, 'S1': 18, 'S2': 20, 'E1': 22, 'NE1': 35, 'NE2': 37 },
      'S2': { 'N1': 26, 'N2': 28, 'N3': 30, 'C1': 25, 'W1': 24, 'W2': 26, 'S1': 20, 'S2': 18, 'E1': 24, 'NE1': 37, 'NE2': 39 },
      'E1': { 'N1': 25, 'N2': 27, 'N3': 29, 'C1': 24, 'W1': 23, 'W2': 25, 'S1': 22, 'S2': 24, 'E1': 18, 'NE1': 32, 'NE2': 34 },
      'NE1': { 'N1': 30, 'N2': 32, 'N3': 34, 'C1': 30, 'W1': 32, 'W2': 34, 'S1': 35, 'S2': 37, 'E1': 32, 'NE1': 25, 'NE2': 28 },
      'NE2': { 'N1': 32, 'N2': 34, 'N3': 36, 'C1': 32, 'W1': 34, 'W2': 36, 'S1': 37, 'S2': 39, 'E1': 34, 'NE1': 28, 'NE2': 25 }
    };
  };

  // ========== CLIENT LOGIN FUNCTIONS ==========
  const handleClientLogin = async () => {
    setLoginError("");
    try {
      const response = await fetch("https://faithcargo.onrender.com/api/accounts/client-login/", {
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
        
        // Fetch rates (default + client-specific)
        await fetchClientSpecificRates(loginCredentials.clientId);
      } else {
        setLoginError(data.error || "Invalid credentials");
      }
    } catch (error) {
      console.error("Login error:", error);
      setLoginError("Server error. Please try again.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("clientToken");
    localStorage.removeItem("clientId");
    setCurrentUser(null);
    setIsClientLoggedIn(false);
    setClientRates(null);
    setClientPolicy(null);
    // Reset to default rate matrix
    fetchClientSpecificRates(null);
    resetForm();
  };

  // Check for existing session on load
  useEffect(() => {
    const savedClientId = localStorage.getItem("clientId");
    fetchClientSpecificRates(savedClientId);
    
    if (savedClientId) {
      setIsClientLoggedIn(true);
      fetch(`https://faithcargo.onrender.com/api/accounts/client/${savedClientId}/`)
        .then(res => res.json())
        .then(data => {
          if (data.success) setCurrentUser(data.user);
        })
        .catch(console.error);
    }
  }, []);

  // ========== CHECK ODA STATUS FROM PINCODE API ==========
  const checkPincodeODA = async (pincode) => {
    try {
      const response = await fetch(`https://faithcargo.onrender.com/api/pincode/zone/${pincode}/`);
      if (response.ok) {
        const data = await response.json();
        return { 
          isODA: data.oda || false, 
          zone: data.zone, 
          city: data.city, 
          state: data.state 
        };
      }
      const firstDigit = pincode.charAt(0);
      const zoneMap = {
        '1': 'N1', '2': 'N2', '3': 'N3',
        '4': 'C1', '5': 'W1', '6': 'W2',
        '7': 'S1', '8': 'S2', '9': 'E1',
        '0': 'NE1'
      };
      return { 
        isODA: false, 
        zone: zoneMap[firstDigit] || 'NE2', 
        city: "", 
        state: "" 
      };
    } catch (error) {
      console.error("Error checking ODA:", error);
      return { isODA: false, zone: null, city: null, state: null };
    }
  };

  // Fetch pincode details with ODA status
  const fetchPincodeDetails = async (pincode, type) => {
    if (pincode && pincode.length === 6) {
      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
        const data = await response.json();
        
        let city = "", state = "";
        if (data[0]?.Status === "Success") {
          const postOffice = data[0].PostOffice[0];
          city = postOffice.District;
          state = postOffice.State;
        }
        
        const odaData = await checkPincodeODA(pincode);
        
        const details = {
          city: city,
          state: state,
          zone: odaData.zone,
          isODA: odaData.isODA
        };
        
        if (type === "origin") {
          setOriginDetails(details);
        } else {
          setDestinationDetails(details);
        }
        
        if (odaData.isODA) {
          setOdaMessage(`⚠️ ${type === "origin" ? "Origin" : "Destination"} pincode ${pincode} is an ODA area. Extra charges will apply.`);
          setTimeout(() => setOdaMessage(""), 5000);
        }
      } catch (error) {
        console.error("Error fetching pincode:", error);
      }
    }
  };

  // Get zone from pincode
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

  // 🔥 FIXED: Get rate from zone mapping with better logging
  const getRateFromZones = (originZone, destZone) => {
    console.log(`🔍 Looking for rate: ${originZone} → ${destZone}`);
    
    if (zoneMapping && zoneMapping[originZone] && zoneMapping[originZone][destZone]) {
      const rate = zoneMapping[originZone][destZone];
      console.log(`✅ Rate found: ${originZone} → ${destZone} = ₹${rate}/kg`);
      return rate;
    }
    
    // Fallback default rate
    let defaultRate = 18;
    if (activeTab === 'express') defaultRate = 25;
    if (activeTab === 'air') defaultRate = 45;
    
    console.log(`⚠️ Rate not found for ${originZone}→${destZone}, using default: ₹${defaultRate}/kg`);
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
        setOriginDetails({ city: "", state: "", zone: "", isODA: false });
      } else {
        setDestinationDetails({ city: "", state: "", zone: "", isODA: false });
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

  // CALCULATE RATE LOGIC with Zone Matrix
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
    
    // CHECK ODA STATUS
    let odaCharge = 0;
    let isODAArea = false;
    
    try {
      const [originODA, destODA] = await Promise.all([
        checkPincodeODA(form.origin),
        checkPincodeODA(form.destination)
      ]);
      
      isODAArea = originODA.isODA || destODA.isODA;
      
      if (isODAArea) {
        const weightBasedODA = chargeableWeight * 3;
        odaCharge = Math.max(650, weightBasedODA);
        console.log(`ODA Charge: ₹${odaCharge} (${chargeableWeight}kg × 3 = ₹${weightBasedODA}, min ₹650)`);
      }
    } catch (error) {
      console.error("ODA check error:", error);
    }
    
    const charges = getClientCharges();
    
    // 🔥 GET ZONE-BASED RATE FROM MATRIX
    const originZone = getZoneFromPincode(form.origin);
    const destZone = getZoneFromPincode(form.destination);
    const zoneRate = getRateFromZones(originZone, destZone);
    
    const freight = chargeableWeight * zoneRate;
    const gst = freight * (charges.gstPercent / 100);
    const fuel = freight * (charges.fuelPercent / 100);
    const docket = charges.docketCharge;
    const fov = charges.fovCharge;
    
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
      actualWeight: actualWeight.toFixed(2),
      volumetric: volumetric.toFixed(2),
      chargeable: chargeableWeight.toFixed(2),
      ratePerKg: zoneRate.toFixed(2),
      freight: freight.toFixed(2),
      fuel: fuel.toFixed(2),
      gst: gst.toFixed(2),
      odaCharge: odaCharge.toFixed(2),
      isODAArea: isODAArea,
      cod: cod.toFixed(2),
      handling: handling.toFixed(2),
      fragileCharge: fragileCharge.toFixed(2),
      expressCharge: expressCharge.toFixed(2),
      insurance: insuranceVal.toFixed(2),
      appointment: appointmentVal.toFixed(2),
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

    console.log("✅ Calculation complete:", { originZone, destZone, zoneRate, freight, total });
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
    setOriginDetails({ city: "", state: "", zone: "", isODA: false });
    setDestinationDetails({ city: "", state: "", zone: "", isODA: false });
    setDimensions([{ qty: 1, length: "", width: "", height: "" }]);
    setResult(null);
    setOdaMessage("");
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
      {odaMessage && (
        <div className="oda-warning-message">
          <AlertCircle size={18} />
          <span>{odaMessage}</span>
        </div>
      )}

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

      {showLoginModal && <LoginModal />}

      <div className="b2b-tabs">
        <button className={`tab-btn ${activeTab === 'surface' ? 'active' : ''}`} onClick={() => setActiveTab('surface')}>
          <Truck size={18} /> Surface Transport
        </button>
        <button className={`tab-btn ${activeTab === 'express' ? 'active' : ''}`} onClick={() => setActiveTab('express')}>
          <Zap size={18} /> Express Delivery
        </button>
        <button className={`tab-btn ${activeTab === 'air' ? 'active' : ''}`} onClick={() => setActiveTab('air')}>
          <TrendingUp size={18} /> Air Cargo
        </button>
      </div>

      <div className="calculator-main-card">
        <div className="calculator-grid">
          <div className="input-section">
            <div className="section-title">
              <Calculator size={20} />
              <h3>Shipment Details</h3>
              <button className="quick-fill-btn" onClick={quickFillExample}>
                <Zap size={14} /> Quick Fill
              </button>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label><MapPin size={16} /> Origin Pincode *</label>
                <input type="text" name="origin" placeholder="Enter 6-digit pincode" value={form.origin} onChange={(e) => handlePincodeChange(e, "origin")} maxLength="6" />
                {originDetails.city && (
                  <div className="location-detail">
                    <Building size={14} />
                    <span>{originDetails.city}, {originDetails.state}</span>
                    {originDetails.isODA && <span className="oda-badge">ODA Area</span>}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label><MapPin size={16} /> Destination Pincode *</label>
                <input type="text" name="destination" placeholder="Enter 6-digit pincode" value={form.destination} onChange={(e) => handlePincodeChange(e, "destination")} maxLength="6" />
                {destinationDetails.city && (
                  <div className="location-detail">
                    <Building size={14} />
                    <span>{destinationDetails.city}, {destinationDetails.state}</span>
                    {destinationDetails.isODA && <span className="oda-badge">ODA Area</span>}
                  </div>
                )}
              </div>
            </div>

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
                <input type="number" name="weight" placeholder="Enter weight" value={form.weight} onChange={handleChange} step="0.1" />
              </div>
              <div className="form-group half-width">
                <label><FileText size={16} /> Invoice Value (₹)</label>
                <input type="number" name="invoiceValue" placeholder="Value" value={form.invoiceValue} onChange={handleChange} />
              </div>
            </div>

            {(form.paymentMode === "COD" || form.paymentMode === "ToPay") && (
              <div className="form-group">
                <label><DollarSign size={16} /> COD Amount (₹)</label>
                <input type="number" name="codAmount" placeholder="Enter COD amount" value={form.codAmount} onChange={handleChange} />
              </div>
            )}

            <div className="dimensions-section">
              <div className="dimensions-header">
                <label><Package size={16} /> Package Dimensions</label>
                <button className="add-dim-btn" onClick={addBox}><Plus size={14} /> Add Package</button>
              </div>
              {dimensions.map((d, i) => (
                <div key={i} className="dimension-row">
                  <div className="dim-input"><span className="dim-label">Qty</span><input type="number" name="qty" value={d.qty} onChange={(e) => handleDimChange(i, e)} placeholder="Qty" min="1" /></div>
                  <div className="dim-input"><span className="dim-label">L (cm)</span><input type="number" name="length" value={d.length} onChange={(e) => handleDimChange(i, e)} placeholder="Length" step="0.1" /></div>
                  <div className="dim-input"><span className="dim-label">W (cm)</span><input type="number" name="width" value={d.width} onChange={(e) => handleDimChange(i, e)} placeholder="Width" step="0.1" /></div>
                  <div className="dim-input"><span className="dim-label">H (cm)</span><input type="number" name="height" value={d.height} onChange={(e) => handleDimChange(i, e)} placeholder="Height" step="0.1" /></div>
                  {dimensions.length > 1 && <button className="remove-dim-btn" onClick={() => removeBox(i)}><Trash2 size={14} /></button>}
                </div>
              ))}
            </div>

            <div className="services-section">
              <label><Shield size={16} /> Value Added Services</label>
              <div className="checkbox-group">
                <label><input type="checkbox" name="insurance" checked={form.insurance} onChange={handleChange} /> Insurance (2% of Invoice Value)</label>
                <label><input type="checkbox" name="appointment" checked={form.appointment} onChange={handleChange} /> Appointment Delivery</label>
                <label><input type="checkbox" name="fragile" checked={form.fragile} onChange={handleChange} /> Fragile Handling</label>
                <label><input type="checkbox" name="express" checked={form.express} onChange={handleChange} /> Express Priority</label>
              </div>
            </div>

            <div className="action-buttons">
              <button className="btn-calculate" onClick={calculateRate} disabled={loading}>{loading ? "Calculating..." : "Get Live Quote"}</button>
              <button className="btn-reset" onClick={resetForm}>Reset</button>
            </div>
          </div>

          <div className="result-section">
            {result ? (
              <div className="result-content">
                <div className="result-header">
                  <div className="quote-badge">
                    <Zap size={18} />
                    <span>{result.transportType}</span>
                    {isClientLoggedIn && <span className="custom-rate-badge">Custom Rate</span>}
                    {result.isODAArea && <span className="oda-badge-result">⚠️ ODA Applied</span>}
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
                    <div className="point-details"><strong>Origin</strong><p>{result.originCity || form.origin}</p><small>{result.originState}</small></div>
                  </div>
                  <div className="route-arrow">→</div>
                  <div className="route-point">
                    <div className="point-icon"><Truck size={16} /></div>
                    <div className="point-details"><strong>Destination</strong><p>{result.destCity || form.destination}</p><small>{result.destState}</small></div>
                  </div>
                </div>

                {result.originZone && result.destZone && (
                  <div className="zone-info">
                    <span>Zone: {result.originZone} → {result.destZone}</span>
                    <span>Rate: ₹{result.ratePerKg}/kg</span>
                  </div>
                )}

                <div className="weight-summary">
                  <div className="weight-item dark-text"><span>Actual Weight:</span><strong>{result.actualWeight} Kg</strong></div>
                  <div className="weight-item dark-text"><span>Volumetric Weight:</span><strong>{result.volumetric} Kg</strong></div>
                  <div className="weight-item dark-text"><span>Chargeable Weight:</span><strong>{result.chargeable} Kg</strong></div>
                </div>

                <div className="rate-transit-row">
                  <div className="rate-item"><span>Rate per Kg:</span><strong>₹{result.ratePerKg}</strong></div>
                  <div className="transit-item"><span>Transit Time:</span><strong>{result.transitTime}</strong></div>
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
                    {parseFloat(result.odaCharge) > 0 && <div className="breakdown-item oda"><span>ODA Charges (₹650 or ₹3/kg)</span><span>₹{result.odaCharge}</span></div>}
                    {parseFloat(result.cod) > 0 && <div className="breakdown-item"><span>COD/ToPay Fee</span><span>₹{result.cod}</span></div>}
                    {parseFloat(result.handling) > 0 && <div className="breakdown-item"><span>Special Handling</span><span>₹{result.handling}</span></div>}
                    {parseFloat(result.fragileCharge) > 0 && <div className="breakdown-item"><span>Fragile Handling</span><span>₹{result.fragileCharge}</span></div>}
                    {parseFloat(result.expressCharge) > 0 && <div className="breakdown-item"><span>Express Priority</span><span>₹{result.expressCharge}</span></div>}
                    {form.insurance && <div className="breakdown-item"><span>Insurance</span><span>₹{result.insurance}</span></div>}
                    {form.appointment && <div className="breakdown-item"><span>Appointment Delivery</span><span>₹{result.appointment}</span></div>}
                    <div className="breakdown-item gst"><span>GST</span><span>₹{result.gst}</span></div>
                    <div className="breakdown-total"><span>Total Net Amount</span><span>₹{result.total}</span></div>
                  </div>
                )}

                <div className="result-footer">
                  <div className="footer-note"><CheckCircle size={14} /><span>All taxes included. No hidden charges.</span></div>
                  <button className="btn-proceed" onClick={() => window.location.href = '/create-order'}>Proceed to Booking <ArrowRight size={14} /></button>
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
                  <span>✓ ODA charges included</span>
                  <span>✓ Zone-based rates</span>
                </div>
                <button className="example-btn" onClick={quickFillExample}><Zap size={14} /> Try Example</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="b2b-footer">
        <div className="footer-content">
          <div className="footer-logo"><div className="logo-icon-small">FC</div><span>Faith Cargo Logistics Pvt. Ltd.</span></div>
          <div className="footer-links"><a href="#">Terms & Conditions</a><a href="#">Privacy Policy</a><a href="#">Contact Support</a></div>
          <div className="footer-contact"><Phone size={14} /><span>+91 9818641504</span><Mail size={14} /><span>care@faithcargo.com</span></div>
        </div>
        <div className="footer-copyright"><p>&copy; 2024 Faith Cargo Logistics Pvt. Ltd. All rights reserved.</p></div>
      </div>
    </div>
  );
}

export default BaB2bRateCalculator;