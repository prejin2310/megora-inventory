// src/components/products/DeleteConfirmModal.jsx
import React from 'react'
import Button from '../ui/Button'

export default function DeleteConfirmModal({ confirm, setConfirm, onDelete }) {
  if (!confirm.open) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Delete {confirm.name}?
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Are you sure you want to delete this product? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setConfirm({ open: false, id: null, name: '' })}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              onDelete(confirm.id)
              setConfirm({ open: false, id: null, name: '' })
            }}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  )
}
