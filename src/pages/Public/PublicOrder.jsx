import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getOrderByPublicId } from '../../firebase/firestore'

export default function PublicOrder() {
  const { publicId } = useParams()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setError('')
      try {
        const o = await getOrderByPublicId(publicId)
        if (mounted) setOrder(o)
        if (!o && mounted) setError('Order not found')
      } catch (e) {
        console.error('Public order load error:', e)
        if (mounted) setError(e.message || 'Failed to load order')
      }
    })()
    return () => { mounted = false }
  }, [publicId])

  if (error) return <div className="public-main"><div className="error">{error}</div></div>
  if (!order) return <div className="public-main">Loading…</div>

  return (
    <div className="public-main narrow vstack gap">
      <h2>Order #{order.publicId || order.id}</h2>

      <div className="card">
        <div>Status: <strong>{order.status}</strong></div>
        <div className="muted">
          Placed: {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : (order.createdAt || '')}
        </div>
      </div>

      <div className="card">
        <h3>Items</h3>
        <div className="grid two">
          {(order.items || []).map((it, i) => (
            <div key={i} className="hstack">
              <div>{it.name} × {it.qty}</div>
              <div className="grow" />
              <div>₹{Number(it.price || 0).toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Totals</h3>
        <div className="vstack gap">
          <div className="hstack"><div>Subtotal</div><div className="grow" /><div>₹{Number(order?.totals?.subtotal || 0).toFixed(2)}</div></div>
          <div className="hstack"><div>Shipping</div><div className="grow" /><div>₹{Number(order?.totals?.shipping || 0).toFixed(2)}</div></div>
          <div className="hstack"><div>Discount</div><div className="grow" /><div>-₹{Number(order?.totals?.discount || 0).toFixed(2)}</div></div>
          <div className="hstack" style={{ fontWeight: 600 }}><div>Grand Total</div><div className="grow" /><div>₹{Number(order?.totals?.grandTotal || 0).toFixed(2)}</div></div>
        </div>
      </div>
    </div>
  )
}
