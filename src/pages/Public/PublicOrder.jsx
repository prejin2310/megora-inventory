import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Package,
  Truck,
  MapPin,
  Calendar,
  Clock,
  BadgeCheck,
  Link as LinkIcon,
  ExternalLink,
  Navigation,
  ShieldCheck,
  Info,
  Phone,
} from "lucide-react";
import { getOrderByPublicId } from "../../firebase/firestore";

/**
 * PublicOrder – Neo Redesign
 * Modern, mobile-first, animated order tracker page.
 * - Uses lucide-react icons & framer-motion micro-interactions
 * - TailwindCSS utility classes for styling
 * - Preserves *all* original functionality and data logic
 * - Adds small UX improvements (progress bar, empty states, badges)
 */

const BRAND = {
  green: "#024F3D",
  gradient: "bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600",
};

const LOGO_URL = "https://i.ibb.co/hRzSG3r0/webGold.png";

// -------------------- Helpers --------------------
const toDateObj = (ts) => {
  try {
    return ts?.toDate ? ts.toDate() : typeof ts === "string" ? new Date(ts) : new Date(ts);
  } catch {
    return null;
  }
};

const fmtDate = (ts) => {
  const d = toDateObj(ts);
  try {
    return d ? d.toLocaleDateString() : "-";
  } catch {
    return String(ts || "-");
  }
};

const fmtTime = (ts) => {
  const d = toDateObj(ts);
  try {
    return d ? d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "-";
  } catch {
    return String(ts || "-");
  }
};

const money = (n) => `₹${Number(n || 0).toFixed(2)}`;

// Status flow (includes Out for Delivery)
const FLOW = [
  { key: "Received", label: "Order Received", icon: Package },
  { key: "Packed", label: "Item Packed", icon: BoxIcon },
  { key: "Waiting for Pickup", label: "Pickup Initiated", icon: Navigation },
  { key: "In Transit", label: "In Transit", icon: Truck },
  { key: "Out for Delivery", label: "Out for Delivery", icon: Navigation },
  { key: "Delivered", label: "Delivered", icon: CheckCircle2 },
];

// Fallback icon (simple cube) when using "BoxIcon" reference
function BoxIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={(props?.className || "") + " w-5 h-5"}
    >
      <path d="M21 16V8l-9-5-9 5v8l9 5 9-5z" />
      <path d="M3.3 7.3L12 12l8.7-4.7" />
    </svg>
  );
}

export default function PublicOrderNeo() {
  const { publicId } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setError("");
        setLoading(true);
        const o = await getOrderByPublicId(publicId);
        if (!mounted) return;
        setOrder(o || null);
        if (!o) setError("Order not found");
      } catch (e) {
        console.error("Public order load error:", e);
        if (mounted) setError(e?.message || "Failed to load order");
      } finally {
        mounted && setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [publicId]);

  const placedAtDate = useMemo(() => {
    if (!order?.createdAt) return null;
    return toDateObj(order.createdAt);
  }, [order]);

  const statusTimes = useMemo(() => {
    const map = {};
    (order?.history || []).forEach((h) => {
      if (!map[h.status]) map[h.status] = h.at;
    });
    return map;
  }, [order]);

  const customerName = order?.customer?.name || "Customer";
  const orderNumber = order?.publicId || order?.id || "";
  const shipping = order?.shipping || {};
  const address = shipping?.address || order?.customer?.address || ""; // may be string in your data
  const totals = order?.totals || { subtotal: 0, shipping: 0, discount: 0, grandTotal: 0 };

  const flow = FLOW;
  const currentIndexRaw = flow.findIndex((f) => f.key === order?.status);
  const currentIndex = currentIndexRaw >= 0 ? currentIndexRaw : 0;

  const estDelivery = order?.estimatedDelivery || shipping?.estimatedDelivery || "";
  const trackingUrl = (shipping?.trackingUrl || "").trim();
  const canTrack = Boolean(trackingUrl);

  // Return policy: 24h from Delivered timestamp
  let returnExpired = false;
  let returnEndsAt = null;
  if (order?.status === "Delivered" && statusTimes["Delivered"]) {
    const deliveredAt = toDateObj(statusTimes["Delivered"]);
    if (deliveredAt) {
      returnEndsAt = new Date(deliveredAt.getTime() + 24 * 60 * 60 * 1000);
      returnExpired = new Date() > returnEndsAt;
    }
  }

  // WhatsApp link with prefilled message and newlines
  const returnPhone = "917736166728"; // international without +
  const prefilledMessage = ["#Return Request", `Order: ${orderNumber}`, `Customer: ${customerName}`, "Reason: "].join("\n");
  const waReturnLink = `https://wa.me/${returnPhone}?text=${encodeURIComponent(prefilledMessage)}`;

  // Progress percent for bar
  const progressPct = Math.max(0, Math.min(100, ((currentIndex + 1) / flow.length) * 100));

  // Small helper to render address (string or object)
  const renderAddress = () => {
    if (!address) return "-";
    if (typeof address === "string") return address;
    const lines = [
      address?.name || customerName,
      [address?.line1, address?.line2].filter(Boolean).join(", "),
      [address?.city, address?.state, address?.postalCode].filter(Boolean).join(", "),
      address?.country,
      address?.phone ? `Phone: ${address.phone}` : "",
    ].filter((v) => v && String(v).trim().length > 0);
    return lines.join("\n");
  };

  // -------------- UI Blocks --------------
const Header = (
  <div className="bg-brand text-white shadow">
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      {/* Desktop layout */}
      <div className="hidden md:grid md:grid-cols-[auto_1fr_auto] md:items-center md:gap-6">
        {/* Logo */}
        <div className="h-16 w-16">
          <img
            src={LOGO_URL}
            alt="Megora Jewels"
            className="h-full w-full object-contain"
          />
        </div>

        {/* Brand text */}
        <div>
          <h1 className="font-groillim text-xl font-bold tracking-wide">
            Megora Jewels
          </h1>
          <p className="text-sm text-white/70">
            Exclusive Online Store — Shop Anytime Anywhere!
          </p>
          <a
  className="inline-flex items-center gap-1 text-xs text-white hover:text-white/80"
  href="https://www.megorajewels.com"
  target="_blank"
  rel="noreferrer noopener"
>
  www.megorajewels.com <ExternalLink className="h-4 w-4 text-white" />
</a>

        </div>

        {/* Order summary */}
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="justify-self-end w-[260px]"
        >
          <div className="rounded-2xl border border-white/30 bg-white/10 p-3 backdrop-blur">
            <div className="grid grid-cols-[80px_1fr] items-center gap-2">
              <span className="text-xs text-white/70">Order</span>
              <span className="justify-self-end font-bold">#{orderNumber || "-"}</span>
            </div>
            <div className="grid grid-cols-[80px_1fr] items-center gap-2">
              <span className="text-xs text-white/70">Placed</span>
              <span className="justify-self-end text-xs">
                {placedAtDate ? placedAtDate.toLocaleString() : "-"}
              </span>
            </div>
            <div className="mt-1 grid grid-cols-[80px_1fr] items-center gap-2">
              <span className="text-xs text-white/70">Status</span>
              <span className="justify-self-end rounded-full border border-white/30 bg-emerald-700 px-3 py-1 text-[11px] font-semibold text-white shadow">
                {order?.status || "-"}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Mobile layout */}
      {/* Mobile layout */}
<div className="flex flex-col items-center text-center md:hidden">
  {/* Logo (centered) */}
  <img
    src={LOGO_URL}
    alt="Megora Jewels"
    className="h-20 w-20 mb-2 object-contain mx-auto"
  />

  {/* Brand */}
  <h1 className="font-groillim text-base font-semibold tracking-wide">
    Megora Jewels
  </h1>
  <p className="text-[11px] text-white/70">Exclusive Online Store</p>

  {/* Website link */}
 <a
  className="inline-flex items-center gap-1 text-xs text-white hover:text-white/80"
  href="https://www.megorajewels.com"
  target="_blank"
  rel="noreferrer noopener"
>
  www.megorajewels.com <ExternalLink className="h-4 w-4 text-white" />
</a>



  {/* Order summary */}
  <motion.div
    initial={{ y: -10, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ type: "spring", stiffness: 260, damping: 20 }}
    className="mt-4 w-full max-w-sm"
  >
    <div className="rounded-2xl border border-white/30 bg-white/10 p-3 backdrop-blur text-left">
      <div className="grid grid-cols-[80px_1fr] items-center gap-2">
        <span className="text-xs text-white/70">Order</span>
        <span className="justify-self-end font-bold">#{orderNumber || "-"}</span>
      </div>
      <div className="grid grid-cols-[80px_1fr] items-center gap-2">
        <span className="text-xs text-white/70">Placed</span>
        <span className="justify-self-end text-xs">
          {placedAtDate ? placedAtDate.toLocaleString() : "-"}
        </span>
      </div>
      <div className="mt-1 grid grid-cols-[80px_1fr] items-center gap-2">
        <span className="text-xs text-white/70">Status</span>
        <span className="justify-self-end rounded-full border border-white/30 bg-emerald-700 px-3 py-1 text-[11px] font-semibold text-white shadow">
          {order?.status || "-"}
        </span>
      </div>
    </div>
  </motion.div>
</div>


      {/* Progress bar (shared for both) */}
      <div className="mt-5">
        <div className="h-1.5 md:h-2 w-full overflow-hidden rounded-full bg-white/30">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="h-full rounded-full bg-white"
          />
        </div>
        <div className="mt-1 text-right text-[10px] md:text-xs text-white/80">
          {Math.round(progressPct)}% complete
        </div>
      </div>
    </div>
  </div>
);



  const Loading = (
    <div className="flex min-h-[60vh] items-center justify-center bg-slate-50 p-6">
      <motion.div
        className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-lg"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <span className="relative inline-flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-600" />
        </span>
        <p className="text-sm text-slate-600">Loading order…</p>
      </motion.div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen">{Header}{Loading}</div>
  );

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        {Header}
        <div className="mx-auto w-full max-w-3xl p-4">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm">
            <div className="flex items-center gap-2"><Info className="h-4 w-4" /><span className="font-semibold">{error}</span></div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50">
        {Header}
        <div className="mx-auto w-full max-w-3xl p-4">
          <div className="rounded-xl border p-4 text-sm text-slate-600 shadow-sm">No order data.</div>
        </div>
      </div>
    );
  }

  // Timeline row
  const Timeline = (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold">Order Progress</h3>
          <p className="text-xs text-slate-500">Follow your order from warehouse to your door.</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">Estimated Delivery</div>
          <div className="text-sm font-semibold">{estDelivery ? fmtDate(estDelivery) : "—"}</div>
        </div>
      </div>

      <div className="grid gap-4">
        {flow.map((step, idx) => {
          const Icon = step.icon || Package;
          const reached = idx <= currentIndex;
          const isCurrent = idx === currentIndex;
          const at = statusTimes[step.key];
          const dateStr = at ? fmtDate(at) : "-";
          const timeStr = at ? fmtTime(at) : "-";
          const showCourierInline = step.key === "In Transit" && reached && (shipping?.courier || shipping?.awb);
          return (
            <motion.div
              key={step.key}
              initial={{ x: -6, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true, margin: "-20%" }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="relative grid grid-cols-[28px_1fr] items-start gap-3"
            >
              {/* Rail */}
              <div className="relative">
                <div
                  className={`relative grid h-7 w-7 place-items-center rounded-full border-2 ${
                    isCurrent
                      ? "border-emerald-600 bg-white ring-8 ring-emerald-100"
                      : reached
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${reached ? "text-emerald-600" : "text-slate-400"}`} />
                </div>
                {/* Connector */}
                {idx < flow.length - 1 && (
                  <div className={`absolute left-1/2 top-7 -ml-px h-[28px] w-0.5 ${reached ? "bg-emerald-200" : "bg-slate-200"}`} />
                )}
              </div>

              {/* Content */}
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className={`truncate text-sm font-semibold ${reached ? "text-emerald-700" : "text-slate-600"}`}>{step.label}</div>
                  <div className="text-right text-xs text-slate-500">
                    <div>{dateStr}</div>
                    <div>{timeStr}</div>
                  </div>
                </div>
                {showCourierInline && (
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-700">
                    {shipping?.courier && (
                      <div>
                        <span className="text-slate-500">Courier:</span> <span className="font-medium">{shipping.courier}</span>
                      </div>
                    )}
                    {shipping?.awb && (
                      <div>
                        <span className="text-slate-500">AWB:</span> <span className="font-medium">{shipping.awb}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {canTrack && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-slate-700">
              <div className="text-xs text-slate-500">Live tracking</div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {shipping?.courier && (
                  <span>
                    Courier: <strong>{shipping.courier}</strong>
                  </span>
                )}
                {shipping?.awb && (
                  <span>
                    • AWB: <strong>{shipping.awb}</strong>
                  </span>
                )}
              </div>
            </div>
            <div className="grow" />
           <a
  className="inline-flex items-center gap-2 rounded-lg border border-emerald-500 bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow hover:brightness-95"
  href={trackingUrl}
  target="_blank"
  rel="noreferrer noopener"
  title="Open official courier tracking"
>
  <Navigation className="h-4 w-4 text-white" /> Track Live Location
</a>

          </div>
          <div className="mt-2 text-xs text-emerald-800/80">
            Live location updates can be viewed only on the official courier website.
          </div>
        </div>
      )}
    </div>
  );

  const ReturnPolicy = (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold">Return & Refund Policy</h3>
          <p className="text-xs text-emerald-800/80">Return must be requested within 24 hours of delivery.</p>
        </div>
        {returnEndsAt && !returnExpired && (
          <div className="text-right">
            <div className="text-xs text-slate-500">Return window ends</div>
            <div className="text-sm font-semibold">{fmtDate(returnEndsAt)} {fmtTime(returnEndsAt)}</div>
          </div>
        )}
      </div>

      {!returnExpired ? (
        <div className="grid gap-2 text-sm">
          <div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-700" /> A clear, continuous open-box video recorded at the time of unboxing is required.</div>
          <div className="pt-1">
            <a
              href={waReturnLink}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-700"
            >
              <Phone className="h-4 w-4" /> Request Return on WhatsApp
            </a>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <div className="font-semibold">Sorry, your return policy period has ended.</div>
          <div className="mt-1 text-red-900/80">
            Need help? Chat with support on <a className="underline underline-offset-4" href={waReturnLink} target="_blank" rel="noreferrer noopener">WhatsApp</a>.
          </div>
        </div>
      )}
    </div>
  );

  const Items = (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <h3 className="mb-2 font-bold">Items</h3>
      <div className="grid gap-3">
        {(order.items || []).map((it, i) => (
          <div key={`${it.sku}-${i}`} className="rounded-xl border p-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="h-16 w-16 overflow-hidden rounded-lg border bg-slate-50">
                {it.image ? (
                  <img src={it.image} alt={it.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-xs text-slate-400">IMG</div>
                )}
              </div>
              <div className="min-w-0 grow">
                <div className="truncate text-sm font-semibold" title={it.name}>{it.name}</div>
                <div className="text-[11px] text-slate-500">{it.sku}</div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-right text-sm md:min-w-[280px]">
                <div>
                  <div className="text-[11px] text-slate-500">Qty</div>
                  <div className="font-medium">{Number(it.qty)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">Price</div>
                  <div className="font-medium">{money(it.price)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">Line Total</div>
                  <div className="font-bold">{money(Number(it.price) * Number(it.qty))}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="mt-3 border-t pt-3">
        <div className="mb-1 flex items-center justify-between text-sm"><span>Subtotal</span><span>{money(totals.subtotal)}</span></div>
        <div className="mb-1 flex items-center justify-between text-sm"><span>Shipping</span><span>{money(totals.shipping)}</span></div>
        <div className="mb-1 flex items-center justify-between text-sm"><span>Discount</span><span className="text-emerald-700">-{money(totals.discount)}</span></div>
        <div className="mt-1 flex items-center justify-between text-base font-bold"><span>Grand Total</span><span>{money(totals.grandTotal)}</span></div>
      </div>
    </div>
  );

  const Delivery = (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <h3 className="mb-2 font-bold">Delivery</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-dashed p-3">
          <div className="text-xs text-slate-500">Delivery Agency</div>
          <div className="text-sm font-semibold">{shipping?.courier || "-"}</div>
          <div className="mt-2 text-xs text-slate-500">AWB / Reference</div>
          <div className="text-sm font-semibold">{shipping?.awb || "-"}</div>
          {canTrack && order?.status !== "Delivered" && (
            <div className="mt-3 text-sm">
              <a
                className="inline-flex items-center gap-2 font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-800"
                href={trackingUrl}
                target="_blank"
                rel="noreferrer noopener"
              >
                <LinkIcon className="h-4 w-4" /> Open Tracking Page
              </a>
            </div>
          )}
        </div>
        <div className="rounded-xl border border-dashed p-3">
          <div className="text-xs text-slate-500">Shipping Address</div>
          <pre className="whitespace-pre-wrap break-words text-sm font-semibold leading-snug text-slate-800">{renderAddress()}</pre>
        </div>
      </div>
    </div>
  );

  const Greeting = (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-700">
        Dear <span className="font-semibold">{customerName}</span>,
      </p>
      <p className="mt-1 text-sm text-slate-600">Thank you for your order. Below are the order details and real‑time progress.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {Header}

      <main className="mx-auto w-full max-w-6xl space-y-4 px-4 py-6">
        {order?.status === "Delivered" ? (
          <>
            {Greeting}
            {ReturnPolicy}
            {Items}
            {Delivery}
          </>
        ) : (
          <>
            {Greeting}
            {Timeline}
            {Items}
            {Delivery}
          </>
        )}
      </main>

      {/* Page footer (subtle) */}
      <footer className="mx-auto w-full max-w-6xl px-4 pb-8 text-center text-[11px] text-slate-500">
        <div className="rounded-xl border bg-white p-2">This page updates automatically as your order progresses.</div>
      </footer>
    </div>
  );
}
