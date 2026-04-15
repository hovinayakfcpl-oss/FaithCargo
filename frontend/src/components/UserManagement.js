import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  Users, Plus, Trash2, Edit, Eye, Package, 
  DollarSign, TrendingUp, Calendar, Search, 
  CheckCircle, XCircle, Clock, Award, Crown,
  Shield, UserPlus, Mail, Phone, MapPin, Building,
  CreditCard, FileText, Truck, Calculator, 
  Settings, Zap, BarChart3, Download, Filter,
  Building2, UserCheck, UserX, RefreshCw, Save,
  X, ChevronLeft, ChevronRight, AlertTriangle
} from "lucide-react";
import "./UserManagement.css";

const API_BASE_URL = "https://faithcargo.onrender.com/api/user";
const RATES_API_URL = "https://faithcargo.onrender.com/api/rates";
const SHIPMENTS_API_URL = "https://faithcargo.onrender.com/api/shipments";

// Zone list for rate matrix
const zones = ["N1","N2","N3","C1","W1","W2","S1","S2","E1","NE1","NE2"];

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("clients");
  
  // Client Rates State
  const [showRateModal, setShowRateModal] = useState(false);
  const [rateClient, setRateClient] = useState(null);
  const [clientRates, setClientRates] = useState({});
  const [masterRates, setMasterRates] = useState({});
  const [ratePolicy, setRatePolicy] = useState({
    surface_rate_per_kg: 18,
    express_rate_per_kg: 25,
    air_rate_per_kg: 45,
    rail_rate_per_kg: 15,
    minFreight: 650,
    docketCharge: 100,
    fuelPercent: 10,
    fovCharge: 75,
    odaCharge: 3,
    codCharge: 150,
    codPercent: 2.5,
    fragileCharge: 250,
    appointmentCharge: 1500,
    handlingCharge: 2,
    insurancePercent: 2,
    expressExtra: 5,
    gstPercent: 18,
    cft: 4500
  });
  
  // Report Filters
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
  
  // New Client Form
  const [newClient, setNewClient] = useState({
    clientId: "",
    companyName: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    gstin: ""
  });
  const [showClientModal, setShowClientModal] = useState(false);
  
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

  // ✅ Handle Check Change
  const handleCheckChange = (e) => {
    setPermissions({ ...permissions, [e.target.name]: e.target.checked });
  };

  // ✅ Add User
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
      fetchStaffUsers();
    } catch (err) {
      alert("Error adding user. Check if backend fields match.");
    }
  };

  // ✅ Update User
  const updateUser = async () => {
    if (!editingUser) return;
    try {
      await axios.put(`${API_BASE_URL}/update-user/${editingUser.id}/`, editingUser, config);
      alert("User Updated Successfully!");
      setShowEditModal(false);
      setEditingUser(null);
      fetchStaffUsers();
    } catch (err) {
      alert("Error updating user");
    }
  };

  // ✅ Delete User
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

  // ✅ View User Details
  const viewUserDetails = async (user) => {
    try {
      const stats = await fetchUserStats(user.id);
      setSelectedUser({ ...user, ...stats });
      setShowUserDetails(true);
    } catch (err) {
      console.error("Error fetching user details:", err);
    }
  };

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
      const response = await axios.get(`${RATES_API_URL}/matrix/`);
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
      await axios.post(`${RATES_API_URL}/client/${rateClient.clientId}/update/`, {
        zone_rates: zonePayload,
        policy: ratePolicy
      }, config);
      alert(`✅ Rates updated for ${rateClient.companyName}`);
      setShowRateModal(false);
      setRateClient(null);
      fetchClients();
    } catch (error) {
      console.error("Error updating client rates:", error);
      alert("❌ Error updating rates");
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

  // ✅ FIXED: Fetch client orders from shipments API
  const fetchClientOrders = async (clientId) => {
    try {
      console.log("Fetching orders for client:", clientId);
      const response = await axios.get(`${SHIPMENTS_API_URL}/client/${clientId}/orders/`);
      console.log("Orders response:", response.data);
      
      // Return array even if empty
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error("Error fetching client orders:", error);
      return [];
    }
  };

  // ✅ FIXED: Generate client report with proper data mapping
  const generateClientReport = async (client) => {
    setLoading(true);
    try {
      console.log("Generating report for client:", client);
      
      const orders = await fetchClientOrders(client.clientId);
      console.log("Raw orders data:", orders);
      
      const totalFreight = orders.reduce((sum, o) => sum + (o.value || 0), 0);
      const totalOrders = orders.length;
      
      // Map orders to display format
      const mappedOrders = orders.map((o, index) => ({
        id: index,
        order_number: o.lr || o.lr_number || `ORDER${index + 1}`,
        created_at: o.date || new Date().toISOString(),
        origin_pincode: o.route ? o.route.split(' → ')[0] : 'N/A',
        destination_pincode: o.route ? o.route.split(' → ')[1] : 'N/A',
        weight: o.weight || 0,
        total_value: o.value || 0,
        freight_amount: o.value || 0,
        status: o.status || 'booked'
      }));
      
      setReportData({
        username: client.companyName || client.username,
        clientId: client.clientId,
        totalOrders: totalOrders,
        totalShipments: totalOrders,
        totalFreight: totalFreight,
        totalValue: totalFreight,
        orders: mappedOrders
      });
      setShowReportModal(true);
    } catch (error) {
      console.error("Error generating report:", error);
      alert("Error generating report: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Export report as CSV
  const exportReportCSV = () => {
    if (!reportData) return;
    
    const headers = "Order ID,Date,Origin,Destination,Weight,Value,Status\n";
    const rows = reportData.orders.map(o => 
      `${o.order_number},${o.created_at},${o.origin_pincode},${o.destination_pincode},${o.weight},${o.total_value},${o.status}`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportData.clientId}_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ✅ FIXED: Fetch all clients with order counts
  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/clients/`, config);
      console.log("Clients API response:", res.data);
      
      const clientsWithOrders = await Promise.all(
        res.data.map(async (client) => {
          const orders = await fetchClientOrders(client.clientId);
          const totalFreight = orders.reduce((sum, o) => sum + (o.value || 0), 0);
          console.log(`Client ${client.clientId}: ${orders.length} orders, ₹${totalFreight}`);
          return { 
            ...client, 
            orderCount: orders.length,
            totalFreight: totalFreight
          };
        })
      );
      setClients(clientsWithOrders);
    } catch (err) {
      console.error("Error fetching clients:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch staff users
  const fetchStaffUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/users/`, config);
      setUsers(res.data);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user stats
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

  // Create new client
  const createClient = async () => {
    if (!newClient.clientId || !newClient.companyName || !newClient.email || !newClient.password) {
      alert("Please fill all required fields: Client ID, Company Name, Email, Password");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        clientId: newClient.clientId.toUpperCase(),
        companyName: newClient.companyName,
        email: newClient.email,
        password: newClient.password,
        phone: newClient.phone || "",
        address: newClient.address || "",
        gstin: newClient.gstin || ""
      };
      
      console.log("Creating client:", payload);
      
      const response = await axios.post(`${API_BASE_URL}/client/create/`, payload, config);
      
      alert(`✅ Client ${newClient.clientId} created successfully!`);
      setNewClient({
        clientId: "",
        companyName: "",
        email: "",
        password: "",
        phone: "",
        address: "",
        gstin: ""
      });
      setShowClientModal(false);
      fetchClients();
    } catch (err) {
      console.error("Error creating client:", err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || "Unknown error";
      alert(`❌ Error creating client: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // Delete client
  const deleteClient = async (clientId) => {
    if (!window.confirm(`Are you sure you want to delete client ${clientId}?`)) return;
    
    setLoading(true);
    try {
      await axios.delete(`${API_BASE_URL}/client/${clientId}/delete/`, config);
      alert(`✅ Client ${clientId} deleted successfully`);
      fetchClients();
    } catch (err) {
      console.error("Error deleting client:", err);
      alert("❌ Error deleting client");
    } finally {
      setLoading(false);
    }
  };

  // Update client status
  const updateClientStatus = async (clientId, isActive) => {
    try {
      await axios.put(`${API_BASE_URL}/client/${clientId}/status/`, { is_active: isActive }, config);
      fetchClients();
    } catch (err) {
      console.error("Error updating client status:", err);
    }
  };

  useEffect(() => {
    fetchMasterRates();
    if (activeTab === "clients") {
      fetchClients();
    } else {
      fetchStaffUsers();
    }
  }, [activeTab]);

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

  const filteredClients = clients.filter(client => 
    client.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.clientId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalClients = clients.length;
  const totalClientOrders = clients.reduce((sum, c) => sum + (c.orderCount || 0), 0);
  const totalClientRevenue = clients.reduce((sum, c) => sum + (c.totalFreight || 0), 0);

  // Render Rate Matrix Modal
  const renderRateModal = () => (
    <div className="um-modal-overlay" onClick={() => setShowRateModal(false)}>
      <div className="um-modal rate-modal" onClick={e => e.stopPropagation()}>
        <div className="um-modal-header">
          <h2>⭐ Custom Rates for: {rateClient?.companyName}</h2>
          <button className="um-modal-close" onClick={() => setShowRateModal(false)}>×</button>
        </div>
        <div className="um-modal-body">
          <div className="rate-matrix-section">
  <h4>📊 Zone Rate Matrix (₹ per kg)</h4>
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
                  step="0.5"
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
        </div>
        <div className="um-modal-footer">
          <button className="um-btn-secondary" onClick={() => setShowRateModal(false)}>Cancel</button>
          <button className="um-btn-primary" onClick={updateClientRates} disabled={loading}>
            {loading ? <RefreshCw size={16} className="spin" /> : <Save size={16} />}
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
          <h2>📊 Report: {reportData?.username}</h2>
          <button className="um-modal-close" onClick={() => setShowReportModal(false)}>×</button>
        </div>
        <div className="um-modal-body">
          <div className="report-stats">
            <div className="stat">
              <span>Total Orders</span>
              <strong>{reportData?.totalOrders || 0}</strong>
            </div>
            <div className="stat">
              <span>Total Value</span>
              <strong>₹{(reportData?.totalValue || 0).toLocaleString()}</strong>
            </div>
          </div>
          <div className="report-table">
            <h4>📦 Order History</h4>
            <div className="table-container">
              <table className="data-table">
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
                  {(reportData?.orders || []).length === 0 ? (
                    <tr>
                      <td colSpan="6" className="no-data">No orders found</td>
                    </tr>
                  ) : (
                    (reportData?.orders || []).map(order => (
                      <tr key={order.id}>
                        <td><strong>{order.order_number}</strong></td>
                        <td>{new Date(order.created_at).toLocaleDateString()}</td>
                        <td>{order.origin_pincode} → {order.destination_pincode}</td>
                        <td>{order.weight} kg</td>
                        <td>₹{(order.total_value || 0).toLocaleString()}</td>
                        <td>{getOrderStatusBadge(order.status)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
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
            <Building2 size={24} />
          </div>
          <div className="um-stat-info">
            <h3>{totalClients}</h3>
            <p>Total Clients</p>
          </div>
        </div>
        <div className="um-stat-card">
          <div className="um-stat-icon" style={{ background: "#3b82f620", color: "#3b82f6" }}>
            <Package size={24} />
          </div>
          <div className="um-stat-info">
            <h3>{totalClientOrders}</h3>
            <p>Total Orders</p>
          </div>
        </div>
        <div className="um-stat-card">
          <div className="um-stat-icon" style={{ background: "#10b98120", color: "#10b981" }}>
            <DollarSign size={24} />
          </div>
          <div className="um-stat-info">
            <h3>₹{totalClientRevenue.toLocaleString()}</h3>
            <p>Total Revenue</p>
          </div>
        </div>
        <div className="um-stat-card">
          <div className="um-stat-icon" style={{ background: "#8b5cf620", color: "#8b5cf6" }}>
            <TrendingUp size={24} />
          </div>
          <div className="um-stat-info">
            <h3>{activeTab === "clients" ? "Active Clients" : "Staff Users"}</h3>
            <p>{activeTab === "clients" ? "Registered Clients" : "System Users"}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="um-tabs">
        <button 
          className={`um-tab ${activeTab === "clients" ? "active" : ""}`}
          onClick={() => setActiveTab("clients")}
        >
          <Building2 size={16} /> Clients
        </button>
        <button 
          className={`um-tab ${activeTab === "staff" ? "active" : ""}`}
          onClick={() => setActiveTab("staff")}
        >
          <Users size={16} /> Staff Users
        </button>
      </div>

      <div className="um-content-grid">
        {/* Left Panel - Create/Add */}
        <div className="um-form-card">
          <div className="um-card-header">
            {activeTab === "clients" ? (
              <>
                <Building2 size={20} />
                <h3>Add New Client</h3>
              </>
            ) : (
              <>
                <UserPlus size={20} />
                <h3>Create Staff User</h3>
              </>
            )}
          </div>
          
          {activeTab === "clients" ? (
            <div className="client-form">
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Client ID *"
                  value={newClient.clientId}
                  onChange={e => setNewClient({...newClient, clientId: e.target.value.toUpperCase()})}
                />
                <input
                  type="text"
                  placeholder="Company Name *"
                  value={newClient.companyName}
                  onChange={e => setNewClient({...newClient, companyName: e.target.value})}
                />
              </div>
              <div className="form-group">
                <input
                  type="email"
                  placeholder="Email *"
                  value={newClient.email}
                  onChange={e => setNewClient({...newClient, email: e.target.value})}
                />
                <input
                  type="tel"
                  placeholder="Phone *"
                  value={newClient.phone}
                  onChange={e => setNewClient({...newClient, phone: e.target.value})}
                />
              </div>
              <div className="form-group">
                <input
                  type="password"
                  placeholder="Password *"
                  value={newClient.password}
                  onChange={e => setNewClient({...newClient, password: e.target.value})}
                />
                <input
                  type="text"
                  placeholder="GSTIN"
                  value={newClient.gstin}
                  onChange={e => setNewClient({...newClient, gstin: e.target.value.toUpperCase()})}
                />
              </div>
              <textarea
                placeholder="Address"
                rows="2"
                value={newClient.address}
                onChange={e => setNewClient({...newClient, address: e.target.value})}
              />
              <button className="um-btn-add" onClick={createClient} disabled={loading}>
                <Plus size={18} /> Create Client Account
              </button>
            </div>
          ) : (
            <>
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
                <Plus size={18} /> Create Staff User
              </button>
            </>
          )}
        </div>

        {/* Right Panel - List View */}
        <div className="um-users-card">
          <div className="um-card-header">
            {activeTab === "clients" ? (
              <>
                <Building2 size={20} />
                <h3>Client Management</h3>
              </>
            ) : (
              <>
                <Users size={20} />
                <h3>Staff Management</h3>
              </>
            )}
            <div className="um-search-box">
              <Search size={16} />
              <input
                type="text"
                placeholder={activeTab === "clients" ? "Search clients..." : "Search users..."}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="um-loading">Loading...</div>
          ) : (
            <div className="um-users-list">
              {activeTab === "clients" ? (
                filteredClients.map(client => (
                  <div key={client.id} className="um-user-card">
                    <div className="um-user-avatar" style={{ background: "linear-gradient(135deg, #8b5cf6, #7c3aed)" }}>
                      <span>{client.companyName?.charAt(0).toUpperCase() || "C"}</span>
                    </div>
                    <div className="um-user-info" onClick={() => generateClientReport(client)}>
                      <div className="um-user-name">
                        {client.companyName}
                        <span className="client-id-badge">{client.clientId}</span>
                      </div>
                      <div className="um-user-company">{client.email}</div>
                      <div className="um-user-stats">
                        <span><Package size={12} /> {client.orderCount || 0} Orders</span>
                        <span><DollarSign size={12} /> ₹{(client.totalFreight || 0).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="um-user-actions">
                      <button className="um-btn-icon rate" onClick={(e) => { e.stopPropagation(); setRateClient(client); fetchClientRates(client.clientId); setShowRateModal(true); }} title="Custom Rates">
                        <Settings size={16} />
                      </button>
                      <button className="um-btn-icon report" onClick={(e) => { e.stopPropagation(); generateClientReport(client); }} title="View Report">
                        <BarChart3 size={16} />
                      </button>
                      <button className="um-btn-icon delete" onClick={(e) => { e.stopPropagation(); deleteClient(client.clientId); }} title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                filteredUsers.map(user => (
                  <div key={user.id} className="um-user-card">
                    <div className="um-user-avatar">
                      <span>{user.username.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="um-user-info" onClick={() => viewUserDetails(user)}>
                      <div className="um-user-name">{user.username}</div>
                      <div className="um-user-company">{user.company || "Staff"}</div>
                      <div className="um-user-stats">
                        <span><FileText size={12} /> 0 Orders</span>
                        <span><Package size={12} /> 0 Shipments</span>
                        <span><DollarSign size={12} /> ₹0</span>
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
                ))
              )}
            </div>
          )}
        </div>
      </div>

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

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <div className="um-modal-overlay" onClick={() => setShowUserDetails(false)}>
          <div className="um-modal um-details-modal" onClick={e => e.stopPropagation()}>
            <div className="um-modal-header">
              <h2>{selectedUser.username}'s Report</h2>
              <button className="um-modal-close" onClick={() => setShowUserDetails(false)}>×</button>
            </div>
            <div className="um-modal-body">
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
              </div>
              <div className="um-user-details">
                <h4>User Information</h4>
                <div className="details-grid">
                  <div><label>Username:</label> <span>{selectedUser.username}</span></div>
                  <div><label>Email:</label> <span>{selectedUser.email || "N/A"}</span></div>
                  <div><label>Phone:</label> <span>{selectedUser.phone || "N/A"}</span></div>
                  <div><label>Company:</label> <span>{selectedUser.company || "N/A"}</span></div>
                </div>
              </div>
              <div className="um-orders-table">
                <h4>Orders Created by {selectedUser.username}</h4>
                <div className="table-container">
                  <table className="data-table">
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
                            <td>{order.order_number || order.lr_number}</td>
                            <td>{new Date(order.created_at).toLocaleDateString()}</td>
                            <td>{order.origin_pincode} → {order.destination_pincode}</td>
                            <td>{order.weight} kg</td>
                            <td>₹{(order.total_value || 0).toLocaleString()}</td>
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

      {/* Rate Modal */}
      {showRateModal && renderRateModal()}

      {/* Report Modal */}
      {showReportModal && renderReportModal()}
    </div>
  );
}

export default UserManagement;