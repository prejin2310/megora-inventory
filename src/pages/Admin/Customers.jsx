import React, { useEffect, useState } from 'react'
import { createCustomer, listCustomers } from '../../firebase/firestore'
import CustomerForm from '../../components/customers/CustomerForm'
import Table from '../../components/ui/Table'

export default function Customers() {
  const [items, setItems] = useState([])
  const [error, setError] = useState('') // <-- define error state

  const refresh = async () => {
    setError('')
    try {
      const list = await listCustomers()
      setItems(list)
    } catch (e) {
      console.error('Customers load error:', e)
      setError(e.message || 'Failed to load customers')
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const onAdd = async (data) => {
    setError('') // <-- clear before attempting
    try {
      await createCustomer(data)
      await refresh()
    } catch (e) {
      console.error('Create customer error:', e)
      setError(e.message || 'Failed to create customer') // <-- use setError safely
    }
  }

  return (
    <div className="grid two">
      <div>
        {error && <div className="error" style={{ marginBottom: 8 }}>{error}</div>}
        <CustomerForm onSubmit={onAdd} />
      </div>
      <Table
        columns={['Name', 'Email', 'Phone', 'Address']}
        rows={items.map(c => [c.name, c.email, c.phone, c.address])}
      />
    </div>
  )
}
