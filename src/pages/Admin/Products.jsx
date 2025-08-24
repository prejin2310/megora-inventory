import React, { useEffect, useMemo, useState } from 'react'
import Button from '../../components/ui/Button'
import AddProductModal from '../../components/products/AddProductModal'
import { listProducts, createProduct, updateProductStock } from '../../firebase/firestore'

export default function Products() {
  const [all, setAll] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const [openAdd, setOpenAdd] = useState(false)

  const refresh = async () => {
    setError('')
    setLoading(true)
    try {
      const list = await listProducts()
      setAll(list)
    } catch (e) {
      console.error('Products load error:', e)
      setError(e.message || 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const norm = v => String(v || '').toLowerCase()

  const filtered = useMemo(() => {
    const qq = norm(q)
    if (!qq) return all
    return all.filter(p => {
      return (
        norm(p.name).includes(qq) ||
        norm(p.sku).includes(qq) ||
        norm(p.category).includes(qq)
      )
    })
  }, [all, q])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  useEffect(() => {
    if (page > totalPages) setPage(1)
  }, [totalPages, page])
  const start = (page - 1) * pageSize
  const pageItems = filtered.slice(start, start + pageSize)

  const restock = async (p) => {
    const current = Number(p.stock ?? 0)
    const val = prompt(`Enter new stock for ${p.sku || p.name} (current: ${current})`, String(Math.max(current, 10)))
    if (val == null) return
    const to = Number(val)
    if (Number.isNaN(to) || to < 0) return alert('Invalid stock value')
    try {
      await updateProductStock(p.id, { setTo: to })
      await refresh()
    } catch (e) {
      console.error('Restock error:', e)
      alert(e.message || 'Failed to update stock')
    }
  }

  return (
    <div className="vstack" style={{ gap: 12 }}>
      {/* Top bar: search + actions */}
      <div className="hstack" style={{ gap: 8, alignItems: 'center' }}>
        <div className="searchbar">
          <input
            placeholder="Search products (name, SKU, category)"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          {q && <button className="clear" type="button" onClick={() => setQ('')}>×</button>}
        </div>

        <div className="grow" />

        <Button onClick={() => setOpenAdd(true)}>Add Product</Button>
        <Button size="sm" onClick={refresh}>Refresh</Button>
      </div>

      {error && <div className="error">{error}</div>}

      {/* Table view */}
      {loading ? (
        <div className="muted">Loading…</div>
      ) : (
        <div className="table-wrap">
          <div className="t-head">
            <div>Image</div>
            <div>Name</div>
            <div>SKU</div>
            <div>Category</div>
            <div>Price</div>
            <div>Stock</div>
            <div>Min</div>
            <div className="right">Actions</div>
          </div>
          <div className="t-body">
            {pageItems.map(p => (
              <div className="t-row" key={p.id}>
                <div>
                  <div className="thumb">
                    {p.image ? <img src={p.image} alt={p.name} /> : <div className="ph">IMG</div>}
                  </div>
                </div>
                <div className="ell">{p.name || '-'}</div>
                <div className="mono">{p.sku || '-'}</div>
                <div className="ell">{p.category || '-'}</div>
                <div>₹{Number(p.price || 0).toFixed(2)}</div>
                <div>{Number(p.stock || 0)}</div>
                <div className="muted">{Number(p.minStock ?? 5)}</div>
                <div className="right">
                  <Button size="sm" onClick={() => restock(p)}>Restock</Button>
                </div>
              </div>
            ))}
            {pageItems.length === 0 && (
              <div className="t-empty">No products found.</div>
            )}
          </div>
        </div>
      )}

      {/* Bottom pagination */}
      {!loading && (
        <div className="hstack" style={{ gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
          <div className="muted">Rows per page</div>
          <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>

          <div className="pager">
            <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
            <span className="muted">{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</button>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      <AddProductModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onCreated={() => { setOpenAdd(false); refresh() }}
        createProduct={createProduct}
      />

      <style>{`
        .searchbar { position: relative; width: min(420px, 56vw); }
        .searchbar input {
          width: 100%;
          padding: 10px 34px 10px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          font-size: 14px;
          outline: none;
        }
        .searchbar input:focus {
          border-color: #94a3b8;
          box-shadow: 0 0 0 3px rgba(14,165,233,.12);
        }
        .searchbar .clear {
          position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
          width: 26px; height: 26px;
          border-radius: 999px; background: #f1f5f9; border: 1px solid #e2e8f0;
          cursor: pointer; line-height: 1;
        }

        .table-wrap {
          border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background: #fff;
        }
        .t-head, .t-row {
          display: grid; grid-template-columns: 80px 1.6fr 1fr 1fr 0.8fr 0.6fr 0.6fr 0.8fr;
          gap: 10px; align-items: center;
        }
        .t-head { background: #f9fafb; padding: 10px 12px; font-weight: 700; }
        .t-body .t-row { padding: 10px 12px; border-top: 1px dashed #e5e7eb; }
        .t-body .t-row:first-child { border-top: none; }
        .t-empty { text-align: center; color: #6b7280; padding: 16px; }

        .thumb { width: 64px; height: 64px; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; background: #fafafa; display: grid; place-items: center; color: #9ca3af; font-size: 12px; }
        .thumb img { width: 100%; height: 100%; object-fit: cover; }

        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 12px; }
        .ell { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .right { text-align: right; }

        .pager { display: inline-flex; gap: 8px; align-items: center; }
        .pager button {
          border: 1px solid #e5e7eb; border-radius: 8px; padding: 6px 10px; background: #fff;
        }

        @media (max-width: 980px) {
          .t-head, .t-row { grid-template-columns: 80px 1.2fr 1fr 0.8fr 0.8fr 0.6fr 0.6fr 0.8fr; }
        }
        @media (max-width: 720px) {
          .t-head, .t-row { grid-template-columns: 64px 1fr 1fr 0.8fr 0.8fr 0.6fr 0.6fr 0.8fr; }
        }
        @media (max-width: 560px) {
          .t-head, .t-row { grid-template-columns: 56px 1.2fr 1fr 0.8fr 0.8fr 0.6fr 0.6fr 0.8fr; }
        }
      `}</style>
    </div>
  )
}
