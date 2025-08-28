import React, { useEffect, useMemo, useState, useId } from 'react'
import {
  listProducts,
  listCustomers,
  createCustomer,
  createOrder,
} from '../../firebase/firestore'
import Button from '../ui/Button'
import './OrderForm.css'

/* Premium chevron icon that rotates */
function Chevron({ open }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{
        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 200ms ease',
        color: 'currentColor',
        opacity: 0.7,
      }}
    >
      <path fill="currentColor" d="M7.41 8.58 12 13.17l4.59-4.59L18 10l-6 6-6-6z" />
    </svg>
  )
}

/* Accessible accordion with ARIA wiring and max-height animation */
function AccordionSection({ title, children, defaultOpen = false, className = '' }) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = useId()
  const headerId = useId()
  return (
    <section className={`accordion-section ${className}`}>
      <button
        type="button"
        className={`accordion-header ${open ? 'is-open' : ''}`}
        aria-expanded={open}
        aria-controls={panelId}
        id={headerId}
        onClick={() => setOpen(o => !o)}
      >
        <h4 className="accordion-title">{title}</h4>
        <Chevron open={open} />
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        className="accordion-panel"
        style={{
          maxHeight: open ? '1000px' : '0px',
          overflow: 'hidden',
          transition: 'max-height 250ms ease',
        }}
      >
        <div className="accordion-body">{children}</div>
      </div>
    </section>
  )
}

export default function OrderForm({ onClose, onCreated }) {
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [customerId, setCustomerId] = useState('')
  const [newCustomer, setNewCustomer] = useState({ name: '', email: '', phone: '', address: '' })

  const [search, setSearch] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [qty, setQty] = useState(1)

  // cart: [{ sku, name, price, qty, editing?: boolean, _origPrice?: number, image?: string, productId?: string, key?: string, collapsed?: boolean }]
  const [items, setItems] = useState([])

  const [channel, setChannel] = useState('Manual')
  const [notes, setNotes] = useState('')

  // totals inputs
  const [shipAmount, setShipAmount] = useState('0')
  const [discAmount, setDiscAmount] = useState('0')
  const [discPct, setDiscPct] = useState('')

  // payment inputs
  const [payMode, setPayMode] = useState('COD')
  const [payStatus, setPayStatus] = useState('Pending')
  const [payTxn, setPayTxn] = useState('')

  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const [p, c] = await Promise.all([listProducts(), listCustomers()])
        setProducts(p)
        setCustomers(c)
      } catch (e) {
        console.error('OrderForm load error:', e)
        setError(e.message || 'Failed to load data')
      }
    })()
  }, [])

  const filteredProducts = useMemo(() => {
    const q = (search || '').trim().toLowerCase()
    if (!q) return products
    return products.filter((p) => {
      const sku = String(p.sku || '').toLowerCase()
      const name = String(p.name || '').toLowerCase()
      const category = String(p.category || '').toLowerCase()
      return sku.includes(q) || name.includes(q) || category.includes(q)
    })
  }, [products, search])

  // Reset selection when search changes
  useEffect(() => {
    setSelectedProductId('')
  }, [search])

  // Auto-select first filtered product when none selected
  useEffect(() => {
    if (!selectedProductId && filteredProducts.length) {
      setSelectedProductId(filteredProducts[0].id)
    }
  }, [filteredProducts, selectedProductId])

  // Add item as separate line (unique key; keep all existing logic)
  const addItem = () => {
    const p = filteredProducts.find(x => x.id === selectedProductId)
    if (!p) return
    const qn = Math.max(1, Number(qty || 1))
    setItems(prev => ([
      ...prev,
      {
        sku: p.sku,
        name: p.name,
        price: Number(p.price || 0),
        qty: qn,
        _origPrice: Number(p.price || 0),
        editing: false,
        image: p.image || '',
        productId: p.id || null,
        key: `${p.id}-${Date.now()}`,
        collapsed: true,
      }
    ]))
    setQty(1)
    setSelectedProductId('')
  }

  const removeItem = (key) => setItems(prev => prev.filter(x => x.key !== key))

  const toggleEditPrice = (key, on) => {
    setItems(prev =>
      prev.map(it =>
        it.key === key ? { ...it, editing: on, price: Number(it.price) } : it
      )
    )
  }

  const changePrice = (key, value) => {
    setItems(prev =>
      prev.map(it =>
        it.key === key ? { ...it, price: value } : it
      )
    )
  }

  const savePrice = (key) => {
    setItems(prev =>
      prev.map(it =>
        it.key === key
          ? { ...it, price: Number(it.price || 0), editing: false }
          : it
      )
    )
  }

  const cancelPrice = (key) => {
    setItems(prev =>
      prev.map(it =>
        it.key === key ? { ...it, price: Number(it._origPrice || it.price || 0), editing: false } : it
      )
    )
  }

  const changeQty = (key, value) => {
    const qn = Math.max(1, Number(value || 1))
    setItems(prev =>
      prev.map(it => (it.key === key ? { ...it, qty: qn } : it))
    )
  }

  const toggleItemCollapsed = (key) => {
    setItems(prev =>
      prev.map(it => (it.key === key ? { ...it, collapsed: !it.collapsed } : it))
    )
  }

  // Totals math
  const subtotal = items.reduce((s, it) => s + Number(it.price) * Number(it.qty), 0)

  const discAmtNum = useMemo(() => {
    const byAmount = Number(discAmountSafe(discAmount))
    if (byAmount > 0) return byAmount
    const pct = Number(discPctSafe(discPct))
    if (pct > 0) return round2((subtotal * pct) / 100)
    return 0
  }, [discAmount, discPct, subtotal])

  const shippingNum = Number(numSafe(shipAmount))
  const grandTotal = round2(subtotal + shippingNum - discAmtNum)

  const totals = {
    subtotal: round2(subtotal),
    shipping: round2(shippingNum),
    discount: round2(discAmtNum),
    discountPct: Number(discPctSafe(discPct)) || 0,
    grandTotal,
  }

  function numSafe(v) {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  function discAmountSafe(v) {
    const n = Number(v)
    return Number.isFinite(n) && n >= 0 ? n : 0
  }
  function discPctSafe(v) {
    const n = Number(v)
    return Number.isFinite(n) && n >= 0 ? n : 0
  }
  function round2(v) {
    return Math.round((Number(v) || 0) * 100) / 100
  }

  const save = async () => {
    setError('')
    if (!items.length) {
      setError('Add at least one item')
      return
    }
    setSaving(true)
    try {
      let finalCustomerId = customerId
      let customerSnap = null

      // Create a new customer only if not selecting existing and name is provided
      if (!finalCustomerId && newCustomer.name.trim()) {
        const ref = await createCustomer({
          name: newCustomer.name.trim(),
          email: newCustomer.email.trim(),
          phone: newCustomer.phone.trim(),
          address: newCustomer.address.trim(),
        })
        finalCustomerId = ref.id
        customerSnap = {
          name: newCustomer.name.trim(),
          email: newCustomer.email.trim(),
          phone: newCustomer.phone.trim(),
        }
      } else if (finalCustomerId) {
        const c = customers.find(c => c.id === finalCustomerId)
        if (c) customerSnap = { name: c.name, email: c.email, phone: c.phone }
      }

      // prepare clean items payload for Firestore
      const payloadItems = items.map(it => ({
        sku: it.sku,
        name: it.name,
        price: Number(it.price),
        qty: Number(it.qty),
        ...(it.productId ? { productId: it.productId } : {}),
        ...(it.image !== undefined ? { image: String(it.image || '').trim() } : {}),
      }))

      // payment object
      const payment = {
        mode: payMode,
        status: payStatus,
        txnId: (payStatus === 'Paid' || payStatus === 'Refunded') ? (payTxn || '').trim() : '',
      }

      const payload = {
        customerId: finalCustomerId || null,
        customer: customerSnap || null,
        items: payloadItems,
        totals,
        channel,
        notes,
        payment,
      }

      const { id } = await createOrder(payload)
      onCreated?.({ id })
    } catch (e) {
      console.error('Create order error:', e)
      setError(e.message || 'Failed to create order')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal order-form">
        <div className="modal-header">
          <h3>Create Order</h3>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="modal-body">
          {error && <div className="error" style={{ marginBottom: 8 }}>{error}</div>}

          {/* Customer */}
          <AccordionSection title="Customer" defaultOpen className="flat">
            <div className="vstack">
              <select value={customerId} onChange={e => setCustomerId(e.target.value)}>
                <option value="">Select existing</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
                ))}
              </select>
              <div className="muted">Or add new customer</div>
              <input placeholder="Name" value={newCustomer.name} onChange={e => setNewCustomer(s => ({ ...s, name: e.target.value }))} />
              <input placeholder="Email" value={newCustomer.email} onChange={e => setNewCustomer(s => ({ ...s, email: e.target.value }))} />
              <input placeholder="Phone" value={newCustomer.phone} onChange={e => setNewCustomer(s => ({ ...s, phone: e.target.value }))} />
              <textarea placeholder="Address" value={newCustomer.address} onChange={e => setNewCustomer(s => ({ ...s, address: e.target.value }))} />
            </div>
          </AccordionSection>

          {/* Items */}
          <AccordionSection title="Items" defaultOpen className="flat">
  <div className="vstack items-section">
    {/* Search */}
    <input
      className="fld"
      placeholder="Search product (name, SKU, category)"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />

    {/* Quick Add Row (mobile-first stacked) */}
    <div className="quick-add">
      <select
        className="fld product-select"
        value={selectedProductId}
        onChange={(e) => setSelectedProductId(e.target.value)}
        disabled={!filteredProducts.length}
      >
        <option value="">
          {filteredProducts.length ? 'Select product' : 'No products available'}
        </option>
        {filteredProducts.map((p) => (
          <option key={p.id} value={p.id}>
            {p.sku} — {p.name} (₹{Number(p.price || 0).toFixed(2)})
          </option>
        ))}
      </select>

      <input
        className="fld qty-input"
        type="number"
        min="1"
        inputMode="numeric"
        pattern="[0-9]*"
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        placeholder="Qty"
        disabled={!filteredProducts.length}
      />

      <Button
        
        type="button"
        onClick={addItem}
        disabled={!selectedProductId}
      >
        Add
      </Button>
    </div>

    {/* Cart items */}
    {items.length > 0 && (
      <div className="vstack gap item-list">
        {items.map(it => (
          <div key={it.key} className="card item-card">
            {/* Header: name + total + chevron */}
            <button
              type="button"
              className={`item-head ${!it.collapsed ? 'open' : ''}`}
              onClick={() => toggleItemCollapsed(it.key)}
              aria-expanded={!it.collapsed}
              aria-controls={`item-panel-${it.key}`}
            >
              <div className="item-head__name" title={it.name}>{it.name}</div>
              <div className="item-head__total">₹{(Number(it.price) * Number(it.qty)).toFixed(2)}</div>
              <Chevron open={!it.collapsed} />
            </button>

            {/* Details: collapsible on mobile, inline grid on larger */}
            <div
              id={`item-panel-${it.key}`}
              className="item-body"
              style={{
                maxHeight: it.collapsed ? '0px' : '500px',
                overflow: 'hidden',
                transition: 'max-height 220ms ease',
              }}
            >
              <div className="item-body__grid">
                <div className="field">
                  <label className="lbl">Qty</label>
                  <input
                    className="fld"
                    type="number"
                    min="1"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={it.qty}
                    onChange={(e) => changeQty(it.key, e.target.value)}
                  />
                </div>

                {!it.editing ? (
                  <div className="field">
                    <label className="lbl">Price</label>
                    <div className="hstack gap">
                      <div className="mono">₹{Number(it.price).toFixed(2)}</div>
                      <button className="btn btn-sm btn-ghost" type="button" onClick={() => toggleEditPrice(it.key, true)}>
                        Edit
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="field">
                    <label className="lbl">Edit price</label>
                    <div className="hstack gap">
                      <input
                        className="fld"
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        value={it.price}
                        onChange={(e) => changePrice(it.key, e.target.value)}
                      />
                      <button className="btn btn-sm" type="button" onClick={() => savePrice(it.key)}>Save</button>
                      <button className="btn btn-sm btn-ghost" type="button" onClick={() => cancelPrice(it.key)}>Cancel</button>
                    </div>
                  </div>
                )}

                <div className="field actions">
                  <button className="btn btn-sm btn-ghost danger" type="button" onClick={() => removeItem(it.key)}>Remove</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
</AccordionSection>


          {/* Totals */}
          <AccordionSection title="Totals" className="flat">
            <div className="grid two">
              <div className="vstack">
                <label className="muted">Shipping charge</label>
                <input
                  type="number"
                  step="0.01"
                  value={shipAmount}
                  onChange={e => setShipAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="vstack">
                <label className="muted">Discount amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={discAmount}
                  onChange={e => setDiscAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="vstack">
                <label className="muted">Discount % (optional)</label>
                <input
                  type="number"
                  step="0.01"
                  value={discPct}
                  onChange={e => setDiscPct(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="vstack">
                <label className="muted">Subtotal</label>
                <div style={{ fontWeight: 700 }}>₹{subtotal.toFixed(2)}</div>
              </div>
              <div className="vstack">
                <label className="muted">Grand Total</label>
                <div style={{ fontWeight: 800, fontSize: 16 }}>₹{grandTotal.toFixed(2)}</div>
              </div>
            </div>
            <div className="muted small">
              If both discount amount and % are provided, amount is used and % is ignored.
            </div>
          </AccordionSection>

          {/* Payment */}
          <AccordionSection title="Payment" className="flat">
            <div className="grid two">
              <select value={payMode} onChange={e => setPayMode(e.target.value)}>
                <option>COD</option>
                <option>UPI</option>
                <option>Card</option>
                <option>NetBanking</option>
                <option>Wallet</option>
                <option>Other</option>
              </select>

              <select value={payStatus} onChange={e => setPayStatus(e.target.value)}>
                <option>Pending</option>
                <option>Paid</option>
                <option>Failed</option>
                <option>Refunded</option>
              </select>

              <input
                placeholder="TXN ID (if paid/refunded)"
                value={payTxn}
                onChange={e => setPayTxn(e.target.value)}
                disabled={!(payStatus === 'Paid' || payStatus === 'Refunded')}
              />
            </div>
            <div className="muted small">
              TXN ID is enabled only for Paid/Refunded. For COD, leave status Pending until collected.
            </div>
          </AccordionSection>

          {/* Order Channel */}
          <AccordionSection title="Order Channel" className="flat">
            <div className="grid two">
              <select value={channel} onChange={e => setChannel(e.target.value)}>
                <option>Collab/promotion</option>
                <option>WhatsApp</option>
                <option>Instagram</option>
                <option>Website</option>
              </select>
              <input placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </AccordionSection>

          <div className="muted">
            Note: Shipping details (courier, AWB) are added later when dispatching.
          </div>
        </div>

        <div className="modal-footer">
          <div className="hstack" style={{ fontWeight: 600, width: '100%', padding: '8px 0' }}>
            <div>Total</div>
            <div className="grow" />
            <div>₹{Number(grandTotal).toFixed(2)}</div>
          </div>
          <Button onClick={save} disabled={saving || !items.length}>Create Order</Button>
        </div>
      </div>
    </div>
  )
}
