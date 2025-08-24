import React from 'react'
import StatusPill from '../ui/StatusPill'

const columns = ['Received', 'Packed', 'Waiting for Pickup', 'In Transit', 'Delivered']

export default function Kanban({ orders }) {
  return (
    <div className="kanban scroller-x">
      {columns.map(col => (
        <div key={col} className="kanban-col">
          <div className="kanban-col-title">{col}</div>
          <div className="kanban-col-body">
            {orders.filter(o => o.status === col).map(o => (
              <div key={o.id} className="kanban-card">
                <div className="title">#{o.publicId}</div>
                <StatusPill status={o.status} />
                <div className="muted">{o.items?.length || 0} items • ₹{o?.totals?.grandTotal?.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
