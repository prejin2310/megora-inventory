import React, { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Button from '../ui/Button'
import { listCustomers, listProducts, createCustomer, createOrder } from '../../firebase/firestore'
import OrderItemsEditor from './OrderItemsEditor'
import { useAuth } from '../../auth/AuthContext'

export default function OrderForm({ onClose, onCreated }) {
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [useExistingCustomer, setUseExistingCustomer] = useState(true)
  const [customerId, setCustomerId] = useState('')
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '', address: '' })
  const [channel, setChannel] = useState('WhatsApp')
  const [items, setItems] = useState([])
  const [extras, setExtras] = useState({ shipping: 0, tax: 0, discount: 0 })
  const [courier, setCourier] = useState({ name: '', trackingNumber: '', trackingUrl: '' })
  const [saving, setSaving] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    Promise.all([listCustomers(), listProducts()]).then(([c, p]) => {
      setCustomers(c)
      setProducts(p)
    })
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (items.length === 0) return alert('Add at least one item')
    setSaving(true)
    try {
      let cid = customerId
      if (!useExistingCustomer) {
        cid = await createCustomer(customer)
      }
      const orderItems = items.map(it => {
        const p = products.find(x => x.id === it.productId)
        if (!p) throw new Error('Product missing')
        if (Number(it.qty) > Number(p.stock)) throw new Error(`Insufficient stock for ${p.name}`)
        return {
          productId: p.id,
          name: p.name,
          sku: p.sku,
          price: Number(p.price),
          qty: Number(it.qty),
          lineTotal: Number(p.price) * Number(it.qty),
        }
      })
      const res = await createOrder({
        customer: useExistingCustomer ? null : customer,
        customerId: useExistingCustomer ? cid : null,
        items: orderItems,
        extras,
        channel,
        courier,
        userId: user?.uid,
      })
      onCreated({ id: res.id })
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Create Order" onClose={onClose}>
      <form onSubmit={submit} className="vstack gap">
        <div className="hstack">
          <label><input type="radio" checked={useExistingCustomer} onChange={() => setUseExistingCustomer(true)} /> Existing</label>
          <label><input type="radio" checked={!useExistingCustomer} onChange={() => setUseExistingCustomer(false)} /> New</label>
        </div>

        {useExistingCustomer ? (
          <select value={customerId} onChange={e => setCustomerId(e.target.value)}>
            <option value="">Select customer</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name} • {c.phone}</option>)}
          </select>
        ) : (
          <>
            <Input label="Name" value={customer.name} onChange={e => setCustomer(s => ({ ...s, name: e.target.value }))} required />
            <Input label="Email" value={customer.email} onChange={e => setCustomer(s => ({ ...s, email: e.target.value }))} />
            <Input label="Phone" value={customer.phone} onChange={e => setCustomer(s => ({ ...s, phone: e.target.value }))} />
            <Input label="Address" value={customer.address} onChange={e => setCustomer(s => ({ ...s, address: e.target.value }))} />
          </>
        )}

        <div>
          <label>Channel</label>
          <select value={channel} onChange={e => setChannel(e.target.value)}>
            <option>WhatsApp</option>
            <option>Instagram</option>
            <option>Manual</option>
          </select>
        </div>

        <OrderItemsEditor products={products} items={items} onChange={setItems} />

        <div className="grid three">
          <Input label="Shipping" type="number" value={extras.shipping} onChange={e => setExtras(s => ({ ...s, shipping: Number(e.target.value) }))} />
          <Input label="Tax" type="number" value={extras.tax} onChange={e => setExtras(s => ({ ...s, tax: Number(e.target.value) }))} />
          <Input label="Discount" type="number" value={extras.discount} onChange={e => setExtras(s => ({ ...s, discount: Number(e.target.value) }))} />
        </div>

        <div className="grid three">
          <Input label="Courier" value={courier.name} onChange={e => setCourier(s => ({ ...s, name: e.target.value }))} />
          <Input label="Tracking Number" value={courier.trackingNumber} onChange={e => setCourier(s => ({ ...s, trackingNumber: e.target.value }))} />
          <Input label="Tracking URL" value={courier.trackingUrl} onChange={e => setCourier(s => ({ ...s, trackingUrl: e.target.value }))} />
        </div>

        <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Create Order'}</Button>
      </form>
    </Modal>
  )
}
