import React, { useMemo } from 'react'
import Card from '../ui/Card'

export default function LowStockWidget({ products }) {
  const low = useMemo(() => (products || []).filter(p => Number(p.stock) <= Number(p.lowStockThreshold || 5)), [products])
  return (
    <Card title="Low Stock">
      {low.length === 0 ? (
        <div className="muted">All good.</div>
      ) : (
        <ul>
          {low.map(p => <li key={p.id}>{p.name} — {p.stock}</li>)}
        </ul>
      )}
    </Card>
  )
}
