// src/utils/email.js
import emailjs from "@emailjs/browser"

const EMAILJS_SERVICE_ID = process.env.REACT_APP_EMAILJS_SERVICE_ID
const EMAILJS_PUBLIC_KEY = process.env.REACT_APP_EMAILJS_PUBLIC_KEY

// map status to a template id (if you want separate templates per step)
const TEMPLATE_MAP = {
  "Received": process.env.REACT_APP_EMAILJS_TEMPLATE_RECEIVED,
  "Packed": process.env.REACT_APP_EMAILJS_TEMPLATE_PACKED,
  "Waiting for Pickup": process.env.REACT_APP_EMAILJS_TEMPLATE_WAITING,
  "In Transit": process.env.REACT_APP_EMAILJS_TEMPLATE_TRANSIT,
  "Out for Delivery": process.env.REACT_APP_EMAILJS_TEMPLATE_OUT,
  "Delivered": process.env.REACT_APP_EMAILJS_TEMPLATE_DELIVERED,
  "Cancelled": process.env.REACT_APP_EMAILJS_TEMPLATE_CANCELLED,
  "Returned": process.env.REACT_APP_EMAILJS_TEMPLATE_RETURNED,
}

const escapeHTML = (str = "") =>
  String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")

const buildItemsHtml = (items = []) => {
  if (!items.length) return "<div>No items listed.</div>"
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${items.map(it => `
        <tr>
          <td style="padding:6px 0;border-bottom:1px solid #eee;">${escapeHTML(it.name)} × ${it.qty}</td>
          <td align="right" style="padding:6px 0;border-bottom:1px solid #eee;">₹${Number(it.price).toFixed(2)}</td>
        </tr>
      `).join("")}
    </table>
  `
}

export async function sendOrderEmail(order, status, shareLink, note = "") {
  try {
    const templateId = TEMPLATE_MAP[status] || process.env.REACT_APP_EMAILJS_TEMPLATE_DEFAULT

    const toEmail = order?.customerEmail || order?.email
    const toName = order?.customerName || "Customer"

    if (!toEmail) {
      console.warn("No customer email, skipping")
      return
    }

    const subtotal = order?.totals?.subTotal ?? (order.items || []).reduce((s, x) => s + (x.price * x.qty), 0)
    const shipping = order?.totals?.shipping ?? 0
    const total = order?.totals?.grandTotal ?? subtotal + shipping

    const params = {
      customer_name: toName,
      customer_email: toEmail,
      order_id: order.publicId || order.id,
      order_status: status,
      order_note: note || "",
      items_html: buildItemsHtml(order.items || []),
      subtotal: `₹${subtotal.toFixed(2)}`,
      shipping: `₹${shipping.toFixed(2)}`,
      total: `₹${total.toFixed(2)}`,
      order_status_link: shareLink,
      year: new Date().getFullYear(),
    }

    await emailjs.send(EMAILJS_SERVICE_ID, templateId, params, EMAILJS_PUBLIC_KEY)
    console.log("✅ Email sent via EmailJS:", status, toEmail)
  } catch (err) {
    console.error("❌ EmailJS error:", err)
  }
}
