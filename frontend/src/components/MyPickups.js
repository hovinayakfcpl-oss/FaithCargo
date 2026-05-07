import React, { useState, useEffect } from "react";
import axios from "axios";
import { Package, MapPin, Calendar, Clock, Truck, Eye, RefreshCw } from "lucide-react";
import "./MyPickups.css";

const API_BASE = "https://faithcargo.onrender.com/api/pickup";

function MyPickups() {
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPickup, setSelectedPickup] = useState(null);

  const token = localStorage.getItem("clientToken");
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const fetchMyPickups = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/my-pickups/`, config);
      setPickups(res.data.pickups || []);
    } catch (err) {
      console.error("Error fetching pickups:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMyPickups();
  }, []);

  const getStatusBadge = (status) => {
    const statusConfig = {
      PENDING: { color: "#f59e0b", bg: "#fef3c7", text: "Pending" },
      ASSIGNED: { color: "#3b82f6", bg: "#dbeafe", text: "Assigned" },
      PICKED_UP: { color: "#8b5cf6", bg: "#ede9fe", text: "Picked Up" },
      IN_TRANSIT: { color: "#06b6d4", bg: "#cffafe", text: "In Transit" },
      DELIVERED: { color: "#10b981", bg: "#d1fae5", text: "Delivered" },
      CANCELLED: { color: "#ef4444", bg: "#fee2e2", text: "Cancelled" },
    };
    const config = statusConfig[status] || statusConfig.PENDING;
    return (
      <span className="my-pickups-status" style={{ background: config.bg, color: config.color }}>
        {config.text}
      </span>
    );
  };

  return (
    <div className="my-pickups-container">
      <div className="my-pickups-header">
        <h1><Package size={28} /> My Pickups</h1>
        <p>View all your pickup requests</p>
        <button className="my-pickups-refresh" onClick={fetchMyPickups}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="my-pickups-loading">Loading...</div>
      ) : pickups.length === 0 ? (
        <div className="my-pickups-empty">
          <Package size={48} />
          <p>No pickup requests found</p>
          <button className="my-pickups-create-btn" onClick={() => window.location.href = "/pickup-request"}>
            Create New Pickup
          </button>
        </div>
      ) : (
        <div className="my-pickups-list">
          {pickups.map((pickup) => (
            <div key={pickup.id} className="my-pickups-card">
              <div className="my-pickups-card-header">
                <div className="my-pickups-id">{pickup.pickup_id}</div>
                {getStatusBadge(pickup.status)}
              </div>
              
              <div className="my-pickups-card-body">
                <div className="my-pickups-location">
                  <div className="my-pickups-from">
                    <MapPin size={14} color="#10b981" />
                    <div>
                      <strong>Pickup From</strong>
                      <p>{pickup.pickup_name}</p>
                      <p className="my-pickups-address">{pickup.pickup_address}</p>
                      <p className="my-pickups-pincode">📮 {pickup.pickup_pincode}</p>
                    </div>
                  </div>
                  <div className="my-pickups-arrow">→</div>
                  <div className="my-pickups-to">
                    <MapPin size={14} color="#ef4444" />
                    <div>
                      <strong>Deliver To</strong>
                      <p>{pickup.delivery_name}</p>
                      <p className="my-pickups-address">{pickup.delivery_address}</p>
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
                    <Truck size={12} />
                    <span>Assigned to: <strong>{pickup.assigned_to_name}</strong></span>
                  </div>
                )}
              </div>
              
              <div className="my-pickups-card-footer">
                <button className="my-pickups-track-btn" onClick={() => window.location.href = `/tracking?ref=${pickup.pickup_id}`}>
                  <Eye size={14} /> Track
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyPickups;