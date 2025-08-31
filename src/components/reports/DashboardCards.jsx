import React from "react"
import { ShoppingBag, DollarSign, Clock } from "lucide-react" // icons

export default function DashboardCards({ orders }) {
  const totalOrders = orders.length
  const revenue = orders.reduce(
    (sum, o) => sum + (o?.totals?.grandTotal || 0),
    0
  )
  const pending = orders.filter(o =>
    ["Received", "Packed", "Waiting for Pickup", "In Transit"].includes(o.status)
  ).length

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Total Orders */}
      <div className="flex items-center gap-4 p-5 bg-white rounded-2xl shadow-sm border border-gray-200">
        <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600">
          <ShoppingBag size={24} />
        </div>
        <div>
          <div className="text-sm text-gray-500 font-medium">Total Orders</div>
          <div className="text-xl font-bold text-gray-800">{totalOrders}</div>
        </div>
      </div>

      {/* Revenue */}
      <div className="flex items-center gap-4 p-5 bg-white rounded-2xl shadow-sm border border-gray-200">
        <div className="p-3 bg-amber-100 rounded-xl text-amber-600">
          <DollarSign size={24} />
        </div>
        <div>
          <div className="text-sm text-gray-500 font-medium">Revenue</div>
          <div className="text-xl font-bold text-gray-800">
            ₹{revenue.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Pending */}
      <div className="flex items-center gap-4 p-5 bg-white rounded-2xl shadow-sm border border-gray-200">
        <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
          <Clock size={24} />
        </div>
        <div>
          <div className="text-sm text-gray-500 font-medium">Pending</div>
          <div className="text-xl font-bold text-gray-800">{pending}</div>
        </div>
      </div>
    </div>
  )
}
