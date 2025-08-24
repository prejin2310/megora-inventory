import React from 'react'
import { NavLink } from 'react-router-dom'

export default function Sidebar() {
  const closeSidebar = () => {
    document.documentElement.classList.remove('sidebar-open')
  }

  return (
    <>
      <div className="sidebar-backdrop" onClick={closeSidebar} />
      <aside className="sidebar">
        <nav onClick={closeSidebar}>
          <NavLink to="/admin">Dashboard</NavLink>
          <NavLink to="/admin/orders">Orders</NavLink>
          <NavLink to="/admin/products">Products</NavLink>
          <NavLink to="/admin/customers">Customers</NavLink>
          <NavLink to="/admin/inventory">Inventory</NavLink>
          <NavLink to="/admin/settings">Settings</NavLink>
        </nav>
      </aside>
    </>
  )
}
