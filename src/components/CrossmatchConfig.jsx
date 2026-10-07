import { ColumnSelector } from './ColumnSelector.jsx'

export function CrossmatchConfig({
  file1Headers,
  file2Headers,
  file1Column,
  file2Column,
  config,
  onColumnChange,
  onOptionChange,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Crossmatch Configuration
          </div>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Choose comparison key</h2>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <ColumnSelector
          label="File 1 Matching Column"
          options={file1Headers}
          value={file1Column}
          onChange={(value) => onColumnChange('file1', value)}
          disabled={!file1Headers.length}
        />
        <ColumnSelector
          label="File 2 Matching Column"
          options={file2Headers}
          value={file2Column}
          onChange={(value) => onColumnChange('file2', value)}
          disabled={!file2Headers.length}
        />
      </div>

      <div className="mt-6 space-y-3">
        <label className="flex items-center gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={config.trimWhitespace}
            onChange={() => onOptionChange('trimWhitespace', !config.trimWhitespace)}
            className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
          />
          Ignore leading/trailing spaces
        </label>
        <label className="flex items-center gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={config.caseSensitive}
            onChange={() => onOptionChange('caseSensitive', !config.caseSensitive)}
            className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
          />
          Case-sensitive matching
        </label>
        <label className="flex items-center gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={config.ignoreEmpty}
            onChange={() => onOptionChange('ignoreEmpty', !config.ignoreEmpty)}
            className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
          />
          Ignore empty values
        </label>
      </div>
    </div>
  )
}
