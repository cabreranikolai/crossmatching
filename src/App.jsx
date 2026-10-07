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

const tabs = [
  { id: 'all', label: 'All Matches' },
  { id: 'file1', label: 'Only in File 1' },
  { id: 'file2', label: 'Only in File 2' },
]

function App() {
  const [file1, setFile1] = useState(initialFileState)
  const [file2, setFile2] = useState(initialFileState)
  const [config, setConfig] = useState(defaultConfig)
  const [selectedColumns, setSelectedColumns] = useState({ file1: '', file2: '' })
  const [results, setResults] = useState(null)
  const [activeTab, setActiveTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState({ file1: false, file2: false })

  const readFile = async (file, side) => {
    setError('')
    setResults(null)
    setLoading((previous) => ({ ...previous, [side]: true }))

    try {
      const parsed = await readSpreadsheet(file)
      const nextState = {
        file,
        fileName: parsed.fileName,
        headers: parsed.headers,
        rows: parsed.rows,
        rowCount: parsed.rowCount,
        columnCount: parsed.columnCount,
      }

      if (side === 'file1') {
        setFile1(nextState)
        setSelectedColumns((previous) => ({
          ...previous,
          file1: parsed.headers[0] || '',
        }))
      } else {
        setFile2(nextState)
        setSelectedColumns((previous) => ({
          ...previous,
          file2: parsed.headers[0] || '',
        }))
      }
    } catch (readError) {
      setError(readError.message)
      if (side === 'file1') {
        setFile1(initialFileState)
      } else {
        setFile2(initialFileState)
      }
    } finally {
      setLoading((previous) => ({ ...previous, [side]: false }))
    }
  }

  const handleCrossmatch = () => {
    if (!file1.file || !file2.file) {
      setError('Please upload both Excel files before running the comparison.')
      return
    }

    if (!selectedColumns.file1) {
      setError('No matching column has been selected for File 1.')
      return
    }

    if (!selectedColumns.file2) {
      setError('No matching column has been selected for File 2.')
      return
    }

    const crossmatchResult = crossmatchRecords(
      file1.rows,
      file2.rows,
      selectedColumns.file1,
      selectedColumns.file2,
      config,
    )
    const matchedFile2Rows = getMatchedFile2Rows(
      file1.rows,
      file2.rows,
      selectedColumns.file1,
      selectedColumns.file2,
      config,
    )

    setResults({
      ...crossmatchResult,
      matchedFile2Rows,
      file1,
      file2,
      selectedFile1Column: selectedColumns.file1,
      selectedFile2Column: selectedColumns.file2,
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
      file1,
      file2,
      selectedFile1Column: selectedColumns.file1,
      selectedFile2Column: selectedColumns.file2,
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
      file2Headers: file2.headers,
      matchedRows: results.matchedFile2Rows,
      unmatchedRows: results.onlyInFile2,
    })
  }

  const handleReset = () => {
    setFile1(initialFileState)
    setFile2(initialFileState)
    setSelectedColumns({ file1: '', file2: '' })
    setConfig(defaultConfig)
    setResults(null)
    setError('')
    setSearchTerm('')
    setActiveTab('all')
    setCurrentPage(1)
    setSortConfig({ key: '', direction: 'asc' })
    setLoading({ file1: false, file2: false })
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
        ...Object.fromEntries(file2.headers.map((header) => [header, row[header] ?? ''])),
      }))
    }

    if (activeTab === 'file1') {
      return results.onlyInFile1.map((row, index) => ({
        id: `file1-only-${index}`,
        ...Object.fromEntries(file1.headers.map((header) => [header, row[header] ?? ''])),
      }))
    }

    return results.onlyInFile2.map((row, index) => ({
      id: `file2-only-${index}`,
      ...Object.fromEntries(file2.headers.map((header) => [header, row[header] ?? ''])),
    }))
  }, [activeTab, file1.headers, file2.headers, results])

  const columns = useMemo(() => {
    if (!results) {
      return []
    }

    if (activeTab === 'all') {
      return file2.headers.map((header) => ({ key: header, label: header }))
    }

    const sourceHeaders = activeTab === 'file1' ? file1.headers : file2.headers
    return sourceHeaders.map((header) => ({ key: header, label: header }))
  }, [activeTab, file1.headers, file2.headers, results])

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

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-primary-600">
                Excel Crossmatch Tool
              </div>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                Compare two Excel files quickly and securely
              </h1>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Start New Crossmatch
              </button>
              {results && (
                <div className="flex flex-wrap gap-2">
                  <ExportResults
                    onExport={handleExportMatches}
                    disabled={!results.matchedFile2Rows.length && !results.onlyInFile2.length}
                    label="Export File 2 Results"
                  />
                  <ExportResults
                    onExport={handleExport}
                    disabled={!results}
                    label="Export Full Report"
                    variant="secondary"
                  />
                </div>
              )}
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {!file1.file && !file2.file ? (
          <main className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-4 text-4xl font-bold tracking-tight text-slate-900">
                Excel Crossmatch Tool
              </div>
              <p className="text-lg text-slate-600">
                Compare two Excel files and quickly identify matching and unmatched records.
              </p>
              <div className="mt-8 grid gap-5 md:grid-cols-2">
                <FileUpload label="Upload File 1" file={file1.file} isLoading={loading.file1} onFileSelected={(file) => readFile(file, 'file1')} />
                <FileUpload label="Upload File 2" file={file2.file} isLoading={loading.file2} onFileSelected={(file) => readFile(file, 'file2')} />
              </div>
              <div className="mt-6 text-sm text-slate-500">100% browser-based • Your files stay on your device</div>
            </div>
          </main>
        ) : (
          <>
            <section className="mb-8 grid gap-5 lg:grid-cols-2">
              <FileUpload label="File 1" file={file1.file} isLoading={loading.file1} onFileSelected={(file) => readFile(file, 'file1')} />
              <FileUpload label="File 2" file={file2.file} isLoading={loading.file2} onFileSelected={(file) => readFile(file, 'file2')} />
            </section>

            <section className="mb-8">
              <FilePreview
                fileName={file1.fileName}
                rowCount={file1.rowCount}
                columnCount={file1.columnCount}
                headers={file1.headers}
                rows={file1.rows}
              />
              <FilePreview
                fileName={file2.fileName}
                rowCount={file2.rowCount}
                columnCount={file2.columnCount}
                headers={file2.headers}
                rows={file2.rows}
              />
            </section>

            <section className="mb-8">
              <CrossmatchConfig
                file1Headers={file1.headers}
                file2Headers={file2.headers}
                file1Column={selectedColumns.file1}
                file2Column={selectedColumns.file2}
                config={config}
                onColumnChange={(side, value) => {
                  setSelectedColumns((previous) => ({ ...previous, [side]: value }))
                }}
                onOptionChange={(option, value) => {
                  setConfig((previous) => ({ ...previous, [option]: value }))
                }}
              />

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={handleCrossmatch}
                  className="rounded-xl bg-primary-600 px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-primary-700"
                >
                  Crossmatch Files
                </button>
              </div>
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

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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

        <footer className="mt-8 text-center text-sm text-slate-500">
          Your files are processed locally in your browser and are not uploaded to a server.
        </footer>
      </div>
    </div>
  )
}

export default App
