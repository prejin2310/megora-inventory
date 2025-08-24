import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listOrders } from '../../firebase/firestore'

const COLUMNS = [
  { key: 'Received', title: 'Received' },
  { key: 'Packed', title: 'Packed' },
  { key: 'Waiting for Pickup', title: 'Waiting for Pickup' },
  { key: 'In Transit', title: 'In Transit' },
  { key: 'Delivered', title: 'Delivered' },
  { key: 'Cancelled', title: 'Cancelled' },
  { key: 'Returned', title: 'Returned' },
]

const MAX_PER_COLUMN = 3

// Small neutral inline icons (SVG for crispness, CSS-sized)
function IconHash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M5 9h14M5 15h14M9 3L7 21M17 3l-2 18" />
    </svg>
  )
}
function IconReceipt() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2z" />
      <path d="M8 6h8M8 10h8M8 14h5" />
    </svg>
  )
}
function IconUser() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
function IconBox() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 16V8l-9-5-9 5v8l9 5 9-5z" />
      <path d="M3.3 7.3L12 12l8.7-4.7" />
    </svg>
  )
}
function IconClock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
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
                    visible.map(o => {
                      const total = `₹${Number(o?.totals?.grandTotal || 0).toFixed(2)}`
                      const when = o.createdAt?.toDate ? o.createdAt.toDate().toLocaleString() : (o.createdAt || '')
                      const pub = o.publicId || (o.id?.slice(0, 6) ?? '')
                      const cust = o.customer?.name || o.customerId || '—'
                      const itemCount = (o.items?.length || 0)

                      return (
                        <button
                          key={o.id}
                          type="button"
                          className="kanban-card"
                          onClick={() => openOrder(o)}
                          title={`Open order #${pub}`}
                        >
                          {/* Top row: ID + Total */}
                          <div className="kc-row kc-top">
                            <div className="kc-chip">
                              <span className="ico"><IconHash /></span>
                              <span className="txt">#{pub}</span>
                            </div>
                            <div className="kc-chip strong">
                              <span className="ico"><IconReceipt /></span>
                              <span className="txt">{total}</span>
                            </div>
                          </div>

                          {/* Middle row: Customer + Items */}
                          <div className="kc-row kc-mid">
                            <div className="kc-chip ell">
                              <span className="ico"><IconUser /></span>
                              <span className="txt">{cust}</span>
                            </div>
                            <div className="kc-chip">
                              <span className="ico"><IconBox /></span>
                              <span className="txt">{itemCount} items</span>
                            </div>
                          </div>

                          {/* Footer row: Time */}
                          <div className="kc-row kc-foot">
                            <div className="kc-time-pill">
                              <span className="ico"><IconClock /></span>
                              <span className="txt">{when}</span>
                            </div>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>

                <div className="kanban-col-foot">
                  {remaining > 0 && <div className="kanban-more">{remaining} more…</div>}
                  <button type="button" className="kanban-link" onClick={() => viewAllForStatus(col.key)}>
                    View all
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Minimal, neutral styling with subtle icon alignment */}
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
          background: #fff;
          color: #111827;
          padding: 2px 8px;
          border-radius: 999px;
          font-weight: 700;
          font-size: 12px;
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
          box-shadow: 0 8px 22px rgba(0,0,0,0.06);
          transform: translateY(-1px);
          border-color: #d1d5db;
        }

        .kc-row { display: flex; align-items: center; justify-content: space-between; }
        .kc-top { gap: 8px; }
        .kc-mid { margin-top: 6px; gap: 8px; }
        .kc-foot { margin-top: 8px; }

        .kc-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          border: 1px solid #e5e7eb;
          border-radius: 999px;
          font-size: 13px;
          color: #111827;
          background: #fff;
          max-width: 100%;
        }
        .kc-chip.strong { font-weight: 800; }
        .kc-chip .ico { display: inline-flex; color: #64748b; }
        .kc-chip .txt { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .ell { max-width: 60%; }

        .kc-time-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
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
          border: 0; background: transparent; font-weight: 700; cursor: pointer; color: #0ea5e9;
        }
        .kanban-link:hover { text-decoration: underline; }
      `}</style>
    </div>
  )
}
