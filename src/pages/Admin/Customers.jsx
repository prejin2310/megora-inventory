import React, { useEffect, useMemo, useState } from "react"
import {
  createCustomer,
  listCustomers,
  deleteCustomer,
  updateCustomer,
} from "../../firebase/firestore"
import CustomerForm from "../../components/customers/CustomerForm"

function usePagination(data, initialPageSize = 10) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const total = data.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), pageCount))
  }, [total, pageSize, pageCount])
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const slice = data.slice(start, end)
  const setNext = () => setPage((p) => Math.min(p + 1, pageCount))
  const setPrev = () => setPage((p) => Math.max(p - 1, 1))
  const setPageSafe = (n) => setPage(Math.min(Math.max(1, n), pageCount))
  const pages = useMemo(
    () => Array.from({ length: pageCount }, (_, i) => i + 1),
    [pageCount]
  )
  return {
    page,
    pageSize,
    setPageSize,
    setNext,
    setPrev,
    setPage: setPageSafe,
    pageCount,
    total,
    slice,
    start,
    end,
  }
}

export default function Customers() {
  const [items, setItems] = useState([])
  const [error, setError] = useState("")
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [confirm, setConfirm] = useState({ open: false, id: null, name: "" })
  const [edit, setEdit] = useState({ open: false, customer: null })

  const refresh = async () => {
    setError("")
    try {
      const list = await listCustomers()
      setItems(
        list.map((c) => ({
          id: c.id,
          name: c.name || "-",
          email: c.email || "-",
          phone: c.phone || "-",
          address: c.address || "-",
        }))
      )
    } catch (e) {
      console.error("Customers load error:", e)
      setError(e.message || "Failed to load customers")
    }
  }
  useEffect(() => {
    refresh()
  }, [])

  const onAdd = async (data) => {
    setError("")
    setCreating(true)
    try {
      await createCustomer(data)
      await refresh()
    } catch (e) {
      console.error("Create customer error:", e)
      setError(e.message || "Failed to create customer")
    } finally {
      setCreating(false)
    }
  }

  const onDelete = async (id) => {
    setError("")
    setDeletingId(id)
    try {
      await deleteCustomer(id)
      await refresh()
    } catch (e) {
      console.error("Delete customer error:", e)
      setError(e.message || "Failed to delete customer")
    } finally {
      setDeletingId(null)
    }
  }

  const onEditSave = async (form) => {
    setError("")
    if (!form?.id) return
    try {
      await updateCustomer(form.id, {
        name: (form.name || "").trim(),
        email: (form.email || "").trim(),
        phone: (form.phone || "").trim(),
        address: (form.address || "").trim(),
      })
      setEdit({ open: false, customer: null })
      await refresh()
    } catch (e) {
      console.error("Update customer error:", e)
      setError(e.message || "Failed to update customer")
    }
  }

  const {
    page,
    pageSize,
    setPageSize,
    setNext,
    setPrev,
    setPage,
    pageCount,
    total,
    slice,
    start,
    end,
  } = usePagination(items, 10)

  return (
    <div className="text-slate-900">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <h1 className="text-xl font-extrabold">Customers</h1>
        <div className="flex-1" />
        <span className="text-slate-500">{total} total</span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-2 rounded-md mb-3">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-[1fr_2fr] gap-4">
        {/* Left: form */}
        <section className="bg-white border border-slate-200 rounded-xl shadow p-4">
          <CustomerForm onSubmit={onAdd} loading={creating} />
        </section>

        {/* Right: table */}
        <section className="bg-white border border-slate-200 rounded-xl shadow p-4">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-bold">Customer List</h2>
            <div className="ml-auto flex items-center gap-2">
              <label className="flex items-center gap-2 text-slate-500">
                Rows:
                <select
                  className="border border-slate-300 rounded-md px-2 py-1 text-sm"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  {[5, 10, 20, 50].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-slate-50">
                <tr className="text-left text-sm font-semibold text-slate-700">
                  <th className="p-2">Name</th>
                  <th className="p-2 hidden sm:table-cell">Email</th>
                  <th className="p-2">Phone</th>
                  <th className="p-2 hidden sm:table-cell">Address</th>
                  <th className="p-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {slice.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-dashed border-slate-200 hover:bg-slate-50 text-sm"
                  >
                    <td className="p-2">{c.name}</td>
                    <td className="p-2 hidden sm:table-cell">{c.email}</td>
                    <td className="p-2">{c.phone}</td>
                    <td className="p-2 hidden sm:table-cell">{c.address}</td>
                    <td className="p-2 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          className="px-3 py-1 rounded-md border border-slate-300 text-slate-700 text-sm hover:bg-slate-100"
                          onClick={() => setEdit({ open: true, customer: c })}
                        >
                          Edit
                        </button>
                        <button
                          className="px-3 py-1 rounded-md border border-red-300 text-red-700 bg-red-50 text-sm hover:bg-red-100 disabled:opacity-50"
                          onClick={() =>
                            setConfirm({ open: true, id: c.id, name: c.name })
                          }
                          disabled={deletingId === c.id}
                        >
                          {deletingId === c.id ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {slice.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-4 text-slate-500 text-sm"
                    >
                      No customers to show
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <button
              className="px-3 py-1 border rounded-md text-sm disabled:opacity-50"
              onClick={setPrev}
              disabled={page <= 1}
            >
              Prev
            </button>
            <div className="flex gap-1">
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  className={`px-3 py-1 border rounded-md text-sm ${
                    n === page
                      ? "bg-emerald-50 border-emerald-300 text-emerald-700 font-bold"
                      : "bg-white border-slate-300"
                  }`}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <button
              className="px-3 py-1 border rounded-md text-sm disabled:opacity-50"
              onClick={setNext}
              disabled={page >= pageCount}
            >
              Next
            </button>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Showing {total === 0 ? 0 : start + 1}–{Math.min(end, total)} of{" "}
            {total}
          </div>
        </section>
      </div>

      {/* Modals */}
      {confirm.open && (
        <DeleteConfirmModal
          confirm={confirm}
          setConfirm={setConfirm}
          onDelete={onDelete}
        />
      )}
      <EditCustomerModal
        open={edit.open}
        customer={edit.customer}
        onClose={() => setEdit({ open: false, customer: null })}
        onSave={onEditSave}
      />
    </div>
  )
}

/* Delete Confirm Modal */
function DeleteConfirmModal({ confirm, setConfirm, onDelete }) {
  return (
    <div
      className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4"
      onClick={() => setConfirm({ open: false, id: null, name: "" })}
    >
      <div
        className="bg-white rounded-lg shadow-lg max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-2 border-b bg-slate-50">
          <h3 className="font-bold">Delete Customer</h3>
          <button
            className="ml-auto w-7 h-7 rounded-md border text-lg hover:bg-slate-100"
            onClick={() => setConfirm({ open: false, id: null, name: "" })}
          >
            ×
          </button>
        </div>
        <div className="px-4 py-3 text-sm">
          Are you sure you want to delete{" "}
          <span className="font-semibold">{confirm.name}</span>? This action
          cannot be undone.
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t">
          <button
            className="px-3 py-1 border rounded-md text-sm"
            onClick={() => setConfirm({ open: false, id: null, name: "" })}
          >
            Cancel
          </button>
          <button
            className="px-3 py-1 border border-red-300 bg-red-50 text-red-700 rounded-md text-sm hover:bg-red-100"
            onClick={async () => {
              const id = confirm.id
              setConfirm({ open: false, id: null, name: "" })
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

/* Edit Customer Modal */
function EditCustomerModal({ open, customer, onClose, onSave }) {
  const [form, setForm] = useState(customer || {})

  useEffect(() => {
    setForm(customer || {})
  }, [customer])

  if (!open) return null

  const change = (k) => (e) => {
    const v = e?.target?.value ?? ""
    setForm((s) => ({ ...s, [k]: v }))
  }

  const submit = async (e) => {
    e.preventDefault()
    await onSave(form)
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-lg max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-2 border-b bg-slate-50">
          <h3 className="font-bold">Edit Customer</h3>
          <button
            className="ml-auto w-7 h-7 rounded-md border text-lg hover:bg-slate-100"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <form className="p-4 space-y-3" onSubmit={submit}>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500">Name</label>
              <input
                className="border rounded-md px-3 py-2 text-sm"
                value={form.name || ""}
                onChange={change("name")}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500">Email</label>
              <input
                type="email"
                className="border rounded-md px-3 py-2 text-sm"
                value={form.email || ""}
                onChange={change("email")}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500">Phone</label>
              <input
                className="border rounded-md px-3 py-2 text-sm"
                value={form.phone || ""}
                onChange={change("phone")}
              />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs text-slate-500">Address</label>
              <textarea
                rows={3}
                className="border rounded-md px-3 py-2 text-sm"
                value={form.address || ""}
                onChange={change("address")}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t pt-3">
            <button
              type="button"
              className="px-3 py-1 border rounded-md text-sm"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 border rounded-md text-sm bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
