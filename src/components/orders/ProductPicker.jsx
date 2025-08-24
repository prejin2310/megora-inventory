import React, { useEffect, useMemo, useState } from 'react'
import { listProducts } from '../../firebase/firestore'
import Button from '../ui/Button'

export default function ProductPicker({ onAdd }) {
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [qty, setQty] = useState(1)
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      setError('')
      try {
        const list = await listProducts()
        setProducts(list)
      } catch (e) {
        console.error('ProductPicker load error:', e)
        setError(e.message || 'Failed to load products')
      }
    })()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products
    return products.filter(p =>
      [p.name, p.sku, p.category].some(v => String(v || '').toLowerCase().includes(q))
    )
  }, [products, search])

  const add = () => {
    const p = filtered.find(x => x.id === selectedId)
    if (!p) return
    onAdd({
      sku: p.sku,
      name: p.name,
      price: Number(p.price || 0),
      qty: Math.max(1, Number(qty || 1)),
    })
    setQty(1)
  }

  return (
    <div className="card vstack gap">
      <h3>Add item</h3>
      {error && <div className="error">{error}</div>}
      <input placeholder="Search (name, SKU, category)" value={search} onChange={e => setSearch(e.target.value)} />
      <div className="grid two">
        <select value={selectedId} onChange={e => setSelectedId(e.target.value)}>
          <option value="">Select product</option>
          {filtered.map(p => (
            <option key={p.id} value={p.id}>{p.sku} — {p.name} (₹{Number(p.price || 0).toFixed(2)})</option>
          ))}
        </select>
        <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} placeholder="Qty" />
      </div>
      <div className="hstack" style={{ justifyContent: 'flex-end' }}>
        <Button type="button" onClick={add} disabled={!selectedId}>Add Item</Button>
      </div>
    </div>
  )
}
