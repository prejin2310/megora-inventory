import React, { useEffect, useState } from 'react'
import Input from '../ui/Input'
import Button from '../ui/Button'

export default function ProductForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: '', sku: '', price: 0, stock: 0,
    imageUrl: '', description: '', lowStockThreshold: 5
  })

  useEffect(() => {
    if (initial) setForm({
      name: initial.name || '', sku: initial.sku || '', price: initial.price || 0,
      stock: initial.stock || 0, imageUrl: initial.imageUrl || '', description: initial.description || '',
      lowStockThreshold: initial.lowStockThreshold ?? 5
    })
  }, [initial])

  const change = (k) => (e) => setForm(s => ({ ...s, [k]: e.target.value }))
  const submit = (e) => {
    e.preventDefault()
    onSubmit({
      ...form,
      price: Number(form.price),
      stock: Number(form.stock),
      lowStockThreshold: Number(form.lowStockThreshold)
    })
  }

  return (
    <form onSubmit={submit} className="vstack gap">
      <h3>{initial ? 'Edit Product' : 'Add Product'}</h3>
      <Input label="Name" value={form.name} onChange={change('name')} required />
      <Input label="SKU" value={form.sku} onChange={change('sku')} required />
      <Input label="Price" type="number" value={form.price} onChange={change('price')} required />
      <Input label="Initial Stock" type="number" value={form.stock} onChange={change('stock')} required />
      <Input label="Low Stock Threshold" type="number" value={form.lowStockThreshold} onChange={change('lowStockThreshold')} />
      <Input label="Image URL" value={form.imageUrl} onChange={change('imageUrl')} />
      <Input label="Description" value={form.description} onChange={change('description')} />
      <div className="hstack">
        <Button type="submit">{initial ? 'Update' : 'Create'}</Button>
        {initial && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  )
}
