'use client'

type PaginationProps = {
  page: number
  canGoNext: boolean
  loading?: boolean
  onPageChange: (page: number) => void
}

export function Pagination({ page, canGoNext, loading = false, onPageChange }: PaginationProps) {
  return (
    <nav className="board-pagination" aria-label="Board pagination">
      <span className="page-summary">Page <strong>{page}</strong><span className="sr-only"> of board results</span></span>
      <div className="page-controls">
        <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1 || loading} aria-label="Previous page">Previous</button>
        <button type="button" onClick={() => onPageChange(page + 1)} disabled={!canGoNext || loading} aria-label="Next page">Next</button>
      </div>
      <style jsx>{`
        .board-pagination { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 20px; padding-top: 17px; border-top: 1px solid var(--color-border); }
        .page-summary { color: var(--color-muted-foreground); font-size: 13px; }
        .page-summary strong { color: var(--color-foreground); }
        .page-controls { display: flex; gap: 8px; }
        button { min-height: 38px; padding: 0 13px; border: 1px solid var(--color-border); border-radius: 7px; background: var(--color-card); color: var(--color-foreground); font-size: 13px; font-weight: 500; cursor: pointer; transition: background-color var(--motion-fast) var(--ease-enter); }
        button:hover:not(:disabled) { background: var(--color-muted); }
        button:disabled { background: var(--color-muted); color: var(--color-muted-foreground); cursor: not-allowed; opacity: .72; }
        @media (max-width: 390px) { .board-pagination { gap: 8px; } button { padding: 0 9px; } }
      `}</style>
    </nav>
  )
}
