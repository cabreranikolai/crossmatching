import { normalizeValue } from './normalizeValue.js'

const buildLookup = (rows, column, options) => {
  const lookup = new Map()

  rows.forEach((row, index) => {
    const value = row?.[column]
    const normalized = normalizeValue(value, options)

    if (normalized === '' && (options.ignoreEmpty ?? true)) {
      return
    }

    if (!lookup.has(normalized)) {
      lookup.set(normalized, [])
    }

    lookup.get(normalized).push({ row, originalIndex: index })
  })

  return lookup
}

const collectDuplicates = (rows, column, options) => {
  const lookup = new Map()

  rows.forEach((row, index) => {
    const value = row?.[column]
    const normalized = normalizeValue(value, options)

    if (normalized === '' && (options.ignoreEmpty ?? true)) {
      return
    }

    if (!lookup.has(normalized)) {
      lookup.set(normalized, [])
    }

    lookup.get(normalized).push({ row, originalIndex: index })
  })

  return [...lookup.entries()]
    .filter(([, matches]) => matches.length > 1)
    .map(([value, matches]) => ({
      value,
      count: matches.length,
      rows: matches.map((match) => match.row),
      indexes: matches.map((match) => match.originalIndex),
    }))
}

export const getMatchedFile2Rows = (
  file1Rows,
  file2Rows,
  file1Column,
  file2Column,
  options = {},
) => {
  const mergedOptions = {
    trimWhitespace: true,
    caseSensitive: false,
    ignoreEmpty: true,
    ...options,
  }
  const file1Keys = new Set(
    file1Rows
      .map((row) => normalizeValue(row?.[file1Column], mergedOptions))
      .filter((key) => key !== '' || !mergedOptions.ignoreEmpty),
  )

  return file2Rows.filter((row) => {
    const key = normalizeValue(row?.[file2Column], mergedOptions)
    return (key !== '' || !mergedOptions.ignoreEmpty) && file1Keys.has(key)
  })
}

export const crossmatchRecords = (file1Rows, file2Rows, file1Column, file2Column, options = {}) => {
  const mergedOptions = {
    trimWhitespace: true,
    caseSensitive: false,
    ignoreEmpty: true,
    ...options,
  }

  // Build lookup maps once so matching can be done by normalized key instead of row-by-row scanning.
  const file1Lookup = buildLookup(file1Rows, file1Column, mergedOptions)
  const file2Lookup = buildLookup(file2Rows, file2Column, mergedOptions)

  const matched = []
  const onlyInFile1 = []
  const onlyInFile2 = []

  // Treat matching as a key existence check so duplicate values are handled without dropping records.
  file1Lookup.forEach((file1Matches, key) => {
    if (!file2Lookup.has(key)) {
      onlyInFile1.push(...file1Matches.map((match) => match.row))
    }
  })

  file2Lookup.forEach((file2Matches, key) => {
    const file1Matches = file1Lookup.get(key)

    if (!file1Matches) {
      onlyInFile2.push(...file2Matches.map((match) => match.row))
      return
    }

    file2Matches.forEach((file2Match) => {
      matched.push({
        key,
        file1Row: file1Matches[0].row,
        file2Row: file2Match.row,
      })
    })
  })

  const duplicateValuesFile1 = collectDuplicates(file1Rows, file1Column, mergedOptions)
  const duplicateValuesFile2 = collectDuplicates(file2Rows, file2Column, mergedOptions)

  const summary = {
    totalFile1: file1Rows.length,
    totalFile2: file2Rows.length,
    matchedCount: matched.length,
    onlyInFile1Count: onlyInFile1.length,
    onlyInFile2Count: onlyInFile2.length,
    matchRate: file1Rows.length + file2Rows.length === 0 ? 0 : (matched.length / Math.max(file1Rows.length, file2Rows.length)) * 100,
  }

  return {
    summary,
    matched,
    onlyInFile1,
    onlyInFile2,
    duplicates: {
      file1: duplicateValuesFile1,
      file2: duplicateValuesFile2,
    },
    duplicateSummary: {
      file1: duplicateValuesFile1.length,
      file2: duplicateValuesFile2.length,
    },
  }
}
