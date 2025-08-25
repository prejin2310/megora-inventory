import React from 'react'
import { useAuth } from '../../auth/AuthContext'
import Button from '../ui/Button'

export default function Topbar({ onToggleSidebar }) {
  const { user, logout } = useAuth()

  return (
    <header className="topbar">
      <button className="menu-toggle" onClick={onToggleSidebar} aria-label="Toggle sidebar">☰</button>
      <div className="brand">Megora Orders</div>
      <div className="grow" />
      {user && (
        <div className="topbar-right">
          <span className="muted">{user.email}</span>
          <Button variant="ghost" onClick={logout}>Logout</Button>
        </div>
      )}
    </header>
  )
}
