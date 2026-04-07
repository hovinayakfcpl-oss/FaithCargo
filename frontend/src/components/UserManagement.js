import React, { useState, useEffect } from "react";
import axios from "axios";
import API_BASE_URL from "../config";
import "./UserManagement.css";

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", password: "" });
  
  // 🔥 बैकएंड मॉडल (CustomUser) के फील्ड्स के साथ सिंक किया गया
  const [permissions, setPermissions] = useState({
    fcpl_rate: false,
    pickup: false,          // Backend field name: pickup
    vendor_manage: false,
    vendor_rates: false,
    rate_update: false,
    pincode: false,         // Backend field name: pincode
    user_management: false,
    ba_b2b: false,          // Backend field name: ba_b2b
    create_order: false,
    shipment_details: false
  });

  const token = localStorage.getItem("token");
  // नोट: अगर आपका बैकएंड टोकन मांगता है तो इसे रखें, वरना हटा दें
  const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // आपके द्वारा पहले दिए गए बैकएंड API पाथ के अनुसार
      const res = await axios.get(`${API_BASE_URL}/api/users/`, config);
      setUsers(res.data);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckChange = (e) => {
    setPermissions({ ...permissions, [e.target.name]: e.target.checked });
  };

  const addUser = async () => {
    if (!newUser.username || !newUser.password) return alert("Please fill Username and Password");

    const payload = { ...newUser, ...permissions };

    try {
      // बैकएंड add_user API पाथ के अनुसार
      await axios.post(`${API_BASE_URL}/api/add-user/`, payload, config);
      alert("User Created Successfully!");
      
      // फॉर्म रिसेट
      setNewUser({ username: "", password: "" });
      setPermissions(Object.fromEntries(Object.keys(permissions).map(k => [k, false])));
      fetchUsers(); // लिस्ट अपडेट करें
    } catch (err) {
      alert("Error adding user. Check if backend fields match.");
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/delete-user/${id}/`, config);
      setUsers(users.filter(u => u.id !== id));
    } catch (err) {
      alert("Error deleting user");
    }
  };

  return (
    <div className="admin-container">
      <div className="card-header">
        <h2><i className="fas fa-users-cog"></i> User Management Portal</h2>
      </div>

      <div className="management-grid">
        {/* Creation Form */}
        <div className="form-card">
          <h3>Create New User & Allow Modules</h3>
          <div className="input-group">
            <input
              type="text"
              placeholder="Username"
              value={newUser.username}
              onChange={e => setNewUser({ ...newUser, username: e.target.value })}
            />
            <input
              type="password"
              placeholder="Password"
              value={newUser.password}
              onChange={e => setNewUser({ ...newUser, password: e.target.value })}
            />
          </div>

          <div className="permissions-section">
            <h4>Module Permissions</h4>
            <div className="checkbox-grid">
              {Object.keys(permissions).map((key) => (
                <div className="checkbox-item" key={key}>
                  <label>{key.replace(/_/g, ' ').toUpperCase()}</label>
                  <input
                    type="checkbox"
                    name={key}
                    checked={permissions[key]}
                    onChange={handleCheckChange}
                  />
                </div>
              ))}
            </div>
          </div>

          <button className="btn-add" onClick={addUser}>Add User Account</button>
        </div>

        {/* User Table */}
        <div className="list-card">
          <div className="list-header-row">
            <h3>Active Enrollment List</h3>
            <span className="user-count">Total: {users.length}</span>
          </div>
          {loading ? <p>Loading...</p> : (
            <table className="user-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.username}</td>
                    <td>
                      <button className="btn-delete" onClick={() => deleteUser(u.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserManagement;