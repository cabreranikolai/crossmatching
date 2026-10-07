export function FilePreview({ fileName, rowCount, columnCount, headers, rows }) {
  if (!headers?.length) {
    return null
  }

  const previewRows = rows.slice(0, 4)

  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Preview</div>
          <div className="text-lg font-semibold text-slate-900">{fileName}</div>
        </div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {rowCount} rows • {columnCount} columns
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm text-slate-700">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {headers.map((header) => (
                <th key={header} className="px-3 py-2 font-semibold text-slate-800">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, index) => (
              <tr key={`${fileName}-${index}`} className="border-b border-slate-100 last:border-0">
                {headers.map((header) => (
                  <td key={`${header}-${index}`} className="px-3 py-2 align-top">
                    {row[header] ?? ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
