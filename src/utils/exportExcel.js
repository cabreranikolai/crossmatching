import * as XLSX from 'xlsx'

export const exportMatchedRecords = ({ file2Headers, matchedRows, unmatchedRows }) => {
  const toWorksheet = (rows) => XLSX.utils.aoa_to_sheet([
    file2Headers,
    ...rows.map((row) => file2Headers.map((header) => row?.[header] ?? '')),
  ])

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, toWorksheet(matchedRows), 'Matched Records')
  XLSX.utils.book_append_sheet(workbook, toWorksheet(unmatchedRows), 'Not Matched Records')
  XLSX.writeFile(workbook, 'file-2-crossmatch-results.xlsx')
}

export const exportCrossmatchWorkbook = ({
  file1,
  file2,
  selectedFile1Column,
  selectedFile2Column,
  summary,
  matched,
  onlyInFile1,
  onlyInFile2,
  duplicates,
}) => {
  const workbook = XLSX.utils.book_new()

  const summaryRows = [
    ['Field', 'Value'],
    ['File 1', file1?.fileName || 'File 1'],
    ['File 1 rows', String(file1?.rowCount || 0)],
    ['File 1 match column', selectedFile1Column || ''],
    ['File 2', file2?.fileName || 'File 2'],
    ['File 2 rows', String(file2?.rowCount || 0)],
    ['File 2 match column', selectedFile2Column || ''],
    ['Matched count', String(summary?.matchedCount || 0)],
    ['Only in File 1 count', String(summary?.onlyInFile1Count || 0)],
    ['Only in File 2 count', String(summary?.onlyInFile2Count || 0)],
    ['Match percentage', `${Number(summary?.matchRate || 0).toFixed(1)}%`],
  ]

  const matchedSheet = XLSX.utils.json_to_sheet(
    matched.map((entry) => ({
      key: entry.key,
      'File 1': JSON.stringify(entry.file1Row),
      'File 2': JSON.stringify(entry.file2Row),
    })),
  )

  const file1OnlySheet = XLSX.utils.json_to_sheet(
    onlyInFile1.map((row) => row),
  )

  const file2OnlySheet = XLSX.utils.json_to_sheet(
    onlyInFile2.map((row) => row),
  )

  const duplicateSheet = XLSX.utils.json_to_sheet(
    [...(duplicates?.file1 || []), ...(duplicates?.file2 || [])].map((item) => ({
      value: item.value,
      count: item.count,
      source: 'File 1',
      rows: item.rows?.length || 0,
    })),
  )

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows)
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')
  XLSX.utils.book_append_sheet(workbook, matchedSheet, 'Matched Records')
  XLSX.utils.book_append_sheet(workbook, file1OnlySheet, 'Only in File 1')
  XLSX.utils.book_append_sheet(workbook, file2OnlySheet, 'Only in File 2')
  XLSX.utils.book_append_sheet(workbook, duplicateSheet, 'Duplicates')

  XLSX.writeFile(workbook, 'excel-crossmatch-report.xlsx')
}
