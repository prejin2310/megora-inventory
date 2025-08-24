import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  getOrder,
  updateOrderStatus,
  updateOrderItems,
  updateOrderShipping,
  updateOrderEstimated,
} from '../../firebase/firestore'
import Button from '../../components/ui/Button'

export default function OrderDetails() {
  const { orderId } = useParams()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  // Shipping editable fields
  const [ship, setShip] = useState({ courier: '', awb: '', pickupAt: '', notes: '' })
  const [savingShip, setSavingShip] = useState(false)

  // Estimated delivery (date string: YYYY-MM-DD or ISO)
  const [estimatedDelivery, setEstimatedDelivery] = useState('') // admin sets when In Transit

  const load = async () => {
    setError('')
    setLoading(true)
    try {
      const o = await getOrder(orderId)
      setOrder(o)
      setShip({
        courier: o?.shipping?.courier || '',
        awb: o?.shipping?.awb || '',
        pickupAt: o?.shipping?.pickupAt || '',
        notes: o?.shipping?.notes || '',
      })
      setEstimatedDelivery(o?.estimatedDelivery || '')
    } catch (e) {
      console.error('Order load error:', e)
      setError(e.message || 'Failed to load order')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [orderId])

  const canAdvance = useMemo(() => {
    const flow = ['Received', 'Packed', 'Waiting for Pickup', 'In Transit', 'Delivered']
    const idx = flow.indexOf(order?.status || '')
    const next = (to) => flow.indexOf(to) > idx
    return { flow, idx, next }
  }, [order])

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

  const saveEstimated = async () => {
    setError('')
    try {
      // Accept YYYY-MM-DD or ISO strings; store as provided string
      await updateOrderEstimated(orderId, estimatedDelivery || '')
      await load()
    } catch (e) {
      console.error('Estimated delivery update error:', e)
      setError(e.message || 'Failed to update estimated delivery')
    }
  }

  if (loading) return <div>Loading…</div>
  if (!order) return <div className="error">Order not found</div>

  const fmtDateTime = (ts) => {
    try {
      const d = ts?.toDate ? ts.toDate() : (typeof ts === 'string' ? new Date(ts) : new Date(ts))
      return d.toLocaleString()
    } catch {
      return String(ts || '-')
    }
  }

  return (
    <div className="vstack gap">
      <div className="hstack">
        <h2>Order #{order.publicId || order.id}</h2>
        <div className="grow" />
        <div className="pill">{order.status}</div>
      </div>

      {error && <div className="error">{error}</div>}

      {/* Status actions */}
      <div className="card vstack gap">
        <h3>Status</h3>
        <div className="hstack" style={{ gap: 8, flexWrap: 'wrap' }}>
          {canAdvance.next('Packed') && <Button onClick={() => move('Packed')}>Mark Packed</Button>}
          {canAdvance.next('Waiting for Pickup') && <Button onClick={() => move('Waiting for Pickup')}>Waiting for Pickup</Button>}
          {canAdvance.next('In Transit') && <Button onClick={() => move('In Transit')}>Mark In Transit</Button>}
          {canAdvance.next('Delivered') && <Button onClick={() => move('Delivered')}>Mark Delivered</Button>}
        </div>
        <div className="muted">
          Flow: Received → Packed → Waiting for Pickup → In Transit → Delivered
        </div>
      </div>

      {/* Estimated Delivery (admin sets when in transit or later) */}
      <div className="card vstack gap">
        <h3>Estimated Delivery</h3>
        <div className="grid two">
          <input
            type="date"
            value={estimatedDelivery ? (String(estimatedDelivery).slice(0, 10)) : ''}
            onChange={e => setEstimatedDelivery(e.target.value)}
          />
          <div className="hstack" style={{ justifyContent: 'flex-end' }}>
            <Button onClick={saveEstimated}>Save Estimated Date</Button>
          </div>
        </div>
        <div className="muted">
          This appears on the public order page. Update after moving to “In Transit”.
        </div>
      </div>

      {/* Shipping editor */}
      <div className="card vstack gap">
        <h3>Shipping</h3>
        <div className="grid two">
          <input
            placeholder="Courier"
            value={ship.courier}
            onChange={e => setShip(s => ({ ...s, courier: e.target.value }))}
          />
          <input
            placeholder="AWB / Tracking #"
            value={ship.awb}
            onChange={e => setShip(s => ({ ...s, awb: e.target.value }))}
          />
          <input
            type="datetime-local"
            placeholder="Pickup time"
            value={ship.pickupAt}
            onChange={e => setShip(s => ({ ...s, pickupAt: e.target.value }))}
          />
          <input
            placeholder="Notes"
            value={ship.notes}
            onChange={e => setShip(s => ({ ...s, notes: e.target.value }))}
          />
        </div>
        <div className="hstack" style={{ justifyContent: 'flex-end' }}>
          <Button onClick={saveShipping} disabled={savingShip}>Save Shipping</Button>
        </div>
        <div className="muted">
          Courier and AWB will show on the public page when status reaches “In Transit”.
        </div>
      </div>

      {/* Items (read-only here; edit in creation modal if needed) */}
      <div className="card vstack gap">
        <h3>Items</h3>
        <div className="grid two">
          {(order.items || []).map((it, i) => (
            <div key={`${it.sku}-${i}`} className="card">
              <div className="hstack">
                <div>{it.name} × {Number(it.qty)}</div>
                <div className="grow" />
                <div>₹{Number(it.price).toFixed(2)}</div>
              </div>
              <div className="muted small">
                SKU: {it.sku}{it.updatedAt ? ` • updated: ${it.updatedAt}` : ''}
              </div>
            </div>
          ))}
        </div>
        <div className="hstack" style={{ fontWeight: 600 }}>
          <div>Total</div>
          <div className="grow" />
          <div>₹{Number(order?.totals?.grandTotal || 0).toFixed(2)}</div>
        </div>
      </div>

      {/* History */}
      <div className="card vstack gap">
        <h3>History</h3>
        <div className="timeline">
          {(order.history || []).map((h, i) => (
            <div key={i} className="timeline-item">
              <div className="timeline-dot" />
              <div className="timeline-body">
                <div><strong>{h.status}</strong></div>
                <div className="muted small">{fmtDateTime(h.at)}</div>
                {h.note && <div className="muted">{h.note}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
