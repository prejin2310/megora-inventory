import React, { useEffect, useMemo, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import Button from '../../components/ui/Button'
import OrderForm from '../../components/orders/OrderForm'
import Table from '../../components/ui/Table'
import { useNavigate } from 'react-router-dom'

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [filter, setFilter] = useState({ status: '', channel: '' })
  const [showCreate, setShowCreate] = useState(false)
  const [error, setError] = useState('')
  const nav = useNavigate()

  const refresh = async () => {
    setError('')
    try {
      const snap = await getDocs(collection(db, 'orders'))
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (e) {
      console.error('Orders load error:', e)
      setError(e.message || 'Failed to load orders')
    }
  }
  useEffect(() => { refresh() }, [])

  const filtered = useMemo(() => {
    return orders.filter(o => {
      if (filter.status && o.status !== filter.status) return false
      if (filter.channel && o.channel !== filter.channel) return false
      return true
    })
  }, [orders, filter])

  return (
    <div className="vstack gap">
      <div className="hstack">
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
        <Button onClick={() => setShowCreate(true)}>Create Order</Button>
      </div>

      {error && <div className="error">{error}</div>}

      {showCreate && (
        <OrderForm
          onClose={() => setShowCreate(false)}
          onCreated={(o) => { setShowCreate(false); nav(`/admin/orders/${o.id}`) }}
        />
      )}

      <Table
  columns={['Public ID', 'Status', 'Customer', 'Total', 'Channel', 'Share', '']}
  rows={filtered.map(o => {
    const pub = o.publicId || o.id
    const link = `${location.origin}/o/${pub}`
    return [
      pub,
      o.status,
      o.customer?.name || o.customerId || '-',
      `₹${Number(o?.totals?.grandTotal || 0).toFixed(2)}`,
      o.channel,
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

    </div>
  )
}
