import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/common.css";

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "User" });

  const token = localStorage.getItem("token");

  // Fetch users list
  useEffect(() => {
    axios
      .get("http://localhost:8000/auth/users/", {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => setUsers(res.data))
      .catch(err => console.error("Error fetching users:", err));
  }, [token]);

  // Add new user
  const addUser = () => {
    axios
      .post("http://localhost:8000/auth/register/", newUser, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        alert("User added successfully!");
        setUsers([...users, res.data]);
        setNewUser({ username: "", password: "", role: "User" });
      })
      .catch(err => alert("Error adding user"));
  };

  // Delete user
  const deleteUser = (id) => {
    axios
      .delete(`http://localhost:8000/auth/users/${id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(() => {
        alert("User deleted successfully!");
        setUsers(users.filter(u => u.id !== id));
      })
      .catch(err => alert("Error deleting user"));
  };

  return (
    <div>
      <h2>User Management</h2>

      <h3>Create New User</h3>
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
        <option value="User">User</option>
        <option value="Admin">Admin</option>
      </select>
      <button onClick={addUser}>Add User</button>

      <h3>User List</h3>
      <ul>
        {users.map(u => (
          <li key={u.id}>
            {u.username} ({u.role})
            <button onClick={() => deleteUser(u.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default UserManagement;
