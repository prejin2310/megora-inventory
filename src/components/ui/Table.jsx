import React from "react"

export default function Table({ columns, rows }) {
  return (
    <table className="w-full min-w-full border-collapse text-sm">
      <thead className="bg-gray-100">
        <tr>
          {columns.map((col, idx) => (
            <th
              key={idx}
              className="px-4 py-2 text-left font-semibold text-gray-700 border-b"
            >
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ridx) => (
          <tr key={ridx} className="hover:bg-gray-50">
            {row.map((cell, cidx) => (
              <td key={cidx} className="px-4 py-2 border-b">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
