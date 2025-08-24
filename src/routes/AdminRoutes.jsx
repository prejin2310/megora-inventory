import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import RequireAdmin from '../auth/RequireAdmin'
import AdminLayout from '../components/layout/AdminLayout'
import Dashboard from '../pages/Admin/Dashboard'
import Products from '../pages/Admin/Products'
import InventoryLedger from '../pages/Admin/InventoryLedger'
import Customers from '../pages/Admin/Customers'
import Orders from '../pages/Admin/Orders'
import OrderDetails from '../pages/Admin/OrderDetails'
import Settings from '../pages/Admin/Settings'

export default function AdminRoutes() {
  return (
    <Routes>
      <Route element={<RequireAdmin />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="inventory" element={<InventoryLedger />} />
          <Route path="customers" element={<Customers />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:orderId" element={<OrderDetails />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
