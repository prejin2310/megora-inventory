import React, { useEffect, useMemo, useRef, useState } from "react"
import {
  listProducts,
  listCustomers,
  createCustomer,
  createOrder,
  updateProductStock, // atomic increment/decrement
  // decrementProductStockGuarded, // Optional stricter server-side guard (if you add it in firestore.js)
  // subscribeProducts, // Optional real-time products (if you enable it in firestore.js)
} from "../../firebase/firestore"
import { Dialog } from "@headlessui/react"
import {
  XMarkIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline"
import Button from "../ui/Button"

export default function OrderForm({ open = true, onClose, onCreated }) {
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])

  // Customer states
  const [customerId, setCustomerId] = useState("")
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  })
  const [match, setMatch] = useState(null)
  const [showMatchPrompt, setShowMatchPrompt] = useState(false)

  // Items
  const [search, setSearch] = useState("")
  const [selectedProductId, setSelectedProductId] = useState("")
  const [qty, setQty] = useState("1")
  const [items, setItems] = useState([])

  // Meta
  const [channel, setChannel] = useState("Manual")
  const [notes, setNotes] = useState("")
  const [shipAmount, setShipAmount] = useState("0")

  // Discount state
  const [discAmount, setDiscAmount] = useState("0")
  const [discPct, setDiscPct] = useState("")
  const [lastEdited, setLastEdited] = useState("amount")

  // Payment
  const [payMode, setPayMode] = useState("COD")
  const [payStatus, setPayStatus] = useState("Pending")
  const [payTxn, setPayTxn] = useState("")

  // UI
  const [error, setError] = useState("")
  const [formHint, setFormHint] = useState("")
  const [saving, setSaving] = useState(false)

  const closeButtonRef = useRef(null)
  const debounceRef = useRef(null)

  // Load initial data
  useEffect(() => {
    if (!open) return
    ;(async () => {
      try {
        const [p, c] = await Promise.all([listProducts(), listCustomers()])
        setProducts(p)
        setCustomers(c)
      } catch (e) {
        console.error("OrderForm load error:", e)
        setError(e.message || "Failed to load data")
      }
    })()
  }, [open])

  // Optional: live product updates while dialog is open
  // Uncomment if subscribeProducts is exported from firestore.js
  /*
  useEffect(() => {
    if (!open) return
    let unsub
    try {
      unsub = subscribeProducts((items) => setProducts(items))
    } catch (e) {
      console.warn("subscribeProducts failed", e)
    }
    return () => unsub?.()
  }, [open])
  */

  // Reset on close
  useEffect(() => {
    if (!open) {
      setCustomerId("")
      setNewCustomer({ name: "", email: "", phone: "", address: "" })
      setMatch(null)
      setShowMatchPrompt(false)
      setSearch("")
      setSelectedProductId("")
      setQty("1")
      setItems([])
      setChannel("Manual")
      setNotes("")
      setShipAmount("0")
      setDiscAmount("0")
      setDiscPct("")
      setLastEdited("amount")
      setPayMode("COD")
      setPayStatus("Pending")
      setPayTxn("")
      setError("")
      setFormHint("")
      setSaving(false)
    }
  }, [open])

  // Filter products by search
  const filteredProducts = useMemo(() => {
    const q = (search || "").trim().toLowerCase()
    if (!q) return products
    return products.filter((p) =>
      [p.sku, p.name, p.category].some((val) =>
        String(val || "").toLowerCase().includes(q)
      )
    )
  }, [products, search])

  // Debounced customer duplicate lookup
  const findExistingInMemory = (emailRaw, phoneRaw) => {
    const email = (emailRaw || "").trim().toLowerCase()
    const phone = (phoneRaw || "").trim()
    if (!email && !phone) return null
    if (phone) {
      const byPhone = customers.find((c) => String(c.phone || "") === phone)
      if (byPhone) return byPhone
    }
    if (email) {
      const byEmail = customers.find(
        (c) => String(c.email || "").trim().toLowerCase() === email
      )
      if (byEmail) return byEmail
    }
    return null
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const hit = findExistingInMemory(newCustomer.email, newCustomer.phone)
      setMatch(hit || null)
      setShowMatchPrompt(!!hit)
      setFormHint(hit ? "Existing customer detected" : "")
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [newCustomer.email, newCustomer.phone, customers])

  // Items helpers
  const addItem = () => {
    const p = filteredProducts.find((x) => x.id === selectedProductId)
    if (!p) return
    const qn = Math.max(1, Number(qty || 1))
    setItems((prev) => [
      ...prev,
      {
        sku: p.sku,
        name: p.name,
        price: Number(p.price || 0),
        qty: qn,
        _origPrice: Number(p.price || 0),
        editing: false,
        productId: p.id || null,
        image: p.image || "",
        key: `${p.id}-${Date.now()}`,
      },
    ])
    setQty("1")
    setSelectedProductId("")
  }
  const removeItem = (key) =>
    setItems((prev) => prev.filter((x) => x.key !== key))
  const toggleEditPrice = (key, on) =>
    setItems((prev) =>
      prev.map((it) => (it.key === key ? { ...it, editing: on } : it))
    )
  const changePrice = (key, value) =>
    setItems((prev) =>
      prev.map((it) => (it.key === key ? { ...it, price: value } : it))
    )
  const savePrice = (key) =>
    setItems((prev) =>
      prev.map((it) =>
        it.key === key ? { ...it, price: Number(it.price), editing: false } : it
      )
    )
  const cancelPrice = (key) =>
    setItems((prev) =>
      prev.map((it) =>
        it.key === key ? { ...it, price: it._origPrice, editing: false } : it
      )
    )

  // Totals
  const subtotal = items.reduce(
    (s, it) => s + Number(it.price) * Number(it.qty),
    0
  )
  const shippingNum = Number(shipAmount || 0)

  // Discount math
  const effectiveDiscAmount = useMemo(() => {
    const pct = Math.max(0, Math.min(100, Number(discPct || 0)))
    if (lastEdited === "percent") {
      const calc = (subtotal * pct) / 100
      return Math.min(calc, subtotal)
    }
    const amt = Math.max(0, Number(discAmount || 0))
    return Math.min(amt, subtotal)
  }, [discAmount, discPct, lastEdited, subtotal])

  const discountNum = effectiveDiscAmount
  const grandTotal = subtotal + shippingNum - discountNum

  // Discount handlers
  const onDiscAmountChange = (v) => {
    setLastEdited("amount")
    setDiscAmount(v)
    const amt = Math.max(0, Number(v || 0))
    const pct = subtotal > 0 ? Math.min(100, (amt / subtotal) * 100) : 0
    setDiscPct(subtotal > 0 ? String(Math.round(pct * 100) / 100) : "")
  }
  const onDiscPctChange = (v) => {
    setLastEdited("percent")
    const pct = Math.max(0, Math.min(100, Number(v || 0)))
    setDiscPct(String(pct))
    const amt = (subtotal * pct) / 100
    setDiscAmount(String(Math.round(amt * 100) / 100))
  }

  // Payment behavior: COD => enforce Unpaid and disable txn
  useEffect(() => {
    if (payMode === "COD") {
      if (payStatus !== "Unpaid") setPayStatus("Unpaid")
      if (payTxn) setPayTxn("")
    }
  }, [payMode])
  useEffect(() => {
    if (payMode === "COD" && payStatus !== "Unpaid") {
      setPayStatus("Unpaid")
    }
  }, [payStatus, payMode])

  // Validation helpers
  const emailValid =
    !newCustomer.email ||
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCustomer.email.trim())
  const phoneValid =
    !newCustomer.phone || /^\d{10}$/.test(newCustomer.phone.trim())
  const canSubmit = items.length > 0 && emailValid && phoneValid && !saving

  const keepExisting = () => {
    if (!match) return
    setCustomerId(match.id || "")
    setNewCustomer({
      name: match.name || "",
      email: match.email || "",
      phone: match.phone || "",
      address: match.address || "",
    })
    setShowMatchPrompt(false)
    setFormHint("Using existing customer")
  }
  const editExisting = () => {
    if (!match) return
    setCustomerId(match.id || "")
    setNewCustomer({
      name: match.name || "",
      email: match.email || "",
      phone: match.phone || "",
      address: match.address || "",
    })
    setShowMatchPrompt(false)
    setFormHint("Editing existing customer details")
  }
  const createNewInstead = () => {
    setCustomerId("")
    setShowMatchPrompt(false)
    setFormHint("Will create a new customer on save")
  }

  const save = async () => {
    setError("")
    setFormHint("")
    if (!items.length) {
      setError("Add at least one item")
      return
    }
    if (!emailValid) {
      setError("Invalid email format")
      return
    }
    if (!phoneValid) {
      setError("Phone must be 10 digits")
      return
    }

    // 0) Ensure every line has productId (prevents silent skip of stock update)
    if (items.some((it) => !it.productId)) {
      setError(
        "Some items are not linked to products. Remove and re-add from the selector so each line has a productId."
      )
      return
    }

    // 1) Validate inventory before creating order (client-side check)
    for (const it of items) {
      const p = products.find((x) => x.id === it.productId)
      const wanted = Number(it.qty || 0)
      if (!p) {
        setError(`Product not found for "${it?.name || it?.sku || "item"}"`)
        return
      }
      if (!Number.isFinite(wanted) || wanted <= 0) {
        setError(`Invalid quantity for "${p.name}"`)
        return
      }
      const available = Number(p.stock ?? 0)
      if (!Number.isFinite(available)) {
        setError(`Inventory not configured for "${p.name}"`)
        return
      }
      if (available < wanted) {
        setError(
          `Not enough stock for "${p.name}". Available: ${available}, requested: ${wanted}`
        )
        return
      }
    }

    setSaving(true)
    try {
      let finalCustomerId = customerId
      let customerSnap = null

      if (finalCustomerId) {
        const c = customers.find((c) => c.id === finalCustomerId)
        if (c) customerSnap = { ...c }
      } else {
        const hit = findExistingInMemory(newCustomer.email, newCustomer.phone)
        if (hit) {
          finalCustomerId = hit.id
          customerSnap = { ...hit }
        } else {
          const addressLine = (newCustomer.address || "").trim()
          const ref = await createCustomer({
            ...newCustomer,
            address: addressLine,
          })
          finalCustomerId = ref.id
          customerSnap = { ...newCustomer, address: addressLine }
        }
      }

      const payloadItems = items.map((it) => ({
        sku: it.sku,
        name: it.name,
        price: it.price,
        qty: it.qty,
        image: it.image || "",
        productId: it.productId || null,
      }))

      const payload = {
        customerId: finalCustomerId,
        customer: customerSnap,
        items: payloadItems,
        totals: {
          subtotal,
          shipping: shippingNum,
          discount: discountNum,
          ...(lastEdited === "percent"
            ? { discountPct: Number(discPct || 0) }
            : {}),
          grandTotal,
        },
        channel,
        notes,
        payment: { mode: payMode, status: payStatus, txnId: payTxn },
        shippingAddress: customerSnap?.address || newCustomer.address || "",
      }

      // 2) Create order
      const { id } = await createOrder(payload)

      // 3) Atomically decrement stock for each item; report failures clearly
      let decrementFailures = []
      try {
        await Promise.all(
          items
            .filter((it) => it.productId)
            .map(async (it) => {
              try {
                // Option A: atomic increment (current)
                await updateProductStock(it.productId, {
                  add: -Number(it.qty || 1),
                })

                // Option B: stricter guard (requires helper in firestore.js)
                // await decrementProductStockGuarded(it.productId, Number(it.qty || 1))
              } catch (e) {
                decrementFailures.push({
                  sku: it.sku,
                  name: it.name,
                  err: e?.message || String(e),
                })
              }
            })
        )
      } catch (e) {
        decrementFailures.push({
          sku: "unknown",
          name: "unknown",
          err: e?.message || String(e),
        })
      }

      if (decrementFailures.length > 0) {
        console.warn("Stock decrement issues:", decrementFailures)
        setFormHint(
          `Order created, but some stock updates failed: ` +
            decrementFailures
              .map((f) => `${f.sku || ""} ${f.name || ""}`)
              .join(", ") +
            `. Please adjust inventory manually in Products.`
        )
      }

      onCreated?.({ id })
      // Only auto-close if stock decrements succeeded
      if (decrementFailures.length === 0) {
        onClose?.()
      }
    } catch (e) {
      setError(e.message || "Failed to create order")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      initialFocus={closeButtonRef}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-slate-900/60" aria-hidden="true" />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-end sm:items-center justify-center p-2 sm:p-4">
          <Dialog.Panel className="w-full max-w-3xl bg-white rounded-xl shadow-2xl ring-1 ring-black/5">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-4 py-3">
              <Dialog.Title className="text-base sm:text-lg font-semibold text-gray-800">
                Create Order
              </Dialog.Title>
              <button
                ref={closeButtonRef}
                onClick={onClose}
                className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
                aria-label="Close"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6 space-y-6">
              {(error || formHint) && (
                <div className="space-y-2">
                  {error && (
                    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      <ExclamationTriangleIcon className="h-5 w-5 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}
                  {formHint && !error && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      <CheckCircleIcon className="h-5 w-5 mt-0.5" />
                      <span>{formHint}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Customer */}
              <section className="space-y-3">
                <h4 className="font-medium text-gray-900">Customer Info</h4>

                {/* Existing dropdown */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Select Existing Customer
                  </label>
                  <div className="relative">
                    <select
                      className="w-full rounded-lg border border-gray-300 pl-3 pr-8 py-2 text-sm focus:border-sky-400 focus:ring focus:ring-sky-200"
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                    >
                      <option value="">-- Choose Customer --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} — {c.phone}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-2 top-2.5 text-gray-500">
                      ▼
                    </span>
                  </div>
                </div>

                {/* New/Search fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Name
                    </label>
                    <div className="relative">
                      <UserIcon className="h-5 w-5 absolute left-2 top-2.5 text-gray-400" />
                      <input
                        className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:border-sky-400 focus:ring focus:ring-sky-200"
                        value={newCustomer.name}
                        onChange={(e) =>
                          setNewCustomer((s) => ({
                            ...s,
                            name: e.target.value,
                          }))
                        }
                        placeholder="Customer name"
                      />
                    </div>
                  </div>
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Email
                    </label>
                    <div className="relative">
                      <EnvelopeIcon className="h-5 w-5 absolute left-2 top-2.5 text-gray-400" />
                      <input
                        type="email"
                        className={`w-full rounded-lg border pl-9 pr-3 py-2 text-sm focus:border-sky-400 focus:ring focus:ring-sky-200 ${
                          newCustomer.email && !emailValid
                            ? "border-red-400 focus:border-red-400 focus:ring-red-200"
                            : "border-gray-300"
                        }`}
                        value={newCustomer.email}
                        onChange={(e) =>
                          setNewCustomer((s) => ({
                            ...s,
                            email: e.target.value,
                          }))
                        }
                        placeholder="name@example.com"
                      />
                    </div>
                    {newCustomer.email && !emailValid && (
                      <p className="mt-1 text-xs text-red-600">
                        Invalid email format
                      </p>
                    )}
                  </div>
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Phone
                    </label>
                    <div className="relative">
                      <PhoneIcon className="h-5 w-5 absolute left-2 top-2.5 text-gray-400" />
                      <input
                        inputMode="numeric"
                        pattern="\d*"
                        className={`w-full rounded-lg border pl-9 pr-3 py-2 text-sm focus:border-sky-400 focus:ring focus:ring-sky-200 ${
                          newCustomer.phone && !phoneValid
                            ? "border-red-400 focus:border-red-400 focus:ring-red-200"
                            : "border-gray-300"
                        }`}
                        value={newCustomer.phone}
                        onChange={(e) =>
                          setNewCustomer((s) => ({
                            ...s,
                            phone: e.target.value,
                          }))
                        }
                        placeholder="10-digit phone"
                        maxLength={10}
                      />
                    </div>
                    {newCustomer.phone && !phoneValid && (
                      <p className="mt-1 text-xs text-red-600">
                        Phone must be 10 digits
                      </p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Address
                    </label>
                    <div className="relative">
                      <MapPinIcon className="h-5 w-5 absolute left-2 top-2.5 text-gray-400" />
                      <textarea
                        rows={2}
                        className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:border-sky-400 focus:ring focus:ring-sky-200"
                        value={newCustomer.address}
                        onChange={(e) =>
                          setNewCustomer((s) => ({
                            ...s,
                            address: e.target.value,
                          }))
                        }
                        placeholder="Full address"
                      />
                    </div>
                  </div>
                </div>

                {/* Match prompt */}
                {showMatchPrompt && match && (
                  <div className="mt-1 p-3 rounded-lg border border-amber-200 bg-amber-50">
                    <div className="flex items-center gap-2 text-amber-900 text-sm mb-2">
                      <ExclamationTriangleIcon className="h-5 w-5" />
                      <span>
                        Existing customer found: <strong>{match.name}</strong>{" "}
                        (<span>{match.phone || match.email}</span>)
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={keepExisting} className="px-3 py-1.5">
                        Keep existing
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={editExisting}
                        className="px-3 py-1.5"
                      >
                        <PencilSquareIcon className="h-4 w-4 mr-1 inline" />
                        Edit existing
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={createNewInstead}
                        className="px-3 py-1.5"
                      >
                        Create new
                      </Button>
                    </div>
                  </div>
                )}
              </section>

              {/* Items */}
              <section className="space-y-3">
                <h4 className="font-medium text-gray-900">Order Items</h4>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <MagnifyingGlassIcon className="h-5 w-5 absolute left-2 top-2.5 text-gray-400" />
                    <input
                      className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:border-sky-400 focus:ring focus:ring-sky-200"
                      placeholder="Search product"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <select
                    className="flex-1 rounded-lg border border-gray-300 pl-3 pr-8 py-2 text-sm focus:border-sky-400 focus:ring focus:ring-sky-200"
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                  >
                    <option value="">Select product</option>
                    {filteredProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.sku} — {p.name} (₹{p.price})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    className="w-full sm:w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-400 focus:ring focus:ring-sky-200"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                  />
                  <Button onClick={addItem} disabled={!selectedProductId} className="px-4">
                    Add
                  </Button>
                </div>

                <div className="space-y-2">
                  {items.map((it) => (
                    <div
                      key={it.key}
                      className="border rounded-lg p-3 flex justify-between items-center"
                    >
                      <div className="flex items-center gap-3">
                        {it.image && (
                          <img
                            src={it.image}
                            alt={it.name}
                            className="w-12 h-12 rounded object-cover"
                          />
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{it.name}</div>
                          <div className="text-sm text-gray-500">
                            {it.qty} × ₹{it.price}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 items-center">
                        {!it.editing ? (
                          <>
                            <div className="text-sm font-medium">
                              ₹{Number(it.price).toFixed(2)}
                            </div>
                            <button
                              className="text-blue-600 text-sm hover:underline"
                              onClick={() => toggleEditPrice(it.key, true)}
                            >
                              Edit
                            </button>
                          </>
                        ) : (
                          <>
                            <input
                              type="number"
                              min="0"
                              className="w-24 rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-sky-400 focus:ring focus:ring-sky-200"
                              value={it.price}
                              onChange={(e) => changePrice(it.key, e.target.value)}
                            />
                            <button
                              className="text-green-600 text-sm hover:underline"
                              onClick={() => savePrice(it.key)}
                            >
                              Save
                            </button>
                            <button
                              className="text-gray-500 text-sm hover:underline"
                              onClick={() => cancelPrice(it.key)}
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        <button
                          className="text-red-600 text-sm hover:underline"
                          onClick={() => removeItem(it.key)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Channel */}
              <section className="space-y-2">
                <h4 className="font-medium text-gray-900">Channel</h4>
                <select
                  className="w-full rounded-lg border border-gray-300 pl-3 pr-8 py-2 text-sm focus:border-sky-400 focus:ring focus:ring-sky-200"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                >
                  <option value="Website">Website</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Collab">Collab</option>
                </select>
              </section>

              {/* Payment */}
              <section className="space-y-2">
                <h4 className="font-medium text-gray-900">Payment</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <select
                    className="w-full rounded-lg border border-gray-300 pl-3 pr-8 py-2 text-sm focus:border-sky-400 focus:ring focus:ring-sky-200"
                    value={payMode}
                    onChange={(e) => setPayMode(e.target.value)}
                  >
                    <option value="COD">COD</option>
                    <option value="Prepaid">UPI</option>
                    <option value="Bank Transfer">Net Banking</option>
                    <option value="Card">Debit/Credit</option>
                  </select>
                  <select
                    className="w-full rounded-lg border border-gray-300 pl-3 pr-8 py-2 text-sm focus:border-sky-400 focus:ring focus:ring-sky-200"
                    value={payStatus}
                    onChange={(e) => setPayStatus(e.target.value)}
                    disabled={payMode === "COD"}
                  >
                    <option value="Unpaid">Unpaid</option>
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Failed">Failed</option>
                  </select>
                  <input
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-400 focus:ring focus:ring-sky-200"
                    placeholder={payMode === "COD" ? "Disabled for COD" : "Transaction ID"}
                    value={payTxn}
                    onChange={(e) => setPayTxn(e.target.value)}
                    disabled={payMode === "COD"}
                  />
                </div>
                {payMode === "COD" && (
                  <p className="text-xs text-gray-500">
                    For COD orders, status is forced to Unpaid and transaction ID is not required.
                  </p>
                )}
              </section>

              {/* Totals */}
              <section className="space-y-2">
                <h4 className="font-medium text-gray-900">Totals</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-600">Shipping Charge</label>
                    <input
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-400 focus:ring focus:ring-sky-200"
                      type="number"
                      value={shipAmount}
                      onChange={(e) => setShipAmount(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-600">Discount Percentage (%)</label>
                    <input
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-sky-400 focus:ring focus:ring-sky-200 ${
                        lastEdited === "percent" ? "border-sky-400" : "border-gray-300"
                      }`}
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={discPct}
                      onChange={(e) => onDiscPctChange(e.target.value)}
                      placeholder="e.g., 10"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs text-gray-600">Discount Amount</label>
                    <input
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-sky-400 focus:ring focus:ring-sky-200 ${
                        lastEdited === "amount" ? "border-sky-400" : "border-gray-300"
                      }`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={discAmount}
                      onChange={(e) => onDiscAmountChange(e.target.value)}
                      placeholder="e.g., 100"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter either percentage or amount; the other will auto-calculate.
                    </p>
                  </div>
                </div>

                <div className="mt-1 text-sm text-gray-600">Subtotal: ₹{subtotal.toFixed(2)}</div>
                <div className="text-sm text-gray-600">Shipping: ₹{shippingNum.toFixed(2)}</div>
                <div className="text-sm text-gray-600">
                  Discount: ₹{discountNum.toFixed(2)}
                  {lastEdited === "percent" && discPct ? ` (${Number(discPct).toFixed(2)}%)` : ""}
                </div>
                <div className="mt-1 font-semibold">Grand Total: ₹{grandTotal.toFixed(2)}</div>
              </section>
            </div>

            {/* Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t px-4 py-3">
              <div className="font-semibold">Total: ₹{grandTotal.toFixed(2)}</div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={save}
                  disabled={!canSubmit}
                  className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-900 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Create Order"}
                </Button>
              </div>
            </div>
          </Dialog.Panel>
        </div>
      </div>
    </Dialog>
  )
}
