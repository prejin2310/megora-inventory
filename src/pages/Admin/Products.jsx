import React, { useEffect, useState } from 'react'
import { listProducts, createProduct, updateProduct, deleteProduct } from '../../firebase/firestore'
import ProductForm from '../../components/products/ProductForm'
import Table from '../../components/ui/Table'
import Button from '../../components/ui/Button'

export default function Products() {
  const [items, setItems] = useState([])
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')

  const refresh = async () => {
    setError('')
    try {
      const list = await listProducts()
      setItems(list)
    } catch (e) {
      console.error('Products load error:', e)
      setError(e.message || 'Failed to load products')
    }
  }
  useEffect(() => { refresh() }, [])

  const onSave = async (data) => {
    setError('')
    try {
      if (editing) await updateProduct(editing.id, data)
      else await createProduct(data)
      setEditing(null)
      await refresh()
    } catch (e) {
      console.error('Product save error:', e)
      setError(e.message || 'Failed to save product')
    }
  }

  const onDelete = async (id) => {
    setError('')
    try {
      if (confirm('Delete this product?')) {
        await deleteProduct(id)
        await refresh()
      }
    } catch (e) {
      console.error('Product delete error:', e)
      setError(e.message || 'Failed to delete product')
    }
  }

  return (
    <div className="grid two">
      <div>
        {error && <div className="error" style={{ marginBottom: 8 }}>{error}</div>}
        <ProductForm initial={editing} onCancel={() => setEditing(null)} onSubmit={onSave} />
      </div>
      <div>
        <Table
          columns={['Name', 'SKU', 'Price', 'Stock', 'Actions']}
          rows={items.map(p => [
            p.name,
            p.sku,
            `₹${Number(p.price || 0).toFixed(2)}`,
            Number(p.stock || 0),
            <div className="hstack" key={`act-${p.id}`}>
              <Button size="sm" onClick={() => setEditing(p)}>Edit</Button>
              <Button size="sm" variant="danger" onClick={() => onDelete(p.id)}>Delete</Button>
            </div>
          ])}
        />
      </div>
    </div>
  )
}
