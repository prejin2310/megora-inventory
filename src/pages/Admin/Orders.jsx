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

// Tailwind status color map
const STATUS_STYLE = {
  'Received':            'text-sky-600 bg-sky-50 border border-sky-200',
  'Packed':              'text-indigo-600 bg-indigo-50 border border-indigo-200',
  'Waiting for Pickup':  'text-amber-600 bg-amber-50 border border-amber-200',
  'In Transit':          'text-green-600 bg-green-50 border border-green-200',
  'Delivered':           'text-slate-600 bg-slate-50 border border-slate-200',
  'Cancelled':           'text-red-600 bg-red-50 border border-red-200',
  'Returned':            'text-orange-600 bg-orange-50 border border-orange-200',
}

function StatusPill({ text }) {
  const cls = STATUS_STYLE[text] || 'text-slate-600 bg-slate-50 border border-slate-200'
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${cls}`}>
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
        <button
          key={`open-${o.id}`}
          className="text-sky-600 font-semibold hover:underline"
          onClick={() => nav(`/admin/orders/${o.id}`)}
        >
          {pub}
        </button>,
        SHOW_CREATED_AT ? createdAtText : null,
        <StatusPill key={`st-${o.id}`} text={o.status} />,
        displayName,
        `₹${Number(o?.totals?.grandTotal || 0).toFixed(2)}`,
        o.channel || '-',
        <button
          key={`copy-${o.id}`}
          className="px-3 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link)
              alert(`Copied link:\n${link}`)
            } catch { prompt('Copy link:', link) }
          }}
        >
          Copy
        </button>,
        <Button size="sm" key={`v-${o.id}`} onClick={() => nav(`/admin/orders/${o.id}`)}>View</Button>,
        <Button size="sm" variant="danger" key={`d-${o.id}`} onClick={() => handleDelete(o.id)}>Delete</Button>,
      ]
      return baseCells.filter(c => c !== null)
    })
  }, [filtered, nav])

  return (
    <div className="flex flex-col gap-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filter.status}
          onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">All Status</option>
          {Object.keys(STATUS_STYLE).map(st => <option key={st}>{st}</option>)}
        </select>

        <select
          value={filter.channel}
          onChange={e => setFilter(f => ({ ...f, channel: e.target.value }))}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">All Channels</option>
          <option>WhatsApp</option>
          <option>Instagram</option>
          <option>Manual</option>
        </select>

        <div className="relative flex-1 min-w-[200px]">
          <input
            placeholder="Search (ID, Public ID, customer, SKU, channel)"
            value={q}
            onChange={e => setQ(e.target.value)}
            className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          {q && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"
              onClick={() => setQ('')}
            >
              ×
            </button>
          )}
        </div>

        <div className="flex-1" />

        <Button onClick={() => setShowCreate(true)}>Create Order</Button>
        <Button size="sm" onClick={refresh}>Refresh</Button>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      {showCreate && (
        <OrderForm
          onClose={() => setShowCreate(false)}
          onCreated={(o) => { setShowCreate(false); nav(`/admin/orders/${o.id}`) }}
        />
      )}

      {loading ? (
        <div className="text-gray-500">Loading…</div>
      ) : (
        <div className="w-full overflow-x-auto">
          <div className="w-full">
          <Table columns={columns} rows={rows} />
          </div>
        </div>
      )}
    </div>
  )
}
