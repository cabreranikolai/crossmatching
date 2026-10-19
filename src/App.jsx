import { useMemo, useState } from 'react'
import { CrossmatchConfig } from './components/CrossmatchConfig.jsx'
import { DuplicateWarning } from './components/DuplicateWarning.jsx'
import { ExportResults } from './components/ExportResults.jsx'
import { FilePreview } from './components/FilePreview.jsx'
import { FileUpload } from './components/FileUpload.jsx'
import { ResultsTable } from './components/ResultsTable.jsx'
import { ResultsTabs } from './components/ResultsTabs.jsx'
import { SummaryCards } from './components/SummaryCards.jsx'
import { readSpreadsheet } from './utils/excelParser.js'
import { crossmatchRecords, getMatchedFile2Rows } from './utils/crossmatch.js'
import { exportCrossmatchWorkbook, exportMatchedRecords } from './utils/exportExcel.js'

const defaultConfig = {
  trimWhitespace: true,
  caseSensitive: false,
  ignoreEmpty: true,
}

const initialFileState = {
  file: null,
  fileName: '',
  headers: [],
  rows: [],
  rowCount: 0,
  columnCount: 0,
}

const initialComparisonFile = { id: 0, ...initialFileState, selectedColumn: '', isLoading: false }

const tabs = [
  { id: 'all', label: 'All Matches' },
  { id: 'file1', label: 'Only in Reference' },
  { id: 'file2', label: 'Only in Comparison Files' },
]

function App() {
  const [referenceFile, setReferenceFile] = useState(initialFileState)
  const [comparisonFiles, setComparisonFiles] = useState([initialComparisonFile])
  const [config, setConfig] = useState(defaultConfig)
  const [referenceColumn, setReferenceColumn] = useState('')
  const [results, setResults] = useState(null)
  const [activeTab, setActiveTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' })
  const [error, setError] = useState('')
  const [referenceLoading, setReferenceLoading] = useState(false)

  const uploadedComparisonFiles = comparisonFiles.filter((file) => file.file)
  const comparisonData = useMemo(() => {
    const files = comparisonFiles.filter((file) => file.file)
    const headers = [...new Set(files.flatMap((file) => file.headers))]
    const uniqueHeader = (base) => {
      let header = base
      let suffix = 2
      while (headers.includes(header)) {
        header = `${base} ${suffix}`
        suffix += 1
      }
      return header
    }
    const sourceHeader = uniqueHeader('Source File')
    headers.push(sourceHeader)
    const keyHeader = uniqueHeader('__crossmatch_key__')
    const rows = files.flatMap((file) =>
      file.rows.map((row) => ({
        ...row,
        [sourceHeader]: file.fileName,
        [keyHeader]: row[file.selectedColumn],
      })),
    )

    return {
      headers,
      keyHeader,
      rows,
      fileName: files.map((file) => file.fileName).join(', '),
      rowCount: rows.length,
      columnCount: headers.length,
    }
  }, [comparisonFiles])

  const readReferenceFile = async (file) => {
    setError('')
    setResults(null)
    setReferenceLoading(true)

    try {
      const parsed = await readSpreadsheet(file)
      setReferenceFile({
        file,
        fileName: parsed.fileName,
        headers: parsed.headers,
        rows: parsed.rows,
        rowCount: parsed.rowCount,
        columnCount: parsed.columnCount,
      })
      setReferenceColumn(parsed.headers[0] || '')
    } catch (readError) {
      setError(readError.message)
      setReferenceFile(initialFileState)
      setReferenceColumn('')
    } finally {
      setReferenceLoading(false)
    }
  }

  const readComparisonFile = async (file, id) => {
    setError('')
    setResults(null)
    setComparisonFiles((previous) =>
      previous.map((comparisonFile) =>
        comparisonFile.id === id ? { ...comparisonFile, isLoading: true } : comparisonFile,
      ),
    )

    try {
      const parsed = await readSpreadsheet(file)
      setComparisonFiles((previous) =>
        previous.map((comparisonFile) =>
          comparisonFile.id === id
            ? {
                id,
                file,
                fileName: parsed.fileName,
                headers: parsed.headers,
                rows: parsed.rows,
                rowCount: parsed.rowCount,
                columnCount: parsed.columnCount,
                selectedColumn: parsed.headers[0] || '',
                isLoading: false,
              }
            : comparisonFile,
        ),
      )
    } catch (readError) {
      setError(readError.message)
      setComparisonFiles((previous) =>
        previous.map((comparisonFile) =>
          comparisonFile.id === id
            ? { ...initialComparisonFile, id }
            : comparisonFile,
        ),
      )
    }
  }

  const handleCrossmatch = () => {
    if (referenceLoading || comparisonFiles.some((file) => file.isLoading)) {
      setError('Wait for all selected files to finish loading before crossmatching.')
      return
    }

    if (!referenceFile.file || uploadedComparisonFiles.length === 0) {
      setError('Please upload a reference file and at least one comparison file.')
      return
    }

    if (!referenceColumn) {
      setError('No matching column has been selected for the reference file.')
      return
    }

    if (uploadedComparisonFiles.some((file) => !file.selectedColumn)) {
      setError('Select a matching column for every comparison file.')
      return
    }

    const crossmatchResult = crossmatchRecords(
      referenceFile.rows,
      comparisonData.rows,
      referenceColumn,
      comparisonData.keyHeader,
      config,
    )
    const matchedFile2Rows = getMatchedFile2Rows(
      referenceFile.rows,
      comparisonData.rows,
      referenceColumn,
      comparisonData.keyHeader,
      config,
    )

    setResults({
      ...crossmatchResult,
      matchedFile2Rows,
      file1: referenceFile,
      file2: comparisonData,
      comparisonHeaders: comparisonData.headers,
      selectedFile1Column: referenceColumn,
      selectedFile2Column: uploadedComparisonFiles
        .map((file) => `${file.fileName}: ${file.selectedColumn}`)
        .join('; '),
    })
    setActiveTab('all')
    setSearchTerm('')
    setCurrentPage(1)
    setSortConfig({ key: '', direction: 'asc' })
    setError('')
  }

  const handleExport = () => {
    if (!results) {
      return
    }

    exportCrossmatchWorkbook({
      file1: results.file1,
      file2: results.file2,
      file2Headers: results.comparisonHeaders,
      selectedFile1Column: results.selectedFile1Column,
      selectedFile2Column: results.selectedFile2Column,
      summary: results.summary,
      matched: results.matched,
      onlyInFile1: results.onlyInFile1,
      onlyInFile2: results.onlyInFile2,
      duplicates: results.duplicates,
    })
  }

  const handleExportMatches = () => {
    if (!results || results.matchedFile2Rows.length === 0) {
      return
    }

    exportMatchedRecords({
      file2Headers: results.comparisonHeaders,
      matchedRows: results.matchedFile2Rows,
      unmatchedRows: results.onlyInFile2,
    })
  }

  const handleReset = () => {
    setReferenceFile(initialFileState)
    setComparisonFiles([initialComparisonFile])
    setReferenceColumn('')
    setConfig(defaultConfig)
    setResults(null)
    setError('')
    setSearchTerm('')
    setActiveTab('all')
    setCurrentPage(1)
    setSortConfig({ key: '', direction: 'asc' })
    setReferenceLoading(false)
  }

  const removeReferenceFile = () => {
    setReferenceFile(initialFileState)
    setReferenceColumn('')
    setResults(null)
    setError('')
  }

  const removeComparisonFile = (id) => {
    setComparisonFiles((previous) =>
      previous.map((file) => (file.id === id ? { ...initialComparisonFile, id } : file)),
    )
    setResults(null)
    setError('')
  }

  const addComparisonFile = () => {
    setComparisonFiles((previous) => [
      ...previous,
      { ...initialComparisonFile, id: Math.max(...previous.map((file) => file.id)) + 1 },
    ])
    setResults(null)
  }

  const handleSort = (key) => {
    setSortConfig((previous) => {
      if (previous.key === key) {
        return {
          key,
          direction: previous.direction === 'asc' ? 'desc' : 'asc',
        }
      }

      return { key, direction: 'asc' }
    })
  }

  const tableRows = useMemo(() => {
    if (!results) {
      return []
    }

    if (activeTab === 'all') {
      return results.matchedFile2Rows.map((row, index) => ({
        id: `match-${index}`,
        ...Object.fromEntries(results.comparisonHeaders.map((header) => [header, row[header] ?? ''])),
      }))
    }

    if (activeTab === 'file1') {
      return results.onlyInFile1.map((row, index) => ({
        id: `file1-only-${index}`,
        ...Object.fromEntries(referenceFile.headers.map((header) => [header, row[header] ?? ''])),
      }))
    }

    return results.onlyInFile2.map((row, index) => ({
      id: `file2-only-${index}`,
      ...Object.fromEntries(results.comparisonHeaders.map((header) => [header, row[header] ?? ''])),
    }))
  }, [activeTab, referenceFile.headers, results])

  const columns = useMemo(() => {
    if (!results) {
      return []
    }

    if (activeTab === 'all') {
      return results.comparisonHeaders.map((header) => ({ key: header, label: header }))
    }

    const sourceHeaders = activeTab === 'file1' ? referenceFile.headers : results.comparisonHeaders
    return sourceHeaders.map((header) => ({ key: header, label: header }))
  }, [activeTab, referenceFile.headers, results])

  const visibleRows = useMemo(() => {
    const filtered = tableRows.filter((row) => {
      const searchableText = Object.values(row)
        .join(' ')
        .toLowerCase()
      return searchableText.includes(searchTerm.toLowerCase())
    })

    if (!sortConfig.key) {
      return filtered
    }

    return [...filtered].sort((left, right) => {
      const leftValue = left[sortConfig.key] ?? ''
      const rightValue = right[sortConfig.key] ?? ''
      const normalizedLeft = String(leftValue).toLowerCase()
      const normalizedRight = String(rightValue).toLowerCase()

      if (normalizedLeft < normalizedRight) {
        return sortConfig.direction === 'asc' ? -1 : 1
      }

      if (normalizedLeft > normalizedRight) {
        return sortConfig.direction === 'asc' ? 1 : -1
      }

      return 0
    })
  }, [searchTerm, sortConfig, tableRows])

  const totalPages = Math.max(1, Math.ceil(visibleRows.length / rowsPerPage))
  const paginatedRows = visibleRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
  const isLoading = referenceLoading || comparisonFiles.some((file) => file.isLoading)
  const canRunCrossmatch = Boolean(
    referenceFile.file &&
    uploadedComparisonFiles.length > 0 &&
    uploadedComparisonFiles.every((file) => file.selectedColumn) &&
    referenceColumn &&
    !isLoading,
  )

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-200">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                <path d="M4 7h6v6H4zM14 4h6v6h-6zM14 14h6v6h-6zM7 13v4a3 3 0 0 0 3 3h4M10 10h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold tracking-tight text-slate-900 sm:text-base">
                Excel Crossmatch
              </h1>
              <p className="hidden text-xs text-slate-500 sm:block">Compare spreadsheets with confidence</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {results && (
              <>
                <ExportResults
                  onExport={handleExportMatches}
                  disabled={!results.matchedFile2Rows.length && !results.onlyInFile2.length}
                  label="Export Matches"
                  variant="secondary"
                />
                <ExportResults
                  onExport={handleExport}
                  disabled={!results}
                  label="Export Report"
                  variant="secondary"
                />
              </>
            )}
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100"
            >
              Start New Crossmatch
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {error && (
          <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <section className="mb-8">
          <div className="mb-6 max-w-2xl">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              Spreadsheet matching
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Find the records that matter.
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
              Choose a reference file, then add one or more files to compare against it.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <FileUpload
              label="Reference File"
              file={referenceFile.file}
              isLoading={referenceLoading}
              onFileSelected={readReferenceFile}
              onRemove={removeReferenceFile}
            />
            {comparisonFiles.map((file, index) => (
              <FileUpload
                key={file.id}
                label={`Comparison File ${index + 1}`}
                file={file.file}
                isLoading={file.isLoading}
                onFileSelected={(selectedFile) => readComparisonFile(selectedFile, file.id)}
                onRemove={() => removeComparisonFile(file.id)}
              />
            ))}
            <button
              type="button"
              onClick={addComparisonFile}
              className="flex min-h-20 items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-transparent px-4 py-4 text-sm font-medium text-slate-600 transition hover:border-indigo-300 hover:bg-white hover:text-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-100"
            >
              <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
                <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              Add Comparison File
            </button>
          </div>
        </section>

        {(referenceFile.file || uploadedComparisonFiles.length > 0) && (
          <>
            <details className="group mb-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-slate-700 marker:hidden">
                <span>Preview uploaded data</span>
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-slate-400 transition group-open:rotate-180" aria-hidden="true">
                  <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <div className="pt-2">
                {referenceFile.file && (
                  <FilePreview
                    fileName={referenceFile.fileName}
                    rowCount={referenceFile.rowCount}
                    columnCount={referenceFile.columnCount}
                    headers={referenceFile.headers}
                    rows={referenceFile.rows}
                  />
                )}
                {uploadedComparisonFiles.map((file) => (
                  <FilePreview
                    key={file.id}
                    fileName={file.fileName}
                    rowCount={file.rowCount}
                    columnCount={file.columnCount}
                    headers={file.headers}
                    rows={file.rows}
                  />
                ))}
              </div>
            </details>

            <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.04)] sm:p-6">
              <CrossmatchConfig
                referenceHeaders={referenceFile.headers}
                comparisonFiles={comparisonFiles}
                referenceColumn={referenceColumn}
                config={config}
                onReferenceColumnChange={setReferenceColumn}
                onComparisonColumnChange={(id, value) => {
                  setComparisonFiles((previous) =>
                    previous.map((file) => (file.id === id ? { ...file, selectedColumn: value } : file)),
                  )
                }}
                onOptionChange={(option, value) => {
                  setConfig((previous) => ({ ...previous, [option]: value }))
                }}
              />

            </section>

            {results && (
              <>
                <section className="mb-8">
                  <SummaryCards summary={results.summary} />
                </section>

                <section className="mb-6">
                  {results.duplicateSummary.file1 > 0 || results.duplicateSummary.file2 > 0 ? (
                    <DuplicateWarning duplicates={[...(results.duplicates.file1 || []), ...(results.duplicates.file2 || [])]} />
                  ) : null}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
                  <ResultsTabs
                    activeTab={activeTab}
                    tabs={tabs}
                    onTabChange={(tab) => {
                      setActiveTab(tab)
                      setCurrentPage(1)
                    }}
                    search={searchTerm}
                    onSearchChange={(value) => {
                      setSearchTerm(value)
                      setCurrentPage(1)
                    }}
                  />
                  <ResultsTable
                    rows={paginatedRows}
                    columns={columns}
                    totalRows={visibleRows.length}
                    currentPage={Math.min(currentPage, totalPages)}
                    totalPages={totalPages}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(value) => {
                      setRowsPerPage(value)
                      setCurrentPage(1)
                    }}
                    onPageChange={(page) => setCurrentPage(page)}
                    sortKey={sortConfig.key}
                    sortDirection={sortConfig.direction}
                    onSort={handleSort}
                  />
                </section>
              </>
            )}
          </>
        )}
        <div className="mb-8 flex flex-col-reverse items-center justify-between gap-4 border-t border-slate-200 pt-5 sm:flex-row">
          <p className="text-xs text-slate-500">
            {canRunCrossmatch
              ? 'Files are ready. Select Run Crossmatch to compare your data.'
              : 'Upload a reference file and at least one comparison file to continue.'}
          </p>
          <button
            type="button"
            onClick={handleCrossmatch}
            disabled={!canRunCrossmatch}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none sm:w-auto"
          >
            Run Crossmatch
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
              <path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <footer className="mt-10 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-500 shadow-sm">
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-emerald-600" aria-hidden="true">
              <rect x="4.25" y="8.5" width="11.5" height="8.25" rx="1.75" stroke="currentColor" strokeWidth="1.5" />
              <path d="M6.75 8.5V6a3.25 3.25 0 0 1 6.5 0v2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M10 11.5v2.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Files are processed locally in your browser and never uploaded.
          </div>
        </footer>
      </main>
    </div>
  )
}

export default App
