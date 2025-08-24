// src/utils/pdf.js
// Invoice PDF generation using jsPDF + jspdf-autotable
// Install if not present: npm i jspdf jspdf-autotable

import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

function fmt(n, sym = '₹') {
  return `${sym}${Number(n || 0).toFixed(2)}`
}

function todayISO() {
  const d = new Date()
  const pad = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * generateInvoice
 * @param {Object} order - Firestore order object
 * Expected minimal structure:
 * {
 *   publicId: string,
 *   createdAt?: Timestamp,
 *   customer?: { name, email, phone, address },
 *   courier?: { name, trackingNumber, trackingUrl },
 *   items: [{ name, sku, price, qty, lineTotal }],
 *   totals: { subTotal, tax, shipping, discount, grandTotal }
 * }
 * @param {Object} opts
 * @param {string} opts.brandName - Company/brand name on invoice
 * @param {string} opts.currencySymbol - Currency symbol (default ₹)
 * @param {boolean} opts.autoSave - Whether to auto save to file (default true)
 * @returns {jsPDF} doc instance
 */
export function generateInvoice(order, opts = {}) {
  const {
    brandName = 'Megora',
    currencySymbol = '₹',
    autoSave = true,
  } = opts

  if (!order) throw new Error('Order is required')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const marginX = 40
  let y = 50

  // Header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(brandName, marginX, y)
  y += 10
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`Invoice`, marginX, (y += 16))
  doc.text(`Order #: ${order.publicId || ''}`, marginX, (y += 14))
  const createdAtStr = order?.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : todayISO()
  doc.text(`Date: ${createdAtStr}`, marginX, (y += 14))

  // Customer
  y += 18
  doc.setTextColor(0)
  doc.setFont('helvetica', 'bold')
  doc.text('Bill To', marginX, y)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60)
  const c = order.customer || {}
  const customerLines = [
    c.name || '',
    c.email || '',
    c.phone || '',
    c.address || '',
  ].filter(Boolean)
  customerLines.forEach((line) => (y += 14, doc.text(line, marginX, y)))

  // Courier
  y += 18
  doc.setTextColor(0)
  doc.setFont('helvetica', 'bold')
  doc.text('Courier', marginX, y)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60)
  const k = order.courier || {}
  const courierLines = [
    k.name ? `Name: ${k.name}` : '',
    k.trackingNumber ? `Tracking #: ${k.trackingNumber}` : '',
    k.trackingUrl ? `URL: ${k.trackingUrl}` : '',
  ].filter(Boolean)
  courierLines.forEach((line) => (y += 14, doc.text(line, marginX, y)))

  // Items table
  y += 22
  const rows = (order.items || []).map((it) => ([
    it.name || '',
    it.sku || '',
    String(it.qty || 0),
    fmt(it.price || 0, currencySymbol),
    fmt((it.price || 0) * (it.qty || 0), currencySymbol),
  ]))
  doc.autoTable({
    startY: y,
    head: [['Item', 'SKU', 'Qty', 'Price', 'Line Total']],
    body: rows,
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [15, 23, 42] }, // dark slate
    theme: 'striped',
    margin: { left: marginX, right: marginX },
  })

  // Totals
  const t = order.totals || { subTotal: 0, tax: 0, shipping: 0, discount: 0, grandTotal: 0 }
  let ty = doc.lastAutoTable ? doc.lastAutoTable.finalY + 16 : y + 16
  const rightX = 555 // roughly page width - marginX
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60)

  const line = (label, value, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.text(label, rightX - 180, ty)
    doc.text(value, rightX, ty, { align: 'right' })
    ty += 16
  }

  line('Subtotal', fmt(t.subTotal || 0, currencySymbol))
  line('Tax', fmt(t.tax || 0, currencySymbol))
  line('Shipping', fmt(t.shipping || 0, currencySymbol))
  line('Discount', fmt(-(t.discount || 0), currencySymbol))
  line('Grand Total', fmt(t.grandTotal || 0, currencySymbol), true)

  // Footer
  ty += 24
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120)
  doc.setFontSize(9)
  doc.text('Thank you for your order!', marginX, ty)
  ty += 12
  doc.text('This is a computer-generated invoice and does not require a signature.', marginX, ty)

  if (autoSave) {
    const fileName = `Invoice_${order.publicId || 'order'}_${todayISO()}.pdf`
    doc.save(fileName)
  }

  return doc
}
