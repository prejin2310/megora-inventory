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
  const nav = useNavigate()

  const refresh = async () => {
    const snap = await getDocs(collection(db, 'orders'))
    setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })))
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

      {showCreate && <OrderForm onClose={() => setShowCreate(false)} onCreated={(o) => { setShowCreate(false); nav(`/admin/orders/${o.id}`) }} />}

      <Table
        columns={['Public ID', 'Status', 'Customer', 'Total', 'Channel', '']}
        rows={filtered.map(o => [
          o.publicId,
          o.status,
          o.customer?.name || o.customerId || '-',
          `₹${o?.totals?.grandTotal?.toFixed(2)}`,
          o.channel,
          <Button size="sm" key={`v-${o.id}`} onClick={() => nav(`/admin/orders/${o.id}`)}>View</Button>
        ])}
      />
    </div>
  )
}
