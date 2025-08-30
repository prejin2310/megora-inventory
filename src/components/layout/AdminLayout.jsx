import React, { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Topbar from './Topbar'
import Sidebar from './Sidebar'

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // lock body scroll when drawer open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [sidebarOpen])

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Topbar */}
      <Topbar onToggleSidebar={() => setSidebarOpen((s) => !s)} />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar (desktop) */}
        <div className="hidden md:flex md:w-64 md:flex-shrink-0">
          <Sidebar />
        </div>

        {/* Sidebar (mobile drawer) */}
        {sidebarOpen && (
          <>
            <div className="fixed inset-0 z-40 flex">
              <div className="relative flex w-64 flex-col bg-white border-r border-gray-200 shadow-lg">
                <Sidebar onNav={() => setSidebarOpen(false)} />
              </div>
            </div>
            {/* Overlay */}
            <div
              className="fixed inset-0 bg-black bg-opacity-40 z-30 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          </>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
