'use client'

type PaginationProps = {
  page: number
  hasNext: boolean
  loading?: boolean
  onPageChange: (page: number) => void
}

export function Pagination({ page, hasNext, loading = false, onPageChange }: PaginationProps) {
  if (page === 1 && !hasNext) return null
  return (
    <nav className="pagination" aria-label="Board pagination">
      <span className="page-summary" aria-live="polite" aria-atomic="true">Page <strong>{page}</strong> · Newest first · Up to 20 kudos per page</span>
      <div className="page-controls">
        <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1 || loading} aria-label="Previous page">Previous</button>
        <button type="button" onClick={() => onPageChange(page + 1)} disabled={!hasNext || loading} aria-label="Next page">Next</button>
      </div>
      <style jsx>{`
        .pagination { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--color-border); }
        .page-summary { color: var(--color-muted-foreground); font-size: 12px; }
        .page-summary strong { color: var(--color-foreground); }
        .page-controls { display: flex; gap: 8px; }
        button { min-height: 38px; padding: 0 13px; border: 1px solid var(--color-border); border-radius: 7px; background: var(--color-card); color: var(--color-foreground); font-size: 13px; cursor: pointer; }
        button:hover:not(:disabled) { background: var(--color-muted); }
        button:disabled { color: #777F83; background: var(--color-muted); cursor: not-allowed; }
        button:focus-visible { outline: 3px solid var(--color-ring); outline-offset: 2px; }
        @media (max-width: 420px) { .pagination { align-items: flex-start; flex-direction: column; } }
      `}</style>
    </nav>
  )
}
