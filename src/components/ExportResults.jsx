export function ExportResults({ onExport, disabled, label = 'Export Results', variant = 'primary' }) {
  const styles = variant === 'secondary'
    ? 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 disabled:bg-slate-100'
    : 'bg-primary-600 text-white hover:bg-primary-700 disabled:bg-slate-300'

  return (
    <button
      type="button"
      onClick={onExport}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed ${styles}`}
    >
      {label}
    </button>
  )
}
