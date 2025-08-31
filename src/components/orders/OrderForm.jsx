// src/pages/Admin/OrderForm.jsx
import React, { useEffect, useMemo, useState, useId } from 'react'
import {
  listProducts,
  listCustomers,
  createCustomer,
  createOrder,
} from '../../firebase/firestore'
import Button from '../ui/Button'

function Chevron({ open }) {
  return (
    <svg
      className={`w-5 h-5 transition-transform ${open ? 'rotate-180' : ''}`}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M7.41 8.58 12 13.17l4.59-4.59L18 10l-6 6-6-6z" />
    </svg>
  )
}

function AccordionSection({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = useId()
  const headerId = useId()
  return (
    <section className="border rounded-2xl shadow-sm mb-3 overflow-hidden">
      <button
        type="button"
        className="w-full flex justify-between items-center px-4 py-3 bg-gray-50 hover:bg-gray-100"
        aria-expanded={open}
        aria-controls={panelId}
        id={headerId}
        onClick={() => setOpen(o => !o)}
      >
        <h4 className="font-medium text-gray-800">{title}</h4>
        <Chevron open={open} />
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        className={`transition-[max-height] duration-300 ease-in-out overflow-hidden ${open ? 'max-h-[1000px]' : 'max-h-0'}`}
      >
        <div className="p-4 bg-white">{children}</div>
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
  const [qty, setQty] = useState('1') // now string for text input
  const [items, setItems] = useState([])
  const [channel, setChannel] = useState('Manual')
  const [notes, setNotes] = useState('')
  const [shipAmount, setShipAmount] = useState('0')
  const [discAmount, setDiscAmount] = useState('0')
  const [discPct, setDiscPct] = useState('')
  const [payMode, setPayMode] = useState('COD')
  const [payStatus, setPayStatus] = useState('Pending')
  const [payTxn, setPayTxn] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    (async () => {
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
    return products.filter(p =>
      [p.sku, p.name, p.category].some(val => String(val || '').toLowerCase().includes(q))
    )
  }, [products, search])

  const addItem = () => {
    const p = filteredProducts.find(x => x.id === selectedProductId)
    if (!p) return
    const qn = Math.max(1, Number(qty || 1))
    setItems(prev => ([...prev, {
      sku: p.sku,
      name: p.name,
      price: Number(p.price || 0),
      qty: qn,
      _origPrice: Number(p.price || 0),
      editing: false,
      productId: p.id || null,
      image: p.image || '', // ✅ include product image
      key: `${p.id}-${Date.now()}`,
      collapsed: true,
    }]))
    setQty('1')
    setSelectedProductId('')
  }

  const removeItem = (key) => setItems(prev => prev.filter(x => x.key !== key))

  const toggleEditPrice = (key, on) => {
    setItems(prev => prev.map(it => it.key === key ? { ...it, editing: on } : it))
  }

  const changePrice = (key, value) => {
    setItems(prev => prev.map(it => it.key === key ? { ...it, price: value } : it))
  }

  const savePrice = (key) => {
    setItems(prev => prev.map(it => it.key === key ? { ...it, price: Number(it.price), editing: false } : it))
  }

  const cancelPrice = (key) => {
    setItems(prev => prev.map(it => it.key === key ? { ...it, price: it._origPrice, editing: false } : it))
  }

  const subtotal = items.reduce((s, it) => s + Number(it.price) * Number(it.qty), 0)
  const shippingNum = Number(shipAmount || 0)
  const discountNum = Number(discAmount || 0)
  const grandTotal = subtotal + shippingNum - discountNum

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
      const addressLine = (newCustomer.address || '').trim()
      if (!finalCustomerId && newCustomer.name.trim()) {
        const ref = await createCustomer({ ...newCustomer, address: addressLine })
        finalCustomerId = ref.id
        customerSnap = { ...newCustomer, address: addressLine }
      } else if (finalCustomerId) {
        const c = customers.find(c => c.id === finalCustomerId)
        if (c) customerSnap = { ...c }
      }

      const payloadItems = items.map(it => ({
        sku: it.sku,
        name: it.name,
        price: it.price,
        qty: it.qty,
        image: it.image || null, // ✅ save image in order items too
      }))

      const payload = {
        customerId: finalCustomerId,
        customer: customerSnap,
        items: payloadItems,
        totals: { subtotal, shipping: shippingNum, discount: discountNum, grandTotal },
        channel,
        notes,
        payment: { mode: payMode, status: payStatus, txnId: payTxn },
        shippingAddress: customerSnap?.address || addressLine,
      }

      const { id } = await createOrder(payload)
      onCreated?.({ id })
    } catch (e) {
      setError(e.message || 'Failed to create order')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold">Create Order</h3>
          <button className="text-gray-500 hover:text-gray-700" onClick={onClose}>×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && <div className="text-red-600 text-sm">{error}</div>}

          {/* Customer */}
          <AccordionSection title="Customer" defaultOpen>
            <select className="w-full border rounded-lg p-2 mb-2" value={customerId} onChange={e => setCustomerId(e.target.value)}>
              <option value="">Select existing</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
              ))}
            </select>
            <input className="w-full border rounded-lg p-2 mb-2" placeholder="Name" value={newCustomer.name} onChange={e => setNewCustomer(s => ({ ...s, name: e.target.value }))} />
            <input className="w-full border rounded-lg p-2 mb-2" placeholder="Email" value={newCustomer.email} onChange={e => setNewCustomer(s => ({ ...s, email: e.target.value }))} />
            <input className="w-full border rounded-lg p-2 mb-2" placeholder="Phone" value={newCustomer.phone} onChange={e => setNewCustomer(s => ({ ...s, phone: e.target.value }))} />
            <input className="w-full border rounded-lg p-2" placeholder="Address" value={newCustomer.address} onChange={e => setNewCustomer(s => ({ ...s, address: e.target.value }))} />
          </AccordionSection>

          {/* Items */}
          <AccordionSection title="Items" defaultOpen>
            <input className="w-full border rounded-lg p-2 mb-2" placeholder="Search product" value={search} onChange={e => setSearch(e.target.value)} />
            <div className="flex gap-2 mb-2">
              <select className="flex-1 border rounded-lg p-2" value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)}>
                <option value="">Select product</option>
                {filteredProducts.map(p => (
                  <option key={p.id} value={p.id}>{p.sku} — {p.name} (₹{p.price})</option>
                ))}
              </select>
              <input type="text" className="w-20 border rounded-lg p-2" value={qty} onChange={e => setQty(e.target.value)} />
              <Button onClick={addItem} disabled={!selectedProductId}>Add</Button>
            </div>
            {items.map(it => (
              <div key={it.key} className="border rounded-lg p-3 mb-2 flex items-center gap-3">
                {/* ✅ show image */}
                {it.image ? (
                  <img src={it.image} alt={it.name} className="w-12 h-12 rounded object-cover" />
                ) : (
                  <div className="w-12 h-12 bg-gray-200 flex items-center justify-center rounded text-gray-500">📦</div>
                )}
                <div className="flex-1">
                  <div className="font-medium">{it.name}</div>
                  <div className="text-sm text-gray-500">Qty: {it.qty} × ₹{it.price}</div>
                </div>
                <div className="flex gap-2 items-center">
                  {!it.editing ? (
                    <>
                      <div className="text-sm font-medium">₹{Number(it.price).toFixed(2)}</div>
                      <button className="text-blue-600 text-sm" onClick={() => toggleEditPrice(it.key, true)}>Edit</button>
                    </>
                  ) : (
                    <>
                      <input type="text" className="w-20 border rounded-lg p-1 text-sm" value={it.price} onChange={e => changePrice(it.key, e.target.value)} />
                      <button className="text-green-600 text-sm" onClick={() => savePrice(it.key)}>Save</button>
                      <button className="text-gray-500 text-sm" onClick={() => cancelPrice(it.key)}>Cancel</button>
                    </>
                  )}
                  <button className="text-red-600 text-sm" onClick={() => removeItem(it.key)}>Remove</button>
                </div>
              </div>
            ))}
          </AccordionSection>

          {/* Totals */}
          <AccordionSection title="Totals">
            <div className="grid grid-cols-2 gap-2">
              <input className="border rounded-lg p-2" placeholder="Shipping" type="text" value={shipAmount} onChange={e => setShipAmount(e.target.value)} />
              <input className="border rounded-lg p-2" placeholder="Discount" type="text" value={discAmount} onChange={e => setDiscAmount(e.target.value)} />
              <div className="font-medium col-span-2">Subtotal: ₹{subtotal.toFixed(2)}</div>
              <div className="font-semibold col-span-2">Grand Total: ₹{grandTotal.toFixed(2)}</div>
            </div>
          </AccordionSection>

          {/* Payment */}
          <AccordionSection title="Payment">
            <select className="border rounded-lg p-2 mb-2 w-full" value={payMode} onChange={e => setPayMode(e.target.value)}>
              <option>COD</option><option>UPI</option><option>Card</option>
            </select>
            <select className="border rounded-lg p-2 mb-2 w-full" value={payStatus} onChange={e => setPayStatus(e.target.value)}>
              <option>Pending</option><option>Paid</option><option>Failed</option>
            </select>
            <input className="border rounded-lg p-2 w-full" placeholder="TXN ID" value={payTxn} onChange={e => setPayTxn(e.target.value)} />
          </AccordionSection>

          {/* Order Channel */}
          <AccordionSection title="Order Channel">
            <select className="border rounded-lg p-2 mb-2 w-full" value={channel} onChange={e => setChannel(e.target.value)}>
              <option>Manual</option>
              <option>WhatsApp</option>
              <option>Instagram</option>
              <option>Website</option>
              <option>Collab/Promotion</option>
            </select>
            <input className="border rounded-lg p-2 w-full" placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} />
          </AccordionSection>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-between items-center">
          <div className="font-semibold">Total: ₹{grandTotal.toFixed(2)}</div>
          <Button onClick={save} disabled={saving || !items.length}>Create Order</Button>
        </div>
      </div>
    </div>
  )
}
