import React from 'react'

export default function StockAlertModal({ open, items = [], onClose }) {
  if (!open) return null
  const critical = items.filter(p => Number(p.stock ?? 0) <= 1)

  return (
    <div className="sam-backdrop" role="dialog" aria-modal="true">
      <div className="sam-modal">
        <div className="sam-head">
          <div className="sam-title">Critical Stock Alert</div>
          <button className="sam-x" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="sam-body">
          {critical.length === 0 ? (
            <div className="muted">No products at critical stock.</div>
          ) : (
            <>
              <div className="sam-note">
                The following product{critical.length > 1 ? 's are' : ' is'} at critical stock (≤ 1). Consider restocking:
              </div>
              <div className="sam-list">
                {critical.map(p => (
                  <div key={p.id} className="sam-row">
                    <div className="sam-name" title={p.name || p.sku}>{p.name || p.sku || '—'}</div>
                    <div className="sam-sku muted">{p.sku || '-'}</div>
                    <div className="sam-stock">Stock: {Number(p.stock ?? 0)}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="sam-foot">
          <button className="sam-btn" onClick={onClose}>OK</button>
        </div>
      </div>

      <style>{`
        .sam-backdrop {
          position: fixed; inset: 0; background: rgba(15, 23, 42, .45);
          display: grid; place-items: center; z-index: 50; padding: 16px;
        }
        .sam-modal {
          width: min(560px, 96vw);
          background: #fff; border: 1px solid #e5e7eb; border-radius: 12px;
          box-shadow: 0 24px 64px rgba(0,0,0,.18); display: grid; grid-template-rows: auto 1fr auto;
          max-height: 80vh; overflow: hidden;
        }
        .sam-head { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid #eef0f2; }
        .sam-title { font-weight: 800; }
        .sam-x { margin-left: auto; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; width: 28px; height: 28px; cursor: pointer; }
        .sam-body { padding: 12px; display: grid; gap: 10px; }
        .sam-note { color: #374151; }
        .sam-list { display: grid; gap: 8px; }
        .sam-row {
          display: grid; grid-template-columns: 1fr auto auto; gap: 10px;
          padding: 8px 10px; border: 1px solid #e5e7eb; border-radius: 10px;
        }
        .sam-name { font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sam-sku { font-size: 12px; }
        .sam-stock { font-weight: 700; }
        .sam-foot { padding: 10px 12px; border-top: 1px solid #eef0f2; display: flex; justify-content: flex-end; }
        .sam-btn { background: #024F3D; color: #fff; border: 0; padding: 8px 12px; border-radius: 10px; font-weight: 700; cursor: pointer; }
      `}</style>
    </div>
  )
}
