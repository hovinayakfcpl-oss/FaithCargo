import React, { useState, useEffect } from "react";
import "./UserAdd.css";

function UserAdd() {

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [permissions, setPermissions] = useState({
    rateCalculator: false,
    pickupRequest: false,
    vendorManage: false,
    vendorRates: false,
    rateUpdate: false,
    pincodeManagement: false,
    userManagement: false,
    baB2bRateCalculator: false,
  });

  const [users, setUsers] = useState([]);

  // ✅ FETCH USERS (IMPORTANT FIX)
  const fetchUsers = async () => {
    try {
      const res = await fetch("https://faithcargo.onrender.com/api/user/list/");
      const data = await res.json();

      // 🔥 handle different backend formats
      if (Array.isArray(data)) {
        setUsers(data);
      } else if (data.users) {
        setUsers(data.users);
      } else {
        setUsers([]);
      }

    } catch {
      console.log("Fetch error");
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

    try {
      const res = await fetch("https://faithcargo.onrender.com/api/user/add/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
          fcpl_rate: permissions.rateCalculator,
          pickup: permissions.pickupRequest,
          vendor_manage: permissions.vendorManage,
          vendor_rates: permissions.vendorRates,
          rate_update: permissions.rateUpdate,
          pincode: permissions.pincodeManagement,
          user_management: permissions.userManagement,
          ba_b2b: permissions.baB2bRateCalculator,
        }),
      });

      const data = await res.json();

      if (res.status === 200) {
        alert("User Created ✅");

        setUsername("");
        setPassword("");

        setPermissions({
          rateCalculator: false,
          pickupRequest: false,
          vendorManage: false,
          vendorRates: false,
          rateUpdate: false,
          pincodeManagement: false,
          userManagement: false,
          baB2bRateCalculator: false,
        });

        fetchUsers(); // refresh
      } else {
        alert(data.error || "Error ❌");
      }

    } catch {
      alert("Server error ❌");
    }
  };

  // ✅ DELETE USER
  const deleteUser = async (id) => {
    if (!window.confirm("Delete user?")) return;

    try {
      await fetch(`https://faithcargo.onrender.com/api/user/delete/${id}/`, {
        method: "DELETE",
      });

      fetchUsers();
    } catch {
      alert("Delete failed ❌");
    }
  };

  return (

    <div className="user-page">

      {/* 🔥 LEFT CARD */}
      <div className="card add-user-card">

        <h2>Add User</h2>

        <form onSubmit={handleSubmit}>

          <label>Username</label>
          <input value={username} onChange={(e)=>setUsername(e.target.value)} required/>

          <label>Password</label>
          <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required/>

          <h3>Allow Modules</h3>

          <div className="checkbox-group">
            <label><input type="checkbox" name="rateCalculator" checked={permissions.rateCalculator} onChange={handleCheckbox}/> FCPL Rate Calculator</label>
            <label><input type="checkbox" name="pickupRequest" checked={permissions.pickupRequest} onChange={handleCheckbox}/> Pickup Request</label>
            <label><input type="checkbox" name="vendorManage" checked={permissions.vendorManage} onChange={handleCheckbox}/> Vendor Manage</label>
            <label><input type="checkbox" name="vendorRates" checked={permissions.vendorRates} onChange={handleCheckbox}/> Vendor Rates</label>
            <label><input type="checkbox" name="rateUpdate" checked={permissions.rateUpdate} onChange={handleCheckbox}/> Rate Update</label>
            <label><input type="checkbox" name="pincodeManagement" checked={permissions.pincodeManagement} onChange={handleCheckbox}/> Pincode Management</label>
            <label><input type="checkbox" name="userManagement" checked={permissions.userManagement} onChange={handleCheckbox}/> User Management</label>
            <label><input type="checkbox" name="baB2bRateCalculator" checked={permissions.baB2bRateCalculator} onChange={handleCheckbox}/> BA & B2B Rate Calculator</label>
          </div>

          <button type="submit" className="add-btn">Add User</button>

        </form>

      </div>

      {/* 🔥 RIGHT CARD */}
      <div className="card user-list-card">

        <h3>Total Users: {users.length}</h3>

        <table className="user-table">
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
                <td>{u.id}</td>
                <td>{u.username}</td>
                <td>
                  <button
                    className="delete-btn"
                    onClick={()=>deleteUser(u.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="3">No Users Found</td>
              </tr>
            )}
          </tbody>
        </table>

      </div>

    </div>
  );
}

export default UserAdd;