import React from 'react'

export default function Select({ label, children, ...props }) {
  return (
    <label className="flex flex-col w-full">
      <span className="mb-1 text-sm font-medium text-gray-700">{label}</span>
      <select
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        {...props}
      >
        {children}
      </select>
    </label>
  )
}
