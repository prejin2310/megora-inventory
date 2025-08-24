import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getOrderByPublicId } from '../../firebase/firestore'
import StatusTimeline from '../../components/orders/StatusTimeline'

export default function PublicOrder() {
  const { publicId } = useParams()
  const [order, setOrder] = useState(null)

  useEffect(() => {
    getOrderByPublicId(publicId).then(setOrder)
  }, [publicId])

  if (!order) return <div className="center muted">Order not found</div>

  return (
    <div className="vstack gap narrow">
      <h2>Order #{order.publicId}</h2>
      <div className="card">
        <h4>Summary</h4>
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

      <div className="card">
        <h4>Shipping Address</h4>
        <div>{order.customer?.name}</div>
        <div>{order.customer?.address}</div>
      </div>

      <div className="card">
        <h4>Courier</h4>
        <div>{order.courier?.name}</div>
        {order.courier?.trackingUrl && <a href={order.courier.trackingUrl} target="_blank" rel="noreferrer">Tracking</a>}
      </div>

      <div className="card">
        <h4>Status</h4>
        <StatusTimeline history={order.history} />
      </div>
    </div>
  )
}
