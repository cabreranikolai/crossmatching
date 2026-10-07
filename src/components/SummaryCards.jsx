const cardStyles = {
  total: 'border-slate-200 bg-white text-slate-900',
  matched: 'border-emerald-200 bg-emerald-50 text-emerald-800',
}

export function SummaryCards({ summary }) {
  const cards = [
    { label: 'Total Records File 1', value: summary.totalFile1, tone: 'total' },
    { label: 'Total Records File 2', value: summary.totalFile2, tone: 'total' },
    { label: 'Matches', value: summary.matchedCount, tone: 'matched' },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-2xl border p-4 shadow-sm ${cardStyles[card.tone]}`}
        >
          <div className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">
            {card.label}
          </div>
          <div className="mt-3 text-3xl font-bold tracking-tight">{card.value}</div>
        </div>
      ))}
    </div>
  )
}
