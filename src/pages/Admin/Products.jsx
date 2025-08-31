import React, { useEffect, useMemo, useState } from 'react'
import Button from '../../components/ui/Button'
import AddProductModal from '../../components/products/AddProductModal'
import EditProductModal from '../../components/products/EditProductModal'
import DeleteConfirmModal from '../../components/products/DeleteConfirmModal'

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
      {/* Header */}
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
  <h1 className="text-2xl font-bold text-gray-800">Products</h1>
  <Button
    onClick={() => setOpenAdd(true)}
    className="bg-black hover:bg-gray-900 text-white px-4 py-2 rounded-lg"
  >
    + Add Product
  </Button>
</div>

{/* Search */}
<div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
  <input
    type="text"
    placeholder="Search by name or SKU"
    value={searchTerm}
    onChange={e => setSearchTerm(e.target.value)}
    className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-400 focus:outline-none"
  />
  <Button
    size="sm"
    onClick={refresh}
    className="px-4 py-2 rounded-lg bg-black-500 hover:bg-black-600 text-white"
  >
    Refresh
  </Button>
</div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500">No products found</p>
      ) : (
        <div className="overflow-x-auto rounded-lg shadow-sm">
          {/* Responsive Table - borderless */}
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 text-left font-semibold">Image</th>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">SKU</th>
                <th className="px-4 py-3 text-left font-semibold">Category</th>
                <th className="px-4 py-3 text-left font-semibold">Price</th>
                <th className="px-4 py-3 text-left font-semibold">Stock</th>
                <th className="px-4 py-3 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((p, idx) => (
                <tr
                  key={p.id}
                  className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition`}
                >
                  <td className="px-4 py-3">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="h-12 w-12 object-cover rounded" />
                    ) : (
                      <span className="text-gray-400 italic">No image</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                  <td className="px-4 py-3 text-gray-700">{p.sku}</td>
                  <td className="px-4 py-3 text-gray-700">{p.category}</td>
                  <td className="px-4 py-3 text-gray-800">₹{p.price}</td>
                  <td className="px-4 py-3">{p.stock}</td>
                  <td className="px-4 py-3 flex flex-wrap gap-2">
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

          {/* Pagination */}
    {/* Pagination */}
          <div className="flex justify-center items-center mt-6 gap-2 text-sm flex-wrap">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className={`px-3 py-1.5 rounded-lg ${
                page === 1
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white hover:bg-gray-100 text-gray-700 border"
              }`}
            >
              Prev
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
              <button
                key={num}
                onClick={() => setPage(num)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  num === page
                    ? "bg-gray-700 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100 border"
                }`}
              >
                {num}
              </button>
            ))}

            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className={`px-3 py-1.5 rounded-lg ${
                page === totalPages
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white hover:bg-gray-100 text-gray-700 border"
              }`}
            >
              Next
            </button>
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
