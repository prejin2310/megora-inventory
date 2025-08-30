import React from 'react'

export default function Input({ label, className = '', ...props }) {
  return (
    <label className="flex flex-col gap-1 w-full">
      {label && (
        <span className="text-sm font-medium text-gray-700">{label}</span>
      )}
      <input
        className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black ${className}`}
        {...props}
      />
    </label>
  )
}
