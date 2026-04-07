import React, { useState, useEffect } from "react";
import "./UserAdd.css";

function UserAdd() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ New & Updated Module List
  const [permissions, setPermissions] = useState({
    fcpl_rate: false,
    pickup: false,
    vendor_manage: false,
    vendor_rates: false,
    rate_update: false,
    pincode: false,
    user_management: false,
    ba_b2b: false,
    create_order: false,    // New Module
    shipment_details: false // New Module
  });

  const [users, setUsers] = useState([]);

  // ✅ FETCH USERS
  const fetchUsers = async () => {
    try {
      const res = await fetch("https://faithcargo.onrender.com/api/user/list/");
      const data = await res.json();
      if (Array.isArray(data)) {
        setUsers(data);
      } else if (data.users) {
        setUsers(data.users);
      } else {
        setUsers([]);
      }
    } catch {
      console.log("Error fetching user list");
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCheckbox = (e) => {
    setPermissions({ ...permissions, [e.target.name]: e.target.checked });
  };

  // ✅ ADD USER
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("https://faithcargo.onrender.com/api/user/add/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          ...permissions // Spreading all permissions directly
        }),
      });

      const data = await res.json();

      if (res.status === 200 || res.ok) {
        alert("User Account Created ✅");
        setUsername("");
        setPassword("");
        // Reset all permissions to false
        setPermissions(Object.fromEntries(Object.keys(permissions).map(k => [k, false])));
        fetchUsers();
      } else {
        alert(data.error || "Failed to create user ❌");
      }
    } catch {
      alert("Server connection error ❌");
    } finally {
      setLoading(false);
    }
  };

  // ✅ DELETE USER
  const deleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      const res = await fetch(`https://faithcargo.onrender.com/api/user/delete/${id}/`, {
        method: "DELETE",
      });
      if (res.ok) fetchUsers();
    } catch {
      alert("Delete request failed ❌");
    }
  };

  return (
    <div className="user-page-container">
      <div className="admin-header">
        <h1><i className="fas fa-user-shield"></i> User Control Center</h1>
        <p>Manage system access and module permissions for staff accounts.</p>
      </div>

      <div className="user-layout">
        {/* --- LEFT: CREATE USER CARD --- */}
        <div className="glass-card add-user-form">
          <div className="card-top">
            <h3><i className="fas fa-plus-circle"></i> Create New Account</h3>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Credentials</label>
              <input 
                placeholder="Username" 
                value={username} 
                onChange={(e)=>setUsername(e.target.value)} 
                required 
              />
              <input 
                type="password" 
                placeholder="Password" 
                value={password} 
                onChange={(e)=>setPassword(e.target.value)} 
                required 
              />
            </div>

            <div className="permission-header">
              <label>Module Access Permissions</label>
            </div>

            <div className="checkbox-grid">
              {Object.keys(permissions).map((key) => (
                <label className="checkbox-item" key={key}>
                  <input 
                    type="checkbox" 
                    name={key} 
                    checked={permissions[key]} 
                    onChange={handleCheckbox}
                  />
                  <span className="custom-box"></span>
                  <span className="label-text">{key.replace(/_/g, ' ').toUpperCase()}</span>
                </label>
              ))}
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Processing..." : "Register User"}
            </button>
          </form>
        </div>

        {/* --- RIGHT: USER LIST CARD --- */}
        <div className="glass-card user-list-table">
          <div className="card-top space-between">
            <h3><i className="fas fa-list-ul"></i> Active Users</h3>
            <span className="user-badge">{users.length} Users</span>
          </div>

          <div className="table-wrapper">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.length > 0 ? users.map((u)=>(
                  <tr key={u.id}>
                    <td className="id-col">#{u.id}</td>
                    <td className="user-col"><strong>{u.username}</strong></td>
                    <td className="action-col">
                      <button className="row-delete-btn" onClick={()=>deleteUser(u.id)}>
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="3" className="no-data">No users found.</td></tr>
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