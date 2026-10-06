'use client'

type PaginationProps = {
  page: number
  hasPrevious: boolean
  hasNext: boolean
  loading?: boolean
  onPrevious: () => void
  onNext: () => void
}

export function Pagination({ page, hasPrevious, hasNext, loading = false, onPrevious, onNext }: PaginationProps) {
  if (!hasPrevious && !hasNext) return null
  return (
    <nav className="pagination" aria-label="Board pagination">
      <span className="page-summary">Page <strong>{page}</strong> · Newest first</span>
      <div className="page-controls">
        <button type="button" onClick={onPrevious} disabled={!hasPrevious || loading} aria-label="Previous page">← <span>Previous</span></button>
        <button type="button" onClick={onNext} disabled={!hasNext || loading} aria-label="Next page"><span>Next</span> →</button>
      </div>
      <style jsx>{`
        .pagination { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 20px; padding-top: 17px; border-top: 1px solid var(--color-border); }
        .page-summary { color: var(--color-muted-foreground); font-size: 12px; }
        .page-summary strong { color: var(--color-foreground); font-weight: 600; }
        .page-controls { display: flex; gap: 8px; }
        button { min-height: 36px; padding: 0 12px; border: 1px solid var(--color-border); border-radius: 7px; background: #fff; color: var(--color-foreground); font-size: 12px; font-weight: 500; cursor: pointer; }
        button:disabled { color: #858C8F; background: var(--color-muted); cursor: not-allowed; }
        button:not(:disabled):hover { border-color: var(--color-primary); }
        @media (max-width: 390px) { .pagination { gap: 8px; } button { padding: 0 9px; } }
      `}</style>
    </nav>
  )
}
