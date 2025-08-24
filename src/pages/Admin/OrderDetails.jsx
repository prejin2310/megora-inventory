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

  // All hooks at the top (fixed order)
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  // Shipping editable fields
  const [ship, setShip] = useState({ courier: '', awb: '', pickupAt: '', notes: '' })
  const [savingShip, setSavingShip] = useState(false)

  // Estimated delivery (date string: YYYY-MM-DD or ISO)
  const [estimatedDelivery, setEstimatedDelivery] = useState('') // admin sets when In Transit

  // Derived share link (always declared)
  const shareLink = useMemo(() => {
    const pub = order?.publicId || orderId
    return `${location.origin}/o/${pub}`
  }, [order?.publicId, orderId])

  // Flow helper (always declared)
  const canAdvance = useMemo(() => {
    const flow = ['Received', 'Packed', 'Waiting for Pickup', 'In Transit', 'Delivered']
    const idx = flow.indexOf(order?.status || '')
    const next = (to) => flow.indexOf(to) > idx
    return { flow, idx, next }
  }, [order])

  // Load order (effect always declared)
  useEffect(() => {
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
    load()
  }, [orderId])

  // Actions
  const move = async (next) => {
    setError('')
    try {
      await updateOrderStatus(orderId, next, `Moved to ${next}`)
      // reload
      const o = await getOrder(orderId)
      setOrder(o)
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
      const o = await getOrder(orderId)
      setOrder(o)
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
      await updateOrderEstimated(orderId, estimatedDelivery || '')
      const o = await getOrder(orderId)
      setOrder(o)
    } catch (e) {
      console.error('Estimated delivery update error:', e)
      setError(e.message || 'Failed to update estimated delivery')
    }
  }

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      alert(`Copied link:\n${shareLink}`)
    } catch {
      prompt('Copy link:', shareLink)
    }
  }

  const fmtDateTime = (ts) => {
    try {
      const d = ts?.toDate ? ts.toDate() : (typeof ts === 'string' ? new Date(ts) : new Date(ts))
      return d.toLocaleString()
    } catch {
      return String(ts || '-')
    }
  }

  // Early returns come AFTER all hooks
  if (loading) return <div>Loading…</div>
  if (!order) return <div className="error">Order not found</div>

  return (
    <div className="vstack gap">
      <div className="hstack">
        <h2>Order #{order.publicId || order.id}</h2>
        <div className="grow" />
        <div className="pill">{order.status}</div>
      </div>

      {error && <div className="error">{error}</div>}

      {/* Customer share link */}
      <div className="card vstack gap">
        <h3>Customer Share Link</h3>
        <div className="hstack" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            className="share-input"
            value={shareLink}
            readOnly
            onFocus={e => e.currentTarget.select()}
          />
          <Button size="sm" onClick={copyShare}>Copy link</Button>
        </div>
      </div>

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

      {/* Estimated Delivery */}
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

      {/* Items with product images */}
      <div className="card vstack gap">
        <h3>Items</h3>
        <div className="grid two">
          {(order.items || []).map((it, i) => (
            <div key={`${it.sku}-${i}`} className="card">
              <div className="hstack" style={{ gap: 10, alignItems: 'center' }}>
                <div className="thumb">
                  {(() => {
                    const img = (it.image || '').trim()
                    return img ? (
                      <img
                        src={img}
                        alt={it.name || it.sku || 'Item'}
                        referrerPolicy="no-referrer"
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '' }}
                      />
                    ) : (
                      <div className="ph">IMG</div>
                    )
                  })()}
                </div>
                <div className="grow">
                  <div className="hstack" style={{ gap: 8 }}>
                    <div>{it.name} × {Number(it.qty)}</div>
                    <div className="grow" />
                    <div>₹{Number(it.price).toFixed(2)}</div>
                  </div>
                  <div className="muted small">
                    SKU: {it.sku}{it.updatedAt ? ` • updated: ${it.updatedAt}` : ''}
                  </div>
                </div>
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

      <style>{`
        .gap { gap: 12px; }
        .vstack { display: grid; }
        .hstack { display: flex; align-items: center; }
        .grid.two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        @media (max-width: 720px) { .grid.two { grid-template-columns: 1fr; } }
        .grow { flex: 1; }
        .pill { background: #eef2ff; color: #3730a3; border-radius: 999px; padding: 4px 10px; font-weight: 700; }

        .card { border: 1px solid #e5e7eb; border-radius: 12px; background: #fff; padding: 12px; }
        .muted { color: #6b7280; }
        .small { font-size: 12px; }

        .share-input {
          width: min(420px, 56vw);
          padding: 8px 10px;
          border: 1px solid #e5e7eb; border-radius: 10px; font-size: 14px;
          background: #f8fafc;
        }

        .thumb { width: 56px; height: 56px; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; background: #fafafa; display: grid; place-items: center; color: #9ca3af; font-size: 12px; }
        .thumb img { width: 100%; height: 100%; object-fit: cover; }
        .ph { display: grid; place-items: center; width: 100%; height: 100%; }

        .timeline { display: grid; gap: 10px; }
        .timeline-item { display: grid; grid-template-columns: 14px 1fr; gap: 10px; }
        .timeline-dot { width: 10px; height: 10px; border-radius: 999px; background: #0ea5e9; margin-top: 6px; }
      `}</style>
    </div>
  )
}
