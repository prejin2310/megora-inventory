import React, { useState } from 'react'
import Button from '../../components/ui/Button'

export default function Settings() {
  const [emailTemplate, setEmailTemplate] = useState(
    'Hi {{name}}, your order {{publicId}} has been created.'
  )

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      {/* Section title */}
      <h3 className="text-lg font-semibold text-gray-800">
        Notification Templates
      </h3>

      {/* Label + textarea */}
      <div className="flex flex-col space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Email Template
        </label>
        <textarea
          rows={8}
          value={emailTemplate}
          onChange={(e) => setEmailTemplate(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
      </div>

      {/* Save button */}
      <Button>Save</Button>

      {/* Note */}
      <p className="text-sm text-gray-500">
        Note: Wire actual email sending later via Cloud Functions or a
        third-party provider.
      </p>
    </div>
  )
}
