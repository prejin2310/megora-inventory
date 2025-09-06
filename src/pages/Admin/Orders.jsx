import React, { useEffect, useMemo, useState, useRef } from 'react'
import {
  collection,
  query as fbQuery,
  orderBy,
  deleteDoc,
  doc,
  onSnapshot,
  getDocs, // fallback one-shot
} from 'firebase/firestore'
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
  'Received':             'text-sky-600 bg-sky-50 border border-sky-200',
  'Packed':               'text-indigo-600 bg-indigo-50 border border-indigo-200',
  'Waiting for Pickup':   'text-amber-600 bg-amber-50 border border-amber-200',
  'In Transit':           'text-green-600 bg-green-50 border border-green-200',
  'Delivered':            'text-slate-600 bg-slate-50 border border-slate-200',
  'Cancelled':            'text-red-600 bg-red-50 border border-red-200',
  'Returned':             'text-orange-600 bg-orange-50 border border-orange-200',
}

function StatusPill({ text }) {
  const cls = STATUS_STYLE[text] || 'text-slate-600 bg-slate-50 border border-slate-200'
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${cls}`}>
      {text}
    </span>
  )
}

// Simple loading skeleton rows
function OrdersSkeleton({ rows = 6 }) {
  return (
    <div className="w-full overflow-x-auto">
      <div className="animate-pulse space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-6 gap-2 items-center"
          >
            <div className="h-5 bg-gray-200 rounded col-span-1" />
            <div className="h-5 bg-gray-200 rounded col-span-1" />
            <div className="h-5 bg-gray-200 rounded col-span-1" />
            <div className="h-5 bg-gray-200 rounded col-span-1" />
            <div className="h-5 bg-gray-200 rounded col-span-1" />
            <div className="h-8 bg-gray-200 rounded col-span-1" />
          </div>
        ))}
      </div>
      <div className="mt-3 h-1 w-full bg-gray-100 rounded">
        <div className="h-1 bg-gradient-to-r from-sky-400 to-indigo-500 rounded animate-[progress_2.2s_ease-in-out_infinite]" />
      </div>
      <style>
        {`@keyframes progress { 0%{width:10%} 50%{width:70%} 100%{width:10%} }`}
      </style>
      <p className="mt-2 text-xs text-gray-500">
        Preparing orders… live data will appear shortly. No need to reload.
      </p>
    </div>
  )
}

// Optional: tiny countdown to reduce reload urge
function WaitHint() {
  const [t, setT] = useState(5)
  useEffect(() => {
    const id = setInterval(() => setT(v => (v > 0 ? v - 1 : 5)), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <span>Syncing</span>
      <span className="inline-flex h-5 items-center rounded-full bg-gray-100 px-2 font-medium">
        {t}s
      </span>
    </div>
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
  const unsubRef = useRef(null)

  const hydrateAndSet = async (rawDocs) => {
    try {
      const withNames = await resolveCustomerNames(rawDocs)
      setOrders(withNames)
    } catch (e) {
      setError(e.message || 'Failed to resolve customer names')
      setOrders(rawDocs)
    }
  }

  const startLive = () => {
    // Clean previous
    if (unsubRef.current) {
      unsubRef.current()
      unsubRef.current = null
    }
    setError('')
    setLoading(true)
    try {
      const qy = fbQuery(collection(db, 'orders'), orderBy('createdAt', 'desc'))
      unsubRef.current = onSnapshot(
        qy,
        async (snap) => {
          const raw = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          await hydrateAndSet(raw)
          setLoading(false)
        },
        async (err) => {
          // Fallback one-shot if ordering/index missing
          console.warn('Live query failed, falling back:', err?.message)
          try {
            const snap2 = await getDocs(collection(db, 'orders'))
            let raw = snap2.docs.map(d => ({ id: d.id, ...d.data() }))
            raw = raw.sort((a, b) => {
              const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime()
              const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime()
              if (tb !== ta) return tb - ta
              return String(b.publicId || '').localeCompare(String(a.publicId || ''))
            })
            await hydrateAndSet(raw)
          } catch (e2) {
            setError(e2.message || 'Failed to load orders')
          } finally {
            setLoading(false)
          }
        }
      )
    } catch (e) {
      setError(e.message || 'Failed to subscribe to orders')
      setLoading(false)
    }
  }

  const refresh = async () => {
    startLive()
  }

  useEffect(() => {
    startLive()
    return () => {
      if (unsubRef.current) unsubRef.current()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      // No need to manually remove; snapshot will reflect deletion
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
        {loading && <WaitHint />}
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      {showCreate && (
        <OrderForm
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onCreated={(o) => { setShowCreate(false); nav(`/admin/orders/${o.id}`) }}
        />
      )}

      {loading ? (
        <OrdersSkeleton rows={8} />
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
