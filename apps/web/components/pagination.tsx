'use client'

type PaginationProps = {
  page: number
  count: number
  hasNext: boolean
  loading?: boolean
  onPageChange: (page: number) => void
}

export function Pagination({ page, count, hasNext, loading = false, onPageChange }: PaginationProps) {
  if (count === 0 && page === 1 && !hasNext) return null
  const first = count === 0 ? 0 : (page - 1) * 20 + 1
  const last = (page - 1) * 20 + count

  return (
    <nav className="pagination" aria-label="Board pagination" aria-busy={loading}>
      <span className="summary" aria-live="polite">Showing <strong>{first}–{last}</strong> · Newest first</span>
      <div className="controls">
        <button type="button" onClick={() => onPageChange(page - 1)} disabled={loading || page <= 1} aria-label="Previous page">Previous</button>
        {hasNext && <button type="button" onClick={() => onPageChange(page + 1)} disabled={loading} aria-label="Next page">Next</button>}
      </div>
      <style jsx>{`
        .pagination { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 20px; padding-top: 17px; border-top: 1px solid var(--color-border); }
        .summary { color: var(--color-muted-foreground); font-size: 12px; line-height: 18px; }
        .summary strong { color: var(--color-foreground); font-weight: 600; }
        .controls { display: flex; gap: 8px; }
        button { min-height: 38px; padding: 0 13px; border: 1px solid var(--color-border); border-radius: 7px; background: var(--color-card); color: var(--color-foreground); font-size: 13px; cursor: pointer; }
        button:hover:not(:disabled) { background: var(--color-muted); }
        button:disabled { color: #777F83; background: #F8F7F4; cursor: not-allowed; }
        @media (max-width: 390px) { .pagination { gap: 8px; } .summary { max-width: 150px; } button { padding: 0 9px; } }
      `}</style>
    </nav>
  )
}
