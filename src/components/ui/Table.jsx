import React from "react"

export default function Table({ columns, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        {/* Header */}
        <thead>
          <tr className="bg-gray-50 text-left">
            {columns.map((col, idx) => (
              <th
                key={idx}
                className="px-4 py-3 font-semibold text-gray-700"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {rows.map((row, ridx) => (
            <tr
              key={ridx}
              className={`${
                ridx % 2 === 0 ? "bg-white" : "bg-gray-50"
              } hover:bg-gray-100 transition`}
            >
              {row.map((cell, cidx) => (
                <td key={cidx} className="px-4 py-3 text-gray-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
