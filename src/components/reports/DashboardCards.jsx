import React from 'react'

export default function DashboardCards({ orders }) {
  const totalOrders = orders.length
  const revenue = orders.reduce((sum, o) => sum + (o?.totals?.grandTotal || 0), 0)
  const pending = orders.filter(o => ['Received', 'Packed', 'Waiting for Pickup', 'In Transit'].includes(o.status)).length

  return (
    <div className="grid cards3">
      <div className="card kpi">
        <div className="kpi-label">Total Orders</div>
        <div className="kpi-value">{totalOrders}</div>
      </div>
      <div className="card kpi">
        <div className="kpi-label">Revenue</div>
        <div className="kpi-value">₹{revenue.toFixed(2)}</div>
      </div>
      <div className="card kpi">
        <div className="kpi-label">Pending</div>
        <div className="kpi-value">{pending}</div>
      </div>
    </div>
  )
}
