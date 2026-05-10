// src/components/MyPickups.js - COMPLETELY FIXED VERSION (No Axios)
import React, { useState, useEffect, useCallback } from "react";
import { 
  Package, MapPin, Calendar, Clock, Truck, Eye, RefreshCw, 
  AlertCircle, CheckCircle, XCircle, User, Phone, Shield
} from "lucide-react";
import "./MyPickups.css";

const API_BASE = "https://faithcargo.onrender.com/api/pickup";

function MyPickups() {
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  // Get token from multiple sources
  const getToken = () => {
    const clientToken = localStorage.getItem("clientToken");
    const token = localStorage.getItem("token");
    const loginType = localStorage.getItem("loginType");
    
    // For client login
    if (loginType === "client" || clientToken) {
      return clientToken;
    }
    return token;
  };

  const token = getToken();
  
  // ✅ FIXED: Get headers for fetch API
  const getHeaders = () => ({
    'Authorization': token ? `Token ${token}` : "",
    'Content-Type': 'application/json'
  });

  // Show toast notification
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
  };

  // ✅ FIXED: Fetch my pickups using fetch API
  const fetchMyPickups = useCallback(async () => {
    const currentToken = getToken();
    if (!currentToken) {
      showToast("Please login first", "error");
      setIsAuthenticated(false);
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/my-pickups/`, {
        method: 'GET',
        headers: getHeaders()
      });
      
      if (response.status === 200) {
        const data = await response.json();
        setPickups(data.pickups || []);
        setIsAuthenticated(true);
      } else if (response.status === 401) {
        showToast("Session expired. Please login again.", "error");
        setIsAuthenticated(false);
      } else if (response.status === 404) {
        // Try alternate endpoint
        try {
          const altResponse = await fetch(`${API_BASE}/client/pickups/`, {
            method: 'GET',
            headers: getHeaders()
          });
          if (altResponse.ok) {
            const altData = await altResponse.json();
            setPickups(altData.pickups || []);
          } else {
            setPickups([]);
          }
        } catch (altErr) {
          console.error("Alternate endpoint also failed");
          setPickups([]);
        }
      } else {
        showToast("Error fetching your pickups", "error");
        setPickups([]);
      }
    } catch (err) {
      console.error("Error fetching pickups:", err);
      showToast("Network error. Please try again.", "error");
      setPickups([]);
    }
    setLoading(false);
  }, []);

  // ✅ FIXED: Cancel pickup request using fetch API
  const cancelPickup = async (pickupId) => {
    if (!window.confirm("Are you sure you want to cancel this pickup request?")) return;
    
    try {
      const response = await fetch(`${API_BASE}/cancel/${pickupId}/`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({})
      });
      
      const data = await response.json();
      
      if (response.ok && data.success !== false) {
        showToast("Pickup cancelled successfully", "success");
        fetchMyPickups();
      } else {
        showToast(data.error || "Error cancelling pickup", "error");
      }
    } catch (err) {
      console.error("Cancel error:", err);
      showToast("Error cancelling pickup", "error");
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const currentToken = getToken();
      if (currentToken) {
        setIsAuthenticated(true);
        await fetchMyPickups();
      } else {
        showToast("Please login to view your pickups", "error");
        setIsAuthenticated(false);
      }
    };
    
    checkAuth();
  }, [fetchMyPickups]);

  const getStatusBadge = (status) => {
    const statusConfig = {
      PENDING: { color: "#f59e0b", bg: "#fef3c7", text: "Pending", icon: <Clock size={10} /> },
      ASSIGNED: { color: "#3b82f6", bg: "#dbeafe", text: "Assigned", icon: <User size={10} /> },
      PICKED_UP: { color: "#8b5cf6", bg: "#ede9fe", text: "Picked Up", icon: <Truck size={10} /> },
      IN_TRANSIT: { color: "#06b6d4", bg: "#cffafe", text: "In Transit", icon: <Package size={10} /> },
      DELIVERED: { color: "#10b981", bg: "#d1fae5", text: "Delivered", icon: <CheckCircle size={10} /> },
      CANCELLED: { color: "#ef4444", bg: "#fee2e2", text: "Cancelled", icon: <XCircle size={10} /> },
    };
    const config = statusConfig[status] || statusConfig.PENDING;
    return (
      <span className="my-pickups-status" style={{ background: config.bg, color: config.color }}>
        {config.icon} {config.text}
      </span>
    );
  };

  // Show unauthorized message if not authenticated
  if (!isAuthenticated && token) {
    return (
      <div className="my-pickups-unauthorized">
        <AlertCircle size={48} color="#d32f2f" />
        <h2>Authentication Failed</h2>
        <p>Please login again to view your pickups.</p>
        <button onClick={() => window.location.href = "/user-login"}>Go to Login</button>
      </div>
    );
  }

  return (
    <div className="my-pickups-container">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`my-pickups-toast ${toast.type}`}>
          {toast.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="my-pickups-header">
        <div className="my-pickups-header-title">
          <Package size={28} color="#d32f2f" />
          <div>
            <h1>My Pickups</h1>
            <p>View and track all your pickup requests</p>
          </div>
        </div>
        <button className="my-pickups-refresh" onClick={fetchMyPickups}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="my-pickups-loading">
          <RefreshCw size={32} className="spin" />
          <p>Loading your pickups...</p>
        </div>
      ) : pickups.length === 0 ? (
        <div className="my-pickups-empty">
          <Package size={64} />
          <h3>No pickup requests found</h3>
          <p>You haven't created any pickup requests yet.</p>
          <button className="my-pickups-create-btn" onClick={() => window.location.href = "/pickup-request"}>
            <Truck size={16} /> Create New Pickup
          </button>
        </div>
      ) : (
        <div className="my-pickups-list">
          {pickups.map((pickup) => (
            <div key={pickup.id} className="my-pickups-card">
              <div className="my-pickups-card-header">
                <div className="my-pickups-id">
                  <Shield size={14} color="#d32f2f" />
                  {pickup.pickup_id}
                </div>
                {getStatusBadge(pickup.status)}
              </div>
              
              <div className="my-pickups-card-body">
                <div className="my-pickups-location">
                  <div className="my-pickups-from">
                    <MapPin size={14} color="#10b981" />
                    <div>
                      <strong>Pickup From</strong>
                      <p className="my-pickups-name">{pickup.pickup_name}</p>
                      <p className="my-pickups-address">{pickup.pickup_address}</p>
                      <p className="my-pickups-contact">
                        <Phone size={10} /> {pickup.pickup_phone}
                      </p>
                      <p className="my-pickups-pincode">📮 {pickup.pickup_pincode}</p>
                    </div>
                  </div>
                  <div className="my-pickups-arrow">→</div>
                  <div className="my-pickups-to">
                    <MapPin size={14} color="#ef4444" />
                    <div>
                      <strong>Deliver To</strong>
                      <p className="my-pickups-name">{pickup.delivery_name}</p>
                      <p className="my-pickups-address">{pickup.delivery_address}</p>
                      <p className="my-pickups-contact">
                        <Phone size={10} /> {pickup.delivery_phone}
                      </p>
                      <p className="my-pickups-pincode">📮 {pickup.delivery_pincode}</p>
                    </div>
                  </div>
                </div>
                
                <div className="my-pickups-details">
                  <div className="my-pickups-detail">
                    <Package size={12} />
                    <span>{pickup.packages} Packages</span>
                  </div>
                  <div className="my-pickups-detail">
                    <Truck size={12} />
                    <span>{pickup.weight} kg</span>
                  </div>
                  <div className="my-pickups-detail">
                    <Calendar size={12} />
                    <span>{pickup.pickup_date}</span>
                  </div>
                  <div className="my-pickups-detail">
                    <Clock size={12} />
                    <span>{pickup.pickup_time}</span>
                  </div>
                </div>
                
                {pickup.assigned_to_name && (
                  <div className="my-pickups-assigned">
                    <User size={12} />
                    <span>Assigned to: <strong>{pickup.assigned_to_name}</strong></span>
                    {pickup.assigned_to_phone && (
                      <a href={`tel:${pickup.assigned_to_phone}`} className="my-pickups-call-link">
                        <Phone size={10} /> Call
                      </a>
                    )}
                  </div>
                )}
                
                {pickup.special_instructions && (
                  <div className="my-pickups-instructions">
                    <AlertCircle size={12} />
                    <span>{pickup.special_instructions}</span>
                  </div>
                )}
              </div>
              
              <div className="my-pickups-card-footer">
                <button 
                  className="my-pickups-track-btn" 
                  onClick={() => window.location.href = `/tracking?ref=${pickup.pickup_id}`}
                >
                  <Eye size={14} /> Track Shipment
                </button>
                {pickup.status === "PENDING" && (
                  <button 
                    className="my-pickups-cancel-btn" 
                    onClick={() => cancelPickup(pickup.pickup_id)}
                  >
                    <XCircle size={14} /> Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyPickups;