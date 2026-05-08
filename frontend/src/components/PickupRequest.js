// src/components/PickupRequest.js - UPDATED & FIXED VERSION
import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  MapPin, Package, Truck, Calendar, Clock, Phone, User, 
  Building2, AlertCircle, CheckCircle, ArrowRight, 
  Weight, Box, Info, Send, Home,
  X, Plus, Minus,
  Shield, Award, Clock as ClockIcon,
  RefreshCw, Check, Users
} from "lucide-react";
import "./PickupRequest.css";

const API_BASE = "https://faithcargo.onrender.com/api/pickup";

function PickupRequest() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [pickupId, setPickupId] = useState("");
  const [activeTab, setActiveTab] = useState("pickup");
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [userRole, setUserRole] = useState("");
  const [clientsList, setClientsList] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  
  // Pickup Details
  const [pickup, setPickup] = useState({
    name: "",
    phone: "",
    address: "",
    pincode: "",
    city: "",
    state: ""
  });
  
  // Delivery Details
  const [delivery, setDelivery] = useState({
    name: "",
    phone: "",
    address: "",
    pincode: "",
    city: "",
    state: ""
  });
  
  // Shipment Details
  const [shipment, setShipment] = useState({
    weight: "",
    packages: 1,
    material: "General Cargo",
    specialInstructions: ""
  });
  
  // Schedule Details
  const [schedule, setSchedule] = useState({
    date: "",
    timeSlot: "Morning",
    preferredTime: ""
  });

  // Get user role from localStorage
  useEffect(() => {
    const role = localStorage.getItem("userRole") || localStorage.getItem("role");
    const token = localStorage.getItem("token") || localStorage.getItem("clientToken");
    
    setUserRole(role);
    
    // If admin, fetch clients list for dropdown
    if (role === "admin" || role === "Admin") {
      fetchClientsList();
    }
    
    if (!token) {
      showToast("Please login to create pickup request", "error");
    }
  }, []);

  // Fetch clients list for admin
  const fetchClientsList = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("https://faithcargo.onrender.com/api/user/clients/", {
        headers: { Authorization: `Token ${token}` }
      });
      if (response.data && response.data.success) {
        setClientsList(response.data.clients || []);
      }
    } catch (err) {
      console.error("Error fetching clients:", err);
      // Set mock clients for testing
      setClientsList([
        { id: 1, username: "fcpl001", company: "FCPL Corp", email: "fcpl001@faithcargo.com" },
        { id: 2, username: "fcpl002", company: "ABC Logistics", email: "abc@faithcargo.com" },
      ]);
    }
  };

  // Show toast notification
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 4000);
  };

  // Fetch location from pincode
  const fetchLocation = async (pincode, type) => {
    if (pincode && pincode.length === 6) {
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
        const data = await res.json();
        if (data?.[0]?.Status === "Success") {
          const postOffice = data[0].PostOffice[0];
          const location = {
            city: postOffice.District || "",
            state: postOffice.State || ""
          };
          if (type === "pickup") {
            setPickup(prev => ({ ...prev, ...location }));
          } else {
            setDelivery(prev => ({ ...prev, ...location }));
          }
        }
      } catch (err) {
        console.error("Error fetching location:", err);
      }
    }
  };

  // Handle pickup pincode change
  const handlePickupPincode = (e) => {
    const pincode = e.target.value;
    setPickup({ ...pickup, pincode });
    if (pincode.length === 6) {
      fetchLocation(pincode, "pickup");
    }
  };

  // Handle delivery pincode change
  const handleDeliveryPincode = (e) => {
    const pincode = e.target.value;
    setDelivery({ ...delivery, pincode });
    if (pincode.length === 6) {
      fetchLocation(pincode, "delivery");
    }
  };

  // Update package count
  const updatePackages = (delta) => {
    setShipment(prev => ({
      ...prev,
      packages: Math.max(1, prev.packages + delta)
    }));
  };

  // Validate form data
  const validateForm = () => {
    if (!pickup.name || !pickup.phone || !pickup.address || !pickup.pincode) {
      showToast("❌ Please fill all pickup details", "error");
      setActiveTab("pickup");
      return false;
    }
    if (!delivery.name || !delivery.phone || !delivery.address || !delivery.pincode) {
      showToast("❌ Please fill all delivery details", "error");
      setActiveTab("delivery");
      return false;
    }
    if (!shipment.weight || shipment.weight <= 0) {
      showToast("❌ Please enter valid weight", "error");
      setActiveTab("shipment");
      return false;
    }
    if (!schedule.date) {
      showToast("❌ Please select pickup date", "error");
      setActiveTab("schedule");
      return false;
    }
    if (pickup.phone.length !== 10) {
      showToast("❌ Please enter valid 10-digit phone number for pickup", "error");
      return false;
    }
    if (delivery.phone.length !== 10) {
      showToast("❌ Please enter valid 10-digit phone number for delivery", "error");
      return false;
    }
    if (pickup.pincode.length !== 6) {
      showToast("❌ Please enter valid 6-digit pincode for pickup", "error");
      return false;
    }
    if (delivery.pincode.length !== 6) {
      showToast("❌ Please enter valid 6-digit pincode for delivery", "error");
      return false;
    }
    return true;
  };

  // Submit pickup request
  const submitRequest = async () => {
    if (!validateForm()) return;
    
    // Get token based on role
    let token;
    if (userRole === "admin" || userRole === "Admin") {
      token = localStorage.getItem("token");
    } else {
      token = localStorage.getItem("clientToken") || localStorage.getItem("token");
    }
    
    if (!token) {
      showToast("Please login to create pickup request", "error");
      return;
    }
    
    setLoading(true);
    
    const config = { 
      headers: { 
        Authorization: `Token ${token}` 
      } 
    };
    
    const payload = {
      pickup_name: pickup.name,
      pickup_phone: pickup.phone,
      pickup_address: pickup.address,
      pickup_pincode: pickup.pincode,
      pickup_city: pickup.city,
      pickup_state: pickup.state,
      delivery_name: delivery.name,
      delivery_phone: delivery.phone,
      delivery_address: delivery.address,
      delivery_pincode: delivery.pincode,
      delivery_city: delivery.city,
      delivery_state: delivery.state,
      weight: parseFloat(shipment.weight),
      packages: shipment.packages,
      material: shipment.material,
      special_instructions: shipment.specialInstructions,
      pickup_date: schedule.date,
      pickup_time: schedule.timeSlot,
      preferred_time_slot: schedule.preferredTime,
    };

    // If admin is creating for a client
    if ((userRole === "admin" || userRole === "Admin") && selectedClient) {
      payload.client_id = selectedClient;
    }

    try {
      console.log("Submitting pickup request:", payload);
      const response = await axios.post(`${API_BASE}/create/`, payload, config);
      
      if (response.data && response.data.success) {
        setPickupId(response.data.pickup_id);
        setSuccess(true);
        showToast(`✅ Pickup request created successfully! ID: ${response.data.pickup_id}`, "success");
        
        // Reset form
        setPickup({ name: "", phone: "", address: "", pincode: "", city: "", state: "" });
        setDelivery({ name: "", phone: "", address: "", pincode: "", city: "", state: "" });
        setShipment({ weight: "", packages: 1, material: "General Cargo", specialInstructions: "" });
        setSchedule({ date: "", timeSlot: "Morning", preferredTime: "" });
        setActiveTab("pickup");
        setSelectedClient("");
        
        window.scrollTo({ top: 0, behavior: "smooth" });
        setTimeout(() => setSuccess(false), 5000);
      } else {
        showToast(response.data?.error || "Error creating pickup request", "error");
      }
    } catch (err) {
      console.error("Error creating pickup:", err);
      if (err.response?.status === 401) {
        showToast("Session expired. Please login again.", "error");
      } else if (err.response?.data?.error) {
        showToast(err.response.data.error, "error");
      } else {
        showToast("❌ Error creating pickup request. Please try again.", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const timeSlots = [
    { value: "Morning", label: "Morning (9AM - 12PM)" },
    { value: "Afternoon", label: "Afternoon (12PM - 3PM)" },
    { value: "Evening", label: "Evening (3PM - 6PM)" },
    { value: "Late Evening", label: "Late Evening (6PM - 9PM)" }
  ];
  
  const materialTypes = ["General Cargo", "Electronics", "Furniture", "Documents", "Automobile Parts", "Fragile Items", "Perishable Goods", "Industrial Equipment"];

  const today = new Date().toISOString().split('T')[0];
  const isAdmin = userRole === "admin" || userRole === "Admin";

  // Eye icon for track button
  const EyeIcon = ({ size, ...props }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  );

  // Headphones icon
  const HeadphonesIcon = ({ size, ...props }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z" />
      <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  );

  return (
    <div className="pickup-request-container">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`pickup-toast ${toast.type}`}>
          {toast.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="pickup-header">
        <div className="pickup-header-content">
          <div className="pickup-header-icon">
            {isAdmin ? <Users size={32} /> : <Truck size={32} />}
          </div>
          <div className="pickup-header-text">
            <h1>{isAdmin ? "Create Pickup for Client" : "Schedule a Pickup"}</h1>
            <p>{isAdmin ? "Create pickup request on behalf of client" : "Request a pickup for your shipment. Our team will contact you shortly."}</p>
          </div>
        </div>
      </div>

      {/* Admin Client Selection */}
      {isAdmin && (
        <div className="pickup-admin-client-select">
          <div className="admin-client-card">
            <Users size={20} />
            <div>
              <strong>Select Client (Optional)</strong>
              <p>If creating pickup for a specific client, select from below. Leave empty for general.</p>
            </div>
            <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>
              <option value="">-- Select Client (Optional) --</option>
              {clientsList.map(client => (
                <option key={client.id} value={client.id}>
                  {client.company || client.username} - {client.email}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Success Banner */}
      {success && (
        <div className="pickup-success-banner">
          <div className="success-content">
            <CheckCircle size={48} color="#10b981" />
            <h2>Pickup Request Submitted Successfully!</h2>
            <p>Your pickup request has been received. Our team will contact you shortly.</p>
            <div className="success-id">
              <span>Pickup ID:</span>
              <strong>{pickupId}</strong>
            </div>
            <div className="success-actions">
              <button className="success-close" onClick={() => setSuccess(false)}>
                <X size={18} /> Close
              </button>
              <button className="success-track" onClick={() => window.location.href = isAdmin ? "/admin/pickup-management" : "/my-pickups"}>
                <EyeIcon size={18} /> {isAdmin ? "Go to Pickup Management" : "View My Pickups"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pickup-form-wrapper">
        {/* Progress Steps */}
        <div className="pickup-progress">
          <div className={`progress-step ${activeTab === "pickup" ? "active" : pickup.name ? "completed" : ""}`}>
            <div className="step-number">{activeTab === "pickup" ? "1" : pickup.name ? <Check size={14} /> : "1"}</div>
            <div className="step-label">Pickup Details</div>
          </div>
          <div className="progress-line"></div>
          <div className={`progress-step ${activeTab === "delivery" ? "active" : delivery.name ? "completed" : ""}`}>
            <div className="step-number">{activeTab === "delivery" ? "2" : delivery.name ? <Check size={14} /> : "2"}</div>
            <div className="step-label">Delivery Details</div>
          </div>
          <div className="progress-line"></div>
          <div className={`progress-step ${activeTab === "shipment" ? "active" : shipment.weight ? "completed" : ""}`}>
            <div className="step-number">{activeTab === "shipment" ? "3" : shipment.weight ? <Check size={14} /> : "3"}</div>
            <div className="step-label">Shipment Info</div>
          </div>
          <div className="progress-line"></div>
          <div className={`progress-step ${activeTab === "schedule" ? "active" : schedule.date ? "completed" : ""}`}>
            <div className="step-number">{activeTab === "schedule" ? "4" : schedule.date ? <Check size={14} /> : "4"}</div>
            <div className="step-label">Schedule</div>
          </div>
        </div>

        {/* Form Content */}
        <div className="pickup-form-content">
          {/* Tab 1: Pickup Details */}
          {activeTab === "pickup" && (
            <div className="form-section">
              <div className="section-header">
                <MapPin size={24} />
                <h2>Pickup Location</h2>
                <p>Where should we pick up the shipment from?</p>
              </div>
              
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Sender/Company Name *</label>
                  <div className="input-icon">
                    <Building2 size={18} />
                    <input
                      type="text"
                      placeholder="Enter sender or company name"
                      value={pickup.name}
                      onChange={(e) => setPickup({...pickup, name: e.target.value.toUpperCase()})}
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Contact Number *</label>
                  <div className="input-icon">
                    <Phone size={18} />
                    <input
                      type="tel"
                      placeholder="10-digit mobile number"
                      value={pickup.phone}
                      onChange={(e) => setPickup({...pickup, phone: e.target.value})}
                      maxLength={10}
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Pincode *</label>
                  <div className="input-icon">
                    <MapPin size={18} />
                    <input
                      type="text"
                      placeholder="6-digit pincode"
                      value={pickup.pincode}
                      onChange={handlePickupPincode}
                      maxLength={6}
                    />
                  </div>
                </div>
                
                <div className="form-group full-width">
                  <label>Full Address *</label>
                  <textarea
                    rows="3"
                    placeholder="House/Flat No., Street, Landmark, Area"
                    value={pickup.address}
                    onChange={(e) => setPickup({...pickup, address: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label>City</label>
                  <input type="text" value={pickup.city} readOnly className="readonly" placeholder="Auto-filled from pincode" />
                </div>
                
                <div className="form-group">
                  <label>State</label>
                  <input type="text" value={pickup.state} readOnly className="readonly" placeholder="Auto-filled from pincode" />
                </div>
              </div>
              
              <div className="form-actions">
                <button className="btn-next" onClick={() => setActiveTab("delivery")}>
                  Next: Delivery Details <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Delivery Details */}
          {activeTab === "delivery" && (
            <div className="form-section">
              <div className="section-header">
                <Home size={24} />
                <h2>Delivery Location</h2>
                <p>Where should we deliver the shipment to?</p>
              </div>
              
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Receiver/Company Name *</label>
                  <div className="input-icon">
                    <Building2 size={18} />
                    <input
                      type="text"
                      placeholder="Enter receiver or company name"
                      value={delivery.name}
                      onChange={(e) => setDelivery({...delivery, name: e.target.value.toUpperCase()})}
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Contact Number *</label>
                  <div className="input-icon">
                    <Phone size={18} />
                    <input
                      type="tel"
                      placeholder="10-digit mobile number"
                      value={delivery.phone}
                      onChange={(e) => setDelivery({...delivery, phone: e.target.value})}
                      maxLength={10}
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Pincode *</label>
                  <div className="input-icon">
                    <MapPin size={18} />
                    <input
                      type="text"
                      placeholder="6-digit pincode"
                      value={delivery.pincode}
                      onChange={handleDeliveryPincode}
                      maxLength={6}
                    />
                  </div>
                </div>
                
                <div className="form-group full-width">
                  <label>Full Address *</label>
                  <textarea
                    rows="3"
                    placeholder="House/Flat No., Street, Landmark, Area"
                    value={delivery.address}
                    onChange={(e) => setDelivery({...delivery, address: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label>City</label>
                  <input type="text" value={delivery.city} readOnly className="readonly" placeholder="Auto-filled from pincode" />
                </div>
                
                <div className="form-group">
                  <label>State</label>
                  <input type="text" value={delivery.state} readOnly className="readonly" placeholder="Auto-filled from pincode" />
                </div>
              </div>
              
              <div className="form-actions">
                <button className="btn-back" onClick={() => setActiveTab("pickup")}>
                  Back
                </button>
                <button className="btn-next" onClick={() => setActiveTab("shipment")}>
                  Next: Shipment Info <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Tab 3: Shipment Details */}
          {activeTab === "shipment" && (
            <div className="form-section">
              <div className="section-header">
                <Package size={24} />
                <h2>Shipment Details</h2>
                <p>Tell us about the items you want to ship</p>
              </div>
              
              <div className="form-grid">
                <div className="form-group">
                  <label>Weight (kg) *</label>
                  <div className="input-icon">
                    <Weight size={18} />
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Enter weight"
                      value={shipment.weight}
                      onChange={(e) => setShipment({...shipment, weight: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Number of Packages *</label>
                  <div className="package-counter">
                    <button type="button" className="counter-btn" onClick={() => updatePackages(-1)}>
                      <Minus size={14} />
                    </button>
                    <span className="package-count">{shipment.packages}</span>
                    <button type="button" className="counter-btn" onClick={() => updatePackages(1)}>
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
                
                <div className="form-group full-width">
                  <label>Material Type *</label>
                  <div className="input-icon">
                    <Box size={18} />
                    <select
                      value={shipment.material}
                      onChange={(e) => setShipment({...shipment, material: e.target.value})}
                    >
                      {materialTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="form-group full-width">
                  <label>Special Instructions (Optional)</label>
                  <textarea
                    rows="3"
                    placeholder="Any special handling instructions? (e.g., Fragile, Handle with care, etc.)"
                    value={shipment.specialInstructions}
                    onChange={(e) => setShipment({...shipment, specialInstructions: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="tips-card">
                <Info size={18} />
                <div>
                  <strong>Pro Tip:</strong> Accurate weight and package count help us provide better service.
                </div>
              </div>
              
              <div className="form-actions">
                <button className="btn-back" onClick={() => setActiveTab("delivery")}>
                  Back
                </button>
                <button className="btn-next" onClick={() => setActiveTab("schedule")}>
                  Next: Schedule <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Tab 4: Schedule */}
          {activeTab === "schedule" && (
            <div className="form-section">
              <div className="section-header">
                <Calendar size={24} />
                <h2>Schedule Pickup</h2>
                <p>Choose your preferred pickup date and time</p>
              </div>
              
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Pickup Date *</label>
                  <div className="input-icon">
                    <Calendar size={18} />
                    <input
                      type="date"
                      min={today}
                      value={schedule.date}
                      onChange={(e) => setSchedule({...schedule, date: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="form-group full-width">
                  <label>Preferred Time Slot *</label>
                  <div className="time-slots">
                    {timeSlots.map(slot => (
                      <button
                        key={slot.value}
                        type="button"
                        className={`time-slot ${schedule.timeSlot === slot.value ? 'active' : ''}`}
                        onClick={() => setSchedule({...schedule, timeSlot: slot.value})}
                      >
                        <ClockIcon size={14} />
                        {slot.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="form-group full-width">
                  <label>Preferred Time (Optional)</label>
                  <div className="input-icon">
                    <Clock size={18} />
                    <input
                      type="time"
                      value={schedule.preferredTime}
                      onChange={(e) => setSchedule({...schedule, preferredTime: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              
              <div className="summary-card">
                <h4>📋 Request Summary</h4>
                <div className="summary-grid">
                  <div className="summary-item">
                    <span>From:</span>
                    <strong>{pickup.name || "—"}</strong>
                    <small>{pickup.pincode}</small>
                  </div>
                  <ArrowRight size={16} className="summary-arrow" />
                  <div className="summary-item">
                    <span>To:</span>
                    <strong>{delivery.name || "—"}</strong>
                    <small>{delivery.pincode}</small>
                  </div>
                  <div className="summary-item">
                    <span>Weight:</span>
                    <strong>{shipment.weight || 0} kg</strong>
                  </div>
                  <div className="summary-item">
                    <span>Packages:</span>
                    <strong>{shipment.packages}</strong>
                  </div>
                  <div className="summary-item">
                    <span>Pickup Date:</span>
                    <strong>{schedule.date || "—"}</strong>
                  </div>
                </div>
              </div>
              
              <div className="form-actions">
                <button className="btn-back" onClick={() => setActiveTab("shipment")}>
                  Back
                </button>
                <button className="btn-submit" onClick={submitRequest} disabled={loading}>
                  {loading ? (
                    <>
                      <RefreshCw size={18} className="spin" /> Processing...
                    </>
                  ) : (
                    <>
                      <Send size={18} /> Submit Pickup Request
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="pickup-features">
        <div className="feature">
          <div className="feature-icon"><Shield size={24} /></div>
          <h4>Safe & Secure</h4>
          <p>Your shipments are fully insured</p>
        </div>
        <div className="feature">
          <div className="feature-icon"><Clock size={24} /></div>
          <h4>On-Time Pickup</h4>
          <p>98% on-time pickup rate</p>
        </div>
        <div className="feature">
          <div className="feature-icon"><Award size={24} /></div>
          <h4>Real-time Tracking</h4>
          <p>Track your shipment live</p>
        </div>
        <div className="feature">
          <div className="feature-icon"><HeadphonesIcon size={24} /></div>
          <h4>24/7 Support</h4>
          <p>Dedicated customer care</p>
        </div>
      </div>
    </div>
  );
}

export default PickupRequest;