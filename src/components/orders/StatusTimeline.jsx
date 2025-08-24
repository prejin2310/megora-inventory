import React from 'react'

export default function StatusTimeline({ history }) {
  return (
    <div className="timeline">
      {history?.map((h, i) => (
        <div key={i} className="timeline-item">
          <div className="timeline-dot" />
          <div className="timeline-content">
            <div className="title">{h.status}</div>
            <div className="muted">{h.at?.toDate ? h.at.toDate().toLocaleString() : ''}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
