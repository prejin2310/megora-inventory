import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  arrayUnion,
  query,
  where,
  limit,
} from 'firebase/firestore'
import { db } from './firebase'

const nowISO = () => new Date().toISOString()

// -------- Customers --------
export async function listCustomers() {
  const snap = await getDocs(collection(db, 'customers'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function createCustomer(data) {
  const payload = {
    name: String(data?.name || ''),
    email: String(data?.email || ''),
    phone: String(data?.phone || ''),
    address: String(data?.address || ''),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  return addDoc(collection(db, 'customers'), payload)
}

export async function updateCustomer(id, data) {
  const ref = doc(db, 'customers', id)
  const payload = {
    ...(data?.name !== undefined ? { name: String(data.name) } : {}),
    ...(data?.email !== undefined ? { email: String(data.email) } : {}),
    ...(data?.phone !== undefined ? { phone: String(data.phone) } : {}),
    ...(data?.address !== undefined ? { address: String(data.address) } : {}),
    updatedAt: serverTimestamp(),
  }
  return updateDoc(ref, payload)
}

export async function deleteCustomer(id) {
  const ref = doc(db, 'customers', id)
  return deleteDoc(ref)
}

export async function getCustomer(id) {
  const ref = doc(db, 'customers', id)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

// Utility to resolve many customer names by ID
export async function getCustomerName(customerId) {
  if (!customerId) return null
  const c = await getCustomer(customerId)
  return c?.name || null
}

export async function resolveCustomerNames(orders) {
  // Collect unique IDs
  const ids = Array.from(
    new Set(orders.map(o => o.customerId).filter(Boolean))
  )
  const cache = {}
  // Batch-like sequential fetch to keep it simple
  for (const id of ids) {
    const c = await getCustomer(id)
    cache[id] = c?.name || null
  }
  // Map onto orders
  return orders.map(o => ({
    ...o,
    _customerName: o.customer?.name || (o.customerId ? (cache[o.customerId] || null) : null),
  }))
}

// -------- Products --------
export async function listProducts() {
  const snap = await getDocs(collection(db, 'products'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function createProduct(data) {
  const payload = {
    sku: String(data?.sku || ''),
    name: String(data?.name || ''),
    price: Number(data?.price || 0),
    stock: Number(data?.stock || 0),
    category: String(data?.category || ''),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  return addDoc(collection(db, 'products'), payload)
}

export async function updateProduct(id, data) {
  const ref = doc(db, 'products', id)
  const payload = {
    ...(data?.sku !== undefined ? { sku: String(data.sku) } : {}),
    ...(data?.name !== undefined ? { name: String(data.name) } : {}),
    ...(data?.price !== undefined ? { price: Number(data.price) } : {}),
    ...(data?.stock !== undefined ? { stock: Number(data.stock) } : {}),
    ...(data?.category !== undefined ? { category: String(data.category) } : {}),
    updatedAt: serverTimestamp(),
  }
  return updateDoc(ref, payload)
}

export async function deleteProduct(id) {
  const ref = doc(db, 'products', id)
  return deleteDoc(ref)
}

export async function getProduct(id) {
  const ref = doc(db, 'products', id)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

// -------- Orders --------
export async function listOrders() {
  const snap = await getDocs(collection(db, 'orders'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getOrder(orderId) {
  const ref = doc(db, 'orders', orderId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

export async function getOrderByPublicId(publicId) {
  const q = query(collection(db, 'orders'), where('publicId', '==', String(publicId)), limit(1))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() }
}

// Create order: no shipping details at creation.
// Items array must NOT use serverTimestamp inside elements.
export async function createOrder(data) {
  const items = Array.isArray(data?.items) ? data.items : []
  const cleanItems = items.map(it => ({
    sku: String(it.sku || ''),
    name: String(it.name || ''),
    price: Number(it.price || 0),
    qty: Number(it.qty || 1),
    updatedAt: it.updatedAt || nowISO(), // client time inside array
  }))

  // Compute totals (no tax at item entry UI per request)
  const subtotal =
    data?.totals?.subtotal != null
      ? Number(data.totals.subtotal)
      : cleanItems.reduce((s, it) => s + Number(it.price) * Number(it.qty), 0)

  const totals = {
    subtotal,
    tax: 0, // removed from item input; can be adjusted later in order details if needed
    shipping: Number(data?.totals?.shipping || 0),
    discount: Number(data?.totals?.discount || 0),
  }
  totals.grandTotal = totals.subtotal + totals.shipping - totals.discount

  const docRef = doc(collection(db, 'orders'))
  const publicId = data?.publicId || `MGO-${Date.now().toString().slice(-6)}`

  await setDoc(docRef, {
    customerId: data?.customerId || null,
    customer: data?.customer || null, // embedded snapshot for quick display (optional)
    items: cleanItems,
    totals,
    channel: data?.channel || 'Manual',
    notes: data?.notes || '',
    status: data?.status || 'Received',
    publicId,
    // shipping is intentionally omitted at creation time
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    history: [{ status: 'Received', at: nowISO(), note: 'Order created' }],
  })

  return { id: docRef.id, publicId }
}

export async function updateOrderStatus(orderId, nextStatus, note = '') {
  const ref = doc(db, 'orders', orderId)
  await updateDoc(ref, {
    status: nextStatus,
    updatedAt: serverTimestamp(),
    history: arrayUnion({ status: nextStatus, at: nowISO(), note }),
  })
}

// Update items safely later (still no serverTimestamp inside array elems)
export async function updateOrderItems(orderId, items) {
  const cleanItems = (Array.isArray(items) ? items : []).map(it => ({
    sku: String(it.sku || ''),
    name: String(it.name || ''),
    price: Number(it.price || 0),
    qty: Number(it.qty || 1),
    updatedAt: it.updatedAt || nowISO(),
  }))
  const ref = doc(db, 'orders', orderId)
  await updateDoc(ref, { items: cleanItems, updatedAt: serverTimestamp() })
}

// Update shipping details later (edit from Order Details page)
export async function updateOrderShipping(orderId, shipping) {
  const ref = doc(db, 'orders', orderId)
  await updateDoc(ref, {
    shipping: {
      courier: String(shipping?.courier || ''),
      awb: String(shipping?.awb || ''),
      pickupAt: String(shipping?.pickupAt || ''), // ISO optional
      notes: String(shipping?.notes || ''),
    },
    updatedAt: serverTimestamp(),
  })
}
