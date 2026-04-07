import React, { useState, useEffect, useCallback } from "react";
import "./UserAdd.css";

function UserAdd() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);

  // ✅ Permissions mapping - matches Django models exactly
  const initialPermissions = {
    fcpl_rate: false,
    pickup: false,
    vendor_manage: false,
    vendor_rates: false,
    rate_update: false,
    pincode: false,
    user_management: false,
    ba_b2b: false,
    create_order: false,    // 🔥 New Module
    shipment_details: false // 🔥 New Module
  };

  const [permissions, setPermissions] = useState(initialPermissions);

  // ✅ Icons Mapping
  const getIcon = (key) => {
    const icons = {
      fcpl_rate: "fa-calculator",
      pickup: "fa-truck-loading",
      vendor_manage: "fa-tasks",
      vendor_rates: "fa-hand-holding-usd",
      rate_update: "fa-sync-alt",
      pincode: "fa-map-marker-alt",
      user_management: "fa-user-cog",
      ba_b2b: "fa-chart-line",
      create_order: "fa-edit",
      shipment_details: "fa-box-open"
    };
    return icons[key] || "fa-check-circle";
  };

  // ✅ FETCH USERS (Wrapped in useCallback to prevent re-renders)
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("https://faithcargo.onrender.com/api/user/list/");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : data.users || []);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCheckbox = (e) => {
    setPermissions({ ...permissions, [e.target.name]: e.target.checked });
  };

  // ✅ ADD USER
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const res = await fetch("https://faithcargo.onrender.com/api/user/add/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
          ...permissions 
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert("User Account Created Successfully ✅");
        // Reset Form
        setUsername("");
        setPassword("");
        setPermissions(initialPermissions);
        // Refresh List
        fetchUsers();
      } else {
        alert(data.error || "Failed to create user ❌");
      }
    } catch (error) {
      alert("Network error: Could not connect to server ❌");
    } finally {
      setLoading(false);
    }
  };

  // ✅ DELETE USER
  const deleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this staff member?")) return;
    try {
      const res = await fetch(`https://faithcargo.onrender.com/api/user/delete/${id}/`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchUsers();
      } else {
        alert("Delete failed ❌");
      }
    } catch {
      alert("Server error during delete ❌");
    }
  };

  return (
    <div className="user-page-container">
      {/* Header */}
      <div className="admin-header-v2">
        <div className="header-content">
          <h1><i className="fas fa-shield-alt"></i> Faith Cargo Admin</h1>
          <p>Manage Staff Access & Module Permissions</p>
        </div>
      </div>

      <div className="user-main-grid">
        {/* LEFT: CREATE USER FORM */}
        <div className="glass-panel add-user-section">
          <div className="panel-header">
            <h3><i className="fas fa-user-plus"></i> Create Account</h3>
          </div>
          
          <form onSubmit={handleSubmit} className="modern-form">
            <div className="input-group-v2">
              <label><i className="fas fa-user"></i> Username</label>
              <input 
                type="text"
                placeholder="Ex: faith_staff_01" 
                value={username} 
                onChange={(e)=>setUsername(e.target.value)} 
                required 
              />
            </div>

            <div className="input-group-v2">
              <label><i className="fas fa-key"></i> Password</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password} 
                onChange={(e)=>setPassword(e.target.value)} 
                required 
              />
            </div>

            <div className="permission-label-v2">
              <span>Grant Module Access</span>
            </div>

            <div className="permission-tile-grid">
              {Object.keys(permissions).map((key) => (
                <label key={key} className={`perm-tile ${permissions[key] ? 'selected' : ''}`}>
                  <input 
                    type="checkbox" 
                    name={key} 
                    checked={permissions[key]} 
                    onChange={handleCheckbox}
                  />
                  <div className="tile-content">
                    <i className={`fas ${getIcon(key)}`}></i>
                    <span>{key.replace(/_/g, ' ')}</span>
                  </div>
                </label>
              ))}
            </div>

            <button type="submit" className="grand-submit-btn" disabled={loading}>
              {loading ? (
                <><i className="fas fa-spinner fa-spin"></i> Saving...</>
              ) : (
                "Create User Account"
              )}
            </button>
          </form>
        </div>

        {/* RIGHT: USER LIST */}
        <div className="glass-panel user-list-section">
          <div className="panel-header flex-between">
            <h3><i className="fas fa-users-cog"></i> Active Staff</h3>
            <span className="count-chip">{users.length} Users</span>
          </div>

          <div className="table-responsive">
            <table className="faith-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Staff Name</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.length > 0 ? users.map((u)=>(
                  <tr key={u.id}>
                    <td><span className="id-tag">#{u.id}</span></td>
                    <td className="user-name-cell">{u.username}</td>
                    <td className="text-right">
                      <button className="icon-del-btn" title="Delete User" onClick={()=>deleteUser(u.id)}>
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="3" className="empty-state">No Staff Accounts Created Yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserAdd;