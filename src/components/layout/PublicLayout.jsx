import React from 'react'

export default function PublicLayout({ children }) {
  return (
    <div className="public-shell">
      <main className="public-main">{children}</main>
    </div>
  )
}
