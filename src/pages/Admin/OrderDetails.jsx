import React, { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import Button from '../../components/ui/Button'
import StatusPill from '../../components/ui/StatusPill'
import { updateOrder, cancelOrReturnOrder } from '../../firebase/firestore'
import { useParams } from 'react-router-dom'
import StatusTimeline from '../../components/orders/StatusTimeline'
import { useAuth } from '../../auth/AuthContext'
import { generateInvoice } from '../../utils/pdf'

export default function OrderDetails() {
  const { orderId } = useParams()
  const [order, setOrder] = useState(null)
  const { user } = useAuth()

  const refresh = async () => {
    const snap = await getDoc(doc(db, 'orders', orderId))
    if (snap.exists()) setOrder({ id: snap.id, ...snap.data() })
  }

  useEffect(() => { refresh() }, [orderId])

  if (!order) return null

  const move = async (status) => {
    await updateOrder(order.id, { status }, user?.uid)
    await refresh()
  }

  const cancel = async () => {
    await cancelOrReturnOrder(order.id, 'Cancelled', user?.uid)
    await refresh()
  }

  const markReturn = async () => {
    await cancelOrReturnOrder(order.id, 'Returned', user?.uid)
    await refresh()
  }

  return (
    <div className="vstack gap">
      <div className="hstack">
        <h2>Order #{order.publicId}</h2>
        <StatusPill status={order.status} />
      </div>

      <div className="grid two">
        <div className="card">
          <h4>Customer</h4>
          <div>{order.customer?.name || order.customerId}</div>
          <div className="muted">{order.customer?.email}</div>
          <div className="muted">{order.customer?.phone}</div>
          <div>{order.customer?.address}</div>
        </div>

        <div className="card">
          <h4>Courier</h4>
          <div>{order.courier?.name}</div>
          <div className="muted">{order.courier?.trackingNumber}</div>
          {order.courier?.trackingUrl && <a href={order.courier.trackingUrl} target="_blank" rel="noreferrer">Tracking Link</a>}
        </div>
      </div>

      <div className="card">
        <h4>Items</h4>
        <ul>
          {order.items.map((it, i) => (
            <li key={i}>{it.name} × {it.qty} — ₹{(it.price * it.qty).toFixed(2)}</li>
          ))}
        </ul>
        <div className="hstack">
          <div>Subtotal: ₹{order.totals.subTotal.toFixed(2)}</div>
          <div>Tax: ₹{order.totals.tax.toFixed(2)}</div>
          <div>Shipping: ₹{order.totals.shipping.toFixed(2)}</div>
          <div>Discount: ₹{order.totals.discount.toFixed(2)}</div>
          <div><b>Total: ₹{order.totals.grandTotal.toFixed(2)}</b></div>
        </div>
      </div>

      <StatusTimeline history={order.history} />

      <div className="hstack">
       <div className="bottom-bar">
  {order.status === 'Received' && <Button onClick={() => move('Packed')}>Mark Packed</Button>}
  {order.status === 'Packed' && <Button onClick={() => move('Waiting for Pickup')}>Waiting</Button>}
  {order.status === 'Waiting for Pickup' && <Button onClick={() => move('In Transit')}>In Transit</Button>}
  {order.status === 'In Transit' && <Button onClick={() => move('Delivered')}>Delivered</Button>}
  {['Received', 'Packed', 'Waiting for Pickup', 'In Transit'].includes(order.status) && <Button variant="danger" onClick={cancel}>Cancel</Button>}
  {order.status === 'Delivered' && <Button variant="danger" onClick={markReturn}>Returned</Button>}
</div>

      </div>

      <Button onClick={() => generateInvoice(order)}>Download Invoice</Button>
    </div>
  )
}
