// src/firebase/firestore.js
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
  increment, // atomic stock increments (kept)
  runTransaction, // NEW: for continuous public ID
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

export async function deleteCustomer(id) {
  if (!id) throw new Error('Missing customer id')
  await deleteDoc(doc(db, 'customers', id))
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

// CREATE: persists image, minStock, description, address (and trims strings)
export async function createProduct(data) {
  const payload = {
    sku: String(data?.sku || '').trim(),
    name: String(data?.name || '').trim(),
    price: Number(data?.price || 0),
    stock: Number(data?.stock || 0),
    category: String(data?.category || '').trim(),
    image: String(data?.image || '').trim(),
    minStock: Number(data?.minStock ?? 5),
    description: String(data?.description || '').trim(),
    address: String(data?.address || '').trim(), // NEW: store product address if provided
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  return addDoc(collection(db, 'products'), payload)
}

// UPDATE: allows updating image, minStock, description, address (only when provided)
export async function updateProduct(id, data) {
  const ref = doc(db, 'products', id)
  const payload = {
    ...(data?.sku !== undefined ? { sku: String(data.sku).trim() } : {}),
    ...(data?.name !== undefined ? { name: String(data.name).trim() } : {}),
    ...(data?.price !== undefined ? { price: Number(data.price) } : {}),
    ...(data?.stock !== undefined ? { stock: Number(data.stock) } : {}),
    ...(data?.category !== undefined ? { category: String(data.category).trim() } : {}),
    ...(data?.image !== undefined ? { image: String(data.image).trim() } : {}),
    ...(data?.minStock !== undefined ? { minStock: Number(data.minStock) } : {}),
    ...(data?.description !== undefined ? { description: String(data.description).trim() } : {}),
    ...(data?.address !== undefined ? { address: String(data.address).trim() } : {}), // NEW
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
  const qy = query(collection(db, 'orders'), where('publicId', '==', String(publicId)), limit(1))
  const snap = await getDocs(qy)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() }
}

// NEW: continuous, sortable Public ID: OR-YYYYMMDD-#### (daily counter with transaction)
async function nextPublicOrderId() {
  const pad = (n, w = 4) => String(n).padStart(w, '0')
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = pad(now.getMonth() + 1, 2)
  const dd = pad(now.getDate(), 2)
  const dayKey = `${yyyy}${mm}${dd}`

  const ref = doc(db, 'counters', 'publicOrderId', 'days', dayKey)
  const id = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    let next = 1
    if (snap.exists()) {
      const cur = Number(snap.data()?.seq || 0)
      next = cur + 1
      tx.update(ref, { seq: next, updatedAt: serverTimestamp() })
    } else {
      tx.set(ref, { seq: next, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
    }
    return `OR-${dayKey}-${pad(next, 4)}`
  })
  return id
}

// Create order: no shipping object at creation; supports totals, payment, publicId
export async function createOrder(data) {
  const items = Array.isArray(data?.items) ? data.items : []
  const cleanItems = items.map(it => ({
    sku: String(it.sku || ''),
    name: String(it.name || ''),
    price: Number(it.price || 0),
    qty: Number(it.qty || 1),
    // Allow these to pass-through if you later include them from the UI:
    ...(it.productId !== undefined ? { productId: it.productId || null } : {}),
    ...(it.image !== undefined ? { image: String(it.image || '').trim() } : {}),
    updatedAt: it.updatedAt || nowISO(), // client timestamp inside array
  }))

  // Subtotal compute fallback
  const subtotal =
    data?.totals?.subtotal != null
      ? Number(data.totals.subtotal)
      : cleanItems.reduce((s, it) => s + Number(it.price) * Number(it.qty), 0)

  // Totals with optional discountPct; tax kept 0 by your design
  const totals = {
    subtotal,
    tax: 0,
    shipping: Number(data?.totals?.shipping || 0),
    discount: Number(data?.totals?.discount || 0),
    ...(data?.totals?.discountPct !== undefined ? { discountPct: Number(data.totals.discountPct) } : {}),
  }
  totals.grandTotal = totals.subtotal + totals.shipping - totals.discount

  // Payment (optional)
  const payment = data?.payment
    ? {
        mode: String(data.payment?.mode || ''),
        status: String(data.payment?.status || ''),
        txnId: String(data.payment?.txnId || ''),
      }
    : null

  // Generate continuous publicId if none provided
  const ref = doc(collection(db, 'orders'))
  const publicId = data?.publicId || await nextPublicOrderId()

  await setDoc(ref, {
    customerId: data?.customerId || null,
    customer: data?.customer || null,
    items: cleanItems,
    totals,
    channel: data?.channel || 'Manual',
    notes: data?.notes || '',
    status: data?.status || 'Received',
    publicId,
    ...(payment ? { payment } : {}),
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
    ...(it.productId !== undefined ? { productId: it.productId || null } : {}),
    ...(it.image !== undefined ? { image: String(it.image || '').trim() } : {}),
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
      ...(shipping?.trackingUrl ? { trackingUrl: String(shipping.trackingUrl) } : {}),
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

// Stock update: supports setTo (absolute) or add (delta) using atomic increment
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
  const qy = query(collection(db, 'products'), where('sku', '==', String(sku)))
  const snap = await getDocs(qy)
  if (snap.empty) return null
  const docSnap = snap.docs[0]
  return { id: docSnap.id, ...docSnap.data() }
}

//real time updation of produtt 9add/edit/delete)

export function subscribeProducts(cb) {
  const db = getFirestore()
  const colRef = collection(db, 'products')
  const unsub = onSnapshot(colRef, (snap) => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    cb(items)
  })
  return unsub
}


// New: update status + append to history
export async function updateOrderStatusByPublicId(publicIdOrDocId, status, atDate) {
  // If you only store publicId, look up the docId first:
  let targetDocRef
  if (publicIdOrDocId?.startsWith?.('orders/')) {
    // already a path
    targetDocRef = doc(db, publicIdOrDocId)
  } else {
    // try by publicId
    const q = query(collection(db, 'orders'), where('publicId', '==', publicIdOrDocId), limit(1))
    const snap = await getDocs(q)
    if (snap.empty) {
      // fallback: assume it's the actual doc id
      targetDocRef = doc(db, 'orders', publicIdOrDocId)
    } else {
      targetDocRef = snap.docs.ref
    }
  }

  const at = atDate instanceof Date ? atDate : new Date()
  // Prefer serverTimestamp for consistency; UI already handles Timestamp/Date
  await updateDoc(targetDocRef, {
    status,
    history: arrayUnion({
      status,
      at: serverTimestamp(),
    }),
  })
}