// src/pages/Admin/Orders.jsx
import React, { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import Button from '../../components/ui/Button'
import OrderForm from '../../components/orders/OrderForm'
import Table from '../../components/ui/Table'
import { useNavigate } from 'react-router-dom'
import { resolveCustomerNames } from '../../firebase/firestore'

// Toggle to show/hide Created At column
const SHOW_CREATED_AT = false

// Status color map
const STATUS_STYLE = {
  'Received':            { color: '#0ea5e9', bg: '#eff6ff', border: '#dbeafe' },
  'Packed':              { color: '#6366f1', bg: '#eef2ff', border: '#e0e7ff' },
  'Waiting for Pickup':  { color: '#f59e0b', bg: '#fffbeb', border: '#fef3c7' },
  'In Transit':          { color: '#16a34a', bg: '#ecfdf5', border: '#bbf7d0' },
  'Delivered':           { color: '#475569', bg: '#f1f5f9', border: '#e2e8f0' },
  'Cancelled':           { color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
  'Returned':            { color: '#f97316', bg: '#fff7ed', border: '#fed7aa' },
}

function StatusPill({ text }) {
  const s = STATUS_STYLE[text] || { color: '#475569', bg: '#f1f5f9', border: '#e2e8f0' }
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 999,
        fontWeight: 600,
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
  const [q, setQ] = useState('')
  const nav = useNavigate()

  const refresh = async () => {
    setError('')
    setLoading(true)
    try {
      let raw = []
      try {
        const qy = query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
        const snap = await getDocs(qy)
        raw = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      } catch {
        const snap = await getDocs(collection(db, 'orders'))
        raw = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        raw = raw.sort((a, b) => {
          const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime()
          const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime()
          if (tb !== ta) return tb - ta
          return String(b.publicId || '').localeCompare(String(a.publicId || ''))
        })
      }
      const withNames = await resolveCustomerNames(raw)
      setOrders(withNames)
    } catch (e) {
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

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return
    try {
      await deleteDoc(doc(db, 'orders', id))
      setOrders(prev => prev.filter(o => o.id !== id))
    } catch (e) {
      alert('Failed to delete: ' + e.message)
    }
  }

  const columns = useMemo(() => {
    const base = ['Order No', 'Status', 'Customer', 'Total', 'Channel', 'Share', 'Actions', '']
    if (SHOW_CREATED_AT) {
      return ['Public ID', 'Created At', 'Status', 'Customer', 'Total', 'Channel', 'Share', '', '']
    }
    return base
  }, [])

  const rows = useMemo(() => {
    return filtered.map(o => {
      const pub = o.publicId || o.id
      const link = `${location.origin}/o/${pub}`
      const displayName = o._customerName || o.customer?.name || o.customerId?.slice(0, 12) || '-'
      const createdAtText = (() => {
        try {
          const d = o.createdAt?.toDate ? o.createdAt.toDate() : (o.createdAt ? new Date(o.createdAt) : null)
          return d ? d.toLocaleString() : '-'
        } catch { return '-' }
      })()

      const baseCells = [
        <button key={`open-${o.id}`} className="linklike" onClick={() => nav(`/admin/orders/${o.id}`)}>
          {pub}
        </button>,
        SHOW_CREATED_AT ? createdAtText : null,
        <StatusPill key={`st-${o.id}`} text={o.status} />,
        displayName,
        `₹${Number(o?.totals?.grandTotal || 0).toFixed(2)}`,
        o.channel || '-',
        <button key={`copy-${o.id}`} className="btn btn-sm" onClick={async () => {
          try {
            await navigator.clipboard.writeText(link)
            alert(`Copied link:\n${link}`)
          } catch { prompt('Copy link:', link) }
        }}>Copy</button>,
        <Button size="sm" key={`v-${o.id}`} onClick={() => nav(`/admin/orders/${o.id}`)}>View</Button>,
        <Button size="sm" variant="danger" key={`d-${o.id}`} onClick={() => handleDelete(o.id)}>Delete</Button>,
      ]
      return baseCells.filter(c => c !== null)
    })
  }, [filtered, nav])

  return (
    <div className="orders-wrapper">
      {/* Controls row */}
      <div className="orders-controls">
        <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
          <option value="">All Status</option>
          {Object.keys(STATUS_STYLE).map(st => <option key={st}>{st}</option>)}
        </select>
        <select value={filter.channel} onChange={e => setFilter(f => ({ ...f, channel: e.target.value }))}>
          <option value="">All Channels</option>
          <option>WhatsApp</option>
          <option>Instagram</option>
          <option>Manual</option>
        </select>
        <div className="searchbar">
          <input placeholder="Search (ID, Public ID, customer, SKU, channel)" value={q} onChange={e => setQ(e.target.value)} />
          {q && <button className="clear" onClick={() => setQ('')}>×</button>}
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
        <div className="table-wrapper">
          <Table columns={columns} rows={rows} />
        </div>
      )}

      <style>{`
        .orders-wrapper { display: flex; flex-direction: column; gap: 16px; }
        .orders-controls { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
        .searchbar { position: relative; flex: 1; min-width: 200px; }
        .searchbar input {
          width: 100%; padding: 10px 34px 10px 12px;
          border: 1px solid #e5e7eb; border-radius: 10px; font-size: 14px;
        }
        .searchbar .clear {
          position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
          width: 26px; height: 26px; border-radius: 999px;
          background: #f1f5f9; border: 1px solid #e2e8f0;
          cursor: pointer;
        }
        .table-wrapper { width: 100%; overflow-x: auto; }
        table { width: 100%; min-width: 760px; border-collapse: collapse; }
        th, td { padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: left; }
        .linklike { background: transparent; border: 0; color: #0ea5e9; font-weight: 600; cursor: pointer; }
        .linklike:hover { text-decoration: underline; }
        @media (max-width: 768px) {
          .orders-controls { flex-direction: column; align-items: stretch; }
          .table-wrapper { overflow-x: scroll; }
        }
      `}</style>
    </div>
  )
}
