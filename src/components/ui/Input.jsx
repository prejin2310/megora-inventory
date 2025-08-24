import React from 'react'

export default function Input({ label, ...props }) {
  return (
    <label className="input">
      <div className="input-label">{label}</div>
      <input {...props} />
    </label>
  )
}
