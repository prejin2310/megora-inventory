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

  if (loading) return <div className="p-4">Loading…</div>
  if (!order) return <div className="text-red-600">Order not found</div>

  const selectedCourier = COURIERS.find((c) => c.name === ship.courier)

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold">Order #{order.publicId || order.id}</h2>
        <span className="ml-auto rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700">
          {order.status}
        </span>
      </div>

      {/* Share Link */}
      <div className="rounded-lg border bg-white p-4 shadow-sm space-y-2">
        <h3 className="font-semibold">Customer Share Link</h3>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="w-full md:w-1/2 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm"
            value={shareLink}
            readOnly
          />
          <Button size="sm" onClick={copyShare}>Copy link</Button>
        </div>
      </div>

      {/* Status */}
      <div className="rounded-lg border bg-white p-4 shadow-sm space-y-2">
        <h3 className="font-semibold">Status</h3>
        <div className="flex flex-wrap gap-2">
          {canAdvance.next("Packed") && <Button onClick={() => move("Packed")}>Mark Packed</Button>}
          {canAdvance.next("Waiting for Pickup") && <Button onClick={() => move("Waiting for Pickup")}>Waiting for Pickup</Button>}
          {canAdvance.next("In Transit") && <Button onClick={() => move("In Transit")}>Mark In Transit</Button>}
          {canAdvance.next("Out for Delivery") && <Button onClick={() => move("Out for Delivery")}>Out for Delivery</Button>}
          {canAdvance.next("Delivered") && <Button onClick={() => move("Delivered")}>Mark Delivered</Button>}
          <button onClick={() => askReasonAndMove("Cancelled")} className="rounded-md border border-red-500 bg-red-100 px-3 py-1 text-sm font-semibold text-red-700 hover:bg-red-200">Cancel</button>
          <button onClick={() => askReasonAndMove("Returned")} className="rounded-md border border-yellow-500 bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-700 hover:bg-yellow-200">Return</button>
        </div>
      </div>

      {/* Estimated Delivery */}
      <div className="rounded-lg border bg-white p-4 shadow-sm space-y-2">
        <h3 className="font-semibold">Estimated Delivery</h3>
        <div className="grid gap-2 md:grid-cols-2">
          <input
            type="date"
            value={estimatedDelivery?.slice(0, 10) || ""}
            onChange={(e) => setEstimatedDelivery(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="flex justify-end">
            <Button onClick={saveEstimated}>Save</Button>
          </div>
        </div>
      </div>

      {/* Shipping */}
      <div className="rounded-lg border bg-white p-4 shadow-sm space-y-2">
        <h3 className="font-semibold">Shipping</h3>
        <div className="grid gap-2 md:grid-cols-2">
          <select
            value={ship.courier}
            onChange={(e) => setShip((s) => ({ ...s, courier: e.target.value }))}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Select Courier</option>
            {COURIERS.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
          <input
            placeholder="AWB / Tracking #"
            value={ship.awb}
            onChange={(e) => setShip((s) => ({ ...s, awb: e.target.value }))}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="datetime-local"
            value={ship.pickupAt}
            onChange={(e) => setShip((s) => ({ ...s, pickupAt: e.target.value }))}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="Notes"
            value={ship.notes}
            onChange={(e) => setShip((s) => ({ ...s, notes: e.target.value }))}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
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
      <div className="rounded-lg border bg-white p-4 shadow-sm space-y-2">
        <h3 className="font-semibold">Items</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {(order.items || []).map((it, i) => (
            <div key={`${it.sku}-${i}`} className="flex items-center gap-3 rounded-md border bg-gray-50 p-2">
              {it.image ? (
                <img src={it.image} alt={it.name} className="h-16 w-16 rounded-md border object-cover" />
              ) : (
                <div className="h-16 w-16 rounded-md border bg-gray-100 grid place-items-center text-xs text-gray-500">IMG</div>
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
        <div className="flex font-semibold justify-between">
          <span>Total</span>
          <span>₹{Number(order?.totals?.grandTotal || 0).toFixed(2)}</span>
        </div>
      </div>

      {/* History */}
      <div className="rounded-lg border bg-white p-4 shadow-sm space-y-2">
        <h3 className="font-semibold">History</h3>
        <div className="space-y-3">
          {(order.history || []).map((h, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex h-5 w-5 items-center justify-center">
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
          <div className="w-full max-w-lg rounded-lg border bg-white shadow-lg">
            <div className="border-b px-4 py-2 font-bold">Reason — {pendingStatus}</div>
            <div className="p-4">
              <textarea
                rows={4}
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder={`Reason for ${pendingStatus}`}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 border-t px-4 py-2">
              <Button variant="ghost" onClick={() => setReasonOpen(false)}>Cancel</Button>
              <button
                onClick={confirmReasonMove}
                className={`px-3 py-1 rounded-md font-semibold ${pendingStatus === "Cancelled"
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
          <div className={`px-4 py-2 rounded-md shadow font-semibold ${
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
