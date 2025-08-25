// Sidebar.jsx
import React from 'react'
import { NavLink } from 'react-router-dom'

export default function Sidebar({ className = '' }) {
  return (
    <aside className={className}>
      <NavLink to="/admin">Dashboard</NavLink>
      <NavLink to="/admin/orders">Orders</NavLink>
      <NavLink to="/admin/products">Products</NavLink>
      <NavLink to="/admin/customers">Customers</NavLink>
      <NavLink to="/admin/inventory">Inventory</NavLink>
      <NavLink to="/admin/settings">Settings</NavLink>
    </aside>
  )
}
