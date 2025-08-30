import React, { useEffect, useMemo, useState } from 'react'
import { listProducts, updateProductStock } from '../../firebase/firestore'
import Button from '../ui/Button'

const DEFAULT_MIN_STOCK = 4

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

  const stockClass = (stock, min) => {
    if (stock <= 1) return 'bg-red-100 text-red-700 font-semibold px-2 py-1 rounded'
    if (stock <= min) return 'bg-yellow-100 text-yellow-700 font-semibold px-2 py-1 rounded'
    return 'bg-green-100 text-green-700 font-semibold px-2 py-1 rounded'
  }

  return (
    <div className="bg-white border rounded-xl shadow-sm p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-bold">{title}</h3>
        <div className="flex-1" />
        {/* Segmented Control */}
        <div className="inline-flex bg-gray-100 rounded-full p-1 text-sm">
          <button
            className={`px-3 py-1 rounded-full ${tab === 'LOW' ? 'bg-white shadow font-semibold' : 'text-gray-600'}`}
            onClick={() => setTab('LOW')}
          >
            Low Stock
          </button>
          <button
            className={`px-3 py-1 rounded-full ${tab === 'OUT' ? 'bg-white shadow font-semibold' : 'text-gray-600'}`}
            onClick={() => setTab('OUT')}
          >
            Out of Stock
          </button>
        </div>
        {tab === 'LOW' && (
          <button
            type="button"
            onClick={() => setUseGridForLow(v => !v)}
            className="border rounded-full px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
          >
            {useGridForLow ? 'Table View' : 'Grid View'}
          </button>
        )}
        <Button size="sm">Export PDF</Button>
      </div>

      {/* Body */}
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {loading ? (
        <div className="text-gray-500 text-sm">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-gray-500 text-sm">No products in this list.</div>
      ) : (
        <>
          {tab === 'LOW' && useGridForLow ? (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {lowList.map(p => {
                const min = Number(p.minStock ?? DEFAULT_MIN_STOCK)
                const stock = Number(p.stock ?? 0)
                return (
                  <div key={p.id} className="border rounded-lg p-3 bg-white flex flex-col gap-2 shadow-sm">
                    <div>
                      <div className="font-bold truncate">{p.name || '-'}</div>
                      <div className="text-xs text-gray-500">{p.sku || '-'}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500">Stock</div>
                        <div className="font-bold">{stock}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Min</div>
                        <div>{min}</div>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button size="sm" onClick={() => restock(p)} disabled={!!restocking[p.id]}>
                        {restocking[p.id] ? 'Updating…' : 'Restock'}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[600px] border rounded-lg">
                <div className="grid grid-cols-[120px_1fr_90px_70px_120px] gap-3 items-center bg-gray-50 px-3 py-2 font-semibold text-sm">
                  <div>SKU</div>
                  <div>Name</div>
                  <div>Stock</div>
                  <div>Min</div>
                  <div></div>
                </div>
                <div>
                  {rows.map(p => {
                    const min = Number(p.minStock ?? DEFAULT_MIN_STOCK)
                    const stock = Number(p.stock ?? 0)
                    return (
                      <div key={p.id} className="grid grid-cols-[120px_1fr_90px_70px_120px] gap-3 items-center px-3 py-2 border-t text-sm">
                        <div className="font-mono text-xs">{p.sku || '-'}</div>
                        <div className="truncate">{p.name || '-'}</div>
                        <div className={stockClass(stock, min)}>{stock}</div>
                        <div className="text-gray-500">{min}</div>
                        <div className="text-right">
                          <Button size="sm" onClick={() => restock(p)} disabled={!!restocking[p.id]}>
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

      {/* Critical Modal */}
      {showCriticalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-4 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-2">⚠ Critical Stock Alert</h3>
            <ul className="list-disc list-inside text-sm text-gray-700">
              {criticalList.map(p => (
                <li key={p.id}>
                  {p.name || p.sku || '-'} – Stock: {p.stock ?? 0}
                </li>
              ))}
            </ul>
            <div className="text-right mt-4">
              <Button size="sm" onClick={() => setShowCriticalModal(false)}>
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
