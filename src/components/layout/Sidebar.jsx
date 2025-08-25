import React from 'react'
import { NavLink } from 'react-router-dom'

export default function Sidebar({ className = '', onNav = () => {} }) {
  return (
    <aside className={className}>
      <NavLink to="/admin" onClick={onNav}>Dashboard</NavLink>
      <NavLink to="/admin/orders" onClick={onNav}>Orders</NavLink>
      <NavLink to="/admin/products" onClick={onNav}>Products</NavLink>
      <NavLink to="/admin/customers" onClick={onNav}>Customers</NavLink>
      <NavLink to="/admin/inventory" onClick={onNav}>Inventory</NavLink>
      <NavLink to="/admin/settings" onClick={onNav}>Settings</NavLink>
    </aside>
  )
}
