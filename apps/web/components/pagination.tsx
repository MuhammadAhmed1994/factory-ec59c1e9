'use client'

export type PaginationProps = {
  page: number
  hasNext: boolean
  loading?: boolean
  onPageChange: (page: number) => void
}

export function Pagination({ page, hasNext, loading = false, onPageChange }: PaginationProps) {
  if (page <= 1 && !hasNext) return null
  return (
    <nav className="pagination" aria-label="Board pagination" aria-busy={loading}>
      <span className="summary" aria-live="polite">Page <strong aria-current="page">{page}</strong>{loading ? ' · Loading…' : ''}</span>
      <div className="controls">
        <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1 || loading} aria-label="Previous page">Previous</button>
        <button type="button" onClick={() => onPageChange(page + 1)} disabled={!hasNext || loading} aria-label="Next page">Next</button>
      </div>
      <style jsx>{`
        .pagination { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--color-border); color: var(--color-muted-foreground); font-size: 13px; }
        .summary strong { color: var(--color-foreground); }
        .controls { display: flex; gap: 8px; }
        button { min-height: 38px; padding: 0 13px; border: 1px solid var(--color-border); border-radius: 7px; color: var(--color-foreground); background: var(--color-card); cursor: pointer; }
        button:hover:not(:disabled) { background: var(--color-muted); }
        button:disabled { color: #858B8F; background: var(--color-muted); cursor: not-allowed; }
        @media (max-width: 390px) { .pagination { align-items: flex-start; flex-direction: column; } }
      `}</style>
    </nav>
  )
}
