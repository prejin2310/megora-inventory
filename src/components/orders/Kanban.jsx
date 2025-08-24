import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listOrders } from '../../firebase/firestore'

// Configure the columns and labels shown in the Kanban
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

  // Group and sort orders per status
  const groups = useMemo(() => {
    const byStatus = Object.fromEntries(COLUMNS.map(c => [c.key, []]))
    for (const o of orders) {
      const key = COLUMNS.find(c => c.key === o.status)?.key || 'Received'
      byStatus[key].push(o)
    }
    for (const k of Object.keys(byStatus)) {
      byStatus[k].sort((a, b) => {
        const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime()
        const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime()
        return tb - ta // newest first
      })
    }
    return byStatus
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

            return (
              <div className="kanban-col" key={col.key}>
                <div className="kanban-col-head">
                  <div className="kanban-col-title">{col.title}</div>
                  <div className="kanban-col-count">{full.length}</div>
                </div>

                <div className="kanban-col-body">
                  {visible.length === 0 ? (
                    <div className="kanban-empty">No orders</div>
                  ) : (
                    visible.map(o => (
                      <button
                        key={o.id}
                        type="button"
                        className="kanban-card"
                        onClick={() => openOrder(o)}
                        title={`Open order #${o.publicId || o.id}`}
                      >
                        <div className="kc-top">
                          <div className="kc-id">#{o.publicId || (o.id?.slice(0, 6) ?? '')}</div>
                          <div className="kc-total">₹{Number(o?.totals?.grandTotal || 0).toFixed(2)}</div>
                        </div>

                        <div className="kc-mid">
                          <div className="kc-cust">{o.customer?.name || o.customerId || '—'}</div>
                        </div>

                        <div className="kc-foot">
                          <div className="kc-items">{(o.items?.length || 0)} items</div>
                          <div className="kc-time">
                            {o.createdAt?.toDate
                              ? o.createdAt.toDate().toLocaleString()
                              : (o.createdAt || '')}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <div className="kanban-col-foot">
                  {remaining > 0 && <div className="kanban-more">{remaining} more…</div>}
                  <button
                    type="button"
                    className="kanban-link"
                    onClick={() => viewAllForStatus(col.key)}
                  >
                    View all
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Scoped styles for the Kanban board */}
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
          display: flex; align-items: center; gap: 8px;
          padding: 10px 12px;
          background: #f9fafb;
          border-bottom: 1px solid #eef0f2;
        }
        .kanban-col-title { font-weight: 700; }
        .kanban-col-count {
          margin-left: auto;
          background: #eef2ff;
          color: #3730a3;
          padding: 2px 8px;
          border-radius: 999px;
          font-weight: 700;
          font-size: 12px;
        }

        .kanban-col-body { padding: 10px 10px; display: grid; gap: 8px; }
        .kanban-empty { color: #6b7280; font-size: 13px; text-align: center; padding: 16px 0; }

        .kanban-card {
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          background: #fff;
          text-align: left;
          padding: 8px 10px;
          cursor: pointer;
          transition: box-shadow .15s ease, transform .05s ease;
        }
        .kanban-card:hover { box-shadow: 0 6px 18px rgba(2,79,61,0.08); transform: translateY(-1px); }

        .kc-top, .kc-mid, .kc-foot { display: flex; align-items: center; }
        .kc-top { justify-content: space-between; font-weight: 700; }
        .kc-id { font-variant-numeric: tabular-nums; }
        .kc-total { color: #065f46; }
        .kc-mid { margin-top: 4px; color: #374151; font-size: 14px; }
        .kc-foot { margin-top: 6px; color: #6b7280; font-size: 12px; justify-content: space-between; }

        .kanban-col-foot {
          display: flex; align-items: center; justify-content: space-between;
          padding: 8px 10px;
          border-top: 1px solid #eef0f2;
          background: #fafafa;
        }
        .kanban-more { color: #6b7280; font-size: 12px; }
        .kanban-link {
          border: 0; background: transparent; color: #0ea5e9; font-weight: 600; cursor: pointer;
        }
        .kanban-link:hover { text-decoration: underline; }
      `}</style>
    </div>
  )
}
