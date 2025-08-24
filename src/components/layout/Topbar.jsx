import React from 'react'
import { useAuth } from '../../auth/AuthContext'
import Button from '../ui/Button'

export default function Topbar() {
  const { user, logout } = useAuth()

  const toggleSidebar = () => {
    document.documentElement.classList.toggle('sidebar-open')
  }

  return (
    <header className="topbar">
      <button className="hamburger" onClick={toggleSidebar} aria-label="Menu">☰</button>
      <div className="brand">Megora Orders</div>
      <div className="grow" />
      {user && (
        <div className="topbar-right">
          <span className="muted hide-sm">{user.email}</span>
          <Button variant="ghost" onClick={logout}>Logout</Button>
        </div>
      )}
    </header>
  )
}
