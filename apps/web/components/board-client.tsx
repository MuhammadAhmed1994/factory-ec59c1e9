'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { apiRequest } from '@/lib/api-client'
import { BoardPost } from './board-post'
import { KudosComposer, type BoardKudos } from './kudos-composer'
import { LiveStatus } from './live-status'
import { Pagination } from './pagination'

type BoardConnection = 'live' | 'reconnecting'
const PAGE_SIZE = 20

function sortNewestFirst(kudos: BoardKudos[]) {
  return [...kudos].sort((a, b) => {
    const byDate = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    return byDate || b.id.localeCompare(a.id)
  })
}

function readEventId(raw: string): string | null {
  try {
    const data = JSON.parse(raw) as { id?: string; kudos?: { id?: string } }
    return data.id ?? data.kudos?.id ?? null
  } catch {
    return null
  }
}

export function BoardClient() {
  const [page, setPage] = useState(1)
  const [kudos, setKudos] = useState<BoardKudos[]>([])
  const [hasNext, setHasNext] = useState(false)
  const [loading, setLoading] = useState(true)
  const [boardError, setBoardError] = useState<string | null>(null)
  const [connection, setConnection] = useState<BoardConnection>('live')
  const [announcement, setAnnouncement] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const requestSequence = useRef(0)
  const hasContent = useRef(false)
  const currentPage = useRef(page)
  currentPage.current = page

  const loadPage = useCallback(async (targetPage: number, retainContent = true) => {
    const requestId = ++requestSequence.current
    if (!retainContent || !hasContent.current) setLoading(true)
    setBoardError(null)
    setHasNext(false)
    try {
      const results = await apiRequest<BoardKudos[]>(`/kudos?page=${targetPage}`)
      if (requestId !== requestSequence.current) return
      const visible = results.filter((item) => item && !('isHidden' in item && (item as BoardKudos & { isHidden?: boolean }).isHidden))
      const ordered = sortNewestFirst(visible.slice(0, PAGE_SIZE))
      hasContent.current = ordered.length > 0
      setKudos(ordered)
      setPage(targetPage)
      setLoading(false)

      // The list endpoint has no total-count metadata. Probe the next page only when full
      // so pagination is shown only when there is at least one additional visible item.
      if (ordered.length === PAGE_SIZE) {
        try {
          const next = await apiRequest<BoardKudos[]>(`/kudos?page=${targetPage + 1}`)
          if (requestId === requestSequence.current) setHasNext(next.length > 0)
        } catch {
          if (requestId === requestSequence.current) {
            setHasNext(true)
            setBoardError('The board couldn’t be updated. Retrying…')
            setConnection('reconnecting')
          }
        }
      }
    } catch {
      if (requestId !== requestSequence.current) return
      setLoading(false)
      setBoardError('The board couldn’t be updated. Retrying…')
      setConnection('reconnecting')
    }
  }, [])

  useEffect(() => {
    void loadPage(1, false)
  }, [loadPage, refreshKey])

  useEffect(() => {
    const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')
    const stream = new EventSource(`${base}/kudos/events`, { withCredentials: true })
    const onAdded = () => {
      setAnnouncement('New kudos added to the board.')
      if (currentPage.current === 1) void loadPage(1)
    }
    const onRemoved = (event: Event) => {
      const id = readEventId((event as MessageEvent<string>).data)
      if (!id) return
      setKudos((current) => {
        const remaining = current.filter((item) => item.id !== id)
        hasContent.current = remaining.length > 0
        return remaining
      })
      setAnnouncement('Hidden kudos removed from the board.')
      void loadPage(currentPage.current)
    }
    stream.addEventListener('kudos-added', onAdded)
    stream.addEventListener('kudos-removed', onRemoved)
    stream.onopen = () => setConnection('live')
    stream.onerror = () => setConnection('reconnecting')
    return () => stream.close()
  }, [loadPage])

  function onCreated(created: BoardKudos) {
    setPage(1)
    currentPage.current = 1
    setKudos((current) => {
      const ordered = sortNewestFirst([created, ...current.filter((item) => item.id !== created.id)]).slice(0, PAGE_SIZE)
      hasContent.current = ordered.length > 0
      return ordered
    })
    setAnnouncement('Kudos posted.')
    setLoading(false)
  }

  const hasPrevious = page > 1

  return (
    <div className="board-page">
      <section className="intro" aria-labelledby="board-title">
        <div>
          <p className="eyebrow">A little appreciation goes a long way</p>
          <h1 id="board-title">Team kudos</h1>
          <p className="subtitle">Good work deserves to be noticed. Give a teammate a shout-out.</p>
        </div>
        <LiveStatus state={connection} />
      </section>

      <KudosComposer onCreated={onCreated} />

      <section aria-labelledby="feed-title">
        <div className="feed-heading">
          <h2 id="feed-title">Latest appreciation</h2>
          <span className="feed-context">Newest first · Page {page}</span>
        </div>
        {boardError && (
          <div className="board-error" role="alert">
            <span>{boardError}</span>
            <button type="button" onClick={() => { setRefreshKey((key) => key + 1); setConnection('reconnecting') }}>Retry</button>
          </div>
        )}
        {announcement && <p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>}
        {loading ? (
          <div className="loading-state" role="status" aria-live="polite">
            <span className="skeleton" /><span className="skeleton" /><span>Loading the latest kudos…</span>
          </div>
        ) : kudos.length === 0 ? (
          <p className="empty-state">No kudos yet. Start with a thank-you.</p>
        ) : (
          <ol className="feed" aria-label="Kudos posts, newest first">
            {kudos.map((item, index) => {
              const counts = new Map<string, number>()
              item.reactions?.forEach(({ emoji }) => counts.set(emoji, (counts.get(emoji) ?? 0) + 1))
              return (
                <li key={item.id}>
                  <BoardPost
                    id={item.id}
                    author={item.author?.name ?? 'A teammate'}
                    recipient={item.recipient?.name ?? 'A teammate'}
                    message={item.message}
                    timestamp={item.createdAt}
                    reactions={[...counts].map(([emoji, count]) => ({ emoji, count }))}
                    isSignedIn
                    onHidden={(id) => setKudos((current) => current.filter((post) => post.id !== id))}
                  />
                  {index === 0 && <span className="sr-only">Newest kudos</span>}
                </li>
              )
            })}
          </ol>
        )}
        {!loading && (
          <Pagination
            page={page}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
            loading={loading}
            onPrevious={() => void loadPage(page - 1, false)}
            onNext={() => void loadPage(page + 1, false)}
          />
        )}
      </section>
      <style jsx>{`
        .board-page { width: min(100%, 760px); margin: 0 auto; padding: 8px 0 24px; }
        .intro { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; margin-bottom: 23px; }
        .eyebrow { margin: 0 0 7px; color: var(--color-primary); font-size: 11px; line-height: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: .13em; }
        h1 { margin: 0; font-size: 32px; line-height: 40px; font-weight: 700; letter-spacing: -.04em; }
        .subtitle { margin: 6px 0 0; color: var(--color-muted-foreground); font-size: 14px; line-height: 21px; }
        .feed-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
        .feed-heading h2 { margin: 0; font-size: 18px; line-height: 26px; font-weight: 600; }
        .feed-context { color: var(--color-muted-foreground); font-size: 12px; }
        .feed { display: grid; gap: 12px; padding: 0; margin: 0; list-style: none; }
        .feed li { min-width: 0; }
        .empty-state { padding: 24px; border: 1px dashed var(--color-border); border-radius: 10px; color: var(--color-muted-foreground); text-align: center; background: rgba(255,255,255,.55); }
        .loading-state { display: grid; gap: 12px; color: var(--color-muted-foreground); font-size: 13px; }
        .skeleton { display: block; height: 112px; border: 1px solid var(--color-border); border-radius: 12px; background: linear-gradient(90deg, #fff 25%, #efeee9 45%, #fff 65%); background-size: 300% 100%; animation: shimmer 1.5s ease-in-out infinite; }
        .board-error { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 0 0 12px; padding: 11px 13px; border: 1px solid #E3D2B7; border-radius: 9px; color: #694410; background: #FBF6EC; font-size: 13px; }
        .board-error button { padding: 5px 10px; border: 1px solid #CBB58F; border-radius: 6px; background: #fff; color: #594011; cursor: pointer; }
        .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }
        @keyframes shimmer { to { background-position: -150% 0; } }
        @media (max-width: 560px) { .intro { align-items: flex-start; gap: 9px; } h1 { font-size: 28px; line-height: 35px; } .feed-heading h2 { font-size: 17px; } }
        @media (prefers-reduced-motion: reduce) { .skeleton { animation: none; } }
      `}</style>
    </div>
  )
}
