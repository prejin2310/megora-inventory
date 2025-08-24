import React, { useEffect, useMemo, useState } from 'react'
import { listProducts, updateProductStock } from '../../firebase/firestore'
import Button from '../ui/Button'

// Use a default threshold if product.minStock is not set
const DEFAULT_MIN_STOCK = 5

export default function LowStockWidget() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('LOW') // LOW | OUT
  const [restocking, setRestocking] = useState({}) // { [productId]: boolean }

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

  const rows = tab === 'LOW' ? lowList : outList
  const title = tab === 'LOW' ? 'Low Stock' : 'Out of Stock'

  const restock = async (p) => {
    // Simple prompt-based restock
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

  const exportPdf = async () => {
    try {
      const { jsPDF } = await import('jspdf') // dynamic import to avoid bundling cost until used
      const doc = new jsPDF({ unit: 'pt' })
      const header = `Megora Jewels — ${title} Report`
      const date = new Date().toLocaleString()

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.text(header, 40, 40)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(date, 40, 58)

      // Table header
      const startY = 80
      const colX = [40, 220, 420, 500] // SKU, Name, Stock, Min
      doc.setFont('helvetica', 'bold')
      doc.text('SKU', colX[0], startY)
      doc.text('Name', colX[1], startY)
      doc.text('Stock', colX[2], startY)
      doc.text('Min', colX[3], startY)
      doc.setLineWidth(0.5)
      doc.line(40, startY + 6, 560, startY + 6)

      // Rows
      let y = startY + 22
      doc.setFont('helvetica', 'normal')
      const list = rows
      list.forEach((p, i) => {
        const min = Number(p.minStock ?? DEFAULT_MIN_STOCK)
        const stock = Number(p.stock ?? 0)
        const name = String(p.name || '')
        const sku = String(p.sku || '')

        doc.text(sku, colX[0], y)
        // wrap long names
        const nameLines = doc.splitTextToSize(name, 180)
        doc.text(nameLines, colX[1], y)
        doc.text(String(stock), colX[2], y)
        doc.text(String(min), colX[3], y)

        // Move Y based on wrapped lines
        const lineHeight = 14
        const used = (Array.isArray(nameLines) ? nameLines.length : 1) * lineHeight
        y += Math.max(used, lineHeight)

        // Page break
        if (y > 760) {
          doc.addPage()
          y = 40
        }
      })

      doc.save(`${title.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.pdf`)
    } catch (e) {
      console.error('PDF export error:', e)
      alert(e.message || 'Failed to export PDF')
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
        <Button size="sm" onClick={exportPdf}>Export PDF</Button>
      </div>

      {error && <div className="error">{error}</div>}
      {loading ? (
        <div className="muted">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="muted">No products in this list.</div>
      ) : (
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
                  <div>{stock}</div>
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
      )}

      {/* Inline minimal styles scoped to widget */}
      <style>{`
        .seg { display: inline-flex; background: #f3f4f6; border-radius: 999px; padding: 2px; margin-right: 8px; }
        .seg-btn { border: 0; background: transparent; padding: 6px 10px; border-radius: 999px; cursor: pointer; }
        .seg-btn.active { background: #ffffff; box-shadow: 0 1px 2px rgba(0,0,0,0.06); }

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
      `}</style>
    </div>
  )
}
