import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  Users, Plus, Trash2, Edit, Eye, FileText, 
  DollarSign, Package, TrendingUp, Calendar, 
  Download, Printer, Search, Filter, ChevronRight,
  CheckCircle, XCircle, Clock, Award, Crown,
  BarChart3, PieChart, Settings, Shield, UserPlus,
  Mail, Phone, MapPin, Building, CreditCard,
  Receipt, FileSpreadsheet, Activity, Zap
} from "lucide-react";
import "./UserManagement.css";

// Direct API URL
const API_BASE_URL = "https://faithcargo.onrender.com";

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [billingData, setBillingData] = useState(null);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  
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
    view_reports: false,
    generate_invoice: false
  });

  const token = localStorage.getItem("token");
  const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

  useEffect(() => {
    fetchUsers();
    fetchAllShipments();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/users/`, config);
      // Fetch orders count for each user
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
        axios.get(`${API_BASE_URL}/api/user-orders/${userId}/`, config),
        axios.get(`${API_BASE_URL}/api/user-shipments/${userId}/`, config)
      ]);
      
      const orders = ordersRes.data;
      const shipments = shipmentsRes.data;
      
      const totalFreight = shipments.reduce((sum, s) => sum + (s.freight_amount || 0), 0);
      const totalGst = shipments.reduce((sum, s) => sum + (s.gst_amount || 0), 0);
      const totalValue = shipments.reduce((sum, s) => sum + (s.invoice_value || 0), 0);
      
      return {
        orderCount: orders.length,
        shipmentCount: shipments.length,
        totalFreight: totalFreight,
        totalGst: totalGst,
        totalValue: totalValue,
        lastOrderDate: orders[0]?.created_at || null,
        shipments: shipments
      };
    } catch (err) {
      console.error("Error fetching user stats:", err);
      return {
        orderCount: 0,
        shipmentCount: 0,
        totalFreight: 0,
        totalGst: 0,
        totalValue: 0,
        lastOrderDate: null,
        shipments: []
      };
    }
  };

  const fetchAllShipments = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/all-shipments/`, config);
      localStorage.setItem('allShipmentsData', JSON.stringify(res.data));
    } catch (err) {
      console.error("Error fetching shipments:", err);
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
      await axios.post(`${API_BASE_URL}/api/add-user/`, payload, config);
      alert("User Created Successfully!");
      setNewUser({ username: "", password: "", email: "", phone: "", company: "", address: "", gstin: "" });
      setPermissions(Object.fromEntries(Object.keys(permissions).map(k => [k, false])));
      fetchUsers();
    } catch (err) {
      alert("Error adding user. Check if backend fields match.");
    }
  };

  const updateUser = async () => {
    if (!editingUser) return;
    try {
      await axios.put(`${API_BASE_URL}/api/update-user/${editingUser.id}/`, editingUser, config);
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
      await axios.delete(`${API_BASE_URL}/api/delete-user/${id}/`, config);
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
    setSelectedUser(user);
    setShowUserDetails(true);
  };

  const generateUserBill = async (user) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/user-bill/${user.id}/?start=${dateRange.start}&end=${dateRange.end}`, config);
      setBillingData(response.data);
      setShowBillingModal(true);
    } catch (err) {
      alert("Error generating bill");
    } finally {
      setLoading(false);
    }
  };

  const printBill = () => {
    const printContent = document.getElementById('bill-content');
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - ${billingData?.user?.username}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; background: white; }
            .bill-container { max-width: 800px; margin: 0 auto; }
            .bill-header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #d32f2f; }
            .bill-header h1 { color: #d32f2f; margin-bottom: 10px; }
            .company-details { font-size: 12px; color: #666; margin-top: 10px; }
            .customer-details { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .bill-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .bill-table th, .bill-table td { padding: 12px; border: 1px solid #e2e8f0; text-align: left; }
            .bill-table th { background: #f1f5f9; font-weight: bold; }
            .total-section { text-align: right; margin-top: 20px; padding-top: 20px; border-top: 2px solid #e2e8f0; }
            .grand-total { font-size: 24px; font-weight: bold; color: #d32f2f; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="bill-container">${printContent.innerHTML}</div>
          <script>window.print();window.close();<\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const downloadCSV = () => {
    if (!selectedUser?.shipments) return;
    
    const headers = ["LR Number", "AWB", "Date", "Origin", "Destination", "Weight", "Freight", "GST", "Total", "Status"];
    const rows = selectedUser.shipments.map(s => [
      s.lr_number, s.awb_number, new Date(s.created_at).toLocaleDateString(),
      s.origin_pincode, s.destination_pincode, s.weight,
      s.freight_amount, s.gst_amount, s.total_amount, s.status
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedUser.username}_shipments.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status) => {
    const colors = {
      booked: "#f59e0b",
      picked: "#3b82f6",
      in_transit: "#8b5cf6",
      out_for_delivery: "#ec4898",
      delivered: "#10b981"
    };
    return colors[status] || "#64748b";
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
          <div className="um-stat-icon" style={{ background: "#8b5cf620", color: "#8b5cf6" }}>
            <TrendingUp size={24} />
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
            <h4>Module Permissions</h4>
            <div className="um-checkbox-grid">
              {Object.keys(permissions).map((key) => (
                <label className="um-checkbox-item" key={key}>
                  <input
                    type="checkbox"
                    name={key}
                    checked={permissions[key]}
                    onChange={handleCheckChange}
                  />
                  <span>{key.replace(/_/g, ' ').toUpperCase()}</span>
                </label>
              ))}
            </div>
          </div>

          <button className="um-btn-add" onClick={addUser}>
            <Plus size={18} /> Create User Account
          </button>
        </div>

        {/* Users List */}
        <div className="um-users-card">
          <div className="um-card-header">
            <Users size={20} />
            <h3>User Management</h3>
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
                  <div className="um-user-info">
                    <div className="um-user-name">{user.username}</div>
                    <div className="um-user-stats">
                      <span><Package size={12} /> {user.shipmentCount || 0} shipments</span>
                      <span><DollarSign size={12} /> ₹{(user.totalFreight || 0).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="um-user-actions">
                    <button className="um-btn-icon" onClick={() => viewUserDetails(user)} title="View Details">
                      <Eye size={16} />
                    </button>
                    <button className="um-btn-icon" onClick={() => {
                      setEditingUser(user);
                      setShowEditModal(true);
                    }} title="Edit">
                      <Edit size={16} />
                    </button>
                    <button className="um-btn-icon delete" onClick={() => deleteUser(user.id)} title="Delete">
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
          <div className="um-modal" onClick={e => e.stopPropagation()}>
            <div className="um-modal-header">
              <h2>{selectedUser.username}</h2>
              <button className="um-modal-close" onClick={() => setShowUserDetails(false)}>×</button>
            </div>
            
            <div className="um-modal-body">
              <div className="um-user-profile">
                <div className="um-profile-stats">
                  <div className="um-stat-item">
                    <Package size={20} />
                    <div>
                      <strong>{selectedUser.shipmentCount || 0}</strong>
                      <span>Total Shipments</span>
                    </div>
                  </div>
                  <div className="um-stat-item">
                    <DollarSign size={20} />
                    <div>
                      <strong>₹{(selectedUser.totalFreight || 0).toLocaleString()}</strong>
                      <span>Total Freight</span>
                    </div>
                  </div>
                  <div className="um-stat-item">
                    <TrendingUp size={20} />
                    <div>
                      <strong>₹{(selectedUser.totalValue || 0).toLocaleString()}</strong>
                      <span>Invoice Value</span>
                    </div>
                  </div>
                </div>

                <div className="um-profile-actions">
                  <button className="um-btn-primary" onClick={() => generateUserBill(selectedUser)}>
                    <Receipt size={16} /> Generate Bill
                  </button>
                  <button className="um-btn-secondary" onClick={downloadCSV}>
                    <FileSpreadsheet size={16} /> Export CSV
                  </button>
                </div>

                <div className="um-shipments-table">
                  <h4>Recent Shipments</h4>
                  <table className="um-data-table">
                    <thead>
                      <tr>
                        <th>LR No.</th>
                        <th>Date</th>
                        <th>From → To</th>
                        <th>Weight</th>
                        <th>Freight</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedUser.shipments || []).slice(0, 10).map(shipment => (
                        <tr key={shipment.id}>
                          <td>{shipment.lr_number}</td>
                          <td>{new Date(shipment.created_at).toLocaleDateString()}</td>
                          <td>{shipment.origin_pincode} → {shipment.destination_pincode}</td>
                          <td>{shipment.weight} kg</td>
                          <td>₹{shipment.freight_amount?.toLocaleString()}</td>
                          <td>
                            <span className="um-status" style={{ background: `${getStatusColor(shipment.status)}20`, color: getStatusColor(shipment.status) }}>
                              {shipment.status?.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Billing Modal */}
      {showBillingModal && billingData && (
        <div className="um-modal-overlay" onClick={() => setShowBillingModal(false)}>
          <div className="um-modal um-bill-modal" onClick={e => e.stopPropagation()}>
            <div className="um-modal-header">
              <h2>Invoice / Bill</h2>
              <button className="um-modal-close" onClick={() => setShowBillingModal(false)}>×</button>
            </div>
            
            <div className="um-modal-body" id="bill-content">
              <div className="um-bill">
                <div className="um-bill-header">
                  <h1>FAITH CARGO PVT LTD</h1>
                  <p>4/15, Kirti Nagar Industrial Area, New Delhi - 110015</p>
                  <p>GST: 07AAFCF2947K1ZD | CIN: U60231DL2021PTC384521</p>
                </div>
                
                <div className="um-bill-customer">
                  <h3>Bill To:</h3>
                  <p><strong>{billingData.user?.company || billingData.user?.username}</strong></p>
                  <p>{billingData.user?.address}</p>
                  <p>GST: {billingData.user?.gstin || 'N/A'}</p>
                </div>
                
                <div className="um-bill-dates">
                  <p>Period: {dateRange.start || 'Start'} to {dateRange.end || 'End'}</p>
                  <p>Generated: {new Date().toLocaleDateString()}</p>
                </div>
                
                <table className="um-bill-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>LR No.</th>
                      <th>Origin → Dest</th>
                      <th>Weight</th>
                      <th>Freight</th>
                      <th>GST (18%)</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingData.shipments?.map(s => (
                      <tr key={s.id}>
                        <td>{new Date(s.created_at).toLocaleDateString()}</td>
                        <td>{s.lr_number}</td>
                        <td>{s.origin_pincode} → {s.destination_pincode}</td>
                        <td>{s.weight} kg</td>
                        <td>₹{s.freight_amount?.toLocaleString()}</td>
                        <td>₹{s.gst_amount?.toLocaleString()}</td>
                        <td>₹{s.total_amount?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="4"></td>
                      <td><strong>Total:</strong></td>
                      <td><strong>₹{billingData.totalFreight?.toLocaleString()}</strong></td>
                      <td><strong>₹{billingData.totalGst?.toLocaleString()}</strong></td>
                      <td><strong>₹{billingData.grandTotal?.toLocaleString()}</strong></td>
                    </tr>
                  </tfoot>
                </table>
                
                <div className="um-bill-footer">
                  <p>Thank you for your business!</p>
                  <div className="um-signature">For FAITH CARGO PVT LTD</div>
                </div>
              </div>
            </div>
            
            <div className="um-modal-footer">
              <button className="um-btn-secondary" onClick={() => setShowBillingModal(false)}>Close</button>
              <button className="um-btn-primary" onClick={printBill}><Printer size={16} /> Print Bill</button>
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