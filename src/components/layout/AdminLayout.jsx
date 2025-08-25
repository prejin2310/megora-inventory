import React, { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Topbar from './Topbar'
import Sidebar from './Sidebar'
import './admin-responsive.css' // new file

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // lock body scroll when drawer open (prevents weird gaps)
  useEffect(() => {
    if (sidebarOpen) document.body.classList.add('no-scroll')
    else document.body.classList.remove('no-scroll')
    return () => document.body.classList.remove('no-scroll')
  }, [sidebarOpen])

  return (
    <div className="admin-shell">
      <Topbar onToggleSidebar={() => setSidebarOpen((s) => !s)} />
      <div className="admin-body">
        <Sidebar
          className={sidebarOpen ? 'sidebar open' : 'sidebar'}
          onNav={() => setSidebarOpen(false)}
        />
        <main className="admin-main">
          <Outlet />
        </main>
      </div>

      {/* Dim background on mobile when drawer is open */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
    </div>
  )
}
