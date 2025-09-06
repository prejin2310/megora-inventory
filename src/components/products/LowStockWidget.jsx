import React, { useEffect, useMemo, useState } from 'react'
import { listProducts, updateProductStock } from '../../firebase/firestore'
import { doc, updateDoc } from "firebase/firestore" 
import Button from '../ui/Button'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { db } from "../../firebase/firebase" 

const DEFAULT_MIN_STOCK = 4

export default function LowStockWidget() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('LOW')
  const [restocking, setRestocking] = useState({})
  const [showCriticalModal, setShowCriticalModal] = useState(false)
  const [editing, setEditing] = useState({}) // Track which row is being edited
  const [editValues, setEditValues] = useState({}) // Track input values

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
    if (criticalList.length > 0) setShowCriticalModal(true)
  }, [criticalList.length])

  const rows = tab === 'LOW' ? lowList : outList
  const title = tab === 'LOW' ? 'Low Stock' : 'Out of Stock'

  const startEdit = (p) => {
    setEditing({ [p.id]: true })
    setEditValues({ [p.id]: { stock: p.stock ?? 0, minStock: p.minStock ?? DEFAULT_MIN_STOCK } })
  }

  const cancelEdit = () => {
    setEditing({})
    setEditValues({})
  }

 const saveEdit = async (p) => {
  const { stock, minStock } = editValues[p.id]
  if (stock < 0 || minStock < 0) return alert('Values cannot be negative')

  setRestocking(s => ({ ...s, [p.id]: true }))
  try {
    // ✅ compute delta
    const delta = Number(stock) - Number(p.stock ?? 0)
    await updateProductStock(p.id, { add: delta })

    // update minStock separately
    const ref = doc(db, "products", p.id)
    await updateDoc(ref, { minStock: Number(minStock) })

    await refresh()
    cancelEdit()
  } catch (e) {
    console.error('Update error:', e)
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

  // Utility to convert image URL to base64
const getBase64FromUrl = async (url) => {
  const res = await fetch(url)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

const exportPDF = async () => {
  try {
    const doc = new jsPDF()
    const now = new Date()
    const dateStr = now.toLocaleString()
    const logoUrl = 'https://i.ibb.co/hRzSG3r0/webGold.png'
    const logoBase64 = await getBase64FromUrl(logoUrl)
    const pageWidth = doc.internal.pageSize.getWidth()

    // Header
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', 15, 10, 30, 15) // x, y, width, height
    }
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text("Megora Jewels", pageWidth / 2, 15, { align: 'center' })
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Report: ${title}`, pageWidth / 2, 22, { align: 'center' })
    doc.text(`Date: ${dateStr}`, pageWidth - 15, 22, { align: 'right' })

    // Table
    const tableColumn = ["SKU", "Name", "Stock", "Min Stock"]
    const tableRows = rows.map(p => [
      p.sku || '-',
      p.name || '-',
      p.stock ?? 0,
      p.minStock ?? DEFAULT_MIN_STOCK
    ])

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
      styles: { fontSize: 9 },
    })

    doc.save(`${title.replace(/\s+/g, '_')}_${now.getTime()}.pdf`)
  } catch (e) {
    console.error('PDF export failed', e)
    alert('Failed to export PDF')
  }
}





  return (
    <div className="bg-white border rounded-xl shadow-sm p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="text-lg font-bold">{title}</h3>
        <div className="flex-1" />
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
        <Button size="sm" onClick={exportPDF}>Export PDF</Button>
      </div>

      {/* Table */}
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {loading ? (
        <div className="text-gray-500 text-sm">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-gray-500 text-sm">No products in this list.</div>
      ) : (
       <div className="overflow-x-auto">
  <table className="min-w-full text-sm text-gray-700">
    <thead className="bg-gray-50">
      <tr>
        <th className="px-4 py-2 text-left font-semibold">SKU</th>
        <th className="px-4 py-2 text-left font-semibold">Name</th>
        <th className="px-4 py-2 text-left font-semibold">Stock</th>
        <th className="px-4 py-2 text-left font-semibold">Min Stock</th>
        <th className="px-4 py-2"></th>
      </tr>
    </thead>
    <tbody className="bg-white divide-y divide-gray-100">
      {rows.map(p => {
        const min = Number(p.minStock ?? DEFAULT_MIN_STOCK)
        const stock = Number(p.stock ?? 0)
        const isEditing = editing[p.id]
        return (
          <tr key={p.id} className="hover:bg-gray-50 transition-colors duration-150">
            <td className="px-4 py-2 font-mono">{p.sku || '-'}</td>
            <td className="px-4 py-2 truncate">{p.name || '-'}</td>
            <td className="px-4 py-2">
              {isEditing ? (
                <input
                  type="number"
                  className="border px-2 py-1 rounded w-20"
                  value={editValues[p.id].stock}
                  onChange={e => setEditValues(s => ({ ...s, [p.id]: { ...s[p.id], stock: e.target.value } }))}
                />
              ) : (
                <span className={stockClass(stock, min)}>{stock}</span>
              )}
            </td>
            <td className="px-4 py-2">
              {isEditing ? (
                <input
                  type="number"
                  className="border px-2 py-1 rounded w-20"
                  value={editValues[p.id].minStock}
                  onChange={e => setEditValues(s => ({ ...s, [p.id]: { ...s[p.id], minStock: e.target.value } }))}
                />
              ) : (
                <span className="text-gray-500">{min}</span>
              )}
            </td>
            <td className="px-4 py-2 text-right space-x-1">
              {isEditing ? (
                <>
                  <Button size="sm" onClick={() => saveEdit(p)}>Save</Button>
                  <Button size="sm" onClick={cancelEdit} className="bg-gray-200 text-gray-700 hover:bg-gray-300">Cancel</Button>
                </>
              ) : (
                <Button size="sm" onClick={() => startEdit(p)}>Edit</Button>
              )}
            </td>
          </tr>
        )
      })}
    </tbody>
  </table>
</div>

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
              <Button size="sm" onClick={() => setShowCriticalModal(false)}>Dismiss</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
