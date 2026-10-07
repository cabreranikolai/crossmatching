export const normalizeValue = (value, options = {}) => {
  const trimWhitespace = options.trimWhitespace ?? true
  const caseSensitive = options.caseSensitive ?? false
  const ignoreEmpty = options.ignoreEmpty ?? true

  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'number') {
    if (Number.isNaN(value)) {
      return ''
    }

    return String(value)
  }

  if (typeof value === 'boolean') {
    return String(value)
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (typeof value === 'string') {
    let normalized = value

    if (trimWhitespace) {
      normalized = normalized.trim()
    }

    if (!caseSensitive) {
      normalized = normalized.toLowerCase()
    }

    if (ignoreEmpty && normalized === '') {
      return ''
    }

    return normalized
  }

  return String(value)
}
