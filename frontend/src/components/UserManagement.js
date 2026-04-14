import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  Users, Plus, Trash2, Edit, Eye, Package, 
  DollarSign, TrendingUp, Calendar, Search, 
  CheckCircle, XCircle, Clock, Award, Crown,
  Shield, UserPlus, Mail, Phone, MapPin, Building,
  CreditCard, FileText, Truck, Calculator, 
  Settings, Zap, BarChart3, Download, Filter
} from "lucide-react";
import "./UserManagement.css";

const API_BASE_URL = "https://faithcargo.onrender.com/api/user";
const RATES_API_URL = "https://faithcargo.onrender.com/api/rates";

// Zone list for rate matrix
const zones = ["N1","N2","N3","C1","W1","W2","S1","S2","E1","NE1","NE2"];

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // ========== NEW: Client Rates State ==========
  const [showRateModal, setShowRateModal] = useState(false);
  const [rateClient, setRateClient] = useState(null);
  const [clientRates, setClientRates] = useState({});
  const [masterRates, setMasterRates] = useState({});
  const [ratePolicy, setRatePolicy] = useState({
    minFreight: 600,
    docketCharge: 50,
    fuelPercent: 15,
    fovCharge: 75,
    odaCharge: 3,
    codCharge: 150,
    codPercent: 2.5,
    handlingCharge: 2,
    appointmentCharge: 4,
    cft: 4500,
    gstPercent: 18
  });
  
  // ========== NEW: Report Filters ==========
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState(null);
  
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
  
  // Permissions
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

  // Create empty rate matrix
  const createEmptyMatrix = () => {
    let matrix = {};
    zones.forEach(f => {
      matrix[f] = {};
      zones.forEach(t => {
        matrix[f][t] = "";
      });
    });
    return matrix;
  };

  // Fetch master rates
  const fetchMasterRates = async () => {
    try {
      const response = await axios.get("https://faithcargo.onrender.com/api/rates/matrix/");
      let matrix = createEmptyMatrix();
      response.data.forEach(r => {
        if (matrix[r.from_zone]) {
          matrix[r.from_zone][r.to_zone] = r.rate;
        }
      });
      setMasterRates(matrix);
    } catch (error) {
      console.error("Error fetching master rates:", error);
    }
  };

  // Fetch client-specific rates
  const fetchClientRates = async (clientId) => {
    try {
      const response = await axios.get(`${RATES_API_URL}/client/${clientId}/`);
      let matrix = createEmptyMatrix();
      
      if (response.data.zone_rates) {
        response.data.zone_rates.forEach(r => {
          if (matrix[r.from_zone]) {
            matrix[r.from_zone][r.to_zone] = r.rate;
          }
        });
      }
      setClientRates(matrix);
      
      if (response.data.policy) {
        setRatePolicy(response.data.policy);
      }
    } catch (error) {
      console.error("Error fetching client rates:", error);
      setClientRates(createEmptyMatrix());
    }
  };

  // Update client rates
  const updateClientRates = async () => {
    if (!rateClient) return;
    
    setLoading(true);
    let zonePayload = [];
    zones.forEach(f => {
      zones.forEach(t => {
        if (clientRates[f] && clientRates[f][t] !== "") {
          zonePayload.push({
            from_zone: f,
            to_zone: t,
            rate: Number(clientRates[f][t])
          });
        }
      });
    });

    try {
      await axios.post(`${RATES_API_URL}/client/${rateClient.id}/update/`, {
        zone_rates: zonePayload,
        policy: ratePolicy
      }, config);
      alert(`Rates updated for ${rateClient.username}`);
      setShowRateModal(false);
      setRateClient(null);
    } catch (error) {
      console.error("Error updating client rates:", error);
      alert("Error updating rates");
    }
    setLoading(false);
  };

  // Handle rate change
  const handleRateChange = (from, to, value) => {
    setClientRates(prev => ({
      ...prev,
      [from]: {
        ...prev[from],
        [to]: value
      }
    }));
  };

  // Handle policy change
  const handlePolicyChange = (field, value) => {
    setRatePolicy(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }));
  };

  // Generate client report with date filter
  const generateClientReport = async (user, range = dateRange) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/user-report/${user.id}/`, {
        params: { from_date: range.from, to_date: range.to },
        ...config
      });
      setReportData(response.data);
      setShowReportModal(true);
    } catch (error) {
      console.error("Error generating report:", error);
      alert("Error generating report");
    }
  };

  // Export report as CSV
  const exportReportCSV = () => {
    if (!reportData) return;
    
    const ordersCSV = reportData.orders.map(o => 
      `${o.order_number},${o.created_at},${o.origin_pincode},${o.destination_pincode},${o.weight},${o.total_value},${o.status}`
    ).join('\n');
    
    const blob = new Blob([`Order ID,Date,Origin,Destination,Weight,Value,Status\n${ordersCSV}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportData.username}_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchUsers();
    fetchMasterRates();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/users/`, config);
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

  // Render Rate Matrix Modal
  const renderRateModal = () => (
    <div className="um-modal-overlay" onClick={() => setShowRateModal(false)}>
      <div className="um-modal rate-modal" onClick={e => e.stopPropagation()}>
        <div className="um-modal-header">
          <h2>Custom Rates for: {rateClient?.username}</h2>
          <button className="um-modal-close" onClick={() => setShowRateModal(false)}>×</button>
        </div>
        <div className="um-modal-body">
          {/* Zone Rate Matrix */}
          <div className="rate-matrix-section">
            <h4>Zone Rate Matrix (₹ per kg)</h4>
            <div className="table-wrapper">
              <table className="rate-matrix-table">
                <thead>
                  <tr>
                    <th>From ↓ / To →</th>
                    {zones.map(z => <th key={z}>{z}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {zones.map(from => (
                    <tr key={from}>
                      <td className="zone-cell">{from}</td>
                      {zones.map(to => (
                        <td key={to}>
                          <input
                            type="number"
                            value={clientRates[from]?.[to] || ""}
                            onChange={(e) => handleRateChange(from, to, e.target.value)}
                            placeholder={masterRates[from]?.[to] || "0"}
                            className="rate-input"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rate Policy */}
          <div className="policy-section">
            <h4>Rate Policy Overrides</h4>
            <div className="policy-grid">
              <div className="policy-field">
                <label>Min Freight (₹)</label>
                <input type="number" value={ratePolicy.minFreight} onChange={(e) => handlePolicyChange('minFreight', e.target.value)} />
              </div>
              <div className="policy-field">
                <label>Docket Charge (₹)</label>
                <input type="number" value={ratePolicy.docketCharge} onChange={(e) => handlePolicyChange('docketCharge', e.target.value)} />
              </div>
              <div className="policy-field">
                <label>Fuel Surcharge (%)</label>
                <input type="number" value={ratePolicy.fuelPercent} onChange={(e) => handlePolicyChange('fuelPercent', e.target.value)} />
              </div>
              <div className="policy-field">
                <label>FOV Charge (₹)</label>
                <input type="number" value={ratePolicy.fovCharge} onChange={(e) => handlePolicyChange('fovCharge', e.target.value)} />
              </div>
              <div className="policy-field">
                <label>ODA Charge (₹/kg)</label>
                <input type="number" value={ratePolicy.odaCharge} onChange={(e) => handlePolicyChange('odaCharge', e.target.value)} />
              </div>
              <div className="policy-field">
                <label>COD Charge (₹)</label>
                <input type="number" value={ratePolicy.codCharge} onChange={(e) => handlePolicyChange('codCharge', e.target.value)} />
              </div>
              <div className="policy-field">
                <label>COD Percentage (%)</label>
                <input type="number" value={ratePolicy.codPercent} onChange={(e) => handlePolicyChange('codPercent', e.target.value)} />
              </div>
              <div className="policy-field">
                <label>Handling Charge (₹/kg)</label>
                <input type="number" value={ratePolicy.handlingCharge} onChange={(e) => handlePolicyChange('handlingCharge', e.target.value)} />
              </div>
              <div className="policy-field">
                <label>Appointment Charge (₹/kg)</label>
                <input type="number" value={ratePolicy.appointmentCharge} onChange={(e) => handlePolicyChange('appointmentCharge', e.target.value)} />
              </div>
              <div className="policy-field">
                <label>GST (%)</label>
                <input type="number" value={ratePolicy.gstPercent} onChange={(e) => handlePolicyChange('gstPercent', e.target.value)} />
              </div>
            </div>
          </div>
        </div>
        <div className="um-modal-footer">
          <button className="um-btn-secondary" onClick={() => setShowRateModal(false)}>Cancel</button>
          <button className="um-btn-primary" onClick={updateClientRates} disabled={loading}>
            {loading ? "Saving..." : "Save Custom Rates"}
          </button>
        </div>
      </div>
    </div>
  );

  // Render Report Modal
  const renderReportModal = () => (
    <div className="um-modal-overlay" onClick={() => setShowReportModal(false)}>
      <div className="um-modal report-modal" onClick={e => e.stopPropagation()}>
        <div className="um-modal-header">
          <h2>📊 {reportData?.username}'s Report</h2>
          <button className="um-modal-close" onClick={() => setShowReportModal(false)}>×</button>
        </div>
        <div className="um-modal-body">
          {/* Summary Stats */}
          <div className="report-stats">
            <div className="stat">
              <span>Total Orders</span>
              <strong>{reportData?.totalOrders || 0}</strong>
            </div>
            <div className="stat">
              <span>Total Shipments</span>
              <strong>{reportData?.totalShipments || 0}</strong>
            </div>
            <div className="stat">
              <span>Total Freight</span>
              <strong>₹{(reportData?.totalFreight || 0).toLocaleString()}</strong>
            </div>
            <div className="stat">
              <span>Total Value</span>
              <strong>₹{(reportData?.totalValue || 0).toLocaleString()}</strong>
            </div>
          </div>

          {/* Orders Table */}
          <div className="report-table">
            <h4>Orders</h4>
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Date</th>
                  <th>Origin</th>
                  <th>Destination</th>
                  <th>Weight</th>
                  <th>Freight</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(reportData?.orders || []).map(order => (
                  <tr key={order.id}>
                    <td>{order.order_number}</td>
                    <td>{new Date(order.created_at).toLocaleDateString()}</td>
                    <td>{order.origin_pincode}</td>
                    <td>{order.destination_pincode}</td>
                    <td>{order.weight} kg</td>
                    <td>₹{(order.freight_amount || 0).toLocaleString()}</td>
                    <td>{getOrderStatusBadge(order.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="um-modal-footer">
          <button className="um-btn-secondary" onClick={() => setShowReportModal(false)}>Close</button>
          <button className="um-btn-primary" onClick={exportReportCSV}>
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>
    </div>
  );

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
                <div key={user.id} className={`um-user-card ${selectedUser?.id === user.id ? 'active' : ''}`}>
                  <div className="um-user-avatar">
                    <span>{user.username.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="um-user-info" onClick={() => viewUserDetails(user)}>
                    <div className="um-user-name">{user.username}</div>
                    <div className="um-user-company">{user.company || "Individual"}</div>
                    <div className="um-user-stats">
                      <span><FileText size={12} /> {user.orderCount || 0} Orders</span>
                      <span><Package size={12} /> {user.shipmentCount || 0} Shipments</span>
                      <span><DollarSign size={12} /> ₹{(user.totalFreight || 0).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="um-user-actions">
                    <button className="um-btn-icon rate" onClick={(e) => { e.stopPropagation(); setRateClient(user); fetchClientRates(user.id); setShowRateModal(true); }} title="Custom Rates">
                      <Settings size={16} />
                    </button>
                    <button className="um-btn-icon report" onClick={(e) => { e.stopPropagation(); generateClientReport(user); }} title="Generate Report">
                      <BarChart3 size={16} />
                    </button>
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

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <div className="um-modal-overlay" onClick={() => setShowUserDetails(false)}>
          <div className="um-modal um-details-modal" onClick={e => e.stopPropagation()}>
            <div className="um-modal-header">
              <h2>{selectedUser.username}'s Report</h2>
              <button className="um-modal-close" onClick={() => setShowUserDetails(false)}>×</button>
            </div>
            
            <div className="um-modal-body">
              {/* Date Range Filter */}
              <div className="date-filter">
                <label>Filter by Date:</label>
                <input type="date" value={dateRange.from} onChange={e => setDateRange({...dateRange, from: e.target.value})} />
                <span>to</span>
                <input type="date" value={dateRange.to} onChange={e => setDateRange({...dateRange, to: e.target.value})} />
                <button onClick={() => generateClientReport(selectedUser)}><Filter size={14} /> Apply</button>
              </div>

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
                        <th>Freight</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedUser.orders || []).length === 0 ? (
                        <tr><td colSpan="7" className="no-data">No orders found</td></tr>
                      ) : (
                        (selectedUser.orders || []).map(order => (
                          <tr key={order.id}>
                            <td>{order.order_number || order.lr_number || order.id}</td>
                            <td>{new Date(order.created_at).toLocaleDateString()}</td>
                            <td>{order.origin_pincode || "N/A"} → {order.destination_pincode || "N/A"}</td>
                            <td>{order.weight || 0} kg</td>
                            <td>₹{(order.total_value || 0).toLocaleString()}</td>
                            <td>₹{(order.freight_amount || 0).toLocaleString()}</td>
                            <td>{getOrderStatusBadge(order.status)}</td>
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

      {/* Rate Modal */}
      {showRateModal && renderRateModal()}

      {/* Report Modal */}
      {showReportModal && renderReportModal()}
    </div>
  );
}

export default UserManagement;