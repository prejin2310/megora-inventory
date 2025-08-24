import React, { useEffect, useState } from 'react'
import { listProducts, createProduct, updateProduct, deleteProduct } from '../../firebase/firestore'
import ProductForm from '../../components/products/ProductForm'
import Table from '../../components/ui/Table'
import Button from '../../components/ui/Button'

export default function Products() {
  const [items, setItems] = useState([])
  const [editing, setEditing] = useState(null)

  const refresh = async () => setItems(await listProducts())
  useEffect(() => { refresh() }, [])

  const onSave = async (data) => {
    if (editing) await updateProduct(editing.id, data)
    else await createProduct(data)
    setEditing(null)
    await refresh()
  }

  const onDelete = async (id) => {
    if (confirm('Delete this product?')) {
      await deleteProduct(id)
      await refresh()
    }
  }

  return (
    <div className="grid two">
      <div>
        <ProductForm initial={editing} onCancel={() => setEditing(null)} onSubmit={onSave} />
      </div>
      <div>
        <Table
          columns={['Name', 'SKU', 'Price', 'Stock', 'Actions']}
          rows={items.map(p => [
            p.name,
            p.sku,
            `₹${p.price}`,
            p.stock,
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
