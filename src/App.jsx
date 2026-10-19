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
      setError('Wait for all selected workbooks to finish loading before crossmatching.')
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
                Crossmatch Excel files quickly and securely
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

        {!referenceFile.file && uploadedComparisonFiles.length === 0 && (
          <main className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-4 text-4xl font-bold tracking-tight text-slate-900">
                Excel Crossmatch Tool
              </div>
              <p className="text-lg text-slate-600">
                Compare a reference workbook with one or more Excel files to find matching records.
              </p>
            </div>
          </main>
        )}

        <section className="mb-8 mt-8 grid gap-5 lg:grid-cols-2">
          <FileUpload
            label="Reference File"
            file={referenceFile.file}
            isLoading={referenceLoading}
            onFileSelected={readReferenceFile}
          />
          {comparisonFiles.map((file, index) => (
            <FileUpload
              key={file.id}
              label={`Comparison File ${index + 1}`}
              file={file.file}
              isLoading={file.isLoading}
              onFileSelected={(selectedFile) => readComparisonFile(selectedFile, file.id)}
            />
          ))}
          <button
            type="button"
            onClick={addComparisonFile}
            className="rounded-xl border border-primary-200 bg-white px-4 py-3 text-sm font-semibold text-primary-700 transition hover:border-primary-300 hover:bg-primary-50"
          >
            + Add another comparison file
          </button>
        </section>

        {(referenceFile.file || uploadedComparisonFiles.length > 0) && (
          <>
            <section className="mb-8">
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
            </section>

            <section className="mb-8">
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

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={handleCrossmatch}
                  disabled={referenceLoading || comparisonFiles.some((file) => file.isLoading)}
                  className="rounded-xl bg-primary-600 px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
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
