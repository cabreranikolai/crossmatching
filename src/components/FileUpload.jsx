import { useRef, useState } from 'react'

export function FileUpload({ label, file, isLoading = false, onFileSelected, accept = '.xlsx,.xls' }) {
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
      className={`rounded-2xl border-2 border-dashed p-4 transition-all ${
        isDragging
          ? 'border-primary-500 bg-primary-50 shadow-md'
          : 'border-slate-200 bg-white hover:border-primary-300 hover:bg-slate-50'
      }`}
      onDragOver={(event) => {
        event.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
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
        className="flex w-full flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-slate-700"
      >
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-xl text-primary-600">
          ⤴
        </div>
        <div className="text-lg font-semibold">{label}</div>
        <div className="mt-1 text-sm text-slate-500">.xlsx or .xls</div>
      </button>

      {isLoading ? (
        <div className="mt-4 flex items-center gap-2 text-sm font-medium text-primary-700" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
          Reading workbook…
        </div>
      ) : file ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <div className="font-medium text-slate-900">{file.name}</div>
        </div>
      ) : (
        <div className="mt-4 text-sm text-slate-500">No file uploaded yet.</div>
      )}
    </div>
  )
}
