import React from 'react'
import Button from '../ui/Button'

export default function OrderItemsEditor({ products, items, onChange, channel, onChannelChange }) {
  const add = () => onChange([...items, { productId: '', qty: 1, price: 0 }])
  const update = (idx, patch) =>
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  const remove = (idx) => onChange(items.filter((_, i) => i !== idx))

  return (
    <div className="space-y-4">
      {/* Order Channel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h4 className="font-semibold text-gray-800">Order Channel</h4>
        <select
          value={channel}
          onChange={(e) => onChannelChange(e.target.value)}
          className="mt-2 sm:mt-0 border rounded-lg px-3 py-2 text-sm w-full sm:w-52"
        >
          <option value="">Select channel</option>
          <option value="Website">Website</option>
          <option value="Mobile App">Mobile App</option>
          <option value="Walk-in">Walk-in</option>
          <option value="Phone">Phone</option>
        </select>
      </div>

      {/* Items Section */}
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-800">Items</h4>
        <Button size="sm" onClick={add}>+ Add</Button>
      </div>

      {items.map((it, i) => {
        const p = products.find((x) => x.id === it.productId)
        return (
          <div
            key={i}
            className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-center bg-white border rounded-lg p-3 shadow-sm"
          >
            {/* Product */}
            <select
              value={it.productId}
              onChange={(e) =>
                update(i, {
                  productId: e.target.value,
                  price: products.find((x) => x.id === e.target.value)?.price || 0,
                })
              }
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.stock})
                </option>
              ))}
            </select>

            {/* Quantity */}
            <input
              type="number"
              min="1"
              value={it.qty}
              onChange={(e) => update(i, { qty: Number(e.target.value) })}
              className="border rounded-lg px-3 py-2 text-sm w-full"
            />

            {/* Editable Price */}
            <input
              type="number"
              min="0"
              value={it.price ?? p?.price ?? 0}
              onChange={(e) => update(i, { price: Number(e.target.value) })}
              className="border rounded-lg px-3 py-2 text-sm w-full"
            />

            {/* Total */}
            <div className="text-gray-600 text-sm font-medium">
              ₹{(it.qty * (it.price ?? 0)).toFixed(2)}
            </div>

            {/* Remove */}
            <Button size="sm" variant="ghost" onClick={() => remove(i)}>
              Remove
            </Button>
          </div>
        )
      })}
    </div>
  )
}
