import React, { useEffect, useMemo, useState } from "react"
import {
  listProducts,
  listCustomers,
  createCustomer,
  createOrder,
} from "../../firebase/firestore"
import Button from "../ui/Button"

export default function OrderForm({ onClose, onCreated }) {
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [customerId, setCustomerId] = useState("")
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  })
  const [search, setSearch] = useState("")
  const [selectedProductId, setSelectedProductId] = useState("")
  const [qty, setQty] = useState("1")
  const [items, setItems] = useState([])
  const [channel, setChannel] = useState("Manual")
  const [notes, setNotes] = useState("")
  const [shipAmount, setShipAmount] = useState("0")
  const [discAmount, setDiscAmount] = useState("0")
  const [payMode, setPayMode] = useState("COD")
  const [payStatus, setPayStatus] = useState("Pending")
  const [payTxn, setPayTxn] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
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
  }, [])

  const filteredProducts = useMemo(() => {
    const q = (search || "").trim().toLowerCase()
    if (!q) return products
    return products.filter((p) =>
      [p.sku, p.name, p.category].some((val) =>
        String(val || "").toLowerCase().includes(q)
      )
    )
  }, [products, search])

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
        image: p.image || "", // ✅ include product image
        key: `${p.id}-${Date.now()}`,
      },
    ])
    setQty("1")
    setSelectedProductId("")
  }

  const removeItem = (key) =>
    setItems((prev) => prev.filter((x) => x.key !== key))

  const toggleEditPrice = (key, on) => {
    setItems((prev) =>
      prev.map((it) => (it.key === key ? { ...it, editing: on } : it))
    )
  }

  const changePrice = (key, value) => {
    setItems((prev) =>
      prev.map((it) => (it.key === key ? { ...it, price: value } : it))
    )
  }

  const savePrice = (key) => {
    setItems((prev) =>
      prev.map((it) =>
        it.key === key ? { ...it, price: Number(it.price), editing: false } : it
      )
    )
  }

  const cancelPrice = (key) => {
    setItems((prev) =>
      prev.map((it) =>
        it.key === key ? { ...it, price: it._origPrice, editing: false } : it
      )
    )
  }

  const subtotal = items.reduce(
    (s, it) => s + Number(it.price) * Number(it.qty),
    0
  )
  const shippingNum = Number(shipAmount || 0)
  const discountNum = Number(discAmount || 0)
  const grandTotal = subtotal + shippingNum - discountNum

  const save = async () => {
    setError("")
    if (!items.length) {
      setError("Add at least one item")
      return
    }
    setSaving(true)
    try {
      let finalCustomerId = customerId
      let customerSnap = null
      const addressLine = (newCustomer.address || "").trim()
      if (!finalCustomerId && newCustomer.name.trim()) {
        const ref = await createCustomer({ ...newCustomer, address: addressLine })
        finalCustomerId = ref.id
        customerSnap = { ...newCustomer, address: addressLine }
      } else if (finalCustomerId) {
        const c = customers.find((c) => c.id === finalCustomerId)
        if (c) customerSnap = { ...c }
      }

      const payloadItems = items.map((it) => ({
        sku: it.sku,
        name: it.name,
        price: it.price,
        qty: it.qty,
        image: it.image || "",
      }))
      const payload = {
        customerId: finalCustomerId,
        customer: customerSnap,
        items: payloadItems,
        totals: { subtotal, shipping: shippingNum, discount: discountNum, grandTotal },
        channel,
        notes,
        payment: { mode: payMode, status: payStatus, txnId: payTxn },
        shippingAddress: customerSnap?.address || addressLine,
      }

      const { id } = await createOrder(payload)
      onCreated?.({ id })
    } catch (e) {
      setError(e.message || "Failed to create order")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold">Create Order</h3>
          <button
            className="text-gray-500 hover:text-gray-700"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && <div className="text-red-600 text-sm">{error}</div>}

          {/* Customer Info */}
{/* Customer Info */}
<section>
  <h4 className="font-medium mb-2">Customer Info</h4>

  {/* Existing Customer Dropdown */}
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Select Existing Customer
    </label>
    <div className="relative">
      <select
        className="w-full border rounded-lg p-2 appearance-none pr-8"
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
      <span className="absolute right-2 top-3 pointer-events-none text-gray-500">
        ▼
      </span>
    </div>
  </div>

  {/* New Customer Form */}
  <div className="grid md:grid-cols-2 gap-3">
    <div>
      <label className="block text-sm font-medium text-gray-700">Name</label>
      <input
        className="w-full border rounded-lg p-2"
        value={newCustomer.name}
        onChange={(e) =>
          setNewCustomer((s) => ({ ...s, name: e.target.value }))
        }
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700">Email</label>
      <input
        type="email"
        className="w-full border rounded-lg p-2"
        value={newCustomer.email}
        onChange={(e) =>
          setNewCustomer((s) => ({ ...s, email: e.target.value }))
        }
        onBlur={() => {
          if (
            newCustomer.email &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCustomer.email)
          ) {
            setError("Invalid email format")
          } else {
            setError("")
          }
        }}
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700">Phone</label>
      <input
        type="tel"
        className="w-full border rounded-lg p-2"
        value={newCustomer.phone}
        onChange={(e) =>
          setNewCustomer((s) => ({ ...s, phone: e.target.value }))
        }
        onBlur={() => {
          if (newCustomer.phone && !/^\d{10}$/.test(newCustomer.phone)) {
            setError("Phone must be 10 digits")
          } else {
            setError("")
          }
        }}
      />
    </div>

    <div className="md:col-span-2">
      <label className="block text-sm font-medium text-gray-700">Address</label>
      <textarea
        rows="2"
        className="w-full border rounded-lg p-2"
        value={newCustomer.address}
        onChange={(e) =>
          setNewCustomer((s) => ({ ...s, address: e.target.value }))
        }
      />
    </div>
  </div>
</section>


          {/* Items */}
          <section>
            <h4 className="font-medium mb-2">Order Items</h4>
            <div className="flex flex-col md:flex-row gap-2 mb-3">
              <input
                className="flex-1 border rounded-lg p-2"
                placeholder="Search product"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="flex-1 border rounded-lg p-2"
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
                type="text"
                className="w-24 border rounded-lg p-2"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
              <Button onClick={addItem} disabled={!selectedProductId}>
                Add
              </Button>
            </div>

            {items.map((it) => (
              <div
                key={it.key}
                className="border rounded-lg p-3 mb-2 flex justify-between items-center"
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
                    <div className="font-medium">{it.name}</div>
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
                        className="text-blue-600 text-sm"
                        onClick={() => toggleEditPrice(it.key, true)}
                      >
                        Edit
                      </button>
                    </>
                  ) : (
                    <>
                      <input
                        type="text"
                        className="w-20 border rounded-lg p-1 text-sm"
                        value={it.price}
                        onChange={(e) => changePrice(it.key, e.target.value)}
                      />
                      <button
                        className="text-green-600 text-sm"
                        onClick={() => savePrice(it.key)}
                      >
                        Save
                      </button>
                      <button
                        className="text-gray-500 text-sm"
                        onClick={() => cancelPrice(it.key)}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  <button
                    className="text-red-600 text-sm"
                    onClick={() => removeItem(it.key)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </section>

          {/* Channel */}
          <section>
            <h4 className="font-medium mb-2">Channel</h4>
            <select
              className="w-full border rounded-lg p-2"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
            >
      
              <option value="Website">Website</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Instagram">Instagram</option>
               <option value="Instagram">Collab</option>
            </select>
          </section>

          {/* Payment */}
          <section>
            <h4 className="font-medium mb-2">Payment</h4>
            <div className="grid md:grid-cols-3 gap-3">
              <select
                className="w-full border rounded-lg p-2"
                value={payMode}
                onChange={(e) => setPayMode(e.target.value)}
              >
                <option value="COD">COD</option>
                <option value="Prepaid">UPI</option>
                <option value="Bank Transfer">Net Banking</option>
                <option value="Card">Debit/Credit</option>
              </select>
              <select
                className="w-full border rounded-lg p-2"
                value={payStatus}
                onChange={(e) => setPayStatus(e.target.value)}
              >
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
                <option value="Failed">Failed</option>
              </select>
              <input
                className="w-full border rounded-lg p-2"
                placeholder="Transaction ID"
                value={payTxn}
                onChange={(e) => setPayTxn(e.target.value)}
              />
            </div>
          </section>

          {/* Totals */}
          <section>
            <h4 className="font-medium mb-2">Totals</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-600">Shipping Charge</label>
                <input
                  className="border rounded-lg p-2 w-full"
                  type="text"
                  value={shipAmount}
                  onChange={(e) => setShipAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Discount Amount</label>
                <input
                  className="border rounded-lg p-2 w-full"
                  type="text"
                  value={discAmount}
                  onChange={(e) => setDiscAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Subtotal: ₹{subtotal.toFixed(2)}
            </div>
            <div className="mt-1 font-semibold">
              Grand Total: ₹{grandTotal.toFixed(2)}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-between items-center">
          <div className="font-semibold">Total: ₹{grandTotal.toFixed(2)}</div>
          <Button onClick={save} disabled={saving || !items.length}>
            Create Order
          </Button>
        </div>
      </div>
    </div>
  )
}
