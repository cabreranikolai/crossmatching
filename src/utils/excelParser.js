import * as XLSX from 'xlsx'

export const readSpreadsheet = (file) => {
  if (!file) {
    return Promise.reject(new Error('No file provided.'))
  }

  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!['xlsx', 'xls'].includes(extension || '')) {
    return Promise.reject(new Error('Unsupported file format. Please upload an Excel workbook (.xlsx or .xls).'))
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      try {
        const arrayBuffer = event.target?.result
        const workbook = XLSX.read(arrayBuffer, {
          type: 'array',
          cellDates: true,
          raw: false,
        })

        const sheetName = workbook.SheetNames[0]
        if (!sheetName) {
          reject(new Error('The workbook does not contain a usable worksheet.'))
          return
        }

        const worksheet = workbook.Sheets[sheetName]
        const rows = XLSX.utils.sheet_to_json(worksheet, {
          defval: '',
          blankrows: false,
          raw: false,
        })

        if (!rows.length) {
          reject(new Error('The selected worksheet appears to be empty.'))
          return
        }

        const headers = Object.keys(rows[0] || {})
        if (!headers.length) {
          reject(new Error('The worksheet is missing column headers.'))
          return
        }

        resolve({
          fileName: file.name,
          sheetName,
          headers,
          rows,
          rowCount: rows.length,
          columnCount: headers.length,
        })
      } catch {
        reject(new Error('The Excel file appears to be corrupted or unreadable.'))
      }
    }

    reader.onerror = () => {
      reject(new Error('The Excel file could not be read.'))
    }

    reader.readAsArrayBuffer(file)
  })
}
