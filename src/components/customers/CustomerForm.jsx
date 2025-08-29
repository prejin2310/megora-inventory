// src/components/customers/CustomerForm.jsx
import React, { useState } from 'react'
import Input from '../ui/Input'
import Button from '../ui/Button'

export default function CustomerForm({ onSubmit, loading = false, title = 'Add Customer' }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' })
  const [submitting, setSubmitting] = useState(false)

  const change = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (submitting || loading) return
    setSubmitting(true)
    try {
      const payload = {
        name: form.name?.trim(),
        email: form.email?.trim(),
        phone: form.phone?.trim(),
        address: form.address?.trim(),
      }
      await onSubmit(payload)
      setForm({ name: '', email: '', phone: '', address: '' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="cf">
      <div className="cf-head">
        <h3 className="cf-title">{title}</h3>
      </div>

      <div className="cf-grid">
        <div className="cf-field">
          <Input label="Name" value={form.name} onChange={change('name')} required />
        </div>
        <div className="cf-field">
          <Input label="Email" type="email" value={form.email} onChange={change('email')} />
        </div>
        <div className="cf-field">
          <Input label="Phone" type="tel" inputMode="tel" value={form.phone} onChange={change('phone')} />
        </div>
        <div className="cf-field cf-span-2">
          <Input label="Address" value={form.address} onChange={change('address')} />
        </div>
      </div>

      <div className="cf-actions">
        <Button type="submit" disabled={submitting || loading}>
          {(submitting || loading) ? 'Saving…' : 'Add'}
        </Button>
      </div>

      <style>{`
        /* Container and heading */
        .cf { display: grid; gap: 12px; }
        .cf-head { display: flex; align-items: center; }
        .cf-title { margin: 0; font-size: 16px; font-weight: 800; }

        /* Responsive grid: 1 column on mobile, 2 cols on >=720px */
        .cf-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }
        @media (min-width: 720px) {
          .cf-grid { grid-template-columns: 1fr 1fr; gap: 12px; }
          .cf-span-2 { grid-column: span 2; }
        }

        /* Make embedded controls fill width, regardless of Input internals */
        .cf-field :where(input, textarea, select) { width: 100%; }

        /* Actions */
        .cf-actions { display: flex; justify-content: flex-end; gap: 8px; }
      `}</style>
    </form>
  )
}
