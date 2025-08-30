import React from 'react'

export default function StockAlertModal({ open, items = [], onClose }) {
  if (!open) return null
  const critical = items.filter(p => Number(p.stock ?? 0) <= 1)

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg bg-white border border-gray-200 rounded-xl shadow-2xl max-h-[80vh] overflow-hidden grid grid-rows-[auto_1fr_auto]">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200">
          <h2 className="font-extrabold text-gray-800">Critical Stock Alert</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="ml-auto w-7 h-7 flex items-center justify-center rounded-md border border-gray-300 bg-gray-100 hover:bg-gray-200 text-gray-600"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-3 space-y-3 overflow-y-auto">
          {critical.length === 0 ? (
            <div className="text-sm text-gray-500">No products at critical stock.</div>
          ) : (
            <>
              <div className="text-sm text-gray-700">
                The following product{critical.length > 1 ? 's are' : ' is'} at critical stock (≤ 1).
                Consider restocking:
              </div>
              <div className="space-y-2">
                {critical.map((p) => (
                  <div
                    key={p.id}
                    className="grid grid-cols-[1fr_auto_auto] gap-3 items-center border border-gray-200 rounded-lg px-3 py-2"
                  >
                    <div
                      className="font-semibold text-gray-800 truncate"
                      title={p.name || p.sku}
                    >
                      {p.name || p.sku || '—'}
                    </div>
                    <div className="text-xs text-gray-500">{p.sku || '-'}</div>
                    <div className="font-semibold text-gray-900">
                      Stock: {Number(p.stock ?? 0)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="bg-[#024F3D] hover:bg-[#04614d] text-white font-semibold px-4 py-2 rounded-lg"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
