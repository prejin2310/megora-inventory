import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getOrderByPublicId } from '../../firebase/firestore'

// Brand config
const BRAND_GREEN = '#024F3D'
const LOGO_URL = 'https://i.ibb.co/5XLbs6Pr/Megora-Gold.png'

// Formatters
const fmtDateTime = (ts) => {
  try {
    const d = ts?.toDate ? ts.toDate() : (typeof ts === 'string' ? new Date(ts) : new Date(ts))
    return d.toLocaleString()
  } catch {
    return String(ts || '-')
  }
}
const fmtDate = (ts) => {
  try {
    const d = ts?.toDate ? ts.toDate() : (typeof ts === 'string' ? new Date(ts) : new Date(ts))
    return d.toLocaleDateString()
  } catch {
    return String(ts || '-')
  }
}
const fmtTime = (ts) => {
  try {
    const d = ts?.toDate ? ts.toDate() : (typeof ts === 'string' ? new Date(ts) : new Date(ts))
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  } catch {
    return String(ts || '-')
  }
}
const money = (n) => `₹${Number(n || 0).toFixed(2)}`

// Icons
const IconCheck = ({ fill = BRAND_GREEN }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={fill} strokeWidth="2" aria-hidden="true">
    <path d="M20 6L9 17l-5-5" />
  </svg>
)
const IconDot = ({ fill = BRAND_GREEN }) => (
  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="5" fill={fill} /></svg>
)
const IconTruck = ({ fill = BRAND_GREEN }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={fill} strokeWidth="2" aria-hidden="true">
    <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7z" /><circle cx="7.5" cy="17.5" r="1.5" /><circle cx="17.5" cy="17.5" r="1.5" />
  </svg>
)
const IconBox = ({ fill = BRAND_GREEN }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={fill} strokeWidth="2" aria-hidden="true">
    <path d="M21 16V8l-9-5-9 5v8l9 5 9-5z" /><path d="M3.3 7.3L12 12l8.7-4.7" />
  </svg>
)

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

  const placedAtDate = useMemo(() => {
    if (!order?.createdAt) return null
    return order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt)
  }, [order])

  // status times from history
  const statusTimes = useMemo(() => {
    const map = {}
    ;(order?.history || []).forEach(h => {
      if (!map[h.status]) map[h.status] = h.at
    })
    return map
  }, [order])

  if (error) return <div className="public-main"><div className="error">{error}</div></div>
  if (!order) return <div className="public-main">Loading…</div>

  const customerName = order?.customer?.name || 'Customer'
  const shipping = order?.shipping || null
  const totals = order?.totals || { subtotal: 0, shipping: 0, discount: 0, grandTotal: 0 }

  // Flow
  const flow = [
    { key: 'Received', label: 'Order Received', icon: <IconDot /> },
    { key: 'Packed', label: 'Item Packed', icon: <IconBox /> },
    { key: 'Waiting for Pickup', label: 'Courier Pickup Initiated', icon: <IconBox /> },
    { key: 'In Transit', label: 'In Transit', icon: <IconTruck /> },
    { key: 'Delivered', label: 'Delivered', icon: <IconCheck /> },
  ]
  const currentIndexRaw = flow.findIndex(f => f.key === order.status)
  const currentIndex = currentIndexRaw >= 0 ? currentIndexRaw : 0

  // Estimated delivery (admin will set when In Transit)
  const estDelivery = order?.estimatedDelivery || order?.shipping?.estimatedDelivery || null

  return (
    <div className="public-wrap">
      {/* Brand bar with transparent PNG logo */}
      <header className="public-header" style={{ background: BRAND_GREEN }}>
        <div className="brand">
          <img className="brand-logo-img" src={LOGO_URL} alt="Megora Jewels" />
          <div className="brand-name">Megora Jewels</div>
        </div>
      </header>

      <main className="public-main">
        {/* Estimated delivery (top) */}
        <section className="card est-box">
          <div className="est-title">Estimated Delivery</div>
          <div className="est-date">{estDelivery ? fmtDate(estDelivery) : '—'}</div>
          <div className="est-note muted">
            Estimated date will update after the courier picks up the order and progresses to In Transit.
          </div>
        </section>

        {/* Order details compact */}
        <section className="card">
          <div className="order-top">
            <div className="ot-block">
              <div className="muted">Order</div>
              <div className="ot-strong">#{order.publicId || order.id}</div>
            </div>
            <div className="ot-block">
              <div className="muted">Status</div>
              <div className="pill" style={{ color: BRAND_GREEN, borderColor: BRAND_GREEN + '33', background: BRAND_GREEN + '14' }}>
                {order.status}
              </div>
            </div>
            <div className="ot-block">
              <div className="muted">Placed</div>
              <div className="ot-strong">{placedAtDate ? placedAtDate.toLocaleString() : '-'}</div>
            </div>
          </div>
          <div className="muted">Dear {customerName}, thank you for your order.</div>
        </section>

        {/* Vertical timeline with date + time */}
        <section className="card">
          <h3 className="section-title">Order Progress</h3>

          <div className="v-timeline">
            {flow.map((step, idx) => {
              const reached = idx <= currentIndex
              const isCurrent = idx === currentIndex
              const at = statusTimes[step.key] // could be ISO string or Timestamp
              const dateStr = at ? fmtDate(at) : '-'
              const timeStr = at ? fmtTime(at) : '-'
              const showCourierInline = step.key === 'In Transit' && reached && (shipping?.courier || shipping?.awb)

              return (
                <div key={step.key} className={`vt-row ${reached ? 'active' : 'inactive'}`}>
                  {/* Left rail */}
                  <div className="vt-rail">
                    <div className={`vt-node ${isCurrent ? 'current' : (reached ? 'done' : '')}`} style={{ borderColor: BRAND_GREEN }}>
                      {isCurrent ? <span className="vt-pulse" style={{ borderColor: BRAND_GREEN }} /> : null}
                      <div className="vt-icon">{step.icon}</div>
                    </div>
                    {idx < flow.length - 1 && (
                      <div className={`vt-line ${idx < currentIndex ? 'filled' : ''}`} style={{ background: idx < currentIndex ? BRAND_GREEN : 'var(--border)' }} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="vt-content">
                    <div className="vt-head">
                      <div className="vt-title">{step.label}</div>
                      <div className="vt-when">
                        <div className="vt-date">{dateStr}</div>
                        <div className="vt-time">{timeStr}</div>
                      </div>
                    </div>

                    {showCourierInline && (
                      <div className="vt-inline">
                        {shipping?.courier && <div><span className="muted">Courier:</span> {shipping.courier}</div>}
                        {shipping?.awb && <div><span className="muted">AWB:</span> {shipping.awb}</div>}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Items only (clean) */}
        <section className="card">
          <h3 className="section-title">Items</h3>
          <div className="items">
            {(order.items || []).map((it, i) => (
              <div key={`${it.sku}-${i}`} className="item-row">
                <div className="item-left">
                  <div className="item-thumb">
                    {it.image ? <img src={it.image} alt={it.name} /> : <div className="item-placeholder">IMG</div>}
                  </div>
                  <div className="item-info">
                    <div className="item-name">{it.name}</div>
                    <div className="item-sku muted">{it.sku}</div>
                  </div>
                </div>
                <div className="item-mid">
                  <div className="muted">Qty</div>
                  <div className="item-qty">{Number(it.qty)}</div>
                </div>
                <div className="item-mid">
                  <div className="muted">Price</div>
                  <div>{money(it.price)}</div>
                </div>
                <div className="item-right">
                  <div className="muted">Line total</div>
                  <div className="ot-strong">{money(Number(it.price) * Number(it.qty))}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="totals">
            <div className="tot-row">
              <div>Subtotal</div>
              <div>{money(totals.subtotal)}</div>
            </div>
            <div className="tot-row">
              <div>Shipping</div>
              <div>{money(totals.shipping)}</div>
            </div>
            <div className="tot-row">
              <div>Discount</div>
              <div>-{money(totals.discount)}</div>
            </div>
            <div className="tot-row tot-grand">
              <div>Grand Total</div>
              <div>{money(totals.grandTotal)}</div>
            </div>
          </div>
        </section>

        {/* Delivery summary (no extra tracking list) */}
        <section className="card">
          <h3 className="section-title">Delivery</h3>
          <div className="grid-two">
            <div className="ship-box">
              <div className="muted">Delivery Agency</div>
              <div className="ot-strong">{shipping?.courier || '-'}</div>
              <div className="muted mt4">AWB / Reference</div>
              <div className="ot-strong">{shipping?.awb || '-'}</div>
            </div>
            <div />
          </div>
        </section>
                {/* Refund note when Delivered */}
        {order.status === 'Delivered' && (
          <section className="card refund-note">
            <div className="refund-title">Refund & Return Policy</div>
            <div className="refund-body">
              Refund can be initiated through WhatsApp with a valid open-box video and must be claimed within 24 hours of delivery time.
            </div>
          </section>
        )}

        <section className="muted center small">
          For support, reply to our message or contact support@megorajewels.com
        </section>
      </main>
    </div>
  )
}
