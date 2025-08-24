import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getOrder, updateOrderStatus, updateOrderItems, updateOrderShipping } from '../../firebase/firestore'
import Button from '../../components/ui/Button'

export default function OrderDetails() {
  const { orderId } = useParams()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')
  const [ship, setShip] = useState({ courier: '', awb: '', pickupAt: '', notes: '' })
  const [savingShip, setSavingShip] = useState(false)

  const load = async () => {
    setError('')
    try {
      const o = await getOrder(orderId)
      setOrder(o)
      setShip({
        courier: o?.shipping?.courier || '',
        awb: o?.shipping?.awb || '',
        pickupAt: o?.shipping?.pickupAt || '',
        notes: o?.shipping?.notes || '',
      })
    } catch (e) {
      console.error('Order load error:', e)
      setError(e.message || 'Failed to load order')
    }
  }

  useEffect(() => { load() }, [orderId])

  const move = async (next) => {
    setError('')
    try {
      await updateOrderStatus(orderId, next, `Moved to ${next}`)
      await load()
    } catch (e) {
      console.error('Update status error:', e)
      setError(e.message || 'Failed to update status')
    }
  }

  const saveShipping = async () => {
    setSavingShip(true)
    setError('')
    try {
      await updateOrderShipping(orderId, ship)
      await load()
    } catch (e) {
      console.error('Update shipping error:', e)
      setError(e.message || 'Failed to save shipping')
    } finally {
      setSavingShip(false)
    }
  }

  if (!order) return <div>Loading…</div>

  const canAdvance = (from, to) => {
    const flow = ['Received', 'Packed', 'Waiting for Pickup', 'In Transit', 'Delivered']
    return flow.indexOf(to) > flow.indexOf(from)
  }

  return (
    <div className="vstack gap">
      <h2>Order #{order.publicId || order.id}</h2>
      {error && <div className="error">{error}</div>}

      <div className="grid two">
        <div className="card vstack gap">
          <div className="hstack">
            <div className="pill">{order.status}</div>
            <div className="grow" />
            {canAdvance(order.status, 'Packed') && <Button onClick={() => move('Packed')}>Mark Packed</Button>}
            {canAdvance(order.status, 'Waiting for Pickup') && <Button onClick={() => move('Waiting for Pickup')}>Waiting</Button>}
            {canAdvance(order.status, 'In Transit') && <Button onClick={() => move('In Transit')}>In Transit</Button>}
            {canAdvance(order.status, 'Delivered') && <Button onClick={() => move('Delivered')}>Delivered</Button>}
          </div>

          <h3>Shipping (edit later)</h3>
          <div className="grid two">
            <input placeholder="Courier" value={ship.courier} onChange={e => setShip(s => ({ ...s, courier: e.target.value }))} />
            <input placeholder="AWB / Tracking #" value={ship.awb} onChange={e => setShip(s => ({ ...s, awb: e.target.value }))} />
            <input type="datetime-local" placeholder="Pickup time" value={ship.pickupAt} onChange={e => setShip(s => ({ ...s, pickupAt: e.target.value }))} />
            <input placeholder="Notes" value={ship.notes} onChange={e => setShip(s => ({ ...s, notes: e.target.value }))} />
          </div>
          <div className="hstack" style={{ justifyContent: 'flex-end' }}>
            <Button onClick={saveShipping} disabled={savingShip}>Save Shipping</Button>
          </div>
        </div>

        <div className="card">
          <h3>History</h3>
          <div className="timeline">
            {(order.history || []).map((h, i) => (
              <div key={i} className="timeline-item">
                <div className="timeline-dot" />
                <div><strong>{h.status}</strong> • {h.at}</div>
                {h.note && <div className="muted">{h.note}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Items</h3>
        <div className="grid two">
          {(order.items || []).map((it, i) => (
            <div key={i} className="card">
              <div className="hstack">
                <div>{it.name} x {it.qty}</div>
                <div className="grow" />
                <div>₹{Number(it.price).toFixed(2)}</div>
              </div>
              {it.updatedAt && <div className="muted">updated: {it.updatedAt}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
