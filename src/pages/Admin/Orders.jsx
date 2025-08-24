import React, { useEffect, useMemo, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import Button from '../../components/ui/Button'
import OrderForm from '../../components/orders/OrderForm'
import Table from '../../components/ui/Table'
import { useNavigate } from 'react-router-dom'
import { resolveCustomerNames } from '../../firebase/firestore'

// Color map for statuses
const STATUS_STYLE = {
  'Received':           { color: '#0ea5e9', bg: '#eff6ff', border: '#dbeafe' },
  'Packed':             { color: '#6366f1', bg: '#eef2ff', border: '#e0e7ff' },
  'Waiting for Pickup': { color: '#f59e0b', bg: '#fffbeb', border: '#fef3c7' },
  'In Transit':         { color: '#16a34a', bg: '#ecfdf5', border: '#bbf7d0' },
  'Delivered':          { color: '#10b981', bg: '#ecfdf5', border: '#bbf7d0' },
  'Cancelled':          { color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
  'Returned':           { color: '#f97316', bg: '#fff7ed', border: '#fed7aa' },
}

function StatusPill({ text }) {
  const s = STATUS_STYLE[text] || { color: '#475569', bg: '#f1f5f9', border: '#e2e8f0' }
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 999,
        fontWeight: 700,
        color: s.color,
        background: s.bg,
        border: `1px solid ${s.border}`,
        fontSize: 12,
      }}
    >
      {text}
    </span>
  )
}

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [filter, setFilter] = useState({ status: '', channel: '' })
  const [showCreate, setShowCreate] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('') // search query
  const nav = useNavigate()

  const refresh = async () => {
    setError('')
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, 'orders'))
      const raw = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      const withNames = await resolveCustomerNames(raw)
      setOrders(withNames)
    } catch (e) {
      console.error('Orders load error:', e)
      setError(e.message || 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const norm = (v) => String(v || '').toLowerCase()

  const filtered = useMemo(() => {
    const qq = norm(q)
    return orders.filter(o => {
      if (filter.status && o.status !== filter.status) return false
      if (filter.channel && o.channel !== filter.channel) return false

      if (!qq) return true
      const pub = norm(o.publicId || '')
      const oid = norm(o.id || '')
      const cust = norm(o._customerName || o.customer?.name || '')
      const ch = norm(o.channel || '')
      const skuMatch = (o.items || []).some(it => norm(it.sku).includes(qq))
      return pub.includes(qq) || oid.includes(qq) || cust.includes(qq) || ch.includes(qq) || skuMatch
    })
  }, [orders, filter, q])

  return (
    <div className="vstack gap">
      {/* Controls row with filters and search */}
      <div className="hstack" style={{ gap: 8, alignItems: 'center' }}>
        <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
          <option value="">All Status</option>
          <option>Received</option>
          <option>Packed</option>
          <option>Waiting for Pickup</option>
          <option>In Transit</option>
          <option>Delivered</option>
          <option>Cancelled</option>
          <option>Returned</option>
        </select>
        <select value={filter.channel} onChange={e => setFilter(f => ({ ...f, channel: e.target.value }))}>
          <option value="">All Channels</option>
          <option>WhatsApp</option>
          <option>Instagram</option>
          <option>Manual</option>
        </select>

        {/* Search bar */}
        <div className="searchbar">
          <input
            placeholder="Search (ID, Public ID, customer, SKU, channel)"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          {q && (
            <button className="clear" type="button" onClick={() => setQ('')} title="Clear">×</button>
          )}
        </div>

        <div className="grow" />
        <Button onClick={() => setShowCreate(true)}>Create Order</Button>
        <Button size="sm" onClick={refresh}>Refresh</Button>
      </div>

      {error && <div className="error">{error}</div>}

      {showCreate && (
        <OrderForm
          onClose={() => setShowCreate(false)}
          onCreated={(o) => { setShowCreate(false); nav(`/admin/orders/${o.id}`) }}
        />
      )}

      {loading ? (
        <div className="muted">Loading…</div>
      ) : (
        <Table
          columns={['Public ID', 'Status', 'Customer', 'Total', 'Channel', 'Share', '']}
          rows={filtered.map(o => {
            const pub = o.publicId || o.id
            const link = `${location.origin}/o/${pub}`
            const displayName = o._customerName || o.customer?.name || o.customerId?.slice(0, 12) || '-'
            return [
              // Make Public ID clickable to details as well
              <button
                key={`open-${o.id}`}
                className="linklike"
                type="button"
                onClick={() => nav(`/admin/orders/${o.id}`)}
                title="Open order details"
              >
                {pub}
              </button>,
              // Status with visual pill
              <StatusPill key={`st-${o.id}`} text={o.status} />,
              displayName,
              `₹${Number(o?.totals?.grandTotal || 0).toFixed(2)}`,
              o.channel || '-',
              <button
                key={`copy-${o.id}`}
                className="btn btn-sm"
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(link)
                    alert(`Copied link:\n${link}`)
                  } catch {
                    prompt('Copy link:', link)
                  }
                }}
              >
                Copy link
              </button>,
              <Button size="sm" key={`v-${o.id}`} onClick={() => nav(`/admin/orders/${o.id}`)}>View</Button>,
            ]
          })}
        />
      )}

      {/* Scoped styles for search + link + optional tweaks */}
      <style>{`
        .searchbar {
          position: relative;
          width: min(420px, 56vw);
        }
        .searchbar input {
          width: 100%;
          padding: 10px 34px 10px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          font-size: 14px;
          outline: none;
        }
        .searchbar input:focus {
          border-color: #94a3b8;
          box-shadow: 0 0 0 3px rgba(14,165,233,.12);
        }
        .searchbar .clear {
          position: absolute;
          right: 6px; top: 50%; transform: translateY(-50%);
          width: 26px; height: 26px;
          border-radius: 999px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          cursor: pointer;
          line-height: 1;
        }
        .linklike {
          background: transparent;
          border: 0;
          color: #0ea5e9;
          font-weight: 700;
          cursor: pointer;
          padding: 0;
        }
        .linklike:hover { text-decoration: underline; }
      `}</style>
    </div>
  )
}
