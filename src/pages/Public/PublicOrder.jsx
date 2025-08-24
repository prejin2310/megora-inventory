import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getOrderByPublicId } from '../../firebase/firestore'

const BRAND_GREEN = '#024F3D'
const LOGO_URL = 'https://i.ibb.co/5XLbs6Pr/Megora-Gold.png'

// Formatters
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

  const statusTimes = useMemo(() => {
    const map = {}
    ;(order?.history || []).forEach(h => {
      if (!map[h.status]) map[h.status] = h.at
    })
    return map
  }, [order])

  if (error) return <div className="po-main"><div className="po-error">{error}</div></div>
  if (!order) return <div className="po-main">Loading…</div>

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

  const estDelivery = order?.estimatedDelivery || order?.shipping?.estimatedDelivery || ''
  const trackingUrl = (shipping?.trackingUrl || '').trim()
  const canTrack = Boolean(trackingUrl)

  return (
    <div className="po-wrap">
      {/* HEADER */}
      <header className="po-header">
        <div className="po-container po-headbar">
          <div className="po-logo-side">
            <img src={LOGO_URL} alt="Megora Jewels" className="po-logo" />
          </div>

          <div className="po-brand-side">
            <div className="po-brand-name">Megora Jewels</div>
            <div className="po-brand-sub">Exclusive online store — shop anytime anywhere!</div>
            <div className="po-brand-sub">
              <a className="po-site" href="https://megorajewels.com" target="_blank" rel="noopener noreferrer">
                www.megorajewels.com
              </a>
            </div>
          </div>

          {/* RIGHT-SIDE ROUND CARD FOR ID / TIME / STATUS */}
          <div className="po-order-side">
            <div className="po-order-card">
              <div className="po-order-card-row">
                <span className="po-order-label">Order</span>
                <span className="po-order-value">#{order.publicId || order.id}</span>
              </div>
              <div className="po-order-card-row">
                <span className="po-order-label">Placed</span>
                <span className="po-order-value">{placedAtDate ? placedAtDate.toLocaleString() : '-'}</span>
              </div>
              <div className="po-order-card-row">
                <span className="po-order-label">Status</span>
                <span className="po-status-pill">{order.status}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="po-main">
        <div className="po-container po-stack16">
          {/* Greeting (white on mobile) */}
          <section className="po-card po-greet-card">
            <div className="po-greet">
              <div className="po-greet-line">Dear <strong>{customerName}</strong>,</div>
              <div className="po-muted"><br></br>Thank you for your order. Below are your order details and progress.</div>
            </div>
          </section>

          {/* Tracking */}
          {canTrack && (
            <section className="po-card po-track">
              <div className="po-track-row">
                <div className="po-track-info">
                  <div className="po-muted">Track your shipment</div>
                  <div className="po-track-meta">
                    {shipping?.courier ? <span>Courier: <strong>{shipping.courier}</strong></span> : null}
                    {shipping?.awb ? <span> • AWB: <strong>{shipping.awb}</strong></span> : null}
                  </div>
                </div>
                <div className="po-grow" />
                <a
                  className="po-btn-track"
                  href={trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open official courier tracking"
                >
                  Track Package
                </a>
              </div>
            </section>
          )}

          {/* Progress */}
          <section className="po-card">
            <div className="po-progress-head">
              <h3 className="po-section-title">Order Progress</h3>
              <div className="po-est">
                <div className="po-muted">Estimated Delivery</div>
                <div className="po-strong">{estDelivery ? fmtDate(estDelivery) : '—'}</div>
              </div>
            </div>

            {/* Order Progress with Estimated Delivery inside */}
        <section className="card">
          <div className="progress-head">
            <h3 className="section-title">Order Progress</h3>
          </div>

          <div className="est-inline">
            <div className="muted">Estimated Delivery</div>
            <div className="est-inline-date">{estDelivery ? fmtDate(estDelivery) : '—'}</div>
          </div>

          <div className="v-timeline">
            {flow.map((step, idx) => {
              const reached = idx <= currentIndex
              const isCurrent = idx === currentIndex
              const at = statusTimes[step.key]
              const dateStr = at ? fmtDate(at) : '-'
              const timeStr = at ? fmtTime(at) : '-'
              const showCourierInline = step.key === 'In Transit' && reached && (shipping?.courier || shipping?.awb)

              return (
                <div key={step.key} className={`vt-row ${reached ? 'active' : 'inactive'}`}>
                  {/* Left rail */}
                  <div className="vt-rail">
                    <div className={`vt-node ${isCurrent ? 'current' : (reached ? 'done' : '')}`}>
                      {isCurrent ? <span className="vt-pulse" /> : null}
                      <div className="vt-icon">{step.icon}</div>
                    </div>
                    {idx < flow.length - 1 && (
                      <div className={`vt-line ${idx < currentIndex ? 'filled' : ''}`} />
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
          </section>

          {/* Items */}
          <section className="po-card">
            <h3 className="po-section-title">Items</h3>
            <div className="po-items">
              {(order.items || []).map((it, i) => (
                <div key={`${it.sku}-${i}`} className="po-item-row">
                  <div className="po-item-left">
                    <div className="po-thumb">
                      {it.image ? <img src={it.image} alt={it.name} /> : <div className="po-thumb-ph">IMG</div>}
                    </div>
                    <div className="po-item-info">
                      <div className="po-item-name" title={it.name}>{it.name}</div>
                      <div className="po-muted po-small mono">{it.sku}</div>
                    </div>
                  </div>
                  <div className="po-item-mid">
                    <div className="po-muted">Qty</div>
                    <div>{Number(it.qty)}</div>
                  </div>
                  <div className="po-item-mid">
                    <div className="po-muted">Price</div>
                    <div>{money(it.price)}</div>
                  </div>
                  <div className="po-item-right">
                    <div className="po-muted">Line total</div>
                    <div className="po-strong">{money(Number(it.price) * Number(it.qty))}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="po-totals">
              <div className="po-tr"><div>Subtotal</div><div className="right">{money(totals.subtotal)}</div></div>
              <div className="po-tr"><div>Shipping</div><div className="right">{money(totals.shipping)}</div></div>
              <div className="po-tr"><div>Discount</div><div className="right">-{money(totals.discount)}</div></div>
              <div className="po-tr grand"><div>Grand Total</div><div className="right">{money(totals.grandTotal)}</div></div>
            </div>
          </section>

          {/* Delivery */}
          <section className="po-card">
            <h3 className="po-section-title">Delivery</h3>
            <div className="po-grid2">
              <div className="po-shipbox">
                <div className="po-muted">Delivery Agency</div>
                <div className="po-strong">{shipping?.courier || '-'}</div>
                <div className="po-muted po-mt4">AWB / Reference</div>
                <div className="po-strong">{shipping?.awb || '-'}</div>
                {canTrack && (
                  <div className="po-mt8">
                    <a className="po-link" href={trackingUrl} target="_blank" rel="noopener noreferrer">Open Tracking Page →</a>
                  </div>
                )}
              </div>
              <div />
            </div>
          </section>
        </div>
      </main>

      <style>{`
        :root {
          --brand: ${BRAND_GREEN};
          --bg: #f8fafc;
          --card: #ffffff;
          --muted: #6b7280;
          --ink: #0f172a;
          --line: #e5e7eb;
          --pill-bg: #f1f5f9;
          --pill-ink: #475569;
        }
        .po-wrap { min-height: 100vh; background: var(--bg); color: var(--ink); }
        .po-container { width: min(1100px, 92vw); margin: 0 auto; }
        .po-stack16 { display: grid; gap: 16px; }

/* Header */

.po-header {
  background: var(--brand);
  color: #fff;
}

.po-headbar {
  display: grid;
  grid-template-columns: 120px 1fr auto;
  gap: 24px;
  align-items: center;
  padding: 22px 24px;
  background: var(--brand);              /* keep same background */
  border-radius: 20px;                   /* ⬅️ rounded edges */
  box-shadow: 0 6px 20px rgba(2,79,61,.15);
}


@media (max-width: 720px) {
  .po-headbar {
    grid-template-columns: 1fr;
    text-align: center;
    gap: 12px;
    padding: 16px;
  }
  .po-order-side { justify-self: center; width: 100%; }
}
.po-logo {
  width: 100%;
  max-width: 120px;
  height: auto;
  object-fit: contain;
  filter: brightness(1.03);
}
.po-brand-name { font-weight: 800; letter-spacing: .3px; font-size: 20px; }
.po-brand-sub { color: #e9f8f3; font-size: 13px; }
.po-site { color: #ffffff; text-decoration: none; text-underline-offset: 3px; }

/* Right-side round card */
.po-order-side { display: grid; justify-items: end; }
.po-order-card {
  display: grid;
  gap: 6px;
  background: rgba(255,255,255,.12); /* ✅ keep semi-transparent bg */
  border: 1px solid rgba(255,255,255,.25);
  border-radius: 14px;
  padding: 12px 14px;
  min-width: 280px;
  max-width: 360px;
}
@media (max-width: 720px) {
  .po-order-card {
    justify-self: center;
    min-width: 0;
    width: min(520px, 92vw);
  }
}

@media (max-width: 720px) {
  .po-headbar { grid-template-columns: 1fr; text-align: center; gap: 12px; padding: 16px 0; }
  .po-order-side { justify-self: center; width: 100%; justify-items: center; }
}

        .po-logo { width: 100%; max-width: 120px; height: auto; object-fit: contain; filter: brightness(1.03); }
        .po-brand-name { font-weight: 800; letter-spacing: .3px; font-size: 20px; }
        .po-brand-sub { color: #e9f8f3; font-size: 13px; }
        .po-site { color: #ffffff; text-decoration: none; text-underline-offset: 3px; }

        /* Right-side round card */
        .po-order-side { display: grid; justify-items: end; }
        .po-order-card {
          display: grid; gap: 6px;
          background: rgba(255,255,255,.12);
          border: 1px solid rgba(255,255,255,.25);
          border-radius: 14px;
          padding: 12px 14px;
          min-width: 280px;
          max-width: 360px;
        }
        @media (max-width: 720px) {
          .po-order-card { justify-self: center; min-width: 0; width: min(520px, 92vw); }
        }
        .po-order-card-row { display: grid; grid-template-columns: 80px 1fr; gap: 8px; align-items: center; }
        .po-order-label { color: #e7fff6; font-size: 12px; }
        .po-order-value { color: #fff; font-weight: 700; text-align: right; }

        .po-status-pill {
          justify-self: end;
          display: inline-block;
          padding: 4px 10px; border-radius: 999px;
          background: rgba(255,255,255,.14); color: #ffffff; border: 1px solid rgba(255,255,255,.28);
          font-weight: 600; font-size: 12px; text-align: center;
        }

        .po-main { padding: 16px 0 28px; }
        .po-card {
          background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 16px;
          box-shadow: 0 6px 20px rgba(2,79,61,.05);
        }
        .po-greet-card { background: #fff; } /* Keep white on mobile as requested */
        .po-section-title { margin: 0 0 6px; font-size: 18px; font-weight: 700; }
        .po-muted { color: var(--muted); }
        .po-strong { font-weight: 700; }
        .po-error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; padding: 10px 12px; border-radius: 10px; width: min(700px, 90vw); margin: 24px auto; }

        /* Tracking */
        .po-track { border: 1px solid rgba(2,79,61,.18); background: #f4fbf9; }
        .po-track-row { display: flex; align-items: center; gap: 12px; }
        .po-track-info { display: grid; gap: 4px; }
        .po-track-meta { color: var(--ink); font-size: 14px; }
        .po-btn-track {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 10px 14px; border-radius: 10px; font-weight: 700; text-decoration: none; white-space: nowrap;
          background: var(--brand); color: #fff; border: 1px solid var(--brand);
        }
        .po-btn-track:hover { filter: brightness(0.96); }
        .po-grow { flex: 1; }

        /* Progress */
        .po-progress-head {
          display: flex; align-items: center; gap: 10px; justify-content: space-between;
          border-bottom: 1px dashed var(--line); padding-bottom: 10px; margin-bottom: 10px;
        }
        .po-est { display: grid; justify-items: end; }

        .po-vt { display: grid; gap: 14px; }
        .po-vt-row { display: grid; grid-template-columns: 28px 1fr; gap: 12px; align-items: start; }
        .po-vt-rail { position: relative; display: grid; justify-items: center; }
        .po-vt-node {
          position: relative; width: 20px; height: 20px; border-radius: 50%;
          display: grid; place-items: center; border: 2px solid var(--brand); background: #fff;
        }
        .po-vt-node.current { box-shadow: 0 0 0 6px rgba(2,79,61,.12); }
        .po-vt-pulse {
          position: absolute; inset: 50% auto auto 50%;
          width: 30px; height: 30px; margin-left: -15px; margin-top: -15px;
          border-radius: 50%;
          background: rgba(2,79,61,.18); animation: po-pulse 1.6s infinite ease-in-out;
        }
        @keyframes po-pulse {
          0% { transform: scale(0.8); opacity: .7; }
          70% { transform: scale(1.2); opacity: 0; }
          100% { transform: scale(0.8); opacity: 0; }
        }
        .po-vt-icon { position: relative; z-index: 1; }
        .po-vt-line {
          position: absolute; top: 24px; left: 50%; transform: translateX(-50%);
          width: 2px; height: calc(100% - 24px);
          background: var(--line);
        }
        .po-vt-line.filled { background: rgba(2,79,61,.45); }
        .po-vt-content { min-width: 0; display: grid; gap: 6px; }
        .po-vt-head { display: grid; grid-template-columns: 1fr auto; align-items: baseline; gap: 10px; }
        @media (max-width: 560px) { .po-vt-head { grid-template-columns: 1fr; } }
        .po-vt-title { font-weight: 600; }
        .po-vt-when { display: grid; text-align: right; gap: 2px; color: var(--muted); font-weight: 400; }
        .po-vt-inline { display: flex; gap: 16px; flex-wrap: wrap; color: var(--ink); font-weight: 400; }
        .po-inline-track {
          color: var(--brand); text-decoration: none; border-bottom: 1px dashed rgba(2,79,61,.35); font-weight: 600;
        }
        .po-inline-track:hover { opacity: .9; }

        /* Items */
        .po-items { display: grid; gap: 10px; }
        .po-item-row {
          display: grid;
          grid-template-columns: 1fr auto auto auto;
          gap: 12px; align-items: center;
          border: 1px dashed var(--line); border-radius: 12px; padding: 10px 12px; background: #fff;
        }
        @media (max-width: 720px) {
          .po-item-row { grid-template-columns: 1fr 1fr; grid-auto-rows: auto; }
          .po-item-right { justify-self: end; }
        }
        .po-item-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .po-thumb { width: 56px; height: 56px; border-radius: 10px; overflow: hidden; border: 1px solid var(--line); background: #fafafa; display: grid; place-items: center; color: var(--muted); font-size: 12px; }
        .po-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .po-item-info { min-width: 0; }
        .po-item-name { font-weight: 600; white-space: nowrap; text-overflow: ellipsis; overflow: hidden; max-width: 60vw; }
        .po-small { font-size: 12px; }
        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace; font-size: 12px; }
        .right { text-align: right; }

        /* Totals */
        .po-totals { margin-top: 12px; display: grid; gap: 6px; }
        .po-tr { display: grid; grid-template-columns: 1fr auto; align-items: center; }
        .po-tr.grand { font-weight: 700; font-size: 16px; }

        /* Delivery */
        .po-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 720px) { .po-grid2 { grid-template-columns: 1fr; } }
        .po-shipbox { border: 1px dashed var(--line); border-radius: 12px; padding: 10px 12px; background: #fff; }
        .po-link { color: var(--brand); font-weight: 700; text-decoration: none; border-bottom: 1px dashed rgba(2,79,61,.35); }
        .po-link:hover { opacity: .9; }
        .po-mt4 { margin-top: 4px; }
        .po-mt8 { margin-top: 8px; }
      `}</style>
    </div>
  )
}