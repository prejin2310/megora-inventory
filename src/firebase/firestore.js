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

// ---------- Customers ----------
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

// Resolve customer names for orders to display
export async function resolveCustomerNames(orders) {
  const ids = Array.from(new Set(orders.map(o => o.customerId).filter(Boolean)))
  const cache = {}
  for (const id of ids) {
    const c = await getCustomer(id)
    cache[id] = c?.name || null
  }
  return orders.map(o => ({
    ...o,
    _customerName: o.customer?.name || (o.customerId ? (cache[o.customerId] || null) : null),
  }))
}

// ---------- Products ----------
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

// ---------- Orders ----------
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

// Create order: no shipping at creation, no tax in item-input stage
export async function createOrder(data) {
  const items = Array.isArray(data?.items) ? data.items : []
  const cleanItems = items.map(it => ({
    sku: String(it.sku || ''),
    name: String(it.name || ''),
    price: Number(it.price || 0),
    qty: Number(it.qty || 1),
    updatedAt: it.updatedAt || nowISO(), // client timestamp inside array
  }))

  const subtotal =
    data?.totals?.subtotal != null
      ? Number(data.totals.subtotal)
      : cleanItems.reduce((s, it) => s + Number(it.price) * Number(it.qty), 0)

  const totals = {
    subtotal,
    tax: 0,
    shipping: Number(data?.totals?.shipping || 0),
    discount: Number(data?.totals?.discount || 0),
  }
  totals.grandTotal = totals.subtotal + totals.shipping - totals.discount

  const ref = doc(collection(db, 'orders'))
  const publicId = data?.publicId || `MGO-${Date.now().toString().slice(-6)}`
  await setDoc(ref, {
    customerId: data?.customerId || null,
    customer: data?.customer || null,
    items: cleanItems,
    totals,
    channel: data?.channel || 'Manual',
    notes: data?.notes || '',
    status: data?.status || 'Received',
    publicId,
    // shipping omitted at creation
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    history: [{ status: 'Received', at: nowISO(), note: 'Order created' }],
  })
  return { id: ref.id, publicId }
}

export async function updateOrderStatus(orderId, nextStatus, note = '') {
  const ref = doc(db, 'orders', orderId)
  await updateDoc(ref, {
    status: nextStatus,
    updatedAt: serverTimestamp(),
    history: arrayUnion({ status: nextStatus, at: nowISO(), note }),
  })
}

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

export async function updateOrderShipping(orderId, shipping) {
  const ref = doc(db, 'orders', orderId)
  await updateDoc(ref, {
    shipping: {
      courier: String(shipping?.courier || ''),
      awb: String(shipping?.awb || ''),
      pickupAt: String(shipping?.pickupAt || ''),
      notes: String(shipping?.notes || ''),
    },
    updatedAt: serverTimestamp(),
  })
}

export async function updateOrderEstimated(orderId, estimatedDate) {
  const ref = doc(db, 'orders', orderId)
  await updateDoc(ref, {
    estimatedDelivery: estimatedDate || '', // store ISO/date string
    updatedAt: serverTimestamp(),
  })
}

export async function updateProductStock(productId, { setTo = null, add = null }) {
  const ref = doc(db, 'products', productId)
  if (setTo != null) {
    await updateDoc(ref, { stock: Number(setTo), updatedAt: serverTimestamp() })
  } else if (add != null) {
    await updateDoc(ref, { stock: increment(Number(add)), updatedAt: serverTimestamp() })
  } else {
    throw new Error('Provide either setTo or add')
  }
}


export async function getProductBySku(sku) {
  const q = query(collection(db, 'products'), where('sku', '==', sku))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const docSnap = snap.docs[0]
  return { id: docSnap.id, ...docSnap.data() }
}