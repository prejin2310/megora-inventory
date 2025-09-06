// src/pages/inventory/InventoryLedger.jsx
import React, { useEffect, useMemo, useState } from 'react'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
  deleteDoc, // ADD
} from 'firebase/firestore'
import { db } from '../../firebase/firebase'

export default function InventoryLedger() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState({}) // id -> boolean

  useEffect(() => {
    async function load() {
      setLoading(true)

      // 1) Fetch ledger entries
      const snap = await getDocs(
        query(collection(db, 'inventory_ledger'), orderBy('createdAt', 'desc'))
      )
      const ledger = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

      // 2) Collect order references
      const refDocIds = Array.from(
        new Set(ledger.map(r => String(r.referenceId || '').trim()).filter(Boolean))
      )
      const refPublicIds = Array.from(
        new Set(ledger.map(r => String(r.orderPublicId || '').trim()).filter(Boolean))
      )

      // 3) Fetch orders by document id (direct doc get)
      const ordersByDocId = {}
      await Promise.all(
        refDocIds.map(async (oid) => {
          try {
            const ds = await getDoc(doc(db, 'orders', oid))
            if (ds.exists()) {
              ordersByDocId[oid] = { id: ds.id, ...ds.data() }
            }
          } catch {
            // ignore
          }
        })
      )

      // 4) Fetch orders by publicId (query)
      const ordersByPublicId = {}
      await Promise.all(
        refPublicIds.map(async (pid) => {
          try {
            const ds = await getDocs(query(collection(db, 'orders'), where('publicId', '==', pid)))
            if (!ds.empty) {
              const d = ds.docs[0]
              ordersByPublicId[pid] = { id: d.id, ...d.data() }
            }
          } catch {
            // ignore
          }
        })
      )

      // 5) Enrich ledger with resolved order status
      const enriched = ledger.map(r => {
        const ord = (r.referenceId && ordersByDocId[r.referenceId]) ||
                    (r.orderPublicId && ordersByPublicId[r.orderPublicId]) ||
                    null
        return {
          ...r,
          _orderStatus: ord?.status || '-',
          _orderId: ord?.id || r.referenceId || '',
          _orderPublicId: ord?.publicId || r.orderPublicId || '',
        }
      })

      setRows(enriched)
      setLoading(false)
    }

    load()
  }, [])

  const displayRows = useMemo(() => rows, [rows])

  const onDelete = async (id) => {
    if (!id) return
    const yes = window.confirm('Delete this ledger entry? This cannot be undone.')
    if (!yes) return
    setDeleting((s) => ({ ...s, [id]: true }))
    try {
      await deleteDoc(doc(db, 'inventory_ledger', id))
      // remove from UI
      setRows((s) => s.filter((r) => r.id !== id))
    } catch (e) {
      alert(e?.message || 'Failed to delete ledger entry')
    } finally {
      setDeleting((s) => ({ ...s, [id]: false }))
    }
  }

  if (loading) return <div className="p-4 text-gray-600">Loading…</div>

  return (
    <div className="p-4">
      <h1 className="text-lg font-bold text-gray-800 mb-4">Inventory Ledger</h1>

      <div className="overflow-x-auto rounded-lg shadow bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 text-left">At</th>
              <th className="px-4 py-3 text-left">Order Status</th>
              <th className="px-4 py-3 text-left">Product ID</th>
              <th className="px-4 py-3 text-left">Change</th>
              <th className="px-4 py-3 text-left">Reason</th>
              <th className="px-4 py-3 text-left">Order Ref</th>
              <th className="px-4 py-3 text-left">Public ID</th>
              <th className="px-4 py-3 text-left">Item</th>
              <th className="px-4 py-3 text-left">SKU</th>
              <th className="px-4 py-3 text-left">Qty</th>
              <th className="px-4 py-3 text-left">Price</th>
              <th className="px-4 py-3 text-left">Image</th>
              <th className="px-4 py-3 text-left">Actions</th> {/* NEW */}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((r, idx) => (
              <tr
                key={r.id}
                className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
              >
                <td className="px-4 py-3">
                  {r.createdAt?.toDate ? r.createdAt.toDate().toLocaleString() : ''}
                </td>
                <td className="px-4 py-3">{r._orderStatus || '-'}</td>
                <td className="px-4 py-3">{r.productId}</td>
                <td className="px-4 py-3">{r.change}</td>
                <td className="px-4 py-3">{r.reason || '-'}</td>
                <td className="px-4 py-3">{r._orderId || r.referenceId || '-'}</td>
                <td className="px-4 py-3">{r._orderPublicId || '-'}</td>
                <td className="px-4 py-3">{r.item?.name || '-'}</td>
                <td className="px-4 py-3">{r.item?.sku || '-'}</td>
                <td className="px-4 py-3">
                  {typeof r.item?.qty === 'number' ? r.item.qty : '-'}
                </td>
                <td className="px-4 py-3">
                  {typeof r.item?.price === 'number' ? `₹${r.item.price.toFixed(2)}` : '-'}
                </td>
                <td className="px-4 py-3">
                  {r.item?.image ? (
                    <img
                      src={r.item.image}
                      alt={r.item?.name || 'Item'}
                      className="h-10 w-10 rounded object-cover border"
                    />
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onDelete(r.id)}
                    disabled={!!deleting[r.id]}
                    className={`text-sm rounded-md px-3 py-1 border ${
                      deleting[r.id]
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'border-red-500 text-red-700 hover:bg-red-50'
                    }`}
                    title="Delete ledger row"
                  >
                    {deleting[r.id] ? 'Deleting…' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
            {displayRows.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={13}>
                  No ledger entries found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
