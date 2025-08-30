import React from 'react'

export default function StatusTimeline({ history }) {
  return (
    <div className="relative border-l-2 border-gray-200 pl-4">
      {history?.map((h, i) => (
        <div key={i} className="mb-6 relative">
          {/* Timeline Dot */}
          <div className="absolute -left-[9px] top-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow" />

          {/* Content */}
          <div className="ml-2">
            <div className="font-medium text-gray-800">{h.status}</div>
            <div className="text-sm text-gray-500">
              {h.at?.toDate ? h.at.toDate().toLocaleString() : ''}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
