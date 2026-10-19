import * as XLSX from 'xlsx'

export const readSpreadsheet = async (file) => {
  if (!file) {
    throw new Error('No file provided.')
  }

  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!['xlsx', 'xls', 'csv'].includes(extension || '')) {
    throw new Error('Unsupported file format. Please upload an Excel workbook (.xlsx, .xls) or CSV file (.csv).')
  }

  try {
    const isCsv = extension === 'csv'
    const data = isCsv ? await file.text() : await file.arrayBuffer()
    const workbook = XLSX.read(data, {
      type: isCsv ? 'string' : 'array',
      cellDates: true,
      raw: false,
    })

    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      throw new Error('The selected file does not contain any usable data.')
    }

    const worksheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(worksheet, {
      defval: '',
      blankrows: false,
      raw: false,
    })

    if (!rows.length) {
      throw new Error('The selected file appears to be empty.')
    }

    const headers = Object.keys(rows[0] || {})
    if (!headers.length) {
      throw new Error('The selected file is missing column headers.')
    }

    return {
      fileName: file.name,
      sheetName,
      headers,
      rows,
      rowCount: rows.length,
      columnCount: headers.length,
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('The selected file')) {
      throw error
    }

    throw new Error('The selected file appears to be corrupted or unreadable.')
  }
}
