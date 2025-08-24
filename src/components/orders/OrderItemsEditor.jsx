import React from 'react'
import Button from '../ui/Button'

export default function OrderItemsEditor({ products, items, onChange }) {
  const add = () => onChange([...items, { productId: '', qty: 1 }])
  const update = (idx, patch) => onChange(items.map((it, i) => i === idx ? { ...it, ...patch } : it))
  const remove = (idx) => onChange(items.filter((_, i) => i !== idx))

  return (
    <div className="vstack gap">
      <div className="hstack">
        <h4>Items</h4>
        <Button size="sm" onClick={add}>Add</Button>
      </div>
      {items.map((it, i) => {
        const p = products.find(x => x.id === it.productId)
        return (
          <div key={i} className="grid four middle">
            <select value={it.productId} onChange={e => update(i, { productId: e.target.value })}>
              <option value="">Select product</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.stock})</option>)}
            </select>
            <input type="number" min="1" value={it.qty} onChange={e => update(i, { qty: Number(e.target.value) })} />
            <div className="muted">{p ? `₹${p.price}` : '-'}</div>
            <Button size="sm" variant="ghost" onClick={() => remove(i)}>Remove</Button>
          </div>
        )
      })}
    </div>
  )
}
