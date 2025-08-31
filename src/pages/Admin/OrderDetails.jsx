import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Truck, Package, Clock, CheckCircle } from "lucide-react";
import emailjs from "@emailjs/browser";
import {
  getOrderWithCustomer,
  updateOrderStatus,
  updateOrderShipping,
  updateOrderEstimated,
} from "../../firebase/firestore";
import Button from "../../components/ui/Button";

const EMAILJS_SERVICE_ID = "service_rp8s2bc";
const EMAILJS_TEMPLATE_ID = "template_vt061gg";
const EMAILJS_PUBLIC_KEY = "VU-EmmxXtsh02KLCy";

// Init EmailJS once (guard HMR)
if (!window.__emailjs_inited__) {
  emailjs.init(EMAILJS_PUBLIC_KEY);
  window.__emailjs_inited__ = true;
}

const COURIERS = [
  { name: "DTDC", url: "https://www.dtdc.in/trace.asp" },
  { name: "Professional Couriers", url: "https://www.tpcindia.com/track.aspx" },
  { name: "Blue Dart", url: "https://www.bluedart.com/tracking" },
  { name: "Delhivery", url: "https://www.delhivery.com/tracking" },
  { name: "Ecom Express", url: "https://ecomexpress.in/tracking/" },
  { name: "India Post", url: "https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx" },
];

const STATUS_FLOW = [
  { label: "Received", icon: Package },
  { label: "Packed", icon: Package },
  { label: "Waiting for Pickup", icon: Clock },
  { label: "In Transit", icon: Truck },
  { label: "Out for Delivery", icon: Truck },
  { label: "Delivered", icon: CheckCircle },
];

const STATUS_MESSAGES = {
  "Received": "We’re excited to let you know that we have received your order. Our team is already preparing your items with care, and we’ll notify you as soon as your order is packed and on its way..",
  "Packed": "We are pleased to inform you that your order has been packed and is ready for shipment..",
  "Waiting for Pickup": "We have initiated a pickup request with the courier agency, and your order is currently awaiting collection. Your order is ready to be shipped, and the courier details will be shared with you once the shipment is dispatched.",
  "In Transit": "Good news! Your order has been dispatched and is now in transit. It is expected to reach your doorstep within 3–7 days.",
  "Out for Delivery": "Your order is scheduled for delivery by our courier partner. It should reach you soon.",
  "Delivered": "We’re happy to inform you that your order has been successfully delivered. We hope you are delighted with your purchase! Your feedback is valuable to us, please let us know your thoughts, so we can continue to improve our products and services.",
  "Cancelled": "Your order has been cancelled. If this wasn’t intentional, please reach out to us.",
  "Returned": "Your order has been marked as returned. Please contact us for assistance."
};


const buildStepsString = (currentStatus) => {
  const idx = STATUS_FLOW.findIndex((s) => s.label === currentStatus);
  return STATUS_FLOW.map((s, i) => `${i <= idx ? "✓" : "○"} ${s.label}`).join(" | ");
};

const serializeItems = (items = []) =>
  items.map((it) => ({
    name: it.name,
    qty: it.qty,
    price: Number(it.price || 0).toFixed(2),
    sku: it.sku || "",
    image: it.image || "",
  }));

// --- Email sending ---
async function sendOrderProgressEmail(order) {
  const statusMessage = STATUS_MESSAGES[order.status] || order.status;

  const templateParams = {
    to_name: order.customer?.name || order.customerName || "Customer",
    to_email: order.customer?.email || order.customerEmail || "",
    order_id: order.publicId || "",
    order_status: statusMessage,  // 👈 use friendly text here
    tracking_url: 'https://megorajewels.netlify.app/o/' + order.publicId || "www.megorajewels.com",
    items: serializeItems(order.items || [])
      .map((it) => `${it.name} (x${it.qty}) - ₹${it.price}`)
      .join("  ") || "No items",
    total: Number(order?.totals?.grandTotal || 0).toFixed(2),
    courier: order.shipping?.courier || "Courier details will be shared once your order is ready for dispatch.",
    awb: order.shipping?.awb || "Not Available",
    discount: order.totals?.discount ? `₹${Number(order.totals.discount).toFixed(2)}` : "₹0.00",
    shipping: order.totals?.shipping ? `₹${Number(order.totals.shipping).toFixed(2)}` : "₹0.00",
  };


  //console.log("Sending EmailJS params:", templateParams);

  return emailjs.send(
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID,
    templateParams
  );
}




export default function OrderDetails() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [ship, setShip] = useState({ courier: "", awb: "", pickupAt: "", notes: "" });
  const [savingShip, setSavingShip] = useState(false);
  const [estimatedDelivery, setEstimatedDelivery] = useState("");
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reasonText, setReasonText] = useState("");
  const [pendingStatus, setPendingStatus] = useState("");
  const [alert, setAlert] = useState({ open: false, type: "", message: "" });

  const shareLink = useMemo(() => {
    const pub = order?.publicId || orderId;
    return `${location.origin}/o/${pub}`;
  }, [order?.publicId, orderId]);

  const canAdvance = useMemo(() => {
    const flow = STATUS_FLOW.map((s) => s.label);
    const idx = flow.indexOf(order?.status || "");
    const next = (to) => flow.indexOf(to) > idx;
    return { flow, idx, next };
  }, [order]);

  useEffect(() => {
    const load = async () => {
      setError("");
      setLoading(true);
      try {
        const o = await getOrderWithCustomer(orderId);
        setOrder(o);
        setShip({
          courier: o?.shipping?.courier || "",
          awb: o?.shipping?.awb || "",
          pickupAt: o?.shipping?.pickupAt || "",
          notes: o?.shipping?.notes || "",
        });
        setEstimatedDelivery(o?.estimatedDelivery || "");
      } catch (e) {
        setError(e.message || "Failed to load order");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [orderId]);

  const reload = async () => {
    const o = await getOrderWithCustomer(orderId);
    setOrder(o);
    return o;
  };

  const showAlert = (type, message) => {
    setAlert({ open: true, type, message });
    setTimeout(() => setAlert({ open: false, type: "", message: "" }), 2500);
  };

  const renderTimeline = () => {
    const currentIndex = STATUS_FLOW.findIndex((s) => s.label === order?.status);
    return (
      <div className="flex md:flex-row flex-col items-start md:items-center gap-4 md:gap-6">
        {STATUS_FLOW.map((step, i) => {
          const Icon = step.icon;
          const isActive = i <= currentIndex;
          return (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-2"
            >
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  isActive ? "bg-green-100 border-green-500 text-green-600" : "bg-gray-100 border-gray-300 text-gray-400"
                }`}
              >
                <Icon size={20} />
              </div>
              <span className={`text-sm font-medium ${isActive ? "text-green-700" : "text-gray-500"}`}>
                {step.label}
              </span>
              {i < STATUS_FLOW.length - 1 && <div className="hidden md:block w-10 h-0.5 bg-gray-300 mx-2"></div>}
            </motion.div>
          );
        })}
      </div>
    );
  };

  const fmtDateTime = (ts) => {
    try {
      const d = ts?.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleString();
    } catch {
      return String(ts || "-");
    }
  };

  if (loading) return <div className="p-4">Loading…</div>;
  if (!order) return <div className="text-red-600">Order not found</div>;

  const selectedCourier = COURIERS.find((c) => c.name === ship.courier);

  // === ACTIONS ===
  const move = async (next) => {
    try {
      await updateOrderStatus(orderId, next, `Moved to ${next}`);
      const updated = await reload();
      showAlert("success", `Order marked as ${next}`);
      await sendOrderProgressEmail(updated)
    } catch (e) {
      showAlert("error", e.message || "Failed to update status");
    }
  };

  const askReasonAndMove = (next) => {
    setPendingStatus(next);
    setReasonText("");
    setReasonOpen(true);
  };

  const confirmReasonMove = async () => {
    if (!reasonText.trim()) return alert("Please provide a reason.");
    try {
      await updateOrderStatus(orderId, pendingStatus, reasonText.trim());
      const updated = await reload();
      const next = pendingStatus;
      const note = reasonText.trim();
      setReasonOpen(false);
      setPendingStatus("");
      setReasonText("");
      showAlert("success", `Order marked as ${next}`);
      await sendOrderProgressEmail(updated)
    } catch (e) {
      showAlert("error", e.message || "Failed to update status");
    }
  };

  const saveShipping = async () => {
    setSavingShip(true);
    try {
      const selectedCourier = COURIERS.find((c) => c.name === ship.courier);
      await updateOrderShipping(orderId, {
        ...ship,
        trackingUrl: selectedCourier ? selectedCourier.url : "",
      });
      const updated = await reload();
      showAlert("success", "Shipping details saved");
      await sendOrderProgressEmail(updated)
    } catch (e) {
      showAlert("error", e.message || "Failed to save shipping");
    } finally {
      setSavingShip(false);
    }
  };

  const saveEstimated = async () => {
    try {
      await updateOrderEstimated(orderId, estimatedDelivery || "");
      const updated = await reload();
      showAlert("success", "Estimated delivery updated");
     await sendOrderProgressEmail(updated)
    } catch (e) {
      showAlert("error", e.message || "Failed to update estimated delivery");
    }
  };

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      showAlert("success", "Share link copied!");
    } catch {
      prompt("Copy link:", shareLink);
    }
  };

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold">Order #{order.publicId || order.id}</h2>
        <span className="ml-auto rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700">
          {order.status}
        </span>
      </div>

      {/* Progress */}
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <h3 className="font-semibold mb-3">Order Progress</h3>
        {renderTimeline()}
      </div>

      {/* Share */}
      <div className="rounded-lg border bg-white p-4 shadow-sm space-y-2">
        <h3 className="font-semibold flex items-center gap-2">Share Link</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <input className="flex-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm" value={shareLink} readOnly />
          <Button size="sm" onClick={copyShare} className="flex items-center gap-1">Copy</Button>
        </div>
      </div>

      {/* Status Controls */}
      <div className="rounded-lg border bg-white p-4 shadow-sm space-y-3">
        <h3 className="font-semibold">Status</h3>
        <div className="flex flex-wrap gap-2">
          {canAdvance.next("Packed") && <Button onClick={() => move("Packed")}>Mark Packed</Button>}
          {canAdvance.next("Waiting for Pickup") && <Button onClick={() => move("Waiting for Pickup")}>Waiting for Pickup</Button>}
          {canAdvance.next("In Transit") && <Button onClick={() => move("In Transit")}>In Transit</Button>}
          {canAdvance.next("Out for Delivery") && <Button onClick={() => move("Out for Delivery")}>Out for Delivery</Button>}
          {canAdvance.next("Delivered") && <Button onClick={() => move("Delivered")}>Mark Delivered</Button>}
          <button
            onClick={() => askReasonAndMove("Cancelled")}
            className="flex items-center gap-1 rounded-md border border-red-500 bg-red-100 px-3 py-1 text-sm font-semibold text-red-700 hover:bg-red-200"
          >
            Cancel
          </button>
          <button
            onClick={() => askReasonAndMove("Returned")}
            className="flex items-center gap-1 rounded-md border border-yellow-500 bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-700 hover:bg-yellow-200"
          >
            Return
          </button>
        </div>
      </div>

      {/* ETA */}
      <div className="rounded-lg border bg-white p-4 shadow-sm space-y-2">
        <h3 className="font-semibold">Estimated Delivery</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="date"
            value={estimatedDelivery?.slice(0, 10) || ""}
            onChange={(e) => setEstimatedDelivery(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <Button onClick={saveEstimated}>Save</Button>
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
            {COURIERS.map((c) => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
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
            Track at:{" "}
            <a href={selectedCourier.url} target="_blank" rel="noreferrer" className="text-blue-600 underline">
              {selectedCourier.url}
            </a>
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
            <div key={`${it.sku}-${i}`} className="flex items-center gap-3 rounded-md border bg-gray-50 p-2 hover:shadow-md transition">
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
        <div className="flex font-semibold justify-between border-t pt-2">
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
                  <span className="text-xs text-gray-500">
                    {(() => {
                      try {
                        const d = h.at?.toDate ? h.at.toDate() : new Date(h.at);
                        return d.toLocaleString();
                      } catch {
                        return String(h.at || "-");
                      }
                    })()}
                  </span>
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
                className={`px-3 py-1 rounded-md font-semibold ${
                  pendingStatus === "Cancelled"
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

      {/* Toast */}
      {alert.open && (
        <div className="fixed top-20 right-4 z-50">
          <div
            className={`px-4 py-2 rounded-md shadow font-semibold ${
              alert.type === "success"
                ? "bg-green-100 text-green-700 border border-green-500"
                : "bg-red-100 text-red-700 border border-red-500"
            }`}
          >
            {alert.message}
          </div>
        </div>
      )}
    </div>
  );
}
