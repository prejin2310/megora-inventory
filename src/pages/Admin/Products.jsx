import React, { useEffect, useMemo, useState } from 'react'
import Button from '../../components/ui/Button'
import AddProductModal from '../../components/products/AddProductModal'
import {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../../firebase/firestore'

const PAGE_SIZE = 10

export default function Products() {
  const [all, setAll] = useState([])
  const [loading, setLoading] = useState(true)
  const [openAdd, setOpenAdd] = useState(false)
  const [edit, setEdit] = useState({ open: false, product: null })
  const [confirm, setConfirm] = useState({ open: false, id: null, name: '' })
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const list = await listProducts()
      setAll(list)
      setLoading(false)
    }
    load()
  }, [])

  async function refresh() {
    setLoading(true)
    const list = await listProducts()
    setAll(list)
    setLoading(false)
  }

  async function onAdd(p) {
    await createProduct(p)
    setOpenAdd(false)
    refresh()
  }

  async function onEditSave(p) {
    await updateProduct(p.id, p)
    setEdit({ open: false, product: null })
    refresh()
  }

  async function onDelete(id) {
    await deleteProduct(id)
    refresh()
  }

  // search + pagination
  const term = searchTerm.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!term) return all
    return all.filter(p =>
      (p.name || '').toLowerCase().includes(term) ||
      (p.sku || '').toLowerCase().includes(term)
    )
  }, [all, term])

  useEffect(() => { setPage(1) }, [term])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Products</h1>
        <Button onClick={() => setOpenAdd(true)}>+ Add Product</Button>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by name or SKU"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
        <Button size="sm" variant="ghost" onClick={refresh}>Refresh</Button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500">No products found</p>
      ) : (
        <div className="overflow-x-auto">
          {/* Desktop Table */}
          <table className="hidden md:table w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 text-sm text-gray-600">
                <th className="px-4 py-2">Image</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">SKU</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2">Price</th>
                <th className="px-4 py-2">Stock</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(p => (
                <tr key={p.id} className="border-t text-sm">
                  <td className="px-4 py-2">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="h-12 w-12 object-cover rounded" />
                    ) : (
                      <span className="text-gray-400 italic">No image</span>
                    )}
                  </td>
                  <td className="px-4 py-2">{p.name}</td>
                  <td className="px-4 py-2">{p.sku}</td>
                  <td className="px-4 py-2">{p.category}</td>
                  <td className="px-4 py-2">₹{p.price}</td>
                  <td className="px-4 py-2">{p.stock}</td>
                  <td className="px-4 py-2 flex gap-2">
                    <Button size="sm" onClick={() => setEdit({ open: true, product: p })}>Edit</Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setConfirm({ open: true, id: p.id, name: p.name })}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile Cards */}
          <div className="grid gap-4 md:hidden">
            {paged.map(p => (
              <div key={p.id} className="bg-white p-4 rounded-lg shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold">{p.name || '-'}</h3>
                    <p className="text-xs text-gray-500">{p.category || '—'}</p>
                  </div>
                  <div className="text-sm font-bold">₹{Number(p.price || 0).toFixed(2)}</div>
                </div>
                <div className="flex gap-3 mb-3">
                  <div className="h-16 w-16 bg-gray-100 flex items-center justify-center overflow-hidden rounded">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs text-gray-400">No IMG</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-600">
                    <p><span className="font-medium">SKU:</span> {p.sku || '-'}</p>
                    <p><span className="font-medium">Stock:</span> {p.stock || 0}</p>
                    <p><span className="font-medium">Min:</span> {p.minStock ?? 5}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setEdit({ open: true, product: p })}>Edit</Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setConfirm({ open: true, id: p.id, name: p.name })}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex justify-center mt-6 gap-2 text-sm">
            <Button size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
            <span className="px-2 py-1">Page {page} of {totalPages}</span>
            <Button size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Modals */}
      <AddProductModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onCreated={refresh}
        createProduct={createProduct}
      />
      <EditProductModal
        open={edit.open}
        onClose={() => setEdit({ open: false, product: null })}
        product={edit.product}
        onSave={onEditSave}
      />
      {confirm.open && (
        <DeleteConfirmModal
          confirm={confirm}
          setConfirm={setConfirm}
          onDelete={onDelete}
        />
      )}
    </div>
  )
}

/* ---------------- EditProductModal ---------------- */
function EditProductModal({ open, onClose, product, onSave }) {
  const [form, setForm] = useState(product || {})
  useEffect(() => { setForm(product || {}) }, [product])

  const change = k => e => {
    const v = e?.target?.type === 'number' ? Number(e.target.value) : e.target.value
    setForm(s => ({ ...s, [k]: v }))
  }

  const submit = async e => {
    e.preventDefault()
    await onSave(form)
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-lg shadow-lg p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Edit Product</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">×</button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm">Name</label>
              <input value={form.name || ''} onChange={change('name')} className="w-full border rounded px-3 py-2" required />
            </div>
            <div>
              <label className="text-sm">SKU</label>
              <input value={form.sku || ''} onChange={change('sku')} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="text-sm">Category</label>
              <input value={form.category || ''} onChange={change('category')} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="text-sm">Price</label>
              <input type="number" step="0.01" value={form.price || 0} onChange={change('price')} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="text-sm">Stock</label>
              <input type="number" value={form.stock || 0} onChange={change('stock')} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="text-sm">Min Stock</label>
              <input type="number" value={form.minStock ?? 5} onChange={change('minStock')} className="w-full border rounded px-3 py-2" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm">Image URL</label>
              <input value={form.image || ''} onChange={change('image')} className="w-full border rounded px-3 py-2" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm">Description</label>
              <textarea rows={3} value={form.description || ''} onChange={change('description')} className="w-full border rounded px-3 py-2" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ---------------- DeleteConfirmModal ---------------- */
function DeleteConfirmModal({ confirm, setConfirm, onDelete }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setConfirm({ open: false, id: null, name: '' })}>
      <div className="bg-white w-full max-w-sm rounded-lg shadow-lg p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Delete Product</h2>
          <button className="text-gray-500 hover:text-gray-700" onClick={() => setConfirm({ open: false, id: null, name: '' })}>×</button>
        </div>
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete “{confirm.name}”? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirm({ open: false, id: null, name: '' })}>Cancel</Button>
          <Button variant="danger" onClick={async () => { const id = confirm.id; setConfirm({ open: false, id: null, name: '' }); await onDelete(id) }}>Delete</Button>
        </div>
      </div>
    </div>
  )
}
