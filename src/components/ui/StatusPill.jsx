import React from 'react'
import clsx from 'clsx'

export default function StatusPill({ status }) {
  return <span className={clsx('pill', status.replaceAll(' ', '-').toLowerCase())}>{status}</span>
}
