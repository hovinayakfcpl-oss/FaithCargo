import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  Package, Truck, CheckCircle, Clock, MapPin, 
  User, Phone, Calendar, MessageCircle, Bell,
  RefreshCw, ChevronRight, AlertCircle, DollarSign,
  FileText, Check, X, Camera, MessageSquare
} from "lucide-react";
import "./MyWork.css";

const API_BASE = "https://faithcargo.onrender.com/api/pickup";

function MyWork() {
  const [assignedPickups, setAssignedPickups] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("pickups");
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskReply, setTaskReply] = useState("");
  const [showTaskModal, setShowTaskModal] = useState(false);

  const token = localStorage.getItem("token");
  const config = { headers: { Authorization: `Bearer ${token}` } };

  // Fetch my assigned pickups
  const fetchMyPickups = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/staff/my-pickups/`, config);
      setAssignedPickups(res.data.pickups || []);
    } catch (err) {
      console.error("Error fetching pickups:", err);
    }
    setLoading(false);
  };

  // Fetch my tasks
  const fetchMyTasks = async () => {
    try {
      const res = await axios.get(`${API_BASE}/staff/my-tasks/`, config);
      setTasks(res.data.tasks || []);
    } catch (err) {
      console.error("Error fetching tasks:", err);
    }
  };

  // Update pickup status
  const updateStatus = async (pickupId, newStatus) => {
    try {
      await axios.put(
        `${API_BASE}/staff/update-status/${pickupId}/`,
        { status: newStatus },
        config
      );
      fetchMyPickups();
      alert(`✅ Status updated to ${newStatus}`);
    } catch (err) {
      alert("Error updating status");
    }
  };

  // Mark task as completed
  const completeTask = async (taskId) => {
    try {
      await axios.post(
        `${API_BASE}/staff/complete-task/${taskId}/`,
        { reply: taskReply },
        config
      );
      alert("✅ Task marked as completed!");
      setShowTaskModal(false);
      setTaskReply("");
      fetchMyTasks();
    } catch (err) {
      alert("Error completing task");
    }
  };

  useEffect(() => {
    fetchMyPickups();
    fetchMyTasks();
  }, []);

  const getStatusBadge = (status) => {
    const statusConfig = {
      'PENDING': { color: '#f59e0b', bg: '#fef3c7', icon: <Clock size={12} />, text: 'Pending' },
      'ASSIGNED': { color: '#3b82f6', bg: '#dbeafe', icon: <User size={12} />, text: 'Assigned' },
      'PICKED_UP': { color: '#8b5cf6', bg: '#ede9fe', icon: <Truck size={12} />, text: 'Picked Up' },
      'IN_TRANSIT': { color: '#06b6d4', bg: '#cffafe', icon: <Package size={12} />, text: 'In Transit' },
      'DELIVERED': { color: '#10b981', bg: '#d1fae5', icon: <CheckCircle size={12} />, text: 'Delivered' },
      'CANCELLED': { color: '#ef4444', bg: '#fee2e2', icon: <X size={12} />, text: 'Cancelled' }
    };
    const config = statusConfig[status] || statusConfig['PENDING'];
    return (
      <span className="work-status-badge" style={{ background: config.bg, color: config.color }}>
        {config.icon} {config.text}
      </span>
    );
  };

  const getTaskStatusBadge = (status) => {
    if (status === 'COMPLETED') {
      return <span className="task-status completed"><CheckCircle size={12} /> Completed</span>;
    }
    return <span className="task-status pending"><Clock size={12} /> Pending</span>;
  };

  return (
    <div className="mywork-container">
      <div className="mywork-header">
        <h1><Truck size={28} /> My Work</h1>
        <p>Your assigned pickups and tasks from admin</p>
        <button className="mywork-refresh" onClick={() => { fetchMyPickups(); fetchMyTasks(); }}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="mywork-tabs">
        <button 
          className={`mywork-tab ${activeTab === "pickups" ? "active" : ""}`}
          onClick={() => setActiveTab("pickups")}
        >
          <Package size={16} /> Assigned Pickups ({assignedPickups.length})
        </button>
        <button 
          className={`mywork-tab ${activeTab === "tasks" ? "active" : ""}`}
          onClick={() => setActiveTab("tasks")}
        >
          <MessageCircle size={16} /> Tasks ({tasks.filter(t => t.status !== 'COMPLETED').length})
        </button>
      </div>

      {loading ? (
        <div className="mywork-loading">Loading...</div>
      ) : (
        <>
          {/* Pickups Tab */}
          {activeTab === "pickups" && (
            <div className="mywork-pickups">
              {assignedPickups.length === 0 ? (
                <div className="mywork-empty">
                  <Package size={48} />
                  <p>No pickups assigned yet</p>
                </div>
              ) : (
                assignedPickups.map(pickup => (
                  <div key={pickup.id} className="mywork-pickup-card">
                    <div className="mywork-pickup-header">
                      <div className="mywork-pickup-id">{pickup.pickup_id}</div>
                      {getStatusBadge(pickup.status)}
                    </div>
                    
                    <div className="mywork-pickup-body">
                      <div className="mywork-route">
                        <div className="mywork-location">
                          <MapPin size={14} color="#10b981" />
                          <div>
                            <strong>Pickup From</strong>
                            <p>{pickup.pickup_name}</p>
                            <p>{pickup.pickup_address}</p>
                            <p className="mywork-contact"><Phone size={10} /> {pickup.pickup_phone}</p>
                          </div>
                        </div>
                        <div className="mywork-arrow">→</div>
                        <div className="mywork-location">
                          <MapPin size={14} color="#ef4444" />
                          <div>
                            <strong>Deliver To</strong>
                            <p>{pickup.delivery_name}</p>
                            <p>{pickup.delivery_address}</p>
                            <p className="mywork-contact"><Phone size={10} /> {pickup.delivery_phone}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mywork-details">
                        <div className="mywork-detail">
                          <Package size={12} />
                          <span>{pickup.packages} Packages</span>
                        </div>
                        <div className="mywork-detail">
                          <Truck size={12} />
                          <span>{pickup.weight} kg</span>
                        </div>
                        <div className="mywork-detail">
                          <Calendar size={12} />
                          <span>{pickup.pickup_date}</span>
                        </div>
                        <div className="mywork-detail">
                          <Clock size={12} />
                          <span>{pickup.pickup_time}</span>
                        </div>
                      </div>
                      
                      {pickup.special_instructions && (
                        <div className="mywork-instructions">
                          <AlertCircle size={12} />
                          <span>Instructions: {pickup.special_instructions}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="mywork-pickup-footer">
                      <select
                        className="mywork-status-select"
                        value={pickup.status}
                        onChange={(e) => updateStatus(pickup.id, e.target.value)}
                      >
                        <option value="PENDING">Mark as Pending</option>
                        <option value="ASSIGNED">Mark as Assigned</option>
                        <option value="PICKED_UP">✅ Mark as Picked Up</option>
                        <option value="IN_TRANSIT">🚚 Mark as In Transit</option>
                        <option value="DELIVERED">📦 Mark as Delivered</option>
                      </select>
                      <button className="mywork-contact-btn">
                        <Phone size={14} /> Contact Client
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tasks Tab */}
          {activeTab === "tasks" && (
            <div className="mywork-tasks">
              {tasks.length === 0 ? (
                <div className="mywork-empty">
                  <MessageCircle size={48} />
                  <p>No tasks assigned yet</p>
                </div>
              ) : (
                tasks.map(task => (
                  <div key={task.id} className="mywork-task-card">
                    <div className="mywork-task-header">
                      <div className="mywork-task-title">
                        <Bell size={16} />
                        <span>Task from Admin</span>
                      </div>
                      {getTaskStatusBadge(task.status)}
                    </div>
                    
                    <div className="mywork-task-body">
                      <div className="mywork-task-message">
                        <div className="mywork-task-label">Task Details:</div>
                        <p>{task.message}</p>
                      </div>
                      
                      {task.pickup && (
                        <div className="mywork-task-pickup-ref">
                          <Package size={12} />
                          <span>Related Pickup: <strong>{task.pickup.pickup_id}</strong></span>
                        </div>
                      )}
                      
                      {task.reply && (
                        <div className="mywork-task-reply">
                          <div className="mywork-task-label">Your Reply:</div>
                          <p>{task.reply}</p>
                        </div>
                      )}
                    </div>
                    
                    {task.status !== 'COMPLETED' && (
                      <div className="mywork-task-footer">
                        <textarea
                          placeholder="Add your reply or completion notes..."
                          value={taskReply}
                          onChange={(e) => setTaskReply(e.target.value)}
                          rows="2"
                        />
                        <button 
                          className="mywork-complete-btn"
                          onClick={() => completeTask(task.id)}
                        >
                          <CheckCircle size={16} /> Mark as Completed
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default MyWork;