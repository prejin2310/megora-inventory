import React, { useEffect, useMemo, useState } from 'react'
import { listProducts, updateProductStock } from '../../firebase/firestore'
import Button from '../ui/Button'

const DEFAULT_MIN_STOCK = 5

export default function LowStockWidget() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('LOW')
  const [restocking, setRestocking] = useState({})
  const [useGridForLow, setUseGridForLow] = useState(true)
  const [showCriticalModal, setShowCriticalModal] = useState(false)

  const refresh = async () => {
    setError('')
    setLoading(true)
    try {
      const list = await listProducts()
      setProducts(list)
    } catch (e) {
      console.error('LowStock load error:', e)
      setError(e.message || 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const lowList = useMemo(() => {
    return products
      .filter(p => {
        const min = Number(p.minStock ?? DEFAULT_MIN_STOCK)
        const stock = Number(p.stock ?? 0)
        return stock > 0 && stock <= min
      })
      .sort((a, b) => Number(a.stock ?? 0) - Number(b.stock ?? 0))
  }, [products])

  const outList = useMemo(() => {
    return products
      .filter(p => Number(p.stock ?? 0) <= 0)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }, [products])

  const criticalList = useMemo(() => {
    return products.filter(p => Number(p.stock ?? 0) <= 1)
  }, [products])

  useEffect(() => {
    if (criticalList.length > 0) {
      setShowCriticalModal(true)
    }
  }, [criticalList.length])

  // ✅ default to table view on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 767) {
        setUseGridForLow(false)
      } else {
        setUseGridForLow(true)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const rows = tab === 'LOW' ? lowList : outList
  const title = tab === 'LOW' ? 'Low Stock' : 'Out of Stock'

  const restock = async (p) => {
    const current = Number(p.stock ?? 0)
    const val = prompt(`Enter new stock for ${p.sku || p.name} (current: ${current})`, String(Math.max(current, 10)))
    if (val == null) return
    const to = Number(val)
    if (Number.isNaN(to) || to < 0) return alert('Invalid stock value')
    setRestocking(s => ({ ...s, [p.id]: true }))
    try {
      await updateProductStock(p.id, { setTo: to })
      await refresh()
    } catch (e) {
      console.error('Restock error:', e)
      alert(e.message || 'Failed to update stock')
    } finally {
      setRestocking(s => ({ ...s, [p.id]: false }))
    }
  }

  return (
    <div className="card vstack" style={{ gap: 10 }}>
      <div className="hstack" style={{ alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <div className="grow" />
        <div className="seg">
          <button
            className={`seg-btn ${tab === 'LOW' ? 'active' : ''}`}
            onClick={() => setTab('LOW')}
          >
            Low Stock
          </button>
          <button
            className={`seg-btn ${tab === 'OUT' ? 'active' : ''}`}
            onClick={() => setTab('OUT')}
          >
            Out of Stock
          </button>
        </div>
        {tab === 'LOW' && (
          <button
            className="toggle-view"
            type="button"
            onClick={() => setUseGridForLow(v => !v)}
            title={useGridForLow ? 'Show table view' : 'Show grid view'}
          >
            {useGridForLow ? 'Table View' : 'Grid View'}
          </button>
        )}
        <Button size="sm">Export PDF</Button>
      </div>

      {error && <div className="error">{error}</div>}
      {loading ? (
        <div className="muted">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="muted">No products in this list.</div>
      ) : (
        <>
          {tab === 'LOW' && useGridForLow ? (
            <div className="ls-grid">
              {lowList.map(p => {
                const min = Number(p.minStock ?? DEFAULT_MIN_STOCK)
                const stock = Number(p.stock ?? 0)
                return (
                  <div key={p.id} className="ls-card">
                    <div className="ls-top">
                      <div className="ls-name">{p.name || '-'}</div>
                      <div className="ls-sku muted">{p.sku || '-'}</div>
                    </div>
                    <div className="ls-mid">
                      <div className="ls-meta">
                        <div className="muted">Stock</div>
                        <div className="ls-strong">{stock}</div>
                      </div>
                      <div className="ls-meta">
                        <div className="muted">Min</div>
                        <div>{min}</div>
                      </div>
                    </div>
                    <div className="ls-foot">
                      <Button size="sm" onClick={() => restock(p)} disabled={!!restocking[p.id]}>
                        {restocking[p.id] ? 'Updating…' : 'Restock'}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="table-scroll">
              <div className="table-like">
                <div className="t-head">
                  <div>SKU</div>
                  <div>Name</div>
                  <div>Stock</div>
                  <div>Min</div>
                  <div></div>
                </div>
                <div className="t-body">
                  {rows.map(p => {
                    const min = Number(p.minStock ?? DEFAULT_MIN_STOCK)
                    const stock = Number(p.stock ?? 0)
                    return (
                      <div key={p.id} className="t-row">
                        <div className="mono">{p.sku || '-'}</div>
                        <div className="ell">{p.name || '-'}</div>
                        <div
                          className={`stock-cell ${
                            stock <= 1 ? 'stock-critical' :
                            stock <= min ? 'stock-low' : 'stock-ok'
                          }`}
                        >
                          {stock}
                        </div>
                        <div className="muted">{min}</div>
                        <div className="right">
                          <Button
                            size="sm"
                            onClick={() => restock(p)}
                            disabled={!!restocking[p.id]}
                          >
                            {restocking[p.id] ? 'Updating…' : 'Restock'}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ✅ Critical Stock Alert Modal */}
      {showCriticalModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>⚠ Critical Stock Alert</h3>
            <ul>
              {criticalList.map(p => (
                <li key={p.id}>
                  {p.name || p.sku || '-'} – Stock: {p.stock ?? 0}
                </li>
              ))}
            </ul>
            <div style={{ textAlign: "right", marginTop: "10px" }}>
              <Button size="sm" onClick={() => setShowCriticalModal(false)}>
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}

      <style>{`
/* Stock cell coloring */
.stock-cell {
  padding: 4px 6px;
  border-radius: 6px;
  text-align: center;
  font-weight: 600;
}
.stock-critical { background: #fee2e2; color: #b91c1c; }
.stock-low { background: #fef3c7; color: #92400e; }
.stock-ok { background: #dcfce7; color: #065f46; }

.seg { display: inline-flex; background: #f3f4f6; border-radius: 999px; padding: 2px; margin-right: 8px; }
.seg-btn { border: 0; background: transparent; padding: 6px 10px; border-radius: 999px; cursor: pointer; }
.seg-btn.active { background: #ffffff; box-shadow: 0 1px 2px rgba(0,0,0,0.06); }
.toggle-view { border: 1px solid #e5e7eb; background: #fff; border-radius: 999px; padding: 6px 10px; margin-right: 8px; cursor: pointer; }

/* Table */
.table-like { border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; }
.t-head, .t-row {
  display: grid; grid-template-columns: 120px 1fr 90px 70px 120px; gap: 10px; align-items: center;
}
.t-head { background: #f9fafb; padding: 10px 12px; font-weight: 600; }
.t-body .t-row { padding: 10px 12px; border-top: 1px dashed #e5e7eb; }
.t-body .t-row:first-child { border-top: none; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 12px; }
.ell { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.right { text-align: right; }
@media (max-width: 720px) {
  .t-head, .t-row { grid-template-columns: 100px 1fr 70px 60px 100px; }
}

/* Grid */
.ls-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
@media (max-width: 1279px) { .ls-grid { grid-template-columns: repeat(4, 1fr); } }
@media (max-width: 1023px) { .ls-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 767px) { .ls-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 479px) { .ls-grid { grid-template-columns: 1fr; } }
.ls-card {
  border: 1px solid #e5e7eb; border-radius: 12px; background: #fff; padding: 10px 12px;
  display: grid; gap: 8px;
}
.ls-top { display: grid; gap: 2px; }
.ls-name { font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ls-sku { font-size: 12px; }
.ls-mid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.ls-meta { display: grid; gap: 2px; }
.ls-strong { font-weight: 800; }
.ls-foot { display: flex; justify-content: flex-end; }

/* Scroll wrapper */
.table-scroll {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.table-like {
  min-width: 600px;
}

/* ✅ Critical Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal {
  background: #fff;
  padding: 20px;
  border-radius: 12px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 10px 20px rgba(0,0,0,0.2);
}
`}</style>

    </div>
  )
}
