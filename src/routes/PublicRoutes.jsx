import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import PublicLayout from '../components/layout/PublicLayout'
import PublicOrder from '../pages/Public/PublicOrder'

export default function PublicRoutes() {
  return (
    <PublicLayout>
      <Routes>
        <Route path=":publicId" element={<PublicOrder />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </PublicLayout>
  )
}
