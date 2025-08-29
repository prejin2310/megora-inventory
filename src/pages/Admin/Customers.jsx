import React, { useEffect, useMemo, useState } from 'react'
import { createCustomer, listCustomers, deleteCustomer } from '../../firebase/firestore'
import CustomerForm from '../../components/customers/CustomerForm'

function usePagination(data, initialPageSize = 10) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)

  const total = data.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  useEffect(() => {
    // Clamp page within range when data or pageSize changes
    setPage(p => Math.min(Math.max(1, p), pageCount))
  }, [total, pageSize, pageCount])

  const start = (page - 1) * pageSize
  const end = start + pageSize
  const slice = data.slice(start, end)

  const setNext = () => setPage(p => Math.min(p + 1, pageCount))
  const setPrev = () => setPage(p => Math.max(p - 1, 1))
  const setPageSafe = (n) => setPage(Math.min(Math.max(1, n), pageCount))

  const pages = useMemo(() => {
    // simple range, can add ellipsis if needed
    return Array.from({ length: pageCount }, (_, i) => i + 1)
  }, [pageCount])

  return { page, pageSize, setPageSize, setNext, setPrev, setPage: setPageSafe, pageCount, total, slice, start, end }
}

export default function Customers() {
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [confirm, setConfirm] = useState({ open: false, id: null, name: '' })

  const refresh = async () => {
    setError('')
    try {
      const list = await listCustomers()
      // Normalize fields to avoid undefined in table
      setItems(list.map(c => ({
        id: c.id,
        name: c.name || '-',
        email: c.email || '-',
        phone: c.phone || '-',
        address: c.address || '-',
      })))
    } catch (e) {
      console.error('Customers load error:', e)
      setError(e.message || 'Failed to load customers')
    }
  }

  useEffect(() => { refresh() }, [])

  const onAdd = async (data) => {
    setError('')
    setCreating(true)
    try {
      await createCustomer(data)
      await refresh()
    } catch (e) {
      console.error('Create customer error:', e)
      setError(e.message || 'Failed to create customer')
    } finally {
      setCreating(false)
    }
  }

  const onDelete = async (id) => {
    setError('')
    setDeletingId(id)
    try {
      await deleteCustomer(id)
      await refresh()
    } catch (e) {
      console.error('Delete customer error:', e)
      setError(e.message || 'Failed to delete customer')
    } finally {
      setDeletingId(null)
    }
  }

  const { page, pageSize, setPageSize, setNext, setPrev, setPage, pageCount, total, slice, start, end } =
    usePagination(items, 10)

  return (
    <div className="cust-wrap">
      <div className="cust-head">
        <h1 className="cust-title">Customers</h1>
        <div className="grow" />
        <div className="cust-meta">
          <span className="muted">{total} total</span>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="cust-grid">
        {/* Left: form */}
        <section className="card">
          <CustomerForm onSubmit={onAdd} loading={creating} />
        </section>

        {/* Right: table */}
        <section className="card">
          <div className="sec-head">
            <h2 className="sec-title">Customer List</h2>
            <div className="table-controls">
              <label className="psel">
                <span className="muted">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </label>
            </div>
          </div>

          <div className="table-wrap">
            <table className="rt">
              <thead>
                <tr>
                  <th>Name</th>
                  <th className="hide-sm">Email</th>
                  <th>Phone</th>
                  <th className="hide-sm">Address</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {slice.map((c) => (
                  <tr key={c.id}>
                    <td data-th="Name">{c.name}</td>
                    <td data-th="Email" className="hide-sm">{c.email}</td>
                    <td data-th="Phone">{c.phone}</td>
                    <td data-th="Address" className="hide-sm">{c.address}</td>
                    <td className="right" data-th="Actions">
                      <button
                        className="btn danger"
                        onClick={() => setConfirm({ open: true, id: c.id, name: c.name })}
                        disabled={deletingId === c.id}
                        title="Delete customer"
                      >
                        {deletingId === c.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}

                {slice.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty">No customers to show</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="pager">
            <button className="pg-btn" onClick={setPrev} disabled={page <= 1}>Prev</button>
            <div className="pg-pages">
              {Array.from({ length: pageCount }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  className={`pg-num ${n === page ? 'active' : ''}`}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <button className="pg-btn" onClick={setNext} disabled={page >= pageCount}>Next</button>
          </div>

          <div className="pager-meta muted">
            Showing {total === 0 ? 0 : start + 1}–{Math.min(end, total)} of {total}
          </div>
        </section>
      </div>

      {/* Delete confirm modal */}
      {confirm.open && (
        <div className="modal" role="dialog" aria-modal="true" onClick={() => setConfirm({ open: false, id: null, name: '' })}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">Delete customer</div>
              <button className="x" onClick={() => setConfirm({ open: false, id: null, name: '' })}>×</button>
            </div>
            <div className="modal-body">
              Are you sure you want to delete “{confirm.name}”? This action cannot be undone.
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => setConfirm({ open: false, id: null, name: '' })}>Cancel</button>
              <button
                className="btn danger"
                onClick={async () => {
                  const id = confirm.id
                  setConfirm({ open: false, id: null, name: '' })
                  await onDelete(id)
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        :root {
          --ink: #0f172a;
          --muted: #64748b;
          --bg: #f8fafc;
          --card: #ffffff;
          --line: #e5e7eb;
          --brand: #024F3D;
        }
        .cust-wrap { color: var(--ink); }
        .cust-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .cust-title { margin: 0; font-size: 20px; font-weight: 900; }
        .muted { color: var(--muted); }
        .grow { flex: 1; }

        .cust-grid {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 12px;
        }
        @media (max-width: 900px) {
          .cust-grid { grid-template-columns: 1fr; }
        }

        .card {
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 12px;
          box-shadow: 0 8px 28px rgba(15,23,42,.06);
        }
        .sec-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .sec-title { margin: 0; font-size: 16px; font-weight: 800; }
        .table-controls { margin-left: auto; display: flex; align-items: center; gap: 8px; }
        .psel select { border: 1px solid var(--line); border-radius: 8px; padding: 4px 8px; background: #fff; }

        .alert {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #7f1d1d;
          padding: 8px 10px;
          border-radius: 10px;
          margin-bottom: 10px;
        }

        .table-wrap { width: 100%; overflow-x: auto; }
        table.rt { width: 100%; border-collapse: collapse; }
        .rt th, .rt td { text-align: left; padding: 10px 8px; border-bottom: 1px dashed var(--line); vertical-align: top; }
        .rt thead th { font-weight: 800; font-size: 13px; color: var(--ink); background: #f8fafc; position: sticky; top: 0; z-index: 1; }
        .rt tbody tr:hover { background: #fafafa; }
        .right { text-align: right; }

        /* Mobile responsive rows: show labels per cell when headers hidden */
        @media (max-width: 640px) {
          .hide-sm { display: none; }
          .rt thead { display: none; }
          .rt, .rt tbody, .rt tr, .rt td { display: block; width: 100%; }
          .rt tr { border: 1px dashed var(--line); border-radius: 12px; padding: 8px 10px; margin-bottom: 8px; background: #fff; }
          .rt td { border-bottom: none; display: grid; grid-template-columns: 120px 1fr; gap: 8px; }
          .rt td::before {
            content: attr(data-th);
            font-weight: 700;
            color: var(--muted);
          }
          .right { text-align: left; }
        }

        .btn {
          border: 1px solid var(--line);
          background: #fff;
          color: var(--ink);
          border-radius: 10px;
          padding: 8px 10px;
          font-weight: 700;
        }
        .btn:hover { background: #f9fafb; }
        .btn.danger {
          border-color: #fecaca;
          background: #fff5f5;
          color: #991b1b;
        }
        .btn.danger:hover { background: #ffecec; }

        .pager { display: flex; align-items: center; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
        .pg-btn {
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 6px 10px;
          background: #fff;
        }
        .pg-pages { display: flex; gap: 6px; flex-wrap: wrap; }
        .pg-num {
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 6px 10px;
          background: #fff;
        }
        .pg-num.active {
          border-color: rgba(2,79,61,.35);
          background: #f2fbf8;
          color: var(--brand);
          font-weight: 800;
        }
        .pager-meta { margin-top: 4px; font-size: 12px; }

        /* Modal */
        .modal {
          position: fixed; inset: 0; z-index: 50;
          display: grid; place-items: center;
          background: rgba(15,23,42,.5);
        }
        .modal-card {
          width: min(520px, 92vw);
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 14px;
          box-shadow: 0 24px 60px rgba(2,79,61,.18);
          display: grid; grid-template-rows: auto 1fr auto;
        }
        .modal-head {
          display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 8px;
          padding: 10px 12px; border-bottom: 1px solid var(--line); background: #f8fafc;
          border-top-left-radius: 14px; border-top-right-radius: 14px;
        }
        .modal-title { font-weight: 800; }
        .modal-body { padding: 12px; }
        .modal-foot { padding: 10px 12px; border-top: 1px solid var(--line); display: flex; gap: 8px; justify-content: flex-end; }
        .x {
          appearance: none; background: #fff; border: 1px solid var(--line); border-radius: 8px;
          width: 28px; height: 28px; line-height: 24px; text-align: center; font-size: 18px; cursor: pointer;
        }
      `}</style>
    </div>
  )
}


