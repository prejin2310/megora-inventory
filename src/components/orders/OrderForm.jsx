import React, { useEffect, useMemo, useState } from 'react'
import {
  listProducts,
  listCustomers,
  createCustomer,
  createOrder,
} from '../../firebase/firestore'
import Button from '../ui/Button'

export default function OrderForm({ onClose, onCreated }) {
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [customerId, setCustomerId] = useState('')
  const [newCustomer, setNewCustomer] = useState({ name: '', email: '', phone: '', address: '' })

  const [search, setSearch] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [qty, setQty] = useState(1)

  // cart: [{ sku, name, price, qty, editing?: boolean, _origPrice?: number }]
  const [items, setItems] = useState([])

  const [channel, setChannel] = useState('Manual')
  const [notes, setNotes] = useState('')

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

  const addItem = () => {
    const p = filteredProducts.find(x => x.id === selectedProductId)
    if (!p) return
    const qn = Math.max(1, Number(qty || 1))
    setItems(prev => {
      // merge by SKU
      const idx = prev.findIndex(x => x.sku === p.sku)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + qn }
        return copy
      }
      return [
        ...prev,
        {
          sku: p.sku,
          name: p.name,
          price: Number(p.price || 0),
          qty: qn,
          _origPrice: Number(p.price || 0),
          editing: false,
        },
      ]
    })
    setQty(1)
    setSelectedProductId('')
  }

  const removeItem = (sku) => setItems(prev => prev.filter(x => x.sku !== sku))

  const toggleEditPrice = (sku, on) => {
    setItems(prev =>
      prev.map(it =>
        it.sku === sku ? { ...it, editing: on, price: Number(it.price) } : it
      )
    )
  }

  const changePrice = (sku, value) => {
    setItems(prev =>
      prev.map(it =>
        it.sku === sku ? { ...it, price: value } : it
      )
    )
  }

  const savePrice = (sku) => {
    setItems(prev =>
      prev.map(it =>
        it.sku === sku
          ? { ...it, price: Number(it.price || 0), editing: false }
          : it
      )
    )
  }

  const cancelPrice = (sku) => {
    setItems(prev =>
      prev.map(it =>
        it.sku === sku ? { ...it, price: Number(it._origPrice || it.price || 0), editing: false } : it
      )
    )
  }

  const changeQty = (sku, value) => {
    const qn = Math.max(1, Number(value || 1))
    setItems(prev =>
      prev.map(it => (it.sku === sku ? { ...it, qty: qn } : it))
    )
  }

  const subtotal = items.reduce((s, it) => s + Number(it.price) * Number(it.qty), 0)
  // No tax at creation; can be added later. Shipping/discount default 0.
  const totals = { subtotal, shipping: 0, discount: 0, grandTotal: subtotal }

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
      }))

      const payload = {
        customerId: finalCustomerId || null,
        customer: customerSnap || null,
        items: payloadItems,
        totals,
        channel,
        notes,
        // shipping intentionally omitted at creation
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
      <div className="modal">
        <div className="modal-header">
          <h3>Create Order</h3>
          <button className="btn btn-ghost" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {error && <div className="error" style={{ marginBottom: 8 }}>{error}</div>}

          <div className="grid two">
            {/* Customer */}
            <div className="card vstack gap">
              <h4>Customer</h4>
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

            {/* Items */}
            <div className="card vstack gap">
              <h4>Items</h4>

              <input
                placeholder="Search product (name, SKU, category)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <div className="grid two">
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  disabled={!filteredProducts.length}
                >
                  <option value="">{filteredProducts.length ? 'Select product' : 'No products available'}</option>
                  {filteredProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} — {p.name} (₹{Number(p.price || 0).toFixed(2)})
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder="Qty"
                  disabled={!filteredProducts.length}
                />
              </div>

              <div className="hstack" style={{ justifyContent: 'flex-end' }}>
                <Button type="button" onClick={addItem} disabled={!selectedProductId}>Add Item</Button>
              </div>

              {items.length > 0 && (
                <div className="vstack gap">
                  {items.map(it => (
                    <div key={it.sku} className="card">
                      <div className="hstack">
                        <div style={{ minWidth: 180 }}>{it.name}</div>
                        <div className="grow" />
                        {/* Inline qty edit */}
                        <div className="hstack" style={{ gap: 6 }}>
                          <span className="muted">Qty</span>
                          <input
                            type="number"
                            min="1"
                            value={it.qty}
                            onChange={(e) => changeQty(it.sku, e.target.value)}
                            style={{ width: 70 }}
                          />
                        </div>
                        {/* Inline price edit */}
                        {!it.editing ? (
                          <div className="hstack" style={{ gap: 8 }}>
                            <div>₹{Number(it.price).toFixed(2)}</div>
                            <button className="btn btn-sm btn-ghost" type="button" onClick={() => toggleEditPrice(it.sku, true)}>
                              Edit price
                            </button>
                          </div>
                        ) : (
                          <div className="hstack" style={{ gap: 6 }}>
                            <input
                              type="number"
                              step="0.01"
                              value={it.price}
                              onChange={(e) => changePrice(it.sku, e.target.value)}
                              style={{ width: 100 }}
                            />
                            <button className="btn btn-sm" type="button" onClick={() => savePrice(it.sku)}>Save</button>
                            <button className="btn btn-sm btn-ghost" type="button" onClick={() => cancelPrice(it.sku)}>Cancel</button>
                          </div>
                        )}
                        {/* Line total */}
                        <div style={{ width: 110, textAlign: 'right', fontWeight: 600 }}>
                          ₹{(Number(it.price) * Number(it.qty)).toFixed(2)}
                        </div>
                        <button className="btn btn-sm btn-ghost" type="button" onClick={() => removeItem(it.sku)}>Remove</button>
                      </div>
                    </div>
                  ))}
                  <div className="hstack" style={{ fontWeight: 600 }}>
                    <div>Total</div>
                    <div className="grow" />
                    <div>₹{Number(totals.grandTotal).toFixed(2)}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card vstack gap">
            <h4>Meta</h4>
            <div className="grid two">
              <select value={channel} onChange={e => setChannel(e.target.value)}>
                <option>Manual</option>
                <option>WhatsApp</option>
                <option>Instagram</option>
              </select>
              <input placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>

          <div className="muted">
            Note: Shipping details are added later when the courier picks up the order.
          </div>
        </div>

        <div className="modal-footer">
          <Button onClick={save} disabled={saving || !items.length}>Create Order</Button>
        </div>
      </div>
    </div>
  )
}
