import React, { useState, useEffect } from "react";
import axios from "axios";
import API_BASE_URL from "../config";
import "./UserManagement.css"; // आपकी CSS अब यहीं से लोड होगी

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "User" });
  
  // सभी मॉड्यूल्स की लिस्ट (Sidebar के अनुसार)
  const [permissions, setPermissions] = useState({
    fcpl_rate: false,
    pickup_request: false,
    vendor_manage: false,
    vendor_rates: false,
    rate_update: false,
    pincode_manage: false,
    user_management: false,
    ba_b2b_rate: false,
    create_order: false,    // New Module
    shipment_details: false // New Module
  });

  const token = localStorage.getItem("token");
  const config = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/auth/users/`, config);
      setUsers(res.data);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  // चेकबॉक्स हैंडल करने का फंक्शन
  const handleCheckChange = (e) => {
    setPermissions({ ...permissions, [e.target.name]: e.target.checked });
  };

  const addUser = async () => {
    if (!newUser.username || !newUser.password) return alert("Please fill all fields");

    // यूजर डेटा और परमिशन को एक साथ भेजना
    const payload = { ...newUser, ...permissions };

    try {
      const res = await axios.post(`${API_BASE_URL}/auth/register/`, payload, config);
      alert("User Created with Selected Modules!");
      setUsers([...users, res.data]);
      // फॉर्म रिसेट करें
      setNewUser({ username: "", password: "", role: "User" });
      setPermissions(Object.fromEntries(Object.keys(permissions).map(k => [k, false])));
    } catch (err) {
      alert("Error adding user. Backend fields check karein.");
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/auth/users/${id}/`, config);
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
            <select
              value={newUser.role}
              onChange={e => setNewUser({ ...newUser, role: e.target.value })}
            >
              <option value="User">Standard User</option>
              <option value="Admin">System Admin</option>
            </select>
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
          <h3>Active Enrollment List</h3>
          {loading ? <p>Loading...</p> : (
            <table className="user-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.username}</td>
                    <td><span className={`badge ${u.role.toLowerCase()}`}>{u.role}</span></td>
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