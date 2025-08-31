import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listOrders } from '../../firebase/firestore'

// Columns
const COLUMNS = [
  { key: 'Received', title: 'Received', color: 'bg-blue-50', text: 'text-blue-700' },
  { key: 'Packed', title: 'Packed', color: 'bg-indigo-50', text: 'text-indigo-700' },
  { key: 'Waiting for Pickup', title: 'Waiting for Pickup', color: 'bg-yellow-50', text: 'text-yellow-700' },
  { key: 'In Transit', title: 'In Transit', color: 'bg-purple-50', text: 'text-purple-700' },
  { key: 'Delivered', title: 'Delivered', color: 'bg-green-50', text: 'text-green-700' },
  { key: 'Cancelled', title: 'Cancelled', color: 'bg-red-50', text: 'text-red-700' },
  { key: 'Returned', title: 'Returned', color: 'bg-pink-50', text: 'text-pink-700' },
]

const MAX_PER_COLUMN = 3

// Status Icons
const STATUS_ICONS = {
  Received: (
    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M5 13l4 4L19 7" />
    </svg>
  ),
  Packed: (
    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M3 7l6 6 12-12" />
    </svg>
  ),
  'Waiting for Pickup': (
    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
    </svg>
  ),
  'In Transit': (
    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M3 12h18M3 6h18M3 18h18" />
    </svg>
  ),
  Delivered: (
    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M5 13l4 4L19 7" />
    </svg>
  ),
  Cancelled: (
    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M6 6l12 12M6 18L18 6" />
    </svg>
  ),
  Returned: (
    <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M4 12h16M12 4v16" />
    </svg>
  ),
}

// Basic Info Icons
function IconHash() {
  return (
    <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 9h14M5 15h14M9 3L7 21M17 3l-2 18" />
    </svg>
  )
}
function IconReceipt() {
  return (
    <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2z" />
      <path d="M8 6h8M8 10h8M8 14h5" />
    </svg>
  )
}
function IconUser() {
  return (
    <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
function IconBox() {
  return (
    <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 16V8l-9-5-9 5v8l9 5 9-5z" />
      <path d="M3.3 7.3L12 12l8.7-4.7" />
    </svg>
  )
}
function IconClock() {
  return (
    <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  )
}

export default function Kanban({ initialOrders = null }) {
  const nav = useNavigate()
  const [orders, setOrders] = useState(initialOrders || [])
  const [loading, setLoading] = useState(!initialOrders)
  const [error, setError] = useState('')

  useEffect(() => {
    if (initialOrders) return
    ;(async () => {
      setError('')
      setLoading(true)
      try {
        const list = await listOrders()
        setOrders(list)
      } catch (e) {
        console.error('Kanban load error:', e)
        setError(e.message || 'Failed to load orders')
      } finally {
        setLoading(false)
      }
    })()
  }, [initialOrders])

  const groups = useMemo(() => {
    const by = Object.fromEntries(COLUMNS.map(c => [c.key, []]))
    for (const o of orders) {
      const k = COLUMNS.find(c => c.key === o.status)?.key || 'Received'
      by[k].push(o)
    }
    for (const k of Object.keys(by)) {
      by[k].sort((a, b) => {
        const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime()
        const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime()
        return tb - ta
      })
    }
    return by
  }, [orders])

  const openOrder = (o) => nav(`/admin/orders/${o.id}`)
  const viewAllForStatus = (status) => nav(`/admin/orders?status=${encodeURIComponent(status)}`)

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <h3 className="text-xl font-bold text-gray-800">Orders Kanban</h3>
      </div>

      {error && <div className="text-red-600">{error}</div>}

      {loading ? (
        <div className="text-gray-500">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {COLUMNS.map(col => {
            const full = groups[col.key] || []
            const visible = full.slice(0, MAX_PER_COLUMN)
            const remaining = Math.max(0, full.length - visible.length)

            return (
              <div
                key={col.key}
                className="flex flex-col rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300"
              >
                {/* Column Header */}
                <div className={`px-3 py-2 flex justify-between items-center ${col.color} font-semibold ${col.text} text-sm`}>
                  <span>{col.title}</span>
                  <span className="text-xs bg-white border border-gray-300 rounded-full px-2 py-0.5 shadow-sm">
                    {full.length}
                  </span>
                </div>

                {/* Column Body */}
                <div className="flex-1 p-3 space-y-3 bg-gray-50">
                  {visible.length === 0 ? (
                    <div className="text-gray-400 text-center py-4">No orders</div>
                  ) : visible.map(o => {
                    const total = `₹${Number(o?.totals?.grandTotal || 0).toFixed(2)}`
                    const when = o.createdAt?.toDate ? o.createdAt.toDate().toLocaleString() : (o.createdAt || '')
                    const pub = o.publicId || (o.id?.slice(0, 6) ?? '')
                    const cust = o.customer?.name || o.customerId || '—'
                    const itemCount = (o.items?.length || 0)
                    const statusIcon = STATUS_ICONS[o.status] || STATUS_ICONS['Received']

                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => openOrder(o)}
                        className="w-full text-left rounded-xl p-3 bg-white hover:shadow-md hover:-translate-y-1 transition transform duration-200"
                      >
                        {/* Status badge */}
                        <div className="flex items-center gap-2 mb-2">
                          {statusIcon}
                          <span className="text-sm font-semibold">{o.status}</span>
                        </div>

                        {/* Top row */}
                        <div className="flex justify-between gap-2">
                          <div className="flex items-center gap-1 text-sm font-medium text-gray-700 bg-gray-100 rounded-full px-2 py-0.5">
                            <IconHash />
                            <span>#{pub}</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm font-bold bg-gray-100 rounded-full px-2 py-0.5">
                            <IconReceipt />
                            <span>{total}</span>
                          </div>
                        </div>

                        {/* Middle row */}
                        <div className="flex justify-between gap-2 mt-2">
                          <div className="flex items-center gap-1 text-sm font-medium bg-gray-100 rounded-full px-2 py-0.5 truncate max-w-[60%]">
                            <IconUser />
                            <span className="truncate">{cust}</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm font-medium bg-gray-100 rounded-full px-2 py-0.5">
                            <IconBox />
                            <span>{itemCount} items</span>
                          </div>
                        </div>

                        {/* Footer row */}
                        <div className="mt-2">
                          <div className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 rounded-full px-2 py-0.5 truncate">
                            <IconClock />
                            <span className="truncate">{when}</span>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Column Footer */}
                <div className="flex items-center justify-between px-3 py-2 bg-gray-100">
                  {remaining > 0 && <div className="text-xs text-gray-500">{remaining} more…</div>}
                  <button
                    type="button"
                    onClick={() => viewAllForStatus(col.key)}
                    className="text-sm font-semibold text-sky-600 hover:underline"
                  >
                    View all
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
