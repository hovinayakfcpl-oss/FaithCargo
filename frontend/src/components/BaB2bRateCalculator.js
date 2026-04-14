import React, { useState, useEffect } from "react";
import { 
  Truck, MapPin, Weight, Package, CreditCard, 
  Shield, Clock, TrendingUp, DollarSign,
  Plus, Trash2, ChevronDown, ChevronUp, CheckCircle,
  Zap, Award, Star, Users, Phone, Mail, Calculator,
  ArrowRight, Building, FileText, X, Circle
} from "lucide-react";
import "./B2BRateCalculator.css";

function BaB2bRateCalculator() {
  const [form, setForm] = useState({
    origin: "",
    destination: "",
    weight: "",
    invoiceValue: "",
    codAmount: "",
    paymentMode: "", 
    insurance: false,
    appointment: false,
    express: false
  });

  const [originDetails, setOriginDetails] = useState({ city: "", state: "" });
  const [destinationDetails, setDestinationDetails] = useState({ city: "", state: "" });
  const [dimensions, setDimensions] = useState([
    { id: 1, qty: 1, length: "", width: "", height: "" }
  ]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [activeTab, setActiveTab] = useState("surface");
  let nextId = 2;

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
  const handleDimChange = (id, field, value) => {
    setDimensions(dimensions.map(dim => 
      dim.id === id ? { ...dim, [field]: value } : dim
    ));
  };

  // ADD BOX
  const addBox = () => {
    setDimensions([...dimensions, { id: nextId++, qty: 1, length: "", width: "", height: "" }]);
  };

  // REMOVE BOX
  const removeBox = (id) => {
    if (dimensions.length > 1) {
      setDimensions(dimensions.filter(dim => dim.id !== id));
    }
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

  // CALCULATE RATE LOGIC
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

    try {
      const endpoint = activeTab === 'air' 
        ? "https://faithcargo.onrender.com/api/rates/air/calculate/"
        : "https://faithcargo.onrender.com/api/rates/b2b/calculate/";
      
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: form.origin,
          destination: form.destination,
          weight: actualWeight,
          invoiceValue: Number(form.invoiceValue),
          insurance: form.insurance,
          appointment: form.appointment,
          dimensions: dimensions.map(d => ({ qty: d.qty, length: d.length, width: d.width, height: d.height })),
          express: form.express || activeTab === 'express',
          paymentMode: form.paymentMode,
          codAmount: Number(form.codAmount)
        })
      });

      const data = await res.json();

      if (data.error) {
        alert(data.error);
        setLoading(false);
        return;
      }

      const freight = Number(data.freight_charge) || (chargeableWeight * (activeTab === 'air' ? 45 : 18));
      const gst = freight * 0.18;
      const fuel = freight * 0.10;
      const docket = 100;
      const fov = 75;
      const odaCharge = data.oda_charge || 0;
      
      let cod = (form.paymentMode === "COD" || form.paymentMode === "ToPay") ? 150 : 0;
      let handling = (totalQty === 1 && chargeableWeight > 70) ? 750 : 0;
      let expressCharge = (form.express || activeTab === 'express') ? chargeableWeight * 5 : 0;
      let insuranceVal = form.insurance ? (parseFloat(form.invoiceValue) || 0) * 0.02 : 0;
      let appointmentVal = form.appointment ? 1500 : 0;

      let total = freight + gst + fuel + docket + fov + odaCharge + cod + handling + expressCharge + insuranceVal + appointmentVal;

      if (total < 650) total = 650;

      const transportType = activeTab === 'air' ? 'Air Cargo' : (activeTab === 'express' ? 'Express Delivery' : 'Surface Transport');
      const transitTime = activeTab === 'air' ? '1-2 days' : (activeTab === 'express' ? '1-3 days' : '2-5 days');

      setResult({
        ...data,
        actualWeight,
        volumetric: volumetric.toFixed(2),
        chargeable: chargeableWeight.toFixed(2),
        ratePerKg: chargeableWeight > 0 ? (freight / chargeableWeight).toFixed(2) : 0,
        freight,
        fuel: fuel.toFixed(2),
        gst: gst.toFixed(2),
        odaCharge,
        cod,
        handling,
        expressCharge,
        insurance: insuranceVal,
        appointment: appointmentVal,
        total: total.toFixed(2),
        totalQty,
        paymentMode: form.paymentMode,
        transitTime: transitTime,
        transportType: transportType,
        originCity: originDetails.city,
        originState: originDetails.state,
        destCity: destinationDetails.city,
        destState: destinationDetails.state
      });

    } catch (err) {
      alert("Server Error! Please check your internet connection.");
      console.error(err);
    }

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
      express: false
    });
    setOriginDetails({ city: "", state: "" });
    setDestinationDetails({ city: "", state: "" });
    setDimensions([{ id: 1, qty: 1, length: "", width: "", height: "" }]);
    nextId = 2;
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
      express: false
    });
    fetchPincodeDetails("110001", "origin");
    fetchPincodeDetails("400001", "destination");
    setDimensions([{ id: 1, qty: 2, length: "50", width: "40", height: "30" }]);
    nextId = 2;
  };

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
            <div className="badge"><Award size={14} /><span>ISO 9001:2015</span></div>
            <div className="badge"><Star size={14} /><span>4.9 Rating</span></div>
            <div className="badge"><Users size={14} /><span>500+ Clients</span></div>
          </div>
        </div>
        <div className="header-title">
          <h2>BA & B2B Rate Calculator</h2>
          <p>Get instant freight quotes for your business shipments</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="b2b-tabs">
        <button className={`tab-btn ${activeTab === 'surface' ? 'active' : ''}`} onClick={() => setActiveTab('surface')}>
          <Truck size={14} /> Surface Transport
        </button>
        <button className={`tab-btn ${activeTab === 'express' ? 'active' : ''}`} onClick={() => setActiveTab('express')}>
          <Zap size={14} /> Express Delivery
        </button>
        <button className={`tab-btn ${activeTab === 'air' ? 'active' : ''}`} onClick={() => setActiveTab('air')}>
          <TrendingUp size={14} /> Air Cargo
        </button>
      </div>

      {/* Route Row - Origin & Destination Side by Side */}
      <div className="route-row">
        <div className="route-box">
          <label><MapPin size={12} /> Origin Pincode *</label>
          <input 
            type="text" 
            placeholder="Enter 6-digit pincode" 
            value={form.origin}
            onChange={(e) => handlePincodeChange(e, "origin")}
            maxLength="6"
          />
          {originDetails.city && (
            <div className="location-tag">
              <Building size={10} />
              <span>{originDetails.city}, {originDetails.state}</span>
            </div>
          )}
        </div>
        <div className="route-arrow">→</div>
        <div className="route-box">
          <label><MapPin size={12} /> Destination Pincode *</label>
          <input 
            type="text" 
            placeholder="Enter 6-digit pincode" 
            value={form.destination}
            onChange={(e) => handlePincodeChange(e, "destination")}
            maxLength="6"
          />
          {destinationDetails.city && (
            <div className="location-tag">
              <Building size={10} />
              <span>{destinationDetails.city}, {destinationDetails.state}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Calculator Card */}
      <div className="calculator-main-card">
        <div className="calculator-grid">
          {/* Left Side - Input Form */}
          <div className="input-section">
            <div className="form-row-2">
              <div className="form-group">
                <label><CreditCard size={12} /> Payment Mode</label>
                <select name="paymentMode" value={form.paymentMode} onChange={handleChange}>
                  <option value="" disabled>Select Payment Mode</option>
                  <option value="Prepaid">Prepaid</option>
                  <option value="COD">COD</option>
                  <option value="ToPay">To Pay</option>
                </select>
              </div>
              <div className="form-group">
                <label><Weight size={12} /> Weight (Kg) *</label>
                <input 
                  type="number" 
                  name="weight" 
                  placeholder="Enter weight" 
                  value={form.weight}
                  onChange={handleChange}
                  step="0.1"
                />
              </div>
            </div>

            {(form.paymentMode === "COD" || form.paymentMode === "ToPay") && (
              <div className="form-group">
                <label><DollarSign size={12} /> COD Amount (₹)</label>
                <input 
                  type="number" 
                  name="codAmount" 
                  placeholder="Enter COD amount" 
                  value={form.codAmount}
                  onChange={handleChange}
                />
              </div>
            )}

            <div className="form-row-2">
              <div className="form-group">
                <label><FileText size={12} /> Invoice Value (₹)</label>
                <input 
                  type="number" 
                  name="invoiceValue" 
                  placeholder="Enter invoice value" 
                  value={form.invoiceValue}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label><Package size={12} /> Package Dimensions</label>
                <button className="add-dim-btn" onClick={addBox}>
                  <Plus size={12} /> Add
                </button>
              </div>
            </div>

            {/* Dimensions Section - One Line */}
            <div className="dimensions-section">
              {dimensions.map((dim, idx) => (
                <div key={dim.id} className="dimension-row">
                  <input 
                    type="number" 
                    placeholder="Qty" 
                    value={dim.qty} 
                    onChange={(e) => handleDimChange(dim.id, 'qty', e.target.value)}
                    min="1"
                  />
                  <input 
                    type="number" 
                    placeholder="L (cm)" 
                    value={dim.length} 
                    onChange={(e) => handleDimChange(dim.id, 'length', e.target.value)}
                    step="0.1"
                  />
                  <input 
                    type="number" 
                    placeholder="W (cm)" 
                    value={dim.width} 
                    onChange={(e) => handleDimChange(dim.id, 'width', e.target.value)}
                    step="0.1"
                  />
                  <input 
                    type="number" 
                    placeholder="H (cm)" 
                    value={dim.height} 
                    onChange={(e) => handleDimChange(dim.id, 'height', e.target.value)}
                    step="0.1"
                  />
                  {dimensions.length > 1 && (
                    <button className="remove-dim-btn" onClick={() => removeBox(dim.id)}>
                      <X size={14} />
                    </button>
                  )}
                  {idx === dimensions.length - 1 && dimensions.length === 1 && (
                    <div className="dim-placeholder"></div>
                  )}
                </div>
              ))}
            </div>

            {/* Services */}
            <div className="services-group">
              <label className="checkbox-label">
                <input type="checkbox" name="insurance" checked={form.insurance} onChange={handleChange} />
                <span>Insurance (2% of Invoice Value)</span>
              </label>
              <label className="checkbox-label">
                <input type="checkbox" name="appointment" checked={form.appointment} onChange={handleChange} />
                <span>Appointment Delivery (₹1500)</span>
              </label>
              <label className="checkbox-label">
                <input type="checkbox" name="express" checked={form.express} onChange={handleChange} />
                <span>Express Priority (₹5/kg extra)</span>
              </label>
            </div>

            <button className="btn-calculate" onClick={calculateRate} disabled={loading}>
              {loading ? "Calculating..." : "Get Live Quote"}
            </button>
          </div>

          {/* Right Side - Results */}
          <div className="result-section">
            {result ? (
              <div className="result-content">
                <div className="result-header">
                  <div className="quote-badge">
                    <Zap size={14} />
                    <span>{result.transportType}</span>
                  </div>
                  <div className="total-amount">
                    <small>Total Amount</small>
                    <h3>₹{result.total}</h3>
                    {result.total === "650.00" && <span className="min-badge">Min ₹650</span>}
                  </div>
                </div>

                <div className="weight-stats">
                  <div><span>Actual</span><strong>{result.actualWeight} kg</strong></div>
                  <div><span>Volumetric</span><strong>{result.volumetric} kg</strong></div>
                  <div><span>Chargeable</span><strong>{result.chargeable} kg</strong></div>
                  <div><span>Rate/kg</span><strong>₹{result.ratePerKg}</strong></div>
                  <div><span>Transit</span><strong>{result.transitTime}</strong></div>
                </div>

                <div className="breakdown-toggle" onClick={() => setShowBreakdown(!showBreakdown)}>
                  <span>Charges Breakdown</span>
                  {showBreakdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>

                {showBreakdown && (
                  <div className="breakdown-list">
                    <div className="breakdown-item"><span>Basic Freight</span><span>₹{result.freight}</span></div>
                    <div className="breakdown-item"><span>Fuel Surcharge (10%)</span><span>₹{result.fuel}</span></div>
                    <div className="breakdown-item"><span>Docket Charge</span><span>₹100</span></div>
                    <div className="breakdown-item"><span>FOV Charges</span><span>₹75</span></div>
                    {result.odaCharge > 0 && <div className="breakdown-item oda"><span>ODA Charges</span><span>₹{result.odaCharge}</span></div>}
                    {result.cod > 0 && <div className="breakdown-item"><span>COD/ToPay Fee</span><span>₹{result.cod}</span></div>}
                    {result.handling > 0 && <div className="breakdown-item"><span>Special Handling</span><span>₹{result.handling}</span></div>}
                    {result.expressCharge > 0 && <div className="breakdown-item"><span>Express Priority</span><span>₹{result.expressCharge}</span></div>}
                    {form.insurance && <div className="breakdown-item"><span>Insurance (2%)</span><span>₹{result.insurance}</span></div>}
                    {form.appointment && <div className="breakdown-item"><span>Appointment Delivery</span><span>₹{result.appointment}</span></div>}
                    <div className="breakdown-item gst"><span>GST (18% on Freight)</span><span>₹{result.gst}</span></div>
                    <div className="breakdown-total"><span>Total Net Amount</span><span>₹{result.total}</span></div>
                  </div>
                )}

                <button className="btn-proceed" onClick={() => window.location.href = '/create-order'}>
                  Proceed to Booking <ArrowRight size={14} />
                </button>
              </div>
            ) : (
              <div className="empty-result">
                <Calculator size={40} />
                <h4>Ready to calculate?</h4>
                <p>Fill details and click "Get Live Quote"</p>
                <button className="example-btn" onClick={quickFillExample}>
                  <Zap size={12} /> Try Example
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
            <Phone size={12} /><span>+91 9818641504</span>
            <Mail size={12} /><span>care@faithcargo.com</span>
          </div>
        </div>
        <div className="footer-copyright">
          <p>&copy; 2024 Faith Cargo Logistics Pvt. Ltd.</p>
        </div>
      </div>
    </div>
  );
}

export default BaB2bRateCalculator;