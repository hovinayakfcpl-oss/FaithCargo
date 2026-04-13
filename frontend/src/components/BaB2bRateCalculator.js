import React, { useState } from "react";
import { 
  Truck, MapPin, Weight, Package, CreditCard, 
  Shield, Clock, Calendar, TrendingUp, DollarSign,
  Plus, Trash2, ChevronDown, ChevronUp, CheckCircle,
  AlertCircle, Zap, Award, Crown, FileText, Receipt,
  Percent, Scale, Fuel, Landmark, Building, Phone,
  Mail, Globe, Star, Users, Settings, HelpCircle,
  X, Calculator, ArrowRight, Warehouse, Navigation
} from "lucide-react";
import "./B2BRateCalculator.css";

function B2BRateCalculator() {
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

  const [dimensions, setDimensions] = useState([
    { qty: 1, length: "", width: "", height: "" }
  ]);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [activeTab, setActiveTab] = useState("surface");
  const [savedAddresses, setSavedAddresses] = useState([]);

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
      const res = await fetch("https://faithcargo.onrender.com/api/rates/b2b/calculate/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: form.origin,
          destination: form.destination,
          weight: actualWeight,
          invoiceValue: Number(form.invoiceValue),
          insurance: form.insurance,
          appointment: form.appointment,
          dimensions: dimensions,
          fragile: form.fragile,
          express: form.express,
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

      const freight = Number(data.freight_charge) || (chargeableWeight * 18);
      const gst = freight * 0.18;
      const fuel = freight * 0.10;
      const docket = 100;
      const fov = 75;
      const odaCharge = data.oda_charge || 0;
      
      let cod = (form.paymentMode === "COD" || form.paymentMode === "ToPay") ? 150 : 0;
      let handling = (totalQty === 1 && chargeableWeight > 70) ? 750 : 0;
      let fragileCharge = form.fragile ? 250 : 0;
      let expressCharge = form.express ? chargeableWeight * 5 : 0;
      let insuranceVal = form.insurance ? (parseFloat(form.invoiceValue) || 0) * 0.02 : 0;
      let appointmentVal = form.appointment ? 1500 : 0;

      let total = freight + gst + fuel + docket + fov + odaCharge + cod + handling + fragileCharge + expressCharge + insuranceVal + appointmentVal;

      if (total < 650) total = 650;

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
        fragileCharge,
        expressCharge,
        insurance: insuranceVal,
        appointment: appointmentVal,
        total: total.toFixed(2),
        totalQty,
        paymentMode: form.paymentMode,
        transitTime: data.transit_time || "2-4 days"
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
      fragile: false,
      express: false
    });
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
    setDimensions([{ qty: 2, length: "50", width: "40", height: "30" }]);
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
            <div className="badge">
              <Award size={16} />
              <span>ISO 9001:2015</span>
            </div>
            <div className="badge">
              <Star size={16} />
              <span>4.9 Rating</span>
            </div>
            <div className="badge">
              <Users size={16} />
              <span>500+ Clients</span>
            </div>
          </div>
        </div>
        <div className="header-title">
          <h2>B2B & BA Rate Calculator</h2>
          <p>Get instant freight quotes for your business shipments</p>
        </div>
      </div>

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

      <div className="b2b-layout">
        {/* Left Panel - Input Form */}
        <div className="b2b-form-panel">
          <div className="form-card">
            <div className="card-header">
              <h3>Shipment Details</h3>
              <p>Fill the information below to get accurate quote</p>
              <button className="quick-fill-btn" onClick={quickFillExample}>
                <Zap size={14} />
                Quick Fill Example
              </button>
            </div>

            {/* Route Section */}
            <div className="form-section">
              <div className="section-title">
                <MapPin size={18} />
                <span>Route Information</span>
              </div>
              <div className="form-row">
                <div className="input-group">
                  <label>Origin (City/Pincode)</label>
                  <div className="input-wrapper">
                    <MapPin size={16} className="input-icon" />
                    <input 
                      type="text" 
                      name="origin" 
                      placeholder="e.g., Delhi / 110001" 
                      value={form.origin}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div className="input-group">
                  <label>Destination (City/Pincode)</label>
                  <div className="input-wrapper">
                    <MapPin size={16} className="input-icon" />
                    <input 
                      type="text" 
                      name="destination" 
                      placeholder="e.g., Mumbai / 400001" 
                      value={form.destination}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Section */}
            <div className="form-section">
              <div className="section-title">
                <CreditCard size={18} />
                <span>Payment Mode</span>
              </div>
              <div className="form-row">
                <div className="input-group">
                  <label>Payment Mode</label>
                  <div className="input-wrapper">
                    <CreditCard size={16} className="input-icon" />
                    <select name="paymentMode" value={form.paymentMode} onChange={handleChange}>
                      <option value="" disabled>Select Payment Mode</option>
                      <option value="Prepaid">Prepaid</option>
                      <option value="COD">COD (Cash on Delivery)</option>
                      <option value="ToPay">To Pay</option>
                    </select>
                  </div>
                </div>
                {(form.paymentMode === "COD" || form.paymentMode === "ToPay") && (
                  <div className="input-group">
                    <label>COD Amount (₹)</label>
                    <div className="input-wrapper">
                      <DollarSign size={16} className="input-icon" />
                      <input 
                        type="number" 
                        name="codAmount" 
                        placeholder="Enter amount" 
                        value={form.codAmount}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Weight & Value Section */}
            <div className="form-section">
              <div className="section-title">
                <Weight size={18} />
                <span>Cargo Details</span>
              </div>
              <div className="form-row">
                <div className="input-group">
                  <label>Actual Weight (Kg) *</label>
                  <div className="input-wrapper">
                    <Weight size={16} className="input-icon" />
                    <input 
                      type="number" 
                      name="weight" 
                      placeholder="e.g., 25.5" 
                      value={form.weight}
                      onChange={handleChange}
                      step="0.1"
                    />
                  </div>
                </div>
                <div className="input-group">
                  <label>Invoice Value (₹)</label>
                  <div className="input-wrapper">
                    <FileText size={16} className="input-icon" />
                    <input 
                      type="number" 
                      name="invoiceValue" 
                      placeholder="e.g., 50000" 
                      value={form.invoiceValue}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Dimensions Section */}
            <div className="form-section">
              <div className="section-title">
                <Package size={18} />
                <span>Package Dimensions</span>
              </div>
              
              <div className="dimension-header">
                <span className="dim-label">Qty</span>
                <span className="dim-label">Length (cm)</span>
                <span className="dim-label">Width (cm)</span>
                <span className="dim-label">Height (cm)</span>
                <span></span>
              </div>

              {dimensions.map((d, i) => (
                <div key={i} className="dimension-row">
                  <input 
                    type="number" 
                    name="qty" 
                    value={d.qty} 
                    onChange={(e) => handleDimChange(i, e)} 
                    placeholder="Qty"
                    min="1"
                  />
                  <input 
                    type="number" 
                    name="length" 
                    value={d.length} 
                    onChange={(e) => handleDimChange(i, e)} 
                    placeholder="L"
                    step="0.1"
                  />
                  <input 
                    type="number" 
                    name="width" 
                    value={d.width} 
                    onChange={(e) => handleDimChange(i, e)} 
                    placeholder="W"
                    step="0.1"
                  />
                  <input 
                    type="number" 
                    name="height" 
                    value={d.height} 
                    onChange={(e) => handleDimChange(i, e)} 
                    placeholder="H"
                    step="0.1"
                  />
                  {dimensions.length > 1 && (
                    <button className="remove-dim-btn" onClick={() => removeBox(i)}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              
              <button className="add-dim-btn" onClick={addBox}>
                <Plus size={16} />
                Add Package
              </button>
            </div>

            {/* Additional Services */}
            <div className="form-section">
              <div className="section-title">
                <Shield size={18} />
                <span>Value Added Services</span>
              </div>
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input type="checkbox" name="insurance" checked={form.insurance} onChange={handleChange} />
                  <span>Insurance (2% of Invoice Value)</span>
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" name="appointment" checked={form.appointment} onChange={handleChange} />
                  <span>Appointment Delivery (₹1500)</span>
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" name="fragile" checked={form.fragile} onChange={handleChange} />
                  <span>Fragile Handling (₹250)</span>
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" name="express" checked={form.express} onChange={handleChange} />
                  <span>Express Priority (₹5/kg extra)</span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              <button className="btn-calculate" onClick={calculateRate} disabled={loading}>
                {loading ? (
                  <span><i className="fas fa-spinner fa-spin"></i> Calculating...</span>
                ) : (
                  <>
                    <Calculator size={18} />
                    Get Live Quote
                  </>
                )}
              </button>
              <button className="btn-reset" onClick={resetForm}>
                Reset All
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="b2b-result-panel">
          {result ? (
            <div className="result-card">
              <div className="result-header">
                <div className="quote-badge">
                  <Zap size={20} />
                  <span>Instant Quote</span>
                </div>
                <div className="quote-amount">
                  <small>Total Amount</small>
                  <h2>₹{result.total}</h2>
                  {result.total === "650.00" && <span className="min-badge">Min ₹650 Applied</span>}
                </div>
              </div>

              <div className="result-summary">
                <div className="summary-item">
                  <div className="summary-icon">
                    <Package size={20} />
                  </div>
                  <div className="summary-info">
                    <label>Chargeable Weight</label>
                    <strong>{result.chargeable} Kg</strong>
                    <small>Actual: {result.actualWeight} Kg | Vol: {result.volumetric} Kg</small>
                  </div>
                </div>
                <div className="summary-item">
                  <div className="summary-icon">
                    <MapPin size={20} />
                  </div>
                  <div className="summary-info">
                    <label>Route</label>
                    <strong>{result.from_zone || 'N/A'} → {result.to_zone || 'N/A'}</strong>
                    <small>Rate: ₹{result.ratePerKg}/kg</small>
                  </div>
                </div>
                <div className="summary-item">
                  <div className="summary-icon">
                    <Clock size={20} />
                  </div>
                  <div className="summary-info">
                    <label>Transit Time</label>
                    <strong>{result.transitTime}</strong>
                    <small>Estimated delivery</small>
                  </div>
                </div>
              </div>

              <div className="breakdown-toggle" onClick={() => setShowBreakdown(!showBreakdown)}>
                <span>Charges Breakdown</span>
                {showBreakdown ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>

              {showBreakdown && (
                <div className="breakdown-list">
                  <div className="breakdown-item">
                    <span>Basic Freight</span>
                    <span>₹{result.freight}</span>
                  </div>
                  <div className="breakdown-item">
                    <span>Fuel Surcharge (10%)</span>
                    <span>₹{result.fuel}</span>
                  </div>
                  <div className="breakdown-item">
                    <span>Docket / Waybill Charge</span>
                    <span>₹100</span>
                  </div>
                  <div className="breakdown-item">
                    <span>FOV Charges</span>
                    <span>₹75</span>
                  </div>
                  {result.odaCharge > 0 && (
                    <div className="breakdown-item oda">
                      <span>ODA Charges</span>
                      <span>₹{result.odaCharge}</span>
                    </div>
                  )}
                  {result.cod > 0 && (
                    <div className="breakdown-item">
                      <span>COD/ToPay Fee</span>
                      <span>₹{result.cod}</span>
                    </div>
                  )}
                  {result.handling > 0 && (
                    <div className="breakdown-item">
                      <span>Special Handling</span>
                      <span>₹{result.handling}</span>
                    </div>
                  )}
                  {result.fragileCharge > 0 && (
                    <div className="breakdown-item">
                      <span>Fragile Handling</span>
                      <span>₹{result.fragileCharge}</span>
                    </div>
                  )}
                  {result.expressCharge > 0 && (
                    <div className="breakdown-item">
                      <span>Express Priority</span>
                      <span>₹{result.expressCharge}</span>
                    </div>
                  )}
                  {form.insurance && (
                    <div className="breakdown-item">
                      <span>Insurance (2%)</span>
                      <span>₹{result.insurance}</span>
                    </div>
                  )}
                  {form.appointment && (
                    <div className="breakdown-item">
                      <span>Appointment Delivery</span>
                      <span>₹{result.appointment}</span>
                    </div>
                  )}
                  <div className="breakdown-item gst">
                    <span>GST (18% on Freight)</span>
                    <span>₹{result.gst}</span>
                  </div>
                  <div className="breakdown-total">
                    <span>Total Net Amount</span>
                    <span>₹{result.total}</span>
                  </div>
                </div>
              )}

              <div className="result-footer">
                <div className="footer-note">
                  <CheckCircle size={14} />
                  <span>All taxes included. No hidden charges.</span>
                </div>
                <button className="btn-proceed" onClick={() => window.location.href = '/create-order'}>
                  Proceed to Booking
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">
                <Calculator size={64} />
              </div>
              <h3>Ready to calculate?</h3>
              <p>Fill in the shipment details on the left and click "Get Live Quote" to see your freight estimate.</p>
              <div className="empty-features">
                <div className="feature">
                  <CheckCircle size={16} />
                  <span>Real-time rates</span>
                </div>
                <div className="feature">
                  <CheckCircle size={16} />
                  <span>Transparent pricing</span>
                </div>
                <div className="feature">
                  <CheckCircle size={16} />
                  <span>No hidden charges</span>
                </div>
              </div>
              <button className="example-btn" onClick={quickFillExample}>
                <Zap size={16} />
                Try Example
              </button>
            </div>
          )}
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
            <Phone size={14} />
            <span>+91 9818641504</span>
            <Mail size={14} />
            <span>care@faithcargo.com</span>
          </div>
        </div>
        <div className="footer-copyright">
          <p>&copy; 2024 Faith Cargo Logistics Pvt. Ltd. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

export default B2BRateCalculator;