import React, { useEffect, useMemo, useState } from 'react'
import Button from '../../components/ui/Button'
import AddProductModal from '../../components/products/AddProductModal'
import {
  // keep existing API, but we’ll use a realtime listener for auto updates
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../../firebase/firestore'
import './AddProductModal.css';
import './Products.css'

// Pagination helper
const PAGE_SIZE = 10

export default function Products() {
  const [all, setAll] = useState([])
  const [loading, setLoading] = useState(true)
  const [openAdd, setOpenAdd] = useState(false)
  const [edit, setEdit] = useState({ open: false, product: null })
  const [confirm, setConfirm] = useState({ open: false, id: null, name: '' })
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')

  // ---- Realtime listener (Option A) ----
  // Expects a helper exported from firebase/firestore that returns an unsubscribe
  // If not available, see inline fallback using listProducts()
  useEffect(() => {
    let unsub = null
    async function attach() {
      try {
        // Prefer a dedicated subscribeProducts helper if present
        if (typeof window !== 'undefined' && typeof subscribeProducts === 'function') {
          setLoading(true)
          unsub = subscribeProducts((docs) => {
            setAll(docs || [])
            setLoading(false)
          })
        } else if (typeof getProductsOnSnapshot === 'function') {
          setLoading(true)
          unsub = getProductsOnSnapshot((docs) => {
            setAll(docs || [])
            setLoading(false)
          })
        } else {
          // Fallback to one-time load (no realtime)
          setLoading(true)
          const list = await listProducts()
          setAll(list)
          setLoading(false)
        }
      } catch (e) {
        console.error('Failed to attach product listener', e)
        // Fallback to one-time load on error
        const list = await listProducts()
        setAll(list)
        setLoading(false)
      }
    }
    attach()
    return () => {
      if (typeof unsub === 'function') unsub()
    }
  }, [])

  // ---- One-time loader kept for explicit refresh use (Option B) ----
  async function load() {
    setLoading(true)
    const list = await listProducts()
    setAll(list)
    setLoading(false)
  }

  // Fix: define refresh to avoid undefined reference
  const refresh = () => {
    // If using realtime, the list updates automatically; still safe to call load()
    // Call load() only if not on realtime (or if needing a forced resync)
    // Here we call load() to be explicit; no harm if listener is also active.
    load()
  }

  async function onAdd(p) {
    await createProduct(p)
    setOpenAdd(false)
    // With realtime, state updates automatically; still ensure a refresh fallback
    refresh()
  }

  async function onEditSave(p) {
    await updateProduct(p.id, p)
    setEdit({ open: false, product: null })
    // Realtime will push the update; fallback refresh for non-realtime
    refresh()
  }

  async function onDelete(id) {
    await deleteProduct(id)
    // Realtime will remove it; fallback refresh for non-realtime
    refresh()
  }

  // Search filtering
  const term = searchTerm.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!term) return all
    return all.filter((p) => {
      const name = (p.name || '').toLowerCase()
      const sku = (p.sku || '').toLowerCase()
      return name.includes(term) || sku.includes(term)
    })
  }, [all, term])

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1)
  }, [term])

  // Paginate filtered
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="table-scroll-wrap">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-semibold">Products</h1>
          <Button onClick={() => setOpenAdd(true)}>+ Add Product</Button>
        </div>

        {/* Search */}
        <div className="products-search mb-4">
          <input
            className="products-search-input"
            type="text"
            placeholder="Search by name or SKU"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {/* Optional explicit refresh button for non-realtime environments */}
          <Button size="sm" variant="ghost" onClick={refresh}>Refresh</Button>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : filtered.length === 0 ? (
          <p>No products found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="products-table hidden md:table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Name</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((p) => (
                  <tr key={p.id}>
                    <td data-label="Image">
                      {p.image ? (
                        <img
                          src={p.image}
                          alt={p.name}
                          className="h-12 w-12 object-cover rounded md:h-12 md:w-12"
                        />
                      ) : (
                        <span className="text-gray-400 italic">No image</span>
                      )}
                    </td>
                    <td data-label="Name">{p.name}</td>
                    <td data-label="SKU">{p.sku}</td>
                    <td data-label="Category">{p.category}</td>
                    <td data-label="Price">₹{p.price}</td>
                    <td data-label="Stock">{p.stock}</td>
                    <td data-label="Actions" className="actions">
                      <button
                        className="edit"
                        onClick={() => setEdit({ open: true, product: p })}
                      >
                        Edit
                      </button>
                      <button
                        className="delete"
                        onClick={() =>
                          setConfirm({ open: true, id: p.id, name: p.name })
                        }
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile accordion view */}
            <div className="mobile-cards md:hidden">
              {paged.map(p => (
                <div key={p.id} className="prod-card">
                  <div className="prod-card-head">
                    <div>
                      <div className="pch-name">{p.name || '-'}</div>
                      <div className="pch-cat">{p.category || '—'}</div>
                    </div>
                    <div className="pch-price">₹{Number(p.price || 0).toFixed(2)}</div>
                  </div>

                  <div className="prod-media">
                    <div className="pm-thumb">
                      {p.image ? <img src={p.image} alt={p.name} /> : <div>No IMG</div>}
                    </div>
                    <div className="pm-info">
                      <div className="pm-sku">{p.sku || '-'}</div>
                    </div>
                  </div>

                  <div className="prod-meta">
                    <div className="pm-item">
                      <div className="pm-lab">Stock</div>
                      <div className="pm-val">{Number(p.stock || 0)}</div>
                    </div>
                    <div className="pm-item">
                      <div className="pm-lab">Min</div>
                      <div className="pm-val">{Number(p.minStock ?? 5)}</div>
                    </div>
                    <div className="pm-item">
                      <div className="pm-lab">SKU</div>
                      <div className="pm-val" title={p.sku}>{p.sku || '-'}</div>
                    </div>
                  </div>

                  <div className="prod-actions">
                    <Button size="sm" onClick={() => setEdit({ open: true, product: p })}>Edit</Button>
                    <Button
                      size="sm"
                      variant="danger"
                      className="danger"
                      onClick={() => setConfirm({ open: true, id: p.id, name: p.name })}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-center mt-4 space-x-2">
              <Button
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Prev
              </Button>
              <span className="px-2 py-1 text-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Modals */}
        <AddProductModal
          open={openAdd}
          onClose={() => setOpenAdd(false)}
          onCreated={() => { setOpenAdd(false); refresh() }}  // Fix: wire refresh
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
    </div>
  )
}

/* ----------------------- EditProductModal ----------------------- */
function EditProductModal({ open, onClose, product, onSave }) {
  const [form, setForm] = useState(product || {})

  useEffect(() => {
    setForm(product || {})
  }, [product])

  const change = (k) => (e) => {
    const v =
      e?.target?.type === 'number' ? Number(e.target.value) : e.target.value
    setForm((s) => ({ ...s, [k]: v }))
  }

  const submit = async (e) => {
    e.preventDefault()
    await onSave(form)
  }

  if (!open) return null
  return (
    <div className="apm-backdrop" onClick={onClose}>
      <div className="apm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="apm-head">
          <div className="apm-title">Edit Product</div>
          <button className="apm-x" onClick={onClose}>
            ×
          </button>
        </div>
        <form className="apm-body" onSubmit={submit}>
          <div className="apm-grid">
            <div className="apm-field">
              <label>Name</label>
              <input
                value={form.name || ''}
                onChange={change('name')}
                required
              />
            </div>
            <div className="apm-field">
              <label>SKU</label>
              <input value={form.sku || ''} onChange={change('sku')} />
            </div>
            <div className="apm-field">
              <label>Category</label>
              <input value={form.category || ''} onChange={change('category')} />
            </div>
            <div className="apm-field">
              <label>Price</label>
              <input
                type="number"
                step="0.01"
                value={form.price || 0}
                onChange={change('price')}
              />
            </div>
            <div className="apm-field">
              <label>Stock</label>
              <input
                type="number"
                value={form.stock || 0}
                onChange={change('stock')}
              />
            </div>
            <div className="apm-field">
              <label>Min Stock</label>
              <input
                type="number"
                value={form.minStock ?? 5}
                onChange={change('minStock')}
              />
            </div>
            <div className="apm-field apm-col-span">
              <label>Image URL</label>
              <input value={form.image || ''} onChange={change('image')} />
            </div>
            <div className="apm-field apm-col-span">
              <label>Description</label>
              <textarea
                rows={3}
                value={form.description || ''}
                onChange={change('description')}
              />
            </div>
          </div>
          <div className="apm-foot">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ----------------------- DeleteConfirmModal ----------------------- */
function DeleteConfirmModal({ confirm, setConfirm, onDelete }) {
  return (
    <div className="apm-backdrop" onClick={() => setConfirm({ open: false, id: null, name: '' })}>
      <div className="apm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="apm-head">
          <div className="apm-title">Delete Product</div>
          <button
            className="apm-x"
            onClick={() => setConfirm({ open: false, id: null, name: '' })}
          >
            ×
          </button>
        </div>
        <div className="apm-body">
          Are you sure you want to delete “{confirm.name}”? This action cannot
          be undone.
        </div>
        <div className="apm-foot">
          <Button
            variant="ghost"
            onClick={() => setConfirm({ open: false, id: null, name: '' })}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              const id = confirm.id
              setConfirm({ open: false, id: null, name: '' })
              await onDelete(id)
            }}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  )
}

