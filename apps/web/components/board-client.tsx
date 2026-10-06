'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../lib/api-client'
import { BoardPost } from './board-post'
import { KudosComposer, type CreatedKudos } from './kudos-composer'
import { LiveStatus } from './live-status'
import { Pagination } from './pagination'

export type BoardKudos = CreatedKudos & {
  authorId?: string
  isHidden?: boolean
  updatedAt?: string
}

const PAGE_SIZE = 20
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')

function newestFirst(items: BoardKudos[]): BoardKudos[] {
  return [...items].sort((left, right) => {
    const timeDifference = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    return timeDifference || right.id.localeCompare(left.id)
  }).slice(0, PAGE_SIZE)
}

export function BoardClient({ initialKudos, initialError = false }: { initialKudos: BoardKudos[]; initialError?: boolean }) {
  const [kudos, setKudos] = useState(() => newestFirst(initialKudos.filter((post) => !post.isHidden)))
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(initialKudos.length >= PAGE_SIZE)
  const [loading, setLoading] = useState(false)
  const [reconnecting, setReconnecting] = useState(initialError)
  const [boardError, setBoardError] = useState(initialError)
  const [announcement, setAnnouncement] = useState('')

  const loadPage = useCallback(async (requestedPage: number, announceFailure = true) => {
    setLoading(true)
    try {
      const items = await apiRequest<BoardKudos[]>(`/kudos?page=${requestedPage}`)
      const visible = newestFirst(items.filter((post) => !post.isHidden))
      setKudos(visible)
      setPage(requestedPage)
      setHasNext(items.length >= PAGE_SIZE)
      setBoardError(false)
      setReconnecting(false)
      return visible
    } catch {
      if (announceFailure) {
        setBoardError(true)
        setReconnecting(true)
      }
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshCurrent = useCallback(async () => {
    await loadPage(page)
  }, [loadPage, page])

  useEffect(() => {
    const stream = new EventSource(`${API_BASE_URL}/kudos/events`, { withCredentials: true })
    const onOpen = () => setReconnecting(false)
    const onError = () => setReconnecting(true)

    const onBoardEvent = (event: MessageEvent<string>) => {
      try {
        const parsed = JSON.parse(event.data) as {
          type?: string
          data?: { type?: string; id?: string; kudos?: { id?: string } }
          id?: string
          kudos?: { id?: string }
        }
        const payload = parsed.data ?? parsed
        const eventType = parsed.type ?? payload.type ?? ''
        const id = payload.id ?? payload.kudos?.id ?? parsed.kudos?.id
        if ((eventType.includes('removed') || eventType === 'hidden') && id) {
          setKudos((current) => current.filter((post) => post.id !== id))
          setAnnouncement('A hidden kudos was removed from the board.')
        } else if ((eventType.includes('added') || eventType === 'created') && id) {
          setAnnouncement('New kudos added.')
          void loadPage(page, true)
        }
      } catch {
        // Ignore malformed events; EventSource will continue to deliver subsequent updates.
      }
    }

    stream.addEventListener('open', onOpen)
    stream.addEventListener('error', onError)
    stream.addEventListener('message', onBoardEvent as EventListener)
    stream.addEventListener('kudos-added', onBoardEvent as EventListener)
    stream.addEventListener('kudos-removed', onBoardEvent as EventListener)
    return () => stream.close()
  }, [loadPage, page])

  const pageHeading = useMemo(() => {
    if (!kudos.length) return 'Latest appreciation'
    return 'Latest appreciation'
  }, [kudos.length])

  function addCreated(post: CreatedKudos) {
    const created: BoardKudos = { ...post, createdAt: post.createdAt ?? new Date().toISOString() }
    // Keep the API's returned record visible immediately, even if the composer was used on a later page.
    setKudos((current) => newestFirst([created, ...current.filter((item) => item.id !== post.id)]))
    setPage(1)
    setAnnouncement('Kudos posted.')
  }

  return (
    <>
      <section className="intro" aria-labelledby="board-title">
        <div>
          <p className="eyebrow">A little appreciation goes a long way</p>
          <h1 id="board-title">Team kudos</h1>
          <p className="subtitle">Good work deserves to be noticed. Give a teammate a shout-out.</p>
        </div>
        <LiveStatus state={reconnecting ? 'reconnecting' : 'live'} />
      </section>

      <KudosComposer onCreated={addCreated} />

      <section aria-labelledby="feed-title">
        <header className="feed-heading">
          <h2 id="feed-title">{pageHeading}</h2>
          <span className="context">Newest first · 20 per page</span>
        </header>
        {boardError && (
          <div className="board-error" role="alert">
            <span>The board couldn’t be updated. Retrying…</span>
            <button type="button" onClick={() => void refreshCurrent()}>Retry</button>
          </div>
        )}
        {loading && kudos.length === 0 ? (
          <p className="empty-state" role="status">Loading the latest kudos…</p>
        ) : kudos.length === 0 ? (
          <p className="empty-state">No kudos yet. Start with a thank-you.</p>
        ) : (
          <ol className="feed" aria-label="Kudos posts, newest first" aria-busy={loading}>
            {kudos.map((post) => (
              <li key={post.id}>
                <BoardPost
                  id={post.id}
                  author={post.authorId === undefined ? 'Team member' : post.authorId}
                  recipient={post.recipientId}
                  message={post.message}
                  timestamp={post.createdAt}
                  signedIn
                />
              </li>
            ))}
          </ol>
        )}
        <Pagination page={page} count={kudos.length} hasNext={hasNext} loading={loading} onPageChange={(requested) => void loadPage(requested)} />
      </section>
      <p className="announcement" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
      <style jsx>{`
        .intro { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; margin-bottom: 23px; }
        .eyebrow { margin: 0 0 7px; color: var(--color-primary); font-size: 11px; line-height: 16px; font-weight: 700; letter-spacing: .13em; text-transform: uppercase; }
        h1 { margin: 0; font-size: 32px; line-height: 40px; font-weight: 700; letter-spacing: -.04em; }
        .subtitle { margin: 6px 0 0; color: var(--color-muted-foreground); font-size: 14px; line-height: 21px; }
        .feed-heading { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 12px; }
        .feed-heading h2 { margin: 0; font-size: 18px; line-height: 26px; font-weight: 600; }
        .context { color: var(--color-muted-foreground); font-size: 12px; }
        .feed { display: grid; gap: 12px; padding: 0; margin: 0; list-style: none; }
        .empty-state { margin: 0; padding: 24px; border: 1px solid var(--color-border); border-radius: 12px; background: var(--color-card); color: var(--color-muted-foreground); text-align: center; }
        .board-error { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px; padding: 11px 13px; border: 1px solid #E8D7B8; border-radius: 9px; background: #FFF9EF; color: #68460F; font-size: 13px; }
        .board-error button { border: 0; background: transparent; color: #68460F; font-weight: 600; text-decoration: underline; cursor: pointer; }
        .announcement { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }
        @media (max-width: 560px) { .intro { align-items: flex-start; gap: 10px; margin-bottom: 20px; } h1 { font-size: 28px; line-height: 35px; } .context { max-width: 110px; text-align: right; } }
      `}</style>
    </>
  )
}
