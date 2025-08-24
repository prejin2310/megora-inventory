import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listOrders } from '../../firebase/firestore'

// Status configuration: color + icon per column
const STATUS_META = {
  'Received':         { color: '#0ea5e9', bg: '#eff6ff', icon: '📥' },
  'Packed':           { color: '#6366f1', bg: '#eef2ff', icon: '📦' },
  'Waiting for Pickup': { color: '#f59e0b', bg: '#fffbeb', icon: '⏳' },
  'In Transit':       { color: '#16a34a', bg: '#ecfdf5', icon: '🚚' },
  'Delivered':        { color: '#10b981', bg: '#ecfdf5', icon: '✅' },
  'Cancelled':        { color: '#ef4444', bg: '#fef2f2', icon: '✖️' },
  'Returned':         { color: '#f97316', bg: '#fff7ed', icon: '↩️' },
}

const COLUMNS = [
  { key: 'Received', title: 'Received' },
  { key: 'Packed', title: 'Packed' },
  { key: 'Waiting for Pickup', title: 'Waiting for Pickup' },
  { key: 'In Transit', title: 'In Transit' },
  { key: 'Delivered', title: 'Delivered' },
  { key: 'Cancelled', title: 'Cancelled' },
  { key: 'Returned', title: 'Returned' },
]

const MAX_PER_COLUMN = 6

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
    <div className="kanban-wrap">
      <div className="kanban-head">
        <h3 className="kanban-title">Orders</h3>
      </div>

      {error && <div className="error">{error}</div>}
      {loading ? (
        <div className="muted">Loading…</div>
      ) : (
        <div className="kanban-grid">
          {COLUMNS.map(col => {
            const full = groups[col.key] || []
            const visible = full.slice(0, MAX_PER_COLUMN)
            const remaining = Math.max(0, full.length - visible.length)
            const meta = STATUS_META[col.key] || { color: '#475569', bg: '#f8fafc', icon: '•' }

            return (
              <div className="kanban-col" key={col.key}>
                <div className="kanban-col-head" style={{ background: meta.bg, borderBottomColor: meta.bg }}>
                  <div className="kanban-col-left">
                    <span className="kanban-col-icon" aria-hidden="true">{meta.icon}</span>
                    <span className="kanban-col-title" style={{ color: meta.color }}>{col.title}</span>
                  </div>
                  <div className="kanban-col-count" style={{ color: meta.color, background: '#fff' }}>
                    {full.length}
                  </div>
                </div>

                <div className="kanban-col-body">
                  {visible.length === 0 ? (
                    <div className="kanban-empty">No orders</div>
                  ) : (
                    visible.map(o => {
                      const total = `₹${Number(o?.totals?.grandTotal || 0).toFixed(2)}`
                      const when = o.createdAt?.toDate ? o.createdAt.toDate().toLocaleString() : (o.createdAt || '')
                      return (
                        <button
                          key={o.id}
                          type="button"
                          className="kanban-card"
                          onClick={() => openOrder(o)}
                          title={`Open order #${o.publicId || o.id}`}
                        >
                          <div className="kc-row kc-top">
                            <div className="kc-id">#{o.publicId || (o.id?.slice(0, 6) ?? '')}</div>
                            <div className="kc-total">{total}</div>
                          </div>

                          <div className="kc-row kc-mid">
                            <div className="kc-cust" title={o.customer?.name || o.customerId || '—'}>
                              {o.customer?.name || o.customerId || '—'}
                            </div>
                            <div className="kc-items">{(o.items?.length || 0)} items</div>
                          </div>

                          <div className="kc-row kc-foot">
                            <div className="kc-time-pill">{when}</div>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>

                <div className="kanban-col-foot">
                  {remaining > 0 && <div className="kanban-more">{remaining} more…</div>}
                  <button
                    type="button"
                    className="kanban-link"
                    onClick={() => viewAllForStatus(col.key)}
                    style={{ color: meta.color }}
                  >
                    View all
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <style>{`
        .kanban-wrap { display: grid; gap: 12px; }
        .kanban-head { display: flex; align-items: center; }
        .kanban-title { margin: 0; }

        .kanban-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        @media (max-width: 1100px) {
          .kanban-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 720px) {
          .kanban-grid { grid-template-columns: 1fr; }
        }

        .kanban-col {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: #fff;
          display: grid;
          grid-template-rows: auto 1fr auto;
          min-height: 260px;
          overflow: hidden;
        }
        .kanban-col-head {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 12px;
          border-bottom: 1px solid transparent;
        }
        .kanban-col-left { display: inline-flex; align-items: center; gap: 8px; }
        .kanban-col-icon { font-size: 16px; }
        .kanban-col-title { font-weight: 800; letter-spacing: .2px; }
        .kanban-col-count {
          padding: 2px 10px;
          border-radius: 999px;
          font-weight: 800;
          border: 1px solid #e5e7eb;
        }

        .kanban-col-body { padding: 10px 10px; display: grid; gap: 10px; }
        .kanban-empty { color: #6b7280; font-size: 13px; text-align: center; padding: 16px 0; }

        .kanban-card {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: #fff;
          text-align: left;
          padding: 10px 12px;
          cursor: pointer;
          transition: box-shadow .15s ease, transform .05s ease, border-color .15s ease;
        }
        .kanban-card:hover {
          box-shadow: 0 8px 22px rgba(2,79,61,0.08);
          transform: translateY(-1px);
          border-color: #d1d5db;
        }

        .kc-row { display: flex; align-items: center; justify-content: space-between; }
        .kc-top .kc-id { font-weight: 800; font-variant-numeric: tabular-nums; }
        .kc-top .kc-total { font-weight: 800; color: #065f46; }

        .kc-mid {
          margin-top: 6px;
          font-size: 14px;
          color: #374151;
        }
        .kc-cust {
          max-width: 60%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .kc-items {
          color: #6b7280;
          font-size: 12px;
          font-weight: 700;
        }

        .kc-foot { margin-top: 8px; }
        .kc-time-pill {
          font-size: 12px;
          color: #475569;
          background: #f1f5f9;
          padding: 4px 8px;
          border-radius: 999px;
          border: 1px solid #e2e8f0;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .kanban-col-foot {
          display: flex; align-items: center; justify-content: space-between;
          padding: 8px 10px;
          border-top: 1px solid #eef0f2;
          background: #fafafa;
        }
        .kanban-more { color: #6b7280; font-size: 12px; }
        .kanban-link {
          border: 0; background: transparent; font-weight: 700; cursor: pointer;
        }
        .kanban-link:hover { text-decoration: underline; }
      `}</style>
    </div>
  )
}
