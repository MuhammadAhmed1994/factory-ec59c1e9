'use client'

type PaginationProps = {
  page: number
  hasPrevious: boolean
  hasNext: boolean
  loading?: boolean
  onPageChange: (page: number) => void
}

export function Pagination({ page, hasPrevious, hasNext, loading = false, onPageChange }: PaginationProps) {
  if (!hasPrevious && !hasNext) return null
  return (
    <nav className="pagination" aria-label="Board pagination">
      <span className="page-summary">Page <strong>{page}</strong> · Newest first · Up to 20 kudos per page</span>
      <div className="page-controls">
        <button type="button" onClick={() => onPageChange(page - 1)} disabled={!hasPrevious || loading} aria-label="Previous page">Previous</button>
        <button type="button" onClick={() => onPageChange(page + 1)} disabled={!hasNext || loading} aria-label="Next page">Next</button>
      </div>
      <style jsx>{`
        .pagination { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 20px; padding-top: 17px; border-top: 1px solid var(--color-border); }
        .page-summary { color: var(--color-muted-foreground); font-size: 12px; line-height: 18px; }
        .page-summary strong { color: var(--color-foreground); font-weight: 600; }
        .page-controls { display: flex; gap: 8px; }
        button { min-height: 36px; padding: 0 12px; border: 1px solid var(--color-border); border-radius: 7px; background: #fff; color: var(--color-foreground); font-size: 12px; font-weight: 500; cursor: pointer; }
        button:hover:not(:disabled) { background: var(--color-muted); }
        button:disabled { background: #F8F7F4; color: #777F83; cursor: not-allowed; }
        button:focus-visible { outline: 3px solid var(--color-ring); outline-offset: 2px; }
        @media (max-width: 390px) { .pagination { gap: 8px; } .page-summary { max-width: 140px; } button { padding: 0 9px; } }
      `}</style>
    </nav>
  )
}
