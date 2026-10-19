import { useRef, useState } from 'react'

const formatBytes = (bytes) => {
  if (!bytes) {
    return '0 bytes'
  }

  const units = ['bytes', 'KB', 'MB', 'GB']
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / (1024 ** unitIndex)

  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

export function FileUpload({
  label,
  file,
  isLoading = false,
  onFileSelected,
  onRemove,
  accept = '.xlsx,.xls,.csv',
}) {
  const inputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDragging(false)
    const droppedFile = event.dataTransfer.files?.[0]
    if (droppedFile) {
      onFileSelected(droppedFile)
    }
  }

  return (
    <div
      className={`rounded-2xl border bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-all ${
        isDragging
          ? 'border-indigo-400 bg-indigo-50/50 ring-4 ring-indigo-100'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-[0_8px_24px_rgba(15,23,42,0.07)]'
      }`}
      onDragOver={(event) => {
        event.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsDragging(false)
        }
      }}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const selectedFile = event.target.files?.[0]
          if (selectedFile) {
            onFileSelected(selectedFile)
          }
          event.target.value = ''
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isLoading}
        className="group flex min-h-48 w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-6 text-center text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50/40 disabled:cursor-wait"
      >
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition group-hover:border-indigo-100 group-hover:text-indigo-600">
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
            <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 15.5v3A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="text-sm font-semibold text-slate-900">{label}</span>
        <span className="mt-1.5 text-sm text-slate-500">
          {isDragging ? 'Drop your file to upload' : 'Drag and drop, or '}
          {!isDragging && <span className="font-medium text-indigo-600 group-hover:text-indigo-700">browse files</span>}
        </span>
        <span className="mt-4 flex items-center gap-1.5">
          {['.xlsx', '.xls', '.csv'].map((format) => (
            <span key={format} className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500">
              {format}
            </span>
          ))}
        </span>
      </button>

      {isLoading ? (
        <div className="mt-4 flex items-center gap-2 text-sm font-medium text-indigo-700" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
          Reading file…
        </div>
      ) : file ? (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-200/70 bg-emerald-50/50 px-3 py-3 text-sm text-slate-700">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
              <path d="M7 3.75h6.5L19 9.25v11H7a2 2 0 0 1-2-2v-12a2.5 2.5 0 0 1 2-2.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M13 4v5.5h5.5M8.5 14h6m-6 3h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-slate-900">{file.name}</span>
            <span className="mt-0.5 block text-xs text-slate-500">{formatBytes(file.size)}</span>
          </span>
          <span className="rounded-md border border-emerald-200 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
            Ready
          </span>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove ${label.toLowerCase()}`}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-red-600"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                <path d="m7 7 10 10M17 7 7 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      ) : (
        <div className="mt-4 text-xs text-slate-400">Excel workbooks and CSV files supported</div>
      )}
    </div>
  )
}
