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

// Courier mapping
const COURIERS = [
  { name: 'DTDC', url: 'https://www.dtdc.in/trace.asp' },
  { name: 'Professional Couriers', url: 'https://www.tpcindia.com/track.aspx' },
  { name: 'Blue Dart', url: 'https://www.bluedart.com/tracking' },
  { name: 'Delhivery', url: 'https://www.delhivery.com/tracking' },
  { name: 'Ecom Express', url: 'https://ecomexpress.in/tracking/' },
  { name: 'India Post', url: 'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx' },
]

export default function OrderDetails() {
  const { orderId } = useParams()

  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const [ship, setShip] = useState({ courier: '', awb: '', pickupAt: '', notes: '' })
  const [savingShip, setSavingShip] = useState(false)
  const [estimatedDelivery, setEstimatedDelivery] = useState('')

  const [reasonOpen, setReasonOpen] = useState(false)
  const [reasonText, setReasonText] = useState('')
  const [pendingStatus, setPendingStatus] = useState('')

  // Alert state
  const [alert, setAlert] = useState({ open: false, type: '', message: '' })

  // Share link
  const shareLink = useMemo(() => {
    const pub = order?.publicId || orderId
    return `${location.origin}/o/${pub}`
  }, [order?.publicId, orderId])

  // Flow helper (insert Out for Delivery before Delivered)
  const canAdvance = useMemo(() => {
    const flow = ['Received', 'Packed', 'Waiting for Pickup', 'In Transit', 'Out for Delivery', 'Delivered']
    const idx = flow.indexOf(order?.status || '')
    const next = (to) => flow.indexOf(to) > idx
    return { flow, idx, next }
  }, [order])

  // Load order
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

  const reload = async () => {
    const o = await getOrder(orderId)
    setOrder(o)
  }

  // Alerts
  const showAlert = (type, message) => {
    setAlert({ open: true, type, message })
    setTimeout(() => setAlert({ open: false, type: '', message: '' }), 2500)
  }

  // Status update
  const move = async (next) => {
    setError('')
    try {
      await updateOrderStatus(orderId, next, `Moved to ${next}`)
      await reload()
      showAlert('success', `Order marked as ${next}`)
    } catch (e) {
      console.error('Update status error:', e)
      showAlert('error', e.message || 'Failed to update status')
    }
  }

  const askReasonAndMove = (next) => {
    setPendingStatus(next)
    setReasonText('')
    setReasonOpen(true)
  }

  const confirmReasonMove = async () => {
    if (!reasonText.trim()) {
      return alert('Please provide a reason (notes).')
    }
    try {
      await updateOrderStatus(orderId, pendingStatus, reasonText.trim())
      setReasonOpen(false)
      setPendingStatus('')
      setReasonText('')
      await reload()
      showAlert('success', `Order marked as ${pendingStatus}`)
    } catch (e) {
      console.error('Update status error:', e)
      showAlert('error', e.message || 'Failed to update status')
    }
  }

  const cancelReasonMove = () => {
    setReasonOpen(false)
    setPendingStatus('')
    setReasonText('')
  }

  const saveShipping = async () => {
    setSavingShip(true)
    try {
      const selectedCourier = COURIERS.find(c => c.name === ship.courier)
      const payload = {
        ...ship,
        trackingUrl: selectedCourier ? selectedCourier.url : '',
      }
      await updateOrderShipping(orderId, payload)
      await reload()
      showAlert('success', 'Shipping details saved successfully!')
    } catch (e) {
      console.error('Update shipping error:', e)
      showAlert('error', e.message || 'Failed to save shipping')
    } finally {
      setSavingShip(false)
    }
  }

  const saveEstimated = async () => {
    try {
      await updateOrderEstimated(orderId, estimatedDelivery || '')
      await reload()
      showAlert('success', 'Estimated delivery updated!')
    } catch (e) {
      console.error('Estimated delivery update error:', e)
      showAlert('error', e.message || 'Failed to update estimated delivery')
    }
  }

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      showAlert('success', 'Share link copied!')
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

  if (loading) return <div>Loading…</div>
  if (!order) return <div className="error">Order not found</div>

  const selectedCourier = COURIERS.find(c => c.name === ship.courier)

  return (
    <div className="vstack gap">
      {/* Header */}
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

      {/* Status */}
      <div className="card vstack gap">
        <h3>Status</h3>
        <div className="hstack" style={{ gap: 8, flexWrap: 'wrap' }}>
          {canAdvance.next('Packed') && <Button onClick={() => move('Packed')}>Mark Packed</Button>}
          {canAdvance.next('Waiting for Pickup') && <Button onClick={() => move('Waiting for Pickup')}>Waiting for Pickup</Button>}
          {canAdvance.next('In Transit') && <Button onClick={() => move('In Transit')}>Mark In Transit</Button>}

          {/* New: Out for Delivery button appears after In Transit and before Delivered */}
          {canAdvance.next('Out for Delivery') && <Button onClick={() => move('Out for Delivery')}>Mark Out for Delivery</Button>}

          {canAdvance.next('Delivered') && <Button onClick={() => move('Delivered')}>Mark Delivered</Button>}
          <button type="button" className="btn-danger" onClick={() => askReasonAndMove('Cancelled')}>Cancel Order</button>
          <button type="button" className="btn-warning" onClick={() => askReasonAndMove('Returned')}>Mark Returned</button>
        </div>
        <div className="muted">Flow: Received → Packed → Waiting for Pickup → In Transit → Out for Delivery → Delivered</div>
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
      </div>

      {/* Shipping */}
      <div className="card vstack gap">
        <h3>Shipping</h3>
        <div className="grid two">
          <select
            value={ship.courier}
            onChange={e => setShip(s => ({ ...s, courier: e.target.value }))}
          >
            <option value="">Select Courier</option>
            {COURIERS.map(c => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
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

        {selectedCourier && ship.awb && (
          <div className="muted small">
            Track at: <a href={selectedCourier.url} target="_blank" rel="noreferrer">{selectedCourier.url}</a>
          </div>
        )}

        <div className="hstack" style={{ justifyContent: 'flex-end' }}>
          <Button onClick={saveShipping} disabled={savingShip}>Save Shipping</Button>
        </div>
      </div>

      {/* Items */}
      <div className="card vstack gap">
        <h3>Items</h3>
        <div className="grid two">
          {(order.items || []).map((it, i) => (
            <div key={`${it.sku}-${i}`} className="card">
              <div className="hstack" style={{ gap: 10, alignItems: 'center' }}>
                <div className="thumb">
                  {it.image ? <img src={it.image} alt={it.name || it.sku} /> : <div className="ph">IMG</div>}
                </div>
                <div className="grow">
                  <div className="hstack" style={{ gap: 8 }}>
                    <div>{it.name} × {Number(it.qty)}</div>
                    <div className="grow" />
                    <div>₹{Number(it.price).toFixed(2)}</div>
                  </div>
                  <div className="muted small">SKU: {it.sku}</div>
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
              <div className="timeline-axis"><div className="timeline-dot" /></div>
              <div className="timeline-content">
                <div className="timeline-row">
                  <div className="tl-status"><strong>{h.status}</strong></div>
                  <div className="tl-time muted small">{fmtDateTime(h.at)}</div>
                </div>
                {h.note && <div className="tl-note">{h.note}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reason modal */}
      {reasonOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-head"><div className="modal-title">Reason required — {pendingStatus}</div></div>
            <div className="modal-body">
              <textarea
                rows={4}
                placeholder={`Add a reason for marking as ${pendingStatus} (required)`}
                value={reasonText}
                onChange={e => setReasonText(e.target.value)}
              />
            </div>
            <div className="modal-foot">
              <Button variant="ghost" onClick={cancelReasonMove}>Cancel</Button>
              <button
                type="button"
                className={pendingStatus === 'Cancelled' ? 'btn-danger' : 'btn-warning'}
                onClick={confirmReasonMove}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert popup */}
      {alert.open && (
        <div className="alert-popup">
          <div className={`alert-box ${alert.type}`}>{alert.message}</div>
        </div>
      )}

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
        .share-input { width: min(420px, 56vw); padding: 8px 10px; border: 1px solid #e5e7eb; border-radius: 10px; font-size: 14px; background: #f8fafc; }
        .thumb { width: 64px; height: 64px; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; display: grid; place-items: center; background: #fafafa; }
        .thumb img { width: 100%; height: 100%; object-fit: cover; }
        .btn-danger { border: 1px solid #ef4444; background: #fee2e2; color: #991b1b; border-radius: 10px; padding: 8px 12px; font-weight: 700; cursor: pointer; }
        .btn-warning { border: 1px solid #f59e0b; background: #fffbeb; color: #92400e; border-radius: 10px; padding: 8px 12px; font-weight: 700; cursor: pointer; }
        .btn-danger:hover { background: #fecaca; }
        .btn-warning:hover { background: #fef3c7; }
        .modal-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,.45); display: grid; place-items: center; z-index: 50; padding: 16px; }
        .modal { width: min(560px, 96vw); background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 24px 64px rgba(0,0,0,.18); display: grid; grid-template-rows: auto 1fr auto; }
        .modal-head { padding: 10px 12px; border-bottom: 1px solid #eef0f2; }
        .modal-title { font-weight: 800; }
        .modal-body { padding: 12px; }
        .modal-body textarea { width: 100%; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px; font-size: 14px; }
        .modal-foot { padding: 10px 12px; border-top: 1px solid #eef0f2; display: flex; justify-content: flex-end; gap: 8px; }
        .timeline { display: grid; gap: 12px; }
        .timeline-item { display: grid; grid-template-columns: 20px 1fr; gap: 12px; }
        .timeline-dot { width: 10px; height: 10px; border-radius: 999px; background: #0ea5e9; }
        .alert-popup { position: fixed; top: 80px; right: 20px; z-index: 9999; }
        .alert-box { padding: 10px 16px; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.15); animation: fadeInOut 2.5s forwards; }
        .alert-box.success { background: #dcfce7; color: #166534; border: 1px solid #22c55e; }
        .alert-box.error { background: #fee2e2; color: #991b1b; border: 1px solid #ef4444; }
        @keyframes fadeInOut { 0% { opacity: 0; transform: translateY(-10px); } 10% { opacity: 1; transform: translateY(0); } 90% { opacity: 1; } 100% { opacity: 0; transform: translateY(-10px); } }
      `}</style>
    </div>
  )
}
