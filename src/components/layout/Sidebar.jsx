import React from 'react'
import { NavLink } from 'react-router-dom'

export default function Sidebar({ className = '', onNav = () => {} }) {
  const baseLink =
    "block px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2"
  const activeLink =
    "bg-gray-200 font-medium text-gray-900"

  return (
    <aside
      className={`w-64 bg-white border-r border-gray-200 h-full flex flex-col p-4 ${className}`}
    >
      <nav className="flex flex-col space-y-2">
        <NavLink
          to="/admin"
          onClick={onNav}
          className={({ isActive }) =>
            `${baseLink} ${isActive ? activeLink : ""}`
          }
        >
          Dashboard
        </NavLink>

        <NavLink
          to="/admin/orders"
          onClick={onNav}
          className={({ isActive }) =>
            `${baseLink} ${isActive ? activeLink : ""}`
          }
        >
          Orders
        </NavLink>

        <NavLink
          to="/admin/products"
          onClick={onNav}
          className={({ isActive }) =>
            `${baseLink} ${isActive ? activeLink : ""}`
          }
        >
          Products
        </NavLink>

        <NavLink
          to="/admin/customers"
          onClick={onNav}
          className={({ isActive }) =>
            `${baseLink} ${isActive ? activeLink : ""}`
          }
        >
          Customers
        </NavLink>

        <NavLink
          to="/admin/inventory"
          onClick={onNav}
          className={({ isActive }) =>
            `${baseLink} ${isActive ? activeLink : ""}`
          }
        >
          Inventory
        </NavLink>

        <NavLink
          to="/admin/settings"
          onClick={onNav}
          className={({ isActive }) =>
            `${baseLink} ${isActive ? activeLink : ""}`
          }
        >
          Settings
        </NavLink>
      </nav>
    </aside>
  )
}
