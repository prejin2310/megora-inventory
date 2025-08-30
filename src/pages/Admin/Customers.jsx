import React, { useEffect, useMemo, useState } from 'react'
import { createCustomer, listCustomers, deleteCustomer, updateCustomer } from '../../firebase/firestore'
import CustomerForm from '../../components/customers/CustomerForm'

function usePagination(data, initialPageSize = 10) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const total = data.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  useEffect(() => {
    setPage(p => Math.min(Math.max(1, p), pageCount))
  }, [total, pageSize, pageCount])
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const slice = data.slice(start, end)
  const setNext = () => setPage(p => Math.min(p + 1, pageCount))
  const setPrev = () => setPage(p => Math.max(p - 1, 1))
  const setPageSafe = (n) => setPage(Math.min(Math.max(1, n), pageCount))
  const pages = useMemo(() => Array.from({ length: pageCount }, (_, i) => i + 1), [pageCount])
  return { page, pageSize, setPageSize, setNext, setPrev, setPage: setPageSafe, pageCount, total, slice, start, end }
}

export default function Customers() {
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [confirm, setConfirm] = useState({ open: false, id: null, name: '' })
  const [edit, setEdit] = useState({ open: false, customer: null })

  const refresh = async () => {
    setError('')
    try {
      const list = await listCustomers()
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

  const onEditSave = async (form) => {
    setError('')
    if (!form?.id) return
    try {
      await updateCustomer(form.id, {
        name: (form.name || '').trim(),
        email: (form.email || '').trim(),
        phone: (form.phone || '').trim(),
        address: (form.address || '').trim(),
      })
      setEdit({ open: false, customer: null })
      await refresh()
    } catch (e) {
      console.error('Update customer error:', e)
      setError(e.message || 'Failed to update customer')
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
                      <div className="row-actions">
                        <button
                          className="btn"
                          onClick={() => setEdit({ open: true, customer: c })}
                          title="Edit customer"
                        >
                          Edit
                        </button>
                        <button
                          className="btn danger"
                          onClick={() => setConfirm({ open: true, id: c.id, name: c.name })}
                          disabled={deletingId === c.id}
                          title="Delete customer"
                        >
                          {deletingId === c.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
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

      {/* Delete confirm modal (aligned like Products.jsx) */}
      {confirm.open && (
        <DeleteConfirmModal
          confirm={confirm}
          setConfirm={setConfirm}
          onDelete={onDelete}
        />
      )}

      {/* Edit customer modal */}
      <EditCustomerModal
        open={edit.open}
        customer={edit.customer}
        onClose={() => setEdit({ open: false, customer: null })}
        onSave={onEditSave}
      />

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
        .cust-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 12px; }
        @media (max-width: 900px) { .cust-grid { grid-template-columns: 1fr; } }
        .card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 12px; box-shadow: 0 8px 28px rgba(15,23,42,.06); }
        .sec-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .sec-title { margin: 0; font-size: 16px; font-weight: 800; }
        .table-controls { margin-left: auto; display: flex; align-items: center; gap: 8px; }
        .psel select { border: 1px solid var(--line); border-radius: 8px; padding: 4px 8px; background: #fff; }
        .alert { background: #fef2f2; border: 1px solid #fecaca; color: #7f1d1d; padding: 8px 10px; border-radius: 10px; margin-bottom: 10px; }
        .table-wrap { width: 100%; overflow-x: auto; }
        table.rt { width: 100%; border-collapse: collapse; }
        .rt th, .rt td { text-align: left; padding: 10px 8px; border-bottom: 1px dashed var(--line); vertical-align: top; }
        .rt thead th { font-weight: 800; font-size: 13px; color: var(--ink); background: #f8fafc; position: sticky; top: 0; z-index: 1; }
        .rt tbody tr:hover { background: #fafafa; }
        .right { text-align: right; }
        .row-actions { display: inline-flex; gap: 8px; }
        @media (max-width: 640px) {
          .hide-sm { display: none; }
          .rt thead { display: none; }
          .rt, .rt tbody, .rt tr, .rt td { display: block; width: 100%; }
          .rt tr { border: 1px dashed var(--line); border-radius: 12px; padding: 8px 10px; margin-bottom: 8px; background: #fff; }
          .rt td { border-bottom: none; display: grid; grid-template-columns: 120px 1fr; gap: 8px; }
          .rt td::before { content: attr(data-th); font-weight: 700; color: var(--muted); }
          .right { text-align: left; }
        }
        .btn { border: 1px solid var(--line); background: #fff; color: var(--ink); border-radius: 10px; padding: 8px 10px; font-weight: 700; }
        .btn:hover { background: #f9fafb; }
        .btn.danger { border-color: #fecaca; background: #fff5f5; color: #991b1b; }
        .btn.danger:hover { background: #ffecec; }
        .pager { display: flex; align-items: center; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
        .pg-btn { border: 1px solid var(--line); border-radius: 8px; padding: 6px 10px; background: #fff; }
        .pg-pages { display: flex; gap: 6px; flex-wrap: wrap; }
        .pg-num { border: 1px solid var(--line); border-radius: 8px; padding: 6px 10px; background: #fff; }
        .pg-num.active { border-color: rgba(2,79,61,.35); background: #f2fbf8; color: var(--brand); font-weight: 800; }
        .pager-meta { margin-top: 4px; font-size: 12px; }

        /* Shared modal styles (aligned with Products) */
        .apm-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,.45); display: grid; place-items: center; z-index: 50; padding: 16px; }
        .apm-modal { width: min(600px, 96vw); background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 24px 64px rgba(0,0,0,.18); overflow: hidden; }
        .apm-head { display: flex; align-items: center; gap: 8px; padding: 12px; border-bottom: 1px solid #eef0f2; background: #f8fafc; }
        .apm-title { font-weight: 800; }
        .apm-x { margin-left: auto; width: 28px; height: 28px; border: 1px solid #e2e8f0; background: #f1f5f9; border-radius: 8px; cursor: pointer; }
        .apm-body { padding: 12px; }
        .apm-foot { display: flex; justify-content: flex-end; gap: 8px; padding: 10px 12px; border-top: 1px solid #eef0f2; }
        .apm-grid { display: grid; gap: 12px; grid-template-columns: 1fr 1fr; }
        .apm-field { display: grid; gap: 4px; }
        .apm-field label { font-size: 12px; color: #6b7280; }
        .apm-field input, .apm-field textarea { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; font-size: 14px; outline: none; }
        .apm-field input:focus, .apm-field textarea:focus { border-color: #94a3b8; box-shadow: 0 0 0 3px rgba(14,165,233,.12); }
        .apm-col-span { grid-column: 1 / -1; }
        @media (max-width: 720px) { .apm-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  )
}

/* DeleteConfirmModal reused from Products style */
function DeleteConfirmModal({ confirm, setConfirm, onDelete }) {
  return (
    <div className="apm-backdrop" onClick={() => setConfirm({ open: false, id: null, name: '' })}>
      <div className="apm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="apm-head">
          <div className="apm-title">Delete Customer</div>
          <button
            className="apm-x"
            onClick={() => setConfirm({ open: false, id: null, name: '' })}
          >
            ×
          </button>
        </div>
        <div className="apm-body">
          Are you sure you want to delete “{confirm.name}”? This action cannot be undone.
        </div>
        <div className="apm-foot">
          <button
            className="btn"
            onClick={() => setConfirm({ open: false, id: null, name: '' })}
          >
            Cancel
          </button>
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
  )
}

/* Edit customer modal */
function EditCustomerModal({ open, customer, onClose, onSave }) {
  const [form, setForm] = useState(customer || {})

  useEffect(() => {
    setForm(customer || {})
  }, [customer])

  if (!open) return null

  const change = (k) => (e) => {
    const v = e?.target?.value ?? ''
    setForm(s => ({ ...s, [k]: v }))
  }

  const submit = async (e) => {
    e.preventDefault()
    await onSave(form)
  }

  return (
    <div className="apm-backdrop" onClick={onClose}>
      <div className="apm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="apm-head">
          <div className="apm-title">Edit Customer</div>
          <button className="apm-x" onClick={onClose}>×</button>
        </div>
        <form className="apm-body" onSubmit={submit}>
          <div className="apm-grid">
            <div className="apm-field">
              <label>Name</label>
              <input value={form.name || ''} onChange={change('name')} required />
            </div>
            <div className="apm-field">
              <label>Email</label>
              <input type="email" value={form.email || ''} onChange={change('email')} />
            </div>
            <div className="apm-field">
              <label>Phone</label>
              <input value={form.phone || ''} onChange={change('phone')} />
            </div>
            <div className="apm-field apm-col-span">
              <label>Address</label>
              <textarea rows={3} value={form.address || ''} onChange={change('address')} />
            </div>
          </div>
          <div className="apm-foot">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn">Save</button>
          </div>
        </form>
      </div>
    </div>
  )
}
