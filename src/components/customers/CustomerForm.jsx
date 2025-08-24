import React, { useState } from 'react'
import Input from '../ui/Input'
import Button from '../ui/Button'

export default function CustomerForm({ onSubmit }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' })

  const change = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }))
  const submit = (e) => {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <form onSubmit={submit} className="vstack gap">
      <h3>Add Customer</h3>
      <Input label="Name" value={form.name} onChange={change('name')} required />
      <Input label="Email" value={form.email} onChange={change('email')} />
      <Input label="Phone" value={form.phone} onChange={change('phone')} />
      <Input label="Address" value={form.address} onChange={change('address')} />
      <Button type="submit">Add</Button>
    </form>
  )
}
