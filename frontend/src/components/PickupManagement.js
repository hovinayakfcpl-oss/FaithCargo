import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  Package, Truck, User, Calendar, Clock, MapPin, Phone, 
  ChevronRight, Search, Filter, Eye, CheckCircle, 
  XCircle, Clock as ClockIcon, RefreshCw, UserCheck,
  MessageCircle, Send, FileText, DollarSign, CreditCard,
  AlertCircle, Bell, Check, X, Edit, Trash2, Plus
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
  const [taskMessage, setTaskMessage] = useState("");
  const [selectedStaff, setSelectedStaff] = useState("");
  const [assignmentNotes, setAssignmentNotes] = useState("");

  const token = localStorage.getItem("token");
  const config = { headers: { Authorization: `Bearer ${token}` } };

  // Fetch all pickups
  const fetchPickups = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/admin/all/`, config);
      setPickups(res.data.pickups || []);
    } catch (err) {
      console.error("Error fetching pickups:", err);
    }
    setLoading(false);
  };

  // Fetch staff list
  const fetchStaff = async () => {
    try {
      const res = await axios.get(`${API_BASE}/staff/list/`, config);
      setStaffList(res.data.staff || []);
    } catch (err) {
      console.error("Error fetching staff:", err);
    }
  };

  // Assign pickup to staff
  const assignPickup = async () => {
    if (!selectedStaff) {
      alert("Please select a staff member");
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
      alert(`✅ Pickup assigned successfully!`);
      setShowAssignModal(false);
      setSelectedStaff("");
      setAssignmentNotes("");
      fetchPickups();
    } catch (err) {
      alert("❌ Error assigning pickup");
    }
    setLoading(false);
  };

  // Send task to staff
  const sendTaskToStaff = async () => {
    if (!taskMessage.trim()) {
      alert("Please enter task details");
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${API_BASE}/admin/send-task/${selectedPickup.id}/`,
        {
          task: taskMessage,
          staff_id: selectedPickup.assigned_to_id
        },
        config
      );
      alert(`✅ Task sent to staff!`);
      setShowTaskModal(false);
      setTaskMessage("");
      fetchPickups();
    } catch (err) {
      alert("❌ Error sending task");
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
      fetchPickups();
    } catch (err) {
      alert("Error updating status");
    }
  };

  useEffect(() => {
    fetchPickups();
    fetchStaff();
  }, []);

  const getStatusBadge = (status) => {
    const statusConfig = {
      'PENDING': { color: '#f59e0b', bg: '#fef3c7', icon: <ClockIcon size={12} />, text: 'Pending' },
      'ASSIGNED': { color: '#3b82f6', bg: '#dbeafe', icon: <UserCheck size={12} />, text: 'Assigned' },
      'PICKED_UP': { color: '#8b5cf6', bg: '#ede9fe', icon: <Truck size={12} />, text: 'Picked Up' },
      'IN_TRANSIT': { color: '#06b6d4', bg: '#cffafe', icon: <Package size={12} />, text: 'In Transit' },
      'DELIVERED': { color: '#10b981', bg: '#d1fae5', icon: <CheckCircle size={12} />, text: 'Delivered' },
      'CANCELLED': { color: '#ef4444', bg: '#fee2e2', icon: <XCircle size={12} />, text: 'Cancelled' }
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
                          p.pickup_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: pickups.length,
    pending: pickups.filter(p => p.status === 'PENDING').length,
    assigned: pickups.filter(p => p.status === 'ASSIGNED').length,
    delivered: pickups.filter(p => p.status === 'DELIVERED').length
  };

  return (
    <div className="pm-container">
      {/* Header Stats */}
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
            placeholder="Search by Pickup ID, Client, Sender..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="pm-filter-buttons">
          {["ALL", "PENDING", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "DELIVERED"].map(status => (
            <button
              key={status}
              className={`pm-filter-btn ${statusFilter === status ? "active" : ""}`}
              onClick={() => setStatusFilter(status)}
            >
              {status === "ALL" ? "All" : status}
            </button>
          ))}
        </div>
        <button className="pm-refresh-btn" onClick={fetchPickups}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Pickups List */}
      <div className="pm-pickups-list">
        {loading ? (
          <div className="pm-loading">Loading...</div>
        ) : filteredPickups.length === 0 ? (
          <div className="pm-empty">No pickups found</div>
        ) : (
          filteredPickups.map(pickup => (
            <div key={pickup.id} className="pm-pickup-card">
              <div className="pm-pickup-header">
                <div className="pm-pickup-id">{pickup.pickup_id}</div>
                {getStatusBadge(pickup.status)}
              </div>
              
              <div className="pm-pickup-body">
                <div className="pm-pickup-section">
                  <div className="pm-section-title"><MapPin size={14} /> Pickup Details</div>
                  <div className="pm-pickup-details">
                    <div><strong>{pickup.pickup_name}</strong></div>
                    <div>{pickup.pickup_address}</div>
                    <div>📞 {pickup.pickup_phone}</div>
                    <div>📮 {pickup.pickup_pincode}</div>
                  </div>
                </div>
                
                <div className="pm-pickup-arrow">→</div>
                
                <div className="pm-pickup-section">
                  <div className="pm-section-title"><MapPin size={14} /> Delivery Details</div>
                  <div className="pm-pickup-details">
                    <div><strong>{pickup.delivery_name}</strong></div>
                    <div>{pickup.delivery_address}</div>
                    <div>📞 {pickup.delivery_phone}</div>
                    <div>📮 {pickup.delivery_pincode}</div>
                  </div>
                </div>
                
                <div className="pm-pickup-info">
                  <div><Package size={12} /> {pickup.packages} pkg</div>
                  <div><Truck size={12} /> {pickup.weight} kg</div>
                  <div><Calendar size={12} /> {pickup.pickup_date}</div>
                  <div><Clock size={12} /> {pickup.pickup_time}</div>
                </div>
              </div>
              
              <div className="pm-pickup-footer">
                <div className="pm-client-info">
                  <User size={14} />
                  <span>Client: <strong>{pickup.client_name}</strong> ({pickup.client_id})</span>
                </div>
                
                {pickup.assigned_to && (
                  <div className="pm-assigned-info">
                    <UserCheck size={14} />
                    <span>Assigned to: <strong>{pickup.assigned_to}</strong></span>
                  </div>
                )}
                
                <div className="pm-action-buttons">
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
                    <MessageCircle size={16} /> Send Task
                  </button>
                  <select
                    className="pm-status-select"
                    value={pickup.status}
                    onChange={(e) => updateStatus(pickup.id, e.target.value)}
                  >
                    <option value="PENDING">Pending</option>
                    <option value="ASSIGNED">Assigned</option>
                    <option value="PICKED_UP">Picked Up</option>
                    <option value="IN_TRANSIT">In Transit</option>
                    <option value="DELIVERED">Delivered</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
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
              <h3>Assign Pickup: {selectedPickup.pickup_id}</h3>
              <button className="pm-modal-close" onClick={() => setShowAssignModal(false)}>×</button>
            </div>
            <div className="pm-modal-body">
              <div className="pm-form-group">
                <label>Select Staff Member *</label>
                <select value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value)}>
                  <option value="">-- Select Staff --</option>
                  {staffList.map(staff => (
                    <option key={staff.id} value={staff.id}>
                      {staff.username} {staff.company ? `(${staff.company})` : ''}
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
              <h3>Send Task for: {selectedPickup.pickup_id}</h3>
              <button className="pm-modal-close" onClick={() => setShowTaskModal(false)}>×</button>
            </div>
            <div className="pm-modal-body">
              <div className="pm-task-types">
                <p className="pm-task-hint">💡 Task Types:</p>
                <div className="pm-task-badges">
                  <span>💰 Payment Collection</span>
                  <span>📄 Docket Clearance</span>
                  <span>🚚 Delivery Arrangement</span>
                  <span>📞 Customer Follow-up</span>
                  <span>📸 Proof of Delivery</span>
                </div>
              </div>
              <div className="pm-form-group">
                <label>Task Details *</label>
                <textarea
                  rows="4"
                  placeholder="Describe the task clearly...&#10;&#10;Example:&#10;• Collect payment of ₹1500 from customer&#10;• Clear the docket for shipment FCPL1234&#10;• Arrange delivery for urgent shipment"
                  value={taskMessage}
                  onChange={(e) => setTaskMessage(e.target.value)}
                />
              </div>
              <div className="pm-staff-info">
                <UserCheck size={14} />
                <span>Task will be sent to: <strong>{selectedPickup.assigned_to || "Not assigned yet"}</strong></span>
              </div>
            </div>
            <div className="pm-modal-footer">
              <button className="pm-btn-cancel" onClick={() => setShowTaskModal(false)}>Cancel</button>
              <button className="pm-btn-confirm" onClick={sendTaskToStaff} disabled={loading}>
                {loading ? "Sending..." : "Send Task"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PickupManagement;