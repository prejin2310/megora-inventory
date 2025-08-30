import React from 'react'

export default function Card({ title, children }) {
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
      {title && (
        <div className="text-lg font-semibold mb-3 border-b border-gray-100 pb-2">
          {title}
        </div>
      )}
      <div className="text-gray-700">{children}</div>
    </div>
  )
}
