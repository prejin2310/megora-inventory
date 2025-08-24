import React, { useEffect, useState } from 'react'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import Table from '../../components/ui/Table'

export default function InventoryLedger() {
  const [rows, setRows] = useState([])
  useEffect(() => {
    getDocs(query(collection(db, 'inventory_ledger'), orderBy('createdAt', 'desc'))).then(snap => {
      setRows(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [])
  return (
    <Table
      columns={['Product', 'Change', 'Reason', 'Reference', 'At']}
      rows={rows.map(r => [
        r.productId,
        r.change,
        r.reason,
        r.referenceId || '-',
        r.createdAt?.toDate ? r.createdAt.toDate().toLocaleString() : ''
      ])}
    />
  )
}
