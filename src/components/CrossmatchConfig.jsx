import { ColumnSelector } from './ColumnSelector.jsx'

export function CrossmatchConfig({
  referenceHeaders,
  comparisonFiles,
  referenceColumn,
  config,
  onReferenceColumnChange,
  onComparisonColumnChange,
  onOptionChange,
}) {
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-base font-semibold tracking-tight text-slate-900">Matching columns</h2>
        <p className="mt-1 text-sm text-slate-500">
          Choose the column that identifies the same record in each file.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <ColumnSelector
          label="Reference Matching Column"
          options={referenceHeaders}
          value={referenceColumn}
          onChange={onReferenceColumnChange}
          disabled={!referenceHeaders.length}
        />
        {comparisonFiles.map((file, index) => (
          <ColumnSelector
            key={file.id}
            label={`Comparison ${index + 1}${file.fileName ? ` · ${file.fileName}` : ''}`}
            options={file.headers}
            value={file.selectedColumn}
            onChange={(value) => onComparisonColumnChange(file.id, value)}
            disabled={!file.headers.length}
          />
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 border-t border-slate-100 pt-5">
        <label className="flex items-center gap-2.5 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={config.trimWhitespace}
            onChange={() => onOptionChange('trimWhitespace', !config.trimWhitespace)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          Ignore leading/trailing spaces
        </label>
        <label className="flex items-center gap-2.5 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={config.caseSensitive}
            onChange={() => onOptionChange('caseSensitive', !config.caseSensitive)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          Case-sensitive matching
        </label>
        <label className="flex items-center gap-2.5 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={config.ignoreEmpty}
            onChange={() => onOptionChange('ignoreEmpty', !config.ignoreEmpty)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          Ignore empty values
        </label>
      </div>
    </div>
  )
}
