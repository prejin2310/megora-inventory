import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Topbar from './Topbar'
import Sidebar from './Sidebar'
import './admin-responsive.css'

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="admin-shell">
      <Topbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="admin-body">
        <Sidebar className={sidebarOpen ? 'sidebar open' : 'sidebar'} />
        <main className="admin-main">
          <Outlet />
        </main>
      </div>

      {/* Overlay for mobile when sidebar is open */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}
