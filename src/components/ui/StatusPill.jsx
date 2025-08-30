import React from 'react'
import clsx from 'clsx'

export default function StatusPill({ status }) {
  const normalized = status.replaceAll(' ', '-').toLowerCase()

  return (
    <span
      className={clsx(
        'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium capitalize',
        {
          'bg-green-100 text-green-800': normalized === 'completed' || normalized === 'success',
          'bg-yellow-100 text-yellow-800': normalized === 'pending' || normalized === 'in-progress',
          'bg-red-100 text-red-800': normalized === 'failed' || normalized === 'cancelled',
          'bg-blue-100 text-blue-800': normalized === 'processing',
          'bg-gray-100 text-gray-800': !['completed','success','pending','in-progress','failed','cancelled','processing'].includes(normalized),
        }
      )}
    >
      {status}
    </span>
  )
}
