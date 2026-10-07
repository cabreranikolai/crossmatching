export function DuplicateWarning({ duplicates }) {
  const totalDuplicates = duplicates?.reduce((sum, item) => sum + item.count, 0) || 0

  if (!duplicates?.length) {
    return null
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.12em] text-amber-700">
            Duplicate matching values detected.
          </div>
          <div className="mt-1 text-sm">
            {duplicates.length} duplicate value(s) found; {totalDuplicates} total matching rows impacted. Matching is treated as a key existence check rather than a strict one-to-one row comparison.
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {duplicates.map((duplicate) => (
          <div key={duplicate.value} className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm">
            <span className="font-semibold">{duplicate.value}</span>
            <span className="ml-2 text-amber-700">({duplicate.count} records)</span>
          </div>
        ))}
      </div>
    </div>
  )
}
