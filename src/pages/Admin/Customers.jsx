import React, { useEffect, useState } from 'react'
import { createCustomer, listCustomers } from '../../firebase/firestore'
import CustomerForm from '../../components/customers/CustomerForm'
import Table from '../../components/ui/Table'

export default function Customers() {
  const [items, setItems] = useState([])

  const refresh = async () => {
    const list = await listCustomers()
    setItems(list)
  }

  useEffect(() => {
    refresh()
  }, [])

  const onAdd = async (data) => {
    await createCustomer(data)
    await refresh()
  }

  return (
    <div className="grid two">
      <CustomerForm onSubmit={onAdd} />
      <Table
        columns={['Name', 'Email', 'Phone', 'Address']}
        rows={items.map((c) => [c.name, c.email, c.phone, c.address])}
      />
    </div>
  )
}
