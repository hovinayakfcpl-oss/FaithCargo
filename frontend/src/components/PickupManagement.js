// src/components/PickupManagement.js - UPDATED & IMPROVED
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { 
  Package, Truck, User, Calendar, Clock, MapPin, Phone, 
  ChevronRight, Search, Filter, Eye, CheckCircle, 
  XCircle, Clock as ClockIcon, RefreshCw, UserCheck,
  MessageCircle, Send, FileText, DollarSign, CreditCard,
  AlertCircle, Bell, Check, X, Edit, Trash2, Plus,
  Download, Printer, Shield, Star, Award, Zap,
  TrendingUp, Users, ClipboardList, Navigation
} from "lucide-react";
import "./PickupManagement.css";

const API_BASE = "https://faithcargo.onrender.com/api/pickup";

function PickupManagement() {
  const [pickups, setPickups] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedPickup, setSelectedPickup] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [taskMessage, setTaskMessage] = useState("");
  const [selectedStaff, setSelectedStaff] = useState("");
  const [assignmentNotes, setAssignmentNotes] = useState("");
  const [taskType, setTaskType] = useState("OTHER");
  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  // Get token from localStorage
  const token = localStorage.getItem("token");
  
  // ✅ FIXED: Changed from Bearer to Token (Django Token Authentication)
  const config = { 
    headers: { 
      Authorization: token ? `Token ${token}` : "" 
    } 
  };

  // Show toast notification
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
  };

  // Fetch all pickups
  const fetchPickups = useCallback(async () => {
    if (!token) {
      showToast("Please login first", "error");
      return;
    }
    
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/admin/all/`, config);
      setPickups(res.data.pickups || []);
    } catch (err) {
      console.error("Error fetching pickups:", err);
      if (err.response?.status === 401) {
        showToast("Session expired. Please login again.", "error");
      } else {
        showToast("Error fetching pickups", "error");
      }
    }
    setLoading(false);
  }, [token]);

  // Fetch staff list
  const fetchStaff = useCallback(async () => {
    if (!token) return;
    
    try {
      const res = await axios.get(`${API_BASE}/admin/staff/`, config);
      setStaffList(res.data.staff || []);
    } catch (err) {
      console.error("Error fetching staff:", err);
      // If endpoint doesn't exist, try alternative
      try {
        const res2 = await axios.get(`${API_BASE}/staff/list/`, config);
        setStaffList(res2.data.staff || []);
      } catch (err2) {
        console.error("Staff endpoint not found");
      }
    }
  }, [token]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!token) return;
    
    try {
      const res = await axios.get(`${API_BASE}/admin/stats/`, config);
      return res.data.stats;
    } catch (err) {
      console.error("Error fetching stats:", err);
      return null;
    }
  }, [token]);

  // Assign pickup to staff
  const assignPickup = async () => {
    if (!selectedStaff) {
      showToast("Please select a staff member", "error");
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${API_BASE}/admin/assign/${selectedPickup.id}/`,
        {
          staff_id: selectedStaff,
          notes: assignmentNotes
        },
        config
      );
      showToast(`✅ Pickup assigned successfully!`, "success");
      setShowAssignModal(false);
      setSelectedStaff("");
      setAssignmentNotes("");
      fetchPickups();
      fetchStaff();
    } catch (err) {
      console.error("Assign error:", err);
      showToast("❌ Error assigning pickup", "error");
    }
    setLoading(false);
  };

  // Send task to staff
  const sendTaskToStaff = async () => {
    if (!taskMessage.trim()) {
      showToast("Please enter task details", "error");
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${API_BASE}/admin/send-task/${selectedPickup.id}/`,
        {
          task_type: taskType,
          title: taskMessage.split('\n')[0].substring(0, 100),
          description: taskMessage,
          staff_id: selectedPickup.assigned_to_id
        },
        config
      );
      showToast(`✅ Task sent to ${selectedPickup.assigned_to}!`, "success");
      setShowTaskModal(false);
      setTaskMessage("");
      setTaskType("OTHER");
      fetchPickups();
    } catch (err) {
      console.error("Task error:", err);
      showToast("❌ Error sending task", "error");
    }
    setLoading(false);
  };

  // Update pickup status
  const updateStatus = async (pickupId, newStatus) => {
    try {
      await axios.put(
        `${API_BASE}/admin/update-status/${pickupId}/`,
        { status: newStatus },
        config
      );
      showToast(`Status updated to ${newStatus}`, "success");
      fetchPickups();
    } catch (err) {
      console.error("Status update error:", err);
      showToast("Error updating status", "error");
    }
  };

  // Delete pickup (Admin only)
  const deletePickup = async (pickupId) => {
    if (!window.confirm("Are you sure you want to delete this pickup?")) return;
    
    try {
      await axios.delete(`${API_BASE}/admin/delete/${pickupId}/`, config);
      showToast("Pickup deleted successfully", "success");
      fetchPickups();
    } catch (err) {
      showToast("Error deleting pickup", "error");
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ["Pickup ID", "Client", "Sender", "Receiver", "Status", "Weight", "Packages", "Date"];
    const rows = pickups.map(p => [
      p.pickup_id,
      p.client_name,
      p.pickup_name,
      p.delivery_name,
      p.status,
      p.weight,
      p.packages,
      p.pickup_date
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pickups_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Export successful!", "success");
  };

  useEffect(() => {
    if (token) {
      fetchPickups();
      fetchStaff();
    } else {
      showToast("Please login to access Pickup Management", "error");
    }
  }, [token, fetchPickups, fetchStaff]);

  const getStatusBadge = (status) => {
    const statusConfig = {
      'PENDING': { color: '#f59e0b', bg: '#fef3c7', icon: <ClockIcon size={12} />, text: 'Pending', order: 1 },
      'ASSIGNED': { color: '#3b82f6', bg: '#dbeafe', icon: <UserCheck size={12} />, text: 'Assigned', order: 2 },
      'PICKED_UP': { color: '#8b5cf6', bg: '#ede9fe', icon: <Truck size={12} />, text: 'Picked Up', order: 3 },
      'IN_TRANSIT': { color: '#06b6d4', bg: '#cffafe', icon: <Package size={12} />, text: 'In Transit', order: 4 },
      'DELIVERED': { color: '#10b981', bg: '#d1fae5', icon: <CheckCircle size={12} />, text: 'Delivered', order: 5 },
      'CANCELLED': { color: '#ef4444', bg: '#fee2e2', icon: <XCircle size={12} />, text: 'Cancelled', order: 6 }
    };
    const config = statusConfig[status] || statusConfig['PENDING'];
    return (
      <span className="status-badge" style={{ background: config.bg, color: config.color }}>
        {config.icon} {config.text}
      </span>
    );
  };

  const filteredPickups = pickups.filter(p => {
    const matchesSearch = p.pickup_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.pickup_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.delivery_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: pickups.length,
    pending: pickups.filter(p => p.status === 'PENDING').length,
    assigned: pickups.filter(p => p.status === 'ASSIGNED').length,
    pickedUp: pickups.filter(p => p.status === 'PICKED_UP').length,
    inTransit: pickups.filter(p => p.status === 'IN_TRANSIT').length,
    delivered: pickups.filter(p => p.status === 'DELIVERED').length,
    cancelled: pickups.filter(p => p.status === 'CANCELLED').length
  };

  return (
    <div className="pm-container">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`pm-toast ${toast.type}`}>
          {toast.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="pm-header">
        <div className="pm-header-title">
          <ClipboardList size={28} color="#d32f2f" />
          <div>
            <h1>Pickup Management</h1>
            <p>Manage, assign, and track all pickup requests</p>
          </div>
        </div>
        <div className="pm-header-actions">
          <button className="pm-export-btn" onClick={exportToCSV}>
            <Download size={16} /> Export
          </button>
          <button className="pm-refresh-btn" onClick={fetchPickups}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="pm-stats-grid">
        <div className="pm-stat-card">
          <div className="pm-stat-icon" style={{ background: "#d32f2f20", color: "#d32f2f" }}>
            <Package size={24} />
          </div>
          <div className="pm-stat-info">
            <h3>{stats.total}</h3>
            <p>Total Pickups</p>
          </div>
        </div>
        <div className="pm-stat-card">
          <div className="pm-stat-icon" style={{ background: "#f59e0b20", color: "#f59e0b" }}>
            <ClockIcon size={24} />
          </div>
          <div className="pm-stat-info">
            <h3>{stats.pending}</h3>
            <p>Pending</p>
          </div>
        </div>
        <div className="pm-stat-card">
          <div className="pm-stat-icon" style={{ background: "#3b82f620", color: "#3b82f6" }}>
            <UserCheck size={24} />
          </div>
          <div className="pm-stat-info">
            <h3>{stats.assigned}</h3>
            <p>Assigned</p>
          </div>
        </div>
        <div className="pm-stat-card">
          <div className="pm-stat-icon" style={{ background: "#8b5cf620", color: "#8b5cf6" }}>
            <Truck size={24} />
          </div>
          <div className="pm-stat-info">
            <h3>{stats.pickedUp}</h3>
            <p>Picked Up</p>
          </div>
        </div>
        <div className="pm-stat-card">
          <div className="pm-stat-icon" style={{ background: "#06b6d420", color: "#06b6d4" }}>
            <Navigation size={24} />
          </div>
          <div className="pm-stat-info">
            <h3>{stats.inTransit}</h3>
            <p>In Transit</p>
          </div>
        </div>
        <div className="pm-stat-card">
          <div className="pm-stat-icon" style={{ background: "#10b98120", color: "#10b981" }}>
            <CheckCircle size={24} />
          </div>
          <div className="pm-stat-info">
            <h3>{stats.delivered}</h3>
            <p>Delivered</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="pm-filters">
        <div className="pm-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by Pickup ID, Client, Sender, Receiver..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="pm-filter-buttons">
          {["ALL", "PENDING", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "DELIVERED", "CANCELLED"].map(status => (
            <button
              key={status}
              className={`pm-filter-btn ${statusFilter === status ? "active" : ""}`}
              onClick={() => setStatusFilter(status)}
            >
              {status === "ALL" ? "All" : status}
              {status !== "ALL" && (
                <span className="pm-filter-count">
                  {stats[status.toLowerCase()] || 0}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Pickups List */}
      <div className="pm-pickups-list">
        {loading ? (
          <div className="pm-loading">
            <RefreshCw size={32} className="spin" />
            <p>Loading pickups...</p>
          </div>
        ) : filteredPickups.length === 0 ? (
          <div className="pm-empty">
            <Package size={48} />
            <h3>No pickups found</h3>
            <p>Try changing your search or filter criteria</p>
          </div>
        ) : (
          filteredPickups.map(pickup => (
            <div key={pickup.id} className="pm-pickup-card">
              <div className="pm-pickup-header">
                <div className="pm-pickup-id">
                  <Shield size={14} color="#d32f2f" />
                  {pickup.pickup_id}
                </div>
                {getStatusBadge(pickup.status)}
              </div>
              
              <div className="pm-pickup-body">
                <div className="pm-pickup-section">
                  <div className="pm-section-title">
                    <MapPin size={14} color="#10b981" /> Pickup From
                  </div>
                  <div className="pm-pickup-details">
                    <div className="pm-name">{pickup.pickup_name}</div>
                    <div className="pm-address">{pickup.pickup_address}</div>
                    <div className="pm-contact"><Phone size={10} /> {pickup.pickup_phone}</div>
                    <div className="pm-pincode">📮 {pickup.pickup_pincode}</div>
                  </div>
                </div>
                
                <div className="pm-pickup-arrow">
                  <Truck size={20} />
                  <ChevronRight size={16} />
                </div>
                
                <div className="pm-pickup-section">
                  <div className="pm-section-title">
                    <MapPin size={14} color="#ef4444" /> Deliver To
                  </div>
                  <div className="pm-pickup-details">
                    <div className="pm-name">{pickup.delivery_name}</div>
                    <div className="pm-address">{pickup.delivery_address}</div>
                    <div className="pm-contact"><Phone size={10} /> {pickup.delivery_phone}</div>
                    <div className="pm-pincode">📮 {pickup.delivery_pincode}</div>
                  </div>
                </div>
                
                <div className="pm-pickup-info">
                  <span><Package size={12} /> {pickup.packages} pkg</span>
                  <span><Truck size={12} /> {pickup.weight} kg</span>
                  <span><Calendar size={12} /> {pickup.pickup_date}</span>
                  <span><Clock size={12} /> {pickup.pickup_time}</span>
                </div>
              </div>
              
              <div className="pm-pickup-footer">
                <div className="pm-client-info">
                  <User size={14} />
                  <span>Client: <strong>{pickup.client_name}</strong></span>
                  <span className="pm-client-id">ID: {pickup.client_id}</span>
                </div>
                
                {pickup.assigned_to && (
                  <div className="pm-assigned-info">
                    <UserCheck size={14} />
                    <span>Assigned to: <strong>{pickup.assigned_to}</strong></span>
                    {pickup.assigned_at && (
                      <span className="pm-assigned-date">on {new Date(pickup.assigned_at).toLocaleDateString()}</span>
                    )}
                  </div>
                )}
                
                <div className="pm-action-buttons">
                  <button 
                    className="pm-btn-view"
                    onClick={() => {
                      setSelectedPickup(pickup);
                      setShowDetailsModal(true);
                    }}
                  >
                    <Eye size={16} /> View
                  </button>
                  <button 
                    className="pm-btn-assign"
                    onClick={() => {
                      setSelectedPickup(pickup);
                      setShowAssignModal(true);
                    }}
                    disabled={pickup.status !== 'PENDING'}
                  >
                    <UserCheck size={16} /> Assign
                  </button>
                  <button 
                    className="pm-btn-task"
                    onClick={() => {
                      setSelectedPickup(pickup);
                      setShowTaskModal(true);
                    }}
                    disabled={!pickup.assigned_to}
                  >
                    <MessageCircle size={16} /> Task
                  </button>
                  <select
                    className="pm-status-select"
                    value={pickup.status}
                    onChange={(e) => updateStatus(pickup.id, e.target.value)}
                  >
                    <option value="PENDING">⏳ Pending</option>
                    <option value="ASSIGNED">📋 Assigned</option>
                    <option value="PICKED_UP">✅ Picked Up</option>
                    <option value="IN_TRANSIT">🚚 In Transit</option>
                    <option value="DELIVERED">📦 Delivered</option>
                    <option value="CANCELLED">❌ Cancelled</option>
                  </select>
                  <button 
                    className="pm-btn-delete"
                    onClick={() => deletePickup(pickup.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Assign Modal */}
      {showAssignModal && selectedPickup && (
        <div className="pm-modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="pm-modal" onClick={e => e.stopPropagation()}>
            <div className="pm-modal-header">
              <h3><UserCheck size={20} /> Assign Pickup</h3>
              <button className="pm-modal-close" onClick={() => setShowAssignModal(false)}>×</button>
            </div>
            <div className="pm-modal-body">
              <div className="pm-modal-info">
                <p><strong>Pickup ID:</strong> {selectedPickup.pickup_id}</p>
                <p><strong>From:</strong> {selectedPickup.pickup_name}</p>
                <p><strong>To:</strong> {selectedPickup.delivery_name}</p>
              </div>
              <div className="pm-form-group">
                <label>Select Staff Member *</label>
                <select value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value)}>
                  <option value="">-- Select Staff --</option>
                  {staffList.map(staff => (
                    <option key={staff.id} value={staff.id}>
                      {staff.username} {staff.company ? `(${staff.company})` : ''} - {staff.active_pickups || 0} active
                    </option>
                  ))}
                </select>
              </div>
              <div className="pm-form-group">
                <label>Assignment Notes (Optional)</label>
                <textarea
                  rows="3"
                  placeholder="Add any special instructions for the staff..."
                  value={assignmentNotes}
                  onChange={(e) => setAssignmentNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="pm-modal-footer">
              <button className="pm-btn-cancel" onClick={() => setShowAssignModal(false)}>Cancel</button>
              <button className="pm-btn-confirm" onClick={assignPickup} disabled={loading}>
                {loading ? <RefreshCw size={16} className="spin" /> : <CheckCircle size={16} />}
                {loading ? "Assigning..." : "Confirm Assignment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && selectedPickup && (
        <div className="pm-modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="pm-modal" onClick={e => e.stopPropagation()}>
            <div className="pm-modal-header">
              <h3><MessageCircle size={20} /> Send Task</h3>
              <button className="pm-modal-close" onClick={() => setShowTaskModal(false)}>×</button>
            </div>
            <div className="pm-modal-body">
              <div className="pm-modal-info">
                <p><strong>Pickup ID:</strong> {selectedPickup.pickup_id}</p>
                <p><strong>Assigned To:</strong> {selectedPickup.assigned_to || "Not assigned yet"}</p>
              </div>
              <div className="pm-form-group">
                <label>Task Type</label>
                <div className="pm-task-type-select">
                  <button className={`pm-task-type ${taskType === "PAYMENT" ? "active" : ""}`} onClick={() => setTaskType("PAYMENT")}>💰 Payment</button>
                  <button className={`pm-task-type ${taskType === "DOCKET" ? "active" : ""}`} onClick={() => setTaskType("DOCKET")}>📄 Docket</button>
                  <button className={`pm-task-type ${taskType === "DELIVERY" ? "active" : ""}`} onClick={() => setTaskType("DELIVERY")}>🚚 Delivery</button>
                  <button className={`pm-task-type ${taskType === "FOLLOWUP" ? "active" : ""}`} onClick={() => setTaskType("FOLLOWUP")}>📞 Follow-up</button>
                  <button className={`pm-task-type ${taskType === "POD" ? "active" : ""}`} onClick={() => setTaskType("POD")}>📸 POD</button>
                  <button className={`pm-task-type ${taskType === "OTHER" ? "active" : ""}`} onClick={() => setTaskType("OTHER")}>📝 Other</button>
                </div>
              </div>
              <div className="pm-form-group">
                <label>Task Details *</label>
                <textarea
                  rows="5"
                  placeholder="Describe the task clearly...&#10;&#10;Example:&#10;• Collect payment of ₹1500 from customer&#10;• Clear the docket for shipment&#10;• Arrange delivery for urgent shipment"
                  value={taskMessage}
                  onChange={(e) => setTaskMessage(e.target.value)}
                />
              </div>
            </div>
            <div className="pm-modal-footer">
              <button className="pm-btn-cancel" onClick={() => setShowTaskModal(false)}>Cancel</button>
              <button className="pm-btn-confirm" onClick={sendTaskToStaff} disabled={loading}>
                {loading ? <RefreshCw size={16} className="spin" /> : <Send size={16} />}
                {loading ? "Sending..." : "Send Task"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedPickup && (
        <div className="pm-modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="pm-modal pm-modal-large" onClick={e => e.stopPropagation()}>
            <div className="pm-modal-header">
              <h3><Eye size={20} /> Pickup Details</h3>
              <button className="pm-modal-close" onClick={() => setShowDetailsModal(false)}>×</button>
            </div>
            <div className="pm-modal-body">
              <div className="pm-details-grid">
                <div className="pm-details-section">
                  <h4>📋 Basic Information</h4>
                  <div className="pm-details-row">
                    <span>Pickup ID:</span>
                    <strong>{selectedPickup.pickup_id}</strong>
                  </div>
                  <div className="pm-details-row">
                    <span>Status:</span>
                    {getStatusBadge(selectedPickup.status)}
                  </div>
                  <div className="pm-details-row">
                    <span>Client:</span>
                    <strong>{selectedPickup.client_name}</strong>
                  </div>
                  <div className="pm-details-row">
                    <span>Created At:</span>
                    <span>{new Date(selectedPickup.created_at).toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="pm-details-section">
                  <h4>📍 Pickup Location</h4>
                  <div className="pm-details-row">
                    <span>Name:</span>
                    <strong>{selectedPickup.pickup_name}</strong>
                  </div>
                  <div className="pm-details-row">
                    <span>Phone:</span>
                    <span>{selectedPickup.pickup_phone}</span>
                  </div>
                  <div className="pm-details-row">
                    <span>Address:</span>
                    <span>{selectedPickup.pickup_address}</span>
                  </div>
                  <div className="pm-details-row">
                    <span>Pincode:</span>
                    <span>{selectedPickup.pickup_pincode}</span>
                  </div>
                </div>
                
                <div className="pm-details-section">
                  <h4>🎯 Delivery Location</h4>
                  <div className="pm-details-row">
                    <span>Name:</span>
                    <strong>{selectedPickup.delivery_name}</strong>
                  </div>
                  <div className="pm-details-row">
                    <span>Phone:</span>
                    <span>{selectedPickup.delivery_phone}</span>
                  </div>
                  <div className="pm-details-row">
                    <span>Address:</span>
                    <span>{selectedPickup.delivery_address}</span>
                  </div>
                  <div className="pm-details-row">
                    <span>Pincode:</span>
                    <span>{selectedPickup.delivery_pincode}</span>
                  </div>
                </div>
                
                <div className="pm-details-section">
                  <h4>📦 Shipment Details</h4>
                  <div className="pm-details-row">
                    <span>Weight:</span>
                    <span>{selectedPickup.weight} kg</span>
                  </div>
                  <div className="pm-details-row">
                    <span>Packages:</span>
                    <span>{selectedPickup.packages}</span>
                  </div>
                  <div className="pm-details-row">
                    <span>Material:</span>
                    <span>{selectedPickup.material}</span>
                  </div>
                  <div className="pm-details-row">
                    <span>Pickup Date:</span>
                    <span>{selectedPickup.pickup_date}</span>
                  </div>
                  <div className="pm-details-row">
                    <span>Time Slot:</span>
                    <span>{selectedPickup.pickup_time}</span>
                  </div>
                </div>
                
                {selectedPickup.special_instructions && (
                  <div className="pm-details-section full-width">
                    <h4>📝 Special Instructions</h4>
                    <p>{selectedPickup.special_instructions}</p>
                  </div>
                )}
                
                {selectedPickup.assigned_to && (
                  <div className="pm-details-section">
                    <h4>👤 Assignment Info</h4>
                    <div className="pm-details-row">
                      <span>Assigned To:</span>
                      <strong>{selectedPickup.assigned_to}</strong>
                    </div>
                    <div className="pm-details-row">
                      <span>Assigned At:</span>
                      <span>{new Date(selectedPickup.assigned_at).toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="pm-modal-footer">
              <button className="pm-btn-cancel" onClick={() => setShowDetailsModal(false)}>Close</button>
              <button className="pm-btn-confirm" onClick={() => {
                setShowDetailsModal(false);
                window.print();
              }}>
                <Printer size={16} /> Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PickupManagement;