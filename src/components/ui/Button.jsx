import React from 'react'
import clsx from 'clsx'

export default function Button({ children, variant='primary', size='md', ...props }) {
  return (
    <button className={clsx('btn', `btn-${variant}`, `btn-${size}`)} {...props}>
      {children}
    </button>
  )
}
