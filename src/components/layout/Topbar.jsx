import React from 'react'
import { useAuth } from '../../auth/AuthContext'
import Button from '../ui/Button'

export default function Topbar({ onToggleSidebar }) {
  const { user, logout } = useAuth()

  return (
    <header className="flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
      {/* Sidebar Toggle (mobile only) */}
      <button
        className="text-2xl mr-4 md:hidden"
        onClick={onToggleSidebar}
      >
        ☰
      </button>

      {/* Brand */}
      <div className="text-lg font-semibold text-gray-800">
        Megora Orders
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User Info */}
      {user && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 hidden sm:inline">
            {user.displayName}
          </span>
          <Button variant="ghost" onClick={logout}>
            Logout
          </Button>
        </div>
      )}
    </header>
  )
}
