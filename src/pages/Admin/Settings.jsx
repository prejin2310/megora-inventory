import React, { useState } from 'react'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'

export default function Settings() {
  const [emailTemplate, setEmailTemplate] = useState('Hi {{name}}, your order {{publicId}} has been created.')
  return (
    <div className="vstack gap">
      <h3>Notification Templates</h3>
      <label>Email Template</label>
      <textarea rows={8} value={emailTemplate} onChange={e => setEmailTemplate(e.target.value)} />
      <Button>Save</Button>
      <div className="muted">Note: Wire actual email sending later via Cloud Functions or a third-party provider.</div>
    </div>
  )
}
