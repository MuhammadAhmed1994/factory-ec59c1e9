'use client'

type PaginationProps = {
  page: number
  hasNextPage: boolean
  onPageChange: (page: number) => void
  loading?: boolean
}

export function Pagination({ page, hasNextPage, onPageChange, loading = false }: PaginationProps) {
  if (page === 1 && !hasNextPage) return null

  return (
    <nav className="pagination" aria-label="Board pagination">
      <span className="summary" aria-live="polite">Page <strong>{page}</strong></span>
      <div className="controls">
        <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1 || loading} aria-label="Previous page">
          Previous
        </button>
        <button type="button" onClick={() => onPageChange(page + 1)} disabled={!hasNextPage || loading} aria-label="Next page">
          Next
        </button>
      </div>
      <style jsx>{`
        .pagination { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 20px; padding-top: 17px; border-top: 1px solid var(--color-border); }
        .summary { color: var(--color-muted-foreground); font-size: 13px; }
        .summary strong { color: var(--color-foreground); }
        .controls { display: flex; gap: 8px; }
        button { min-height: 38px; padding: 0 13px; border: 1px solid var(--color-border); border-radius: 7px; color: var(--color-foreground); background: var(--color-card); cursor: pointer; }
        button:disabled { color: #777F83; background: var(--color-muted); cursor: not-allowed; }
        button:focus-visible { outline: 3px solid var(--color-ring); outline-offset: 2px; }
        @media (max-width: 390px) { .pagination { gap: 8px; } button { padding: 0 9px; } }
      `}</style>
    </nav>
  )
}
