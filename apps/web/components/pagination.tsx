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
    <nav className="board-pagination" aria-label="Board pagination" aria-busy={loading}>
      <span className="summary">Page <strong>{page}</strong> · Newest first</span>
      <div className="controls">
        <button type="button" aria-label="Previous page" disabled={loading || page <= 1} onClick={() => onPageChange(page - 1)}>← <span>Previous</span></button>
        <button type="button" aria-label="Next page" disabled={loading || !hasNext} onClick={() => onPageChange(page + 1)}><span>Next</span> →</button>
      </div>
      <style jsx>{`
        .board-pagination { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--color-border); }
        .summary { color: var(--color-muted-foreground); font-size: 13px; }
        .summary strong { color: var(--color-foreground); }
        .controls { display: flex; gap: 8px; }
        button { min-height: 38px; padding: 0 12px; border: 1px solid var(--color-border); border-radius: 7px; background: var(--color-card); color: var(--color-foreground); font-size: 13px; cursor: pointer; }
        button:hover:not(:disabled) { border-color: var(--color-primary); }
        button:disabled { color: #777F83; background: var(--color-muted); cursor: not-allowed; }
        @media (max-width: 390px) { .board-pagination { align-items: flex-start; flex-direction: column; } }
      `}</style>
    </nav>
  )
}
