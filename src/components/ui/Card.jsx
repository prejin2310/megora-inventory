import React, { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import {
  getOrder,
  updateOrderStatus,
  updateOrderShipping,
  updateOrderEstimated,
} from "../../firebase/firestore"
import Button from "../../components/ui/Button"

const COURIERS = [
  { name: "DTDC", url: "https://www.dtdc.in/trace.asp" },
  { name: "Professional Couriers", url: "https://www.tpcindia.com/track.aspx" },
  { name: "Blue Dart", url: "https://www.bluedart.com/tracking" },
  { name: "Delhivery", url: "https://www.delhivery.com/tracking" },
  { name: "Ecom Express", url: "https://ecomexpress.in/tracking/" },
  { name: "India Post", url: "https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx" },
]

export default function OrderDetails() {
  const { orderId } = useParams()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  const [ship, setShip] = useState({ courier: "", awb: "", pickupAt: "", notes: "" })
  const [savingShip, setSavingShip] = useState(false)
  const [estimatedDelivery, setEstimatedDelivery] = useState("")

  const [reasonOpen, setReasonOpen] = useState(false)
  const [reasonText, setReasonText] = useState("")
  const [pendingStatus, setPendingStatus] = useState("")

  const [alert, setAlert] = useState({ open: false, type: "", message: "" })

  const shareLink = useMemo(() => {
    const pub = order?.publicId || orderId
    return `${location.origin}/o/${pub}`
  }, [order?.publicId, orderId])

  const canAdvance = useMemo(() => {
    const flow = ["Received", "Packed", "Waiting for Pickup", "In Transit", "Out for Delivery", "Delivered"]
    const idx = flow.indexOf(order?.status || "")
    const next = (to) => flow.indexOf(to) > idx
    return { flow, idx, next }
  }, [order])

  useEffect(() => {
    const load = async () => {
      setError("")
      setLoading(true)
      try {
        const o = await getOrder(orderId)
        setOrder(o)
        setShip({
          courier: o?.shipping?.courier || "",
          awb: o?.shipping?.awb || "",
          pickupAt: o?.shipping?.pickupAt || "",
          notes: o?.shipping?.notes || "",
        })
        setEstimatedDelivery(o?.estimatedDelivery || "")
      } catch (e) {
        setError(e.message || "Failed to load order")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [orderId])

  const reload = async () => {
    const o = await getOrder(orderId)
    setOrder(o)
  }

  const showAlert = (type, message) => {
    setAlert({ open: true, type, message })
    setTimeout(() => setAlert({ open: false, type: "", message: "" }), 2500)
  }

  const move = async (next) => {
    try {
      await updateOrderStatus(orderId, next, `Moved to ${next}`)
      await reload()
      showAlert("success", `Order marked as ${next}`)
    } catch (e) {
      showAlert("error", e.message || "Failed to update status")
    }
  }

  const askReasonAndMove = (next) => {
    setPendingStatus(next)
    setReasonText("")
    setReasonOpen(true)
  }

  const confirmReasonMove = async () => {
    if (!reasonText.trim()) return alert("Please provide a reason.")
    try {
      await updateOrderStatus(orderId, pendingStatus, reasonText.trim())
      setReasonOpen(false)
      setPendingStatus("")
      setReasonText("")
      await reload()
      showAlert("success", `Order marked as ${pendingStatus}`)
    } catch (e) {
      showAlert("error", e.message || "Failed to update status")
    }
  }

  const saveShipping = async () => {
    setSavingShip(true)
    try {
      const selectedCourier = COURIERS.find((c) => c.name === ship.courier)
      await updateOrderShipping(orderId, {
        ...ship,
        trackingUrl: selectedCourier ? selectedCourier.url : "",
      })
      await reload()
      showAlert("success", "Shipping details saved")
    } catch (e) {
      showAlert("error", e.message || "Failed to save shipping")
    } finally {
      setSavingShip(false)
    }
  }

  const saveEstimated = async () => {
    try {
      await updateOrderEstimated(orderId, estimatedDelivery || "")
      await reload()
      showAlert("success", "Estimated delivery updated")
    } catch (e) {
      showAlert("error", e.message || "Failed to update estimated delivery")
    }
  }

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      showAlert("success", "Share link copied!")
    } catch {
      prompt("Copy link:", shareLink)
    }
  }

  const fmtDateTime = (ts) => {
    try {
      const d = ts?.toDate ? ts.toDate() : new Date(ts)
      return d.toLocaleString()
    } catch {
      return String(ts || "-")
    }
  }

  if (loading) return <div className="p-6 text-center text-gray-600">Loading…</div>
  if (!order) return <div className="p-6 text-center text-red-600">Order not found</div>

  const selectedCourier = COURIERS.find((c) => c.name === ship.courier)

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b">
        <h2 className="text-2xl font-bold text-gray-800">Order #{order.publicId || order.id}</h2>
        <span className="ml-auto rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700">
          {order.status}
        </span>
      </div>

      {/* Order Progress */}
      <div className="rounded-xl bg-white p-5 shadow-sm space-y-4">
        <h3 className="text-lg font-semibold">Order Progress</h3>
        <div className="flex flex-wrap gap-3">
          {canAdvance.flow.map((step, i) => (
            <span
              key={step}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                i <= canAdvance.idx
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {step}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Share Link */}
        <div className="rounded-xl bg-white p-5 shadow-sm space-y-3">
          <h3 className="text-lg font-semibold">Customer Share Link</h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm"
              value={shareLink}
              readOnly
            />
            <Button size="sm" onClick={copyShare}>Copy</Button>
          </div>
        </div>

        {/* Estimated Delivery */}
        <div className="rounded-xl bg-white p-5 shadow-sm space-y-3">
          <h3 className="text-lg font-semibold">Estimated Delivery</h3>
          <div className="flex gap-3">
            <input
              type="date"
              value={estimatedDelivery?.slice(0, 10) || ""}
              onChange={(e) => setEstimatedDelivery(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <Button onClick={saveEstimated}>Save</Button>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="rounded-xl bg-white p-5 shadow-sm space-y-3">
        <h3 className="text-lg font-semibold">Update Status</h3>
        <div className="flex flex-wrap gap-2">
          {canAdvance.next("Packed") && <Button onClick={() => move("Packed")}>Packed</Button>}
          {canAdvance.next("Waiting for Pickup") && <Button onClick={() => move("Waiting for Pickup")}>Pickup</Button>}
          {canAdvance.next("In Transit") && <Button onClick={() => move("In Transit")}>In Transit</Button>}
          {canAdvance.next("Out for Delivery") && <Button onClick={() => move("Out for Delivery")}>Out for Delivery</Button>}
          {canAdvance.next("Delivered") && <Button onClick={() => move("Delivered")}>Delivered</Button>}
          <button onClick={() => askReasonAndMove("Cancelled")} className="rounded-lg border border-red-500 bg-red-50 px-3 py-1 text-sm font-semibold text-red-700 hover:bg-red-100">Cancel</button>
          <button onClick={() => askReasonAndMove("Returned")} className="rounded-lg border border-yellow-500 bg-yellow-50 px-3 py-1 text-sm font-semibold text-yellow-700 hover:bg-yellow-100">Return</button>
        </div>
      </div>

      {/* Shipping */}
      <div className="rounded-xl bg-white p-5 shadow-sm space-y-3">
        <h3 className="text-lg font-semibold">Shipping Details</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <select
            value={ship.courier}
            onChange={(e) => setShip((s) => ({ ...s, courier: e.target.value }))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Select Courier</option>
            {COURIERS.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
          <input
            placeholder="AWB / Tracking #"
            value={ship.awb}
            onChange={(e) => setShip((s) => ({ ...s, awb: e.target.value }))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="datetime-local"
            value={ship.pickupAt}
            onChange={(e) => setShip((s) => ({ ...s, pickupAt: e.target.value }))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="Notes"
            value={ship.notes}
            onChange={(e) => setShip((s) => ({ ...s, notes: e.target.value }))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        {selectedCourier && ship.awb && (
          <p className="text-xs text-gray-500">
            Track at: <a href={selectedCourier.url} target="_blank" className="text-blue-600 underline">{selectedCourier.url}</a>
          </p>
        )}
        <div className="flex justify-end">
          <Button onClick={saveShipping} disabled={savingShip}>Save</Button>
        </div>
      </div>

      {/* Items */}
      <div className="rounded-xl bg-white p-5 shadow-sm space-y-3">
        <h3 className="text-lg font-semibold">Items</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {(order.items || []).map((it, i) => (
            <div key={`${it.sku}-${i}`} className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
              {it.image ? (
                <img src={it.image} alt={it.name} className="h-16 w-16 rounded-lg border object-cover" />
              ) : (
                <div className="h-16 w-16 rounded-lg border bg-gray-100 grid place-items-center text-xs text-gray-500">IMG</div>
              )}
              <div className="flex-1">
                <div className="flex justify-between text-sm">
                  <span>{it.name} × {it.qty}</span>
                  <span>₹{Number(it.price).toFixed(2)}</span>
                </div>
                <p className="text-xs text-gray-500">SKU: {it.sku}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex font-semibold justify-between border-t pt-3">
          <span>Total</span>
          <span>₹{Number(order?.totals?.grandTotal || 0).toFixed(2)}</span>
        </div>
      </div>

      {/* History */}
      <div className="rounded-xl bg-white p-5 shadow-sm space-y-4">
        <h3 className="text-lg font-semibold">Order History</h3>
        <div className="space-y-4">
          {(order.history || []).map((h, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex h-6 w-6 items-center justify-center">
                <div className="h-2.5 w-2.5 rounded-full bg-sky-500"></div>
              </div>
              <div>
                <div className="flex justify-between text-sm">
                  <strong>{h.status}</strong>
                  <span className="text-xs text-gray-500">{fmtDateTime(h.at)}</span>
                </div>
                {h.note && <p className="text-xs text-gray-600">{h.note}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reason Modal */}
      {reasonOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-lg overflow-hidden">
            <div className="px-4 py-2 font-bold text-gray-700 bg-gray-50">Reason — {pendingStatus}</div>
            <div className="p-4">
              <textarea
                rows={4}
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder={`Reason for ${pendingStatus}`}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 border-t bg-gray-50 px-4 py-2">
              <Button variant="ghost" onClick={() => setReasonOpen(false)}>Cancel</Button>
              <button
                onClick={confirmReasonMove}
                className={`px-3 py-1 rounded-lg font-semibold ${pendingStatus === "Cancelled"
                  ? "bg-red-100 border border-red-500 text-red-700 hover:bg-red-200"
                  : "bg-yellow-100 border border-yellow-500 text-yellow-700 hover:bg-yellow-200"
                  }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert */}
      {alert.open && (
        <div className="fixed top-20 right-4 z-50 animate-fadeIn">
          <div className={`px-4 py-2 rounded-lg shadow font-semibold ${
            alert.type === "success"
              ? "bg-green-100 text-green-700 border border-green-500"
              : "bg-red-100 text-red-700 border border-red-500"
          }`}>
            {alert.message}
          </div>
        </div>
      )}
    </div>
  )
}
