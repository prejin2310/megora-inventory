import React from 'react'

export default function Select({ label, children, ...props }) {
  return (
    <label className="input">
      <div className="input-label">{label}</div>
      <select {...props}>{children}</select>
    </label>
  )
}
