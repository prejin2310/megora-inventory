import React, { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import DashboardCards from '../../components/reports/DashboardCards'
import Kanban from '../../components/orders/Kanban'
import LowStockWidget from '../../components/products/LowStockWidget'

export default function Dashboard() {
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])

  useEffect(() => {
    Promise.all([
      getDocs(collection(db, 'orders')),
      getDocs(collection(db, 'products')),
    ]).then(([oSnap, pSnap]) => {
      setOrders(oSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setProducts(pSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [])

  return (
    <div className="vstack gap">
      <DashboardCards orders={orders} />
       <LowStockWidget products={products} />
      <Kanban orders={orders} />
     
    </div>
  )
}
