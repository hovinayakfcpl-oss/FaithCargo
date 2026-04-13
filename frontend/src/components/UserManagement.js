import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  Users, Plus, Trash2, Edit, Eye, Package, 
  DollarSign, TrendingUp, Calendar, Search, 
  CheckCircle, XCircle, Clock, Award, Crown,
  Shield, UserPlus, Mail, Phone, MapPin, Building,
  CreditCard, FileText, Truck, Calculator
} from "lucide-react";
import "./UserManagement.css";

const API_BASE_URL = "https://faithcargo.onrender.com/api/user";

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // New User Form
  const [newUser, setNewUser] = useState({ 
    username: "", 
    password: "",
    email: "",
    phone: "",
    company: "",
    address: "",
    gstin: ""
  });
  
  // Edit User
  const [editingUser, setEditingUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Permissions - ONLY THESE MODULES (No Invoice/Reports)
  const [permissions, setPermissions] = useState({
    fcpl_rate: false,
    pickup: false,
    vendor_manage: false,
    vendor_rates: false,
    rate_update: false,
    pincode: false,
    user_management: false,
    ba_b2b: false,
    create_order: false,
    shipment_details: false,
  });

  const token = localStorage.getItem("token");
  const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/users/`, config);
      // Fetch order/shipment stats for each user
      const usersWithStats = await Promise.all(
        res.data.map(async (user) => {
          const stats = await fetchUserStats(user.id);
          return { ...user, ...stats };
        })
      );
      setUsers(usersWithStats);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async (userId) => {
    try {
      const [ordersRes, shipmentsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/user-orders/${userId}/`, config),
        axios.get(`${API_BASE_URL}/user-shipments/${userId}/`, config)
      ]);
      
      const orders = ordersRes.data || [];
      const shipments = shipmentsRes.data || [];
      
      const totalFreight = shipments.reduce((sum, s) => sum + (s.freight_amount || 0), 0);
      const totalValue = shipments.reduce((sum, s) => sum + (s.total_amount || 0), 0);
      
      return {
        orderCount: orders.length,
        shipmentCount: shipments.length,
        totalFreight: totalFreight,
        totalValue: totalValue,
        lastOrderDate: orders[0]?.created_at || null,
        shipments: shipments,
        orders: orders
      };
    } catch (err) {
      console.error("Error fetching user stats:", err);
      return {
        orderCount: 0,
        shipmentCount: 0,
        totalFreight: 0,
        totalValue: 0,
        lastOrderDate: null,
        shipments: [],
        orders: []
      };
    }
  };

  const handleCheckChange = (e) => {
    setPermissions({ ...permissions, [e.target.name]: e.target.checked });
  };

  const addUser = async () => {
    if (!newUser.username || !newUser.password) {
      alert("Please fill Username and Password");
      return;
    }

    const payload = { ...newUser, ...permissions };

    try {
      await axios.post(`${API_BASE_URL}/add-user/`, payload, config);
      alert("User Created Successfully!");
      setNewUser({ username: "", password: "", email: "", phone: "", company: "", address: "", gstin: "" });
      setPermissions({
        fcpl_rate: false, pickup: false, vendor_manage: false, vendor_rates: false,
        rate_update: false, pincode: false, user_management: false, ba_b2b: false,
        create_order: false, shipment_details: false
      });
      fetchUsers();
    } catch (err) {
      alert("Error adding user. Check if backend fields match.");
    }
  };

  const updateUser = async () => {
    if (!editingUser) return;
    try {
      await axios.put(`${API_BASE_URL}/update-user/${editingUser.id}/`, editingUser, config);
      alert("User Updated Successfully!");
      setShowEditModal(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      alert("Error updating user");
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/delete-user/${id}/`, config);
      setUsers(users.filter(u => u.id !== id));
      if (selectedUser?.id === id) {
        setSelectedUser(null);
        setShowUserDetails(false);
      }
    } catch (err) {
      alert("Error deleting user");
    }
  };

  const viewUserDetails = async (user) => {
    // Refresh stats before showing
    const stats = await fetchUserStats(user.id);
    setSelectedUser({ ...user, ...stats });
    setShowUserDetails(true);
  };

  const getOrderStatusBadge = (status) => {
    const statusMap = {
      'booked': { text: '📝 Booked', color: '#f59e0b' },
      'picked': { text: '🚚 Picked', color: '#3b82f6' },
      'in_transit': { text: '🚛 In Transit', color: '#8b5cf6' },
      'out_for_delivery': { text: '📦 Out for Delivery', color: '#ec4898' },
      'delivered': { text: '✅ Delivered', color: '#10b981' }
    };
    const s = statusMap[status] || statusMap.booked;
    return <span className="order-status" style={{ background: `${s.color}20`, color: s.color }}>{s.text}</span>;
  };

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalOrders = users.reduce((sum, u) => sum + (u.orderCount || 0), 0);
  const totalShipments = users.reduce((sum, u) => sum + (u.shipmentCount || 0), 0);
  const totalRevenue = users.reduce((sum, u) => sum + (u.totalFreight || 0), 0);

  return (
    <div className="um-container">
      {/* Header Stats */}
      <div className="um-stats-grid">
        <div className="um-stat-card">
          <div className="um-stat-icon" style={{ background: "#d32f2f20", color: "#d32f2f" }}>
            <Users size={24} />
          </div>
          <div className="um-stat-info">
            <h3>{users.length}</h3>
            <p>Total Users</p>
          </div>
        </div>
        <div className="um-stat-card">
          <div className="um-stat-icon" style={{ background: "#3b82f620", color: "#3b82f6" }}>
            <Package size={24} />
          </div>
          <div className="um-stat-info">
            <h3>{totalShipments}</h3>
            <p>Total Shipments</p>
          </div>
        </div>
        <div className="um-stat-card">
          <div className="um-stat-icon" style={{ background: "#10b98120", color: "#10b981" }}>
            <DollarSign size={24} />
          </div>
          <div className="um-stat-info">
            <h3>₹{totalRevenue.toLocaleString()}</h3>
            <p>Total Revenue</p>
          </div>
        </div>
        <div className="um-stat-card">
          <div className="um-stat-icon" style={{ background: "#f59e0b20", color: "#f59e0b" }}>
            <FileText size={24} />
          </div>
          <div className="um-stat-info">
            <h3>{totalOrders}</h3>
            <p>Total Orders</p>
          </div>
        </div>
      </div>

      <div className="um-content-grid">
        {/* Create User Form */}
        <div className="um-form-card">
          <div className="um-card-header">
            <UserPlus size={20} />
            <h3>Create New User</h3>
          </div>
          
          <div className="um-form-group">
            <div className="um-form-row">
              <input
                type="text"
                placeholder="Username *"
                value={newUser.username}
                onChange={e => setNewUser({ ...newUser, username: e.target.value })}
              />
              <input
                type="password"
                placeholder="Password *"
                value={newUser.password}
                onChange={e => setNewUser({ ...newUser, password: e.target.value })}
              />
            </div>
            <div className="um-form-row">
              <input
                type="email"
                placeholder="Email"
                value={newUser.email}
                onChange={e => setNewUser({ ...newUser, email: e.target.value })}
              />
              <input
                type="tel"
                placeholder="Phone"
                value={newUser.phone}
                onChange={e => setNewUser({ ...newUser, phone: e.target.value })}
              />
            </div>
            <div className="um-form-row">
              <input
                type="text"
                placeholder="Company Name"
                value={newUser.company}
                onChange={e => setNewUser({ ...newUser, company: e.target.value })}
              />
              <input
                type="text"
                placeholder="GSTIN"
                value={newUser.gstin}
                onChange={e => setNewUser({ ...newUser, gstin: e.target.value.toUpperCase() })}
              />
            </div>
            <textarea
              placeholder="Address"
              rows="2"
              value={newUser.address}
              onChange={e => setNewUser({ ...newUser, address: e.target.value })}
            />
          </div>

          <div className="um-permissions-section">
            <h4>Select Module Permissions</h4>
            <div className="um-checkbox-grid">
              <label className="um-checkbox-item">
                <input type="checkbox" name="fcpl_rate" checked={permissions.fcpl_rate} onChange={handleCheckChange} />
                <span>📊 FCPL Rate Calculator</span>
              </label>
              <label className="um-checkbox-item">
                <input type="checkbox" name="pickup" checked={permissions.pickup} onChange={handleCheckChange} />
                <span>🚚 Pickup Request</span>
              </label>
              <label className="um-checkbox-item">
                <input type="checkbox" name="vendor_manage" checked={permissions.vendor_manage} onChange={handleCheckChange} />
                <span>🏢 Vendor Manage</span>
              </label>
              <label className="um-checkbox-item">
                <input type="checkbox" name="vendor_rates" checked={permissions.vendor_rates} onChange={handleCheckChange} />
                <span>💰 Vendor Rates</span>
              </label>
              <label className="um-checkbox-item">
                <input type="checkbox" name="rate_update" checked={permissions.rate_update} onChange={handleCheckChange} />
                <span>📈 Rate Update</span>
              </label>
              <label className="um-checkbox-item">
                <input type="checkbox" name="pincode" checked={permissions.pincode} onChange={handleCheckChange} />
                <span>📍 Pincode Management</span>
              </label>
              <label className="um-checkbox-item">
                <input type="checkbox" name="user_management" checked={permissions.user_management} onChange={handleCheckChange} />
                <span>👥 User Management</span>
              </label>
              <label className="um-checkbox-item">
                <input type="checkbox" name="ba_b2b" checked={permissions.ba_b2b} onChange={handleCheckChange} />
                <span>📊 BA & B2B Rate</span>
              </label>
              <label className="um-checkbox-item">
                <input type="checkbox" name="create_order" checked={permissions.create_order} onChange={handleCheckChange} />
                <span>📝 Create Order</span>
              </label>
              <label className="um-checkbox-item">
                <input type="checkbox" name="shipment_details" checked={permissions.shipment_details} onChange={handleCheckChange} />
                <span>📦 Shipment Details</span>
              </label>
            </div>
          </div>

          <button className="um-btn-add" onClick={addUser}>
            <Plus size={18} /> Create User Account
          </button>
        </div>

        {/* Users List with Stats */}
        <div className="um-users-card">
          <div className="um-card-header">
            <Users size={20} />
            <h3>User Management & Reports</h3>
            <div className="um-search-box">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="um-loading">Loading users...</div>
          ) : (
            <div className="um-users-list">
              {filteredUsers.map(user => (
                <div key={user.id} className={`um-user-card ${selectedUser?.id === user.id ? 'active' : ''}`} onClick={() => viewUserDetails(user)}>
                  <div className="um-user-avatar">
                    <span>{user.username.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="um-user-info">
                    <div className="um-user-name">{user.username}</div>
                    <div className="um-user-company">{user.company || "Individual"}</div>
                    <div className="um-user-stats">
                      <span><FileText size={12} /> {user.orderCount || 0} Orders</span>
                      <span><Package size={12} /> {user.shipmentCount || 0} Shipments</span>
                      <span><DollarSign size={12} /> ₹{(user.totalFreight || 0).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="um-user-actions">
                    <button className="um-btn-icon" onClick={(e) => { e.stopPropagation(); viewUserDetails(user); }} title="View Details">
                      <Eye size={16} />
                    </button>
                    <button className="um-btn-icon" onClick={(e) => { e.stopPropagation(); setEditingUser(user); setShowEditModal(true); }} title="Edit">
                      <Edit size={16} />
                    </button>
                    <button className="um-btn-icon delete" onClick={(e) => { e.stopPropagation(); deleteUser(user.id); }} title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* User Details Modal - Shows Orders & Shipments */}
      {showUserDetails && selectedUser && (
        <div className="um-modal-overlay" onClick={() => setShowUserDetails(false)}>
          <div className="um-modal um-details-modal" onClick={e => e.stopPropagation()}>
            <div className="um-modal-header">
              <h2>{selectedUser.username}'s Report</h2>
              <button className="um-modal-close" onClick={() => setShowUserDetails(false)}>×</button>
            </div>
            
            <div className="um-modal-body">
              {/* User Summary Stats */}
              <div className="um-user-summary">
                <div className="summary-card">
                  <FileText size={24} color="#3b82f6" />
                  <div>
                    <strong>{selectedUser.orderCount || 0}</strong>
                    <span>Total Orders</span>
                  </div>
                </div>
                <div className="summary-card">
                  <Package size={24} color="#10b981" />
                  <div>
                    <strong>{selectedUser.shipmentCount || 0}</strong>
                    <span>Total Shipments</span>
                  </div>
                </div>
                <div className="summary-card">
                  <DollarSign size={24} color="#f59e0b" />
                  <div>
                    <strong>₹{(selectedUser.totalFreight || 0).toLocaleString()}</strong>
                    <span>Total Freight</span>
                  </div>
                </div>
                <div className="summary-card">
                  <TrendingUp size={24} color="#8b5cf6" />
                  <div>
                    <strong>₹{(selectedUser.totalValue || 0).toLocaleString()}</strong>
                    <span>Invoice Value</span>
                  </div>
                </div>
              </div>

              {/* User Details */}
              <div className="um-user-details">
                <h4>User Information</h4>
                <div className="details-grid">
                  <div><label>Username:</label> <span>{selectedUser.username}</span></div>
                  <div><label>Email:</label> <span>{selectedUser.email || "N/A"}</span></div>
                  <div><label>Phone:</label> <span>{selectedUser.phone || "N/A"}</span></div>
                  <div><label>Company:</label> <span>{selectedUser.company || "N/A"}</span></div>
                  <div><label>GSTIN:</label> <span>{selectedUser.gstin || "N/A"}</span></div>
                  <div><label>Joined:</label> <span>{new Date(selectedUser.date_joined).toLocaleDateString()}</span></div>
                </div>
              </div>

              {/* Orders Table */}
              <div className="um-orders-table">
                <h4>Orders Created by {selectedUser.username}</h4>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Date</th>
                        <th>Origin → Dest</th>
                        <th>Weight</th>
                        <th>Value</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedUser.orders || []).length === 0 ? (
                        <tr><td colSpan="6" className="no-data">No orders found</td></tr>
                      ) : (
                        (selectedUser.orders || []).map(order => (
                          <tr key={order.id}>
                            <td>{order.order_number || order.lr_number || order.id}</td>
                            <td>{new Date(order.created_at).toLocaleDateString()}</td>
                            <td>{order.origin_pincode || "N/A"} → {order.destination_pincode || "N/A"}</td>
                            <td>{order.weight || 0} kg</td>
                            <td>₹{(order.total_value || 0).toLocaleString()}</td>
                            <td>{getOrderStatusBadge(order.status)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Shipments Table */}
              <div className="um-shipments-table">
                <h4>Shipments by {selectedUser.username}</h4>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>LR No.</th>
                        <th>Date</th>
                        <th>Route</th>
                        <th>Weight</th>
                        <th>Freight</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedUser.shipments || []).length === 0 ? (
                        <tr><td colSpan="6" className="no-data">No shipments found</td></tr>
                      ) : (
                        (selectedUser.shipments || []).map(shipment => (
                          <tr key={shipment.id}>
                            <td>{shipment.lr_number || "N/A"}</td>
                            <td>{new Date(shipment.created_at).toLocaleDateString()}</td>
                            <td>{shipment.origin_pincode || "N/A"} → {shipment.destination_pincode || "N/A"}</td>
                            <td>{shipment.weight || 0} kg</td>
                            <td>₹{(shipment.freight_amount || 0).toLocaleString()}</td>
                            <td>{getOrderStatusBadge(shipment.status)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="um-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="um-modal um-edit-modal" onClick={e => e.stopPropagation()}>
            <div className="um-modal-header">
              <h2>Edit User: {editingUser.username}</h2>
              <button className="um-modal-close" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <div className="um-modal-body">
              <div className="um-form-group">
                <input
                  type="text"
                  placeholder="Username"
                  value={editingUser.username}
                  onChange={e => setEditingUser({ ...editingUser, username: e.target.value })}
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={editingUser.email || ''}
                  onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={editingUser.phone || ''}
                  onChange={e => setEditingUser({ ...editingUser, phone: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Company"
                  value={editingUser.company || ''}
                  onChange={e => setEditingUser({ ...editingUser, company: e.target.value })}
                />
                <textarea
                  placeholder="Address"
                  rows="2"
                  value={editingUser.address || ''}
                  onChange={e => setEditingUser({ ...editingUser, address: e.target.value })}
                />
              </div>
            </div>
            <div className="um-modal-footer">
              <button className="um-btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button className="um-btn-primary" onClick={updateUser}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;