import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, writeBatch, increment
} from 'firebase/firestore'
import { db } from './firebase'
import { nanoid } from 'nanoid'

export async function createProduct(payload) {
  const now = serverTimestamp()
  const ref = await addDoc(collection(db, 'products'), {
    name: payload.name,
    sku: payload.sku,
    price: Number(payload.price),
    imageUrl: payload.imageUrl || '',
    description: payload.description || '',
    stock: Number(payload.stock ?? 0),
    lowStockThreshold: Number(payload.lowStockThreshold ?? 5),
    createdAt: now,
    updatedAt: now,
  })
  return ref.id
}

export async function updateProduct(id, updates) {
  updates.updatedAt = serverTimestamp()
  await updateDoc(doc(db, 'products', id), updates)
}

export async function deleteProduct(id) {
  await deleteDoc(doc(db, 'products', id))
}

export async function listProducts() {
  const snap = await getDocs(query(collection(db, 'products'), orderBy('name')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function adjustStock(productId, delta, reason, refId, userId) {
  const batch = writeBatch(db)
  const pRef = doc(db, 'products', productId)
  batch.update(pRef, { stock: increment(delta), updatedAt: serverTimestamp() })
  const ledgerRef = doc(collection(db, 'inventory_ledger'))
  batch.set(ledgerRef, {
    productId,
    change: delta,
    reason,
    referenceId: refId || null,
    createdAt: serverTimestamp(),
    createdBy: userId || null,
  })
  await batch.commit()
}

export async function createCustomer(payload) {
  const now = serverTimestamp()
  const ref = await addDoc(collection(db, 'customers'), {
    name: payload.name,
    email: payload.email || '',
    phone: payload.phone || '',
    address: payload.address || '',
    createdAt: now,
    updatedAt: now,
  })
  return ref.id
}

export async function listCustomers() {
  const snap = await getDocs(query(collection(db, 'customers'), orderBy('name')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export function calcTotals(items, extras = {}) {
  const subTotal = items.reduce((sum, it) => sum + Number(it.price) * Number(it.qty), 0)
  const shipping = Number(extras.shipping || 0)
  const tax = Number(extras.tax || 0)
  const discount = Number(extras.discount || 0)
  const grandTotal = subTotal + shipping + tax - discount
  return { subTotal, shipping, tax, discount, grandTotal }
}

export async function createOrder({ customer, customerId, items, extras, channel, courier, payment, userId }) {
  if (!items?.length) throw new Error('No items')
  const now = serverTimestamp()
  const publicId = nanoid(10)
  const batch = writeBatch(db)
  const orderRef = doc(collection(db, 'orders'))
  const totals = calcTotals(items, extras)

  const history = [{ status: 'Received', at: now, by: userId || null }]

  batch.set(orderRef, {
    publicId,
    status: 'Received',
    channel: channel || 'Manual',
    customer: customerId ? null : customer,
    customerId: customerId || null,
    items,
    totals,
    courier: courier || { name: '', trackingNumber: '', trackingUrl: '' },
    payment: payment || { status: 'pending' },
    history,
    createdAt: now,
    updatedAt: now,
  })

  items.forEach(it => {
    const pRef = doc(db, 'products', it.productId)
    batch.update(pRef, { stock: increment(-Number(it.qty)), updatedAt: now })
    const ledgerRef = doc(collection(db, 'inventory_ledger'))
    batch.set(ledgerRef, {
      productId: it.productId,
      change: -Number(it.qty),
      reason: 'order',
      referenceId: orderRef.id,
      createdAt: now,
      createdBy: userId || null,
    })
  })

  await batch.commit()
  return { id: orderRef.id, publicId }
}

export async function updateOrder(orderId, updates, userId) {
  const now = serverTimestamp()
  const oRef = doc(db, 'orders', orderId)
  const patch = { ...updates, updatedAt: now }
  if (updates.status) {
    const snap = await getDoc(oRef)
    const prev = snap.data()
    patch.history = [...(prev.history || []), { status: updates.status, at: now, by: userId || null }]
  }
  await updateDoc(oRef, patch)
}

export async function cancelOrReturnOrder(orderId, type, userId) {
  const now = serverTimestamp()
  const oRef = doc(db, 'orders', orderId)
  const snap = await getDoc(oRef)
  if (!snap.exists()) throw new Error('Order not found')
  const order = snap.data()
  if (order.status === 'Cancelled' || order.status === 'Returned') return

  const batch = writeBatch(db)
  const history = [...(order.history || []), { status: type, at: now, by: userId || null }]
  batch.update(oRef, { status: type, history, updatedAt: now })

  order.items.forEach(it => {
    const pRef = doc(db, 'products', it.productId)
    batch.update(pRef, { stock: increment(Number(it.qty)), updatedAt: now })
    const ledgerRef = doc(collection(db, 'inventory_ledger'))
    batch.set(ledgerRef, {
      productId: it.productId,
      change: Number(it.qty),
      reason: type.toLowerCase(),
      referenceId: orderId,
      createdAt: now,
      createdBy: userId || null,
    })
  })

  await batch.commit()
}

export async function getOrderByPublicId(publicId) {
  const snap = await getDocs(query(collection(db, 'orders'), where('publicId', '==', publicId)))
  if (snap.empty) return null
  const docSnap = snap.docs[0]
  return { id: docSnap.id, ...docSnap.data() }
}
