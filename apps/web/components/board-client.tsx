'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '@/lib/api-client'
import { BoardPost } from './board-post'
import { KudosComposer, type CreatedKudos } from './kudos-composer'
import { Pagination } from './pagination'

const PAGE_SIZE = 20

type Person = { id?: string; name?: string }
export type BoardKudos = {
  id: string
  authorId?: string
  recipientId?: string
  message: string
  createdAt: string
  author?: Person
  recipient?: Person
  isHidden?: boolean
  reactions?: { emoji: string; count: number }[]
  memberReaction?: string | null
}

type BoardClientProps = {
  initialKudos: BoardKudos[]
  initialError?: string
  isTeamLead?: boolean
}

function newestFirst(items: BoardKudos[]) {
  return [...items].sort((left, right) => {
    const byDate = Date.parse(right.createdAt) - Date.parse(left.createdAt)
    return byDate || right.id.localeCompare(left.id)
  })
}

export function BoardClient({ initialKudos, initialError, isTeamLead = false }: BoardClientProps) {
  const visibleInitial = newestFirst(initialKudos.filter((item) => !item.isHidden))
  const [kudos, setKudos] = useState(visibleInitial.slice(0, PAGE_SIZE))
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(visibleInitial.length >= PAGE_SIZE)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(initialError ?? '')
  const [connection, setConnection] = useState<'connecting' | 'live' | 'reconnecting'>('connecting')
  const [retry, setRetry] = useState(0)
  const [announcement, setAnnouncement] = useState('')

  const loadPage = useCallback(async (targetPage: number) => {
    setLoading(true)
    setLoadError('')
    try {
      const result = await apiRequest<BoardKudos[]>(`/kudos?page=${targetPage}`)
      const visible = newestFirst(Array.isArray(result) ? result.filter((item) => !item.isHidden) : []).slice(0, PAGE_SIZE)
      setKudos(visible)
      setPage(targetPage)
      setHasNext(visible.length === PAGE_SIZE)
    } catch {
      setLoadError("The board couldn't be updated. Retrying…")
    } finally {
      setLoading(false)
    }
  }, [])

  const acceptCreated = useCallback((item: CreatedKudos) => {
    const created: BoardKudos = {
      ...item,
      author: item.author ?? { name: 'You' },
      recipient: item.recipient ?? { name: item.recipientId ?? 'Teammate' },
    }
    setPage(1)
    setKudos((current) => newestFirst([created, ...current.filter((post) => post.id !== created.id)]).slice(0, PAGE_SIZE))
    setHasNext((current) => current || visibleInitial.length >= PAGE_SIZE)
    setAnnouncement('New kudos added to the top of the board.')
  }, [visibleInitial.length])

  useEffect(() => {
    let source: EventSource | undefined
    let closed = false
    try {
      const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')
      source = new EventSource(`${base}/kudos/events`, { withCredentials: true })
      source.onopen = () => { if (!closed) setConnection('live') }
      source.onerror = () => { if (!closed) setConnection('reconnecting') }
      const added = (event: Event) => {
        if (closed) return
        setConnection('live')
        setAnnouncement('New kudos added.')
        try {
          const detail = JSON.parse((event as MessageEvent<string>).data) as { data?: { kudos?: { id?: string } }; kudos?: { id?: string } }
          const id = detail.data?.kudos?.id ?? detail.kudos?.id
          if (!id || page !== 1) return
          void apiRequest<BoardKudos[]>('/kudos?page=1').then((list) => {
            const visible = newestFirst(Array.isArray(list) ? list.filter((post) => !post.isHidden) : []).slice(0, PAGE_SIZE)
            setKudos(visible)
            setHasNext(visible.length === PAGE_SIZE)
          }).catch(() => { if (!closed) setConnection('reconnecting') })
        } catch {
          if (page === 1) void loadPage(1)
        }
      }
      const removed = (event: Event) => {
        if (closed) return
        try {
          const detail = JSON.parse((event as MessageEvent<string>).data) as { data?: { id?: string }; id?: string }
          const id = detail.data?.id ?? detail.id
          if (id) setKudos((current) => current.filter((post) => post.id !== id))
          setAnnouncement('A hidden kudos was removed from the board.')
        } catch { /* malformed events do not replace the visible board */ }
      }
      source.addEventListener('kudos-added', added)
      source.addEventListener('kudos-removed', removed)
      source.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as { type?: string; id?: string; kudos?: { id?: string } }
          if (message.type === 'added') added(event)
          if (message.type === 'removed') removed(event)
        } catch { /* ignore malformed stream data */ }
      }
    } catch {
      setConnection('reconnecting')
    }
    return () => { closed = true; source?.close() }
  }, [retry, page, loadPage])

  const reconnect = () => {
    setConnection('connecting')
    setRetry((value) => value + 1)
  }

  return (
    <div className="board-main">
      <section className="intro" aria-labelledby="board-title">
        <div>
          <p className="eyebrow">A little appreciation goes a long way</p>
          <h1 id="board-title">Team kudos</h1>
          <p className="subtitle">Good work deserves to be noticed. Give a teammate a shout-out.</p>
        </div>
        <div className={`live-pill ${connection}`} role="status" aria-live="polite">
          <span className="dot" aria-hidden="true" />
          {connection === 'live' ? 'Board is live' : connection === 'reconnecting' ? 'Reconnecting to board' : 'Connecting to board'}
        </div>
      </section>

      <KudosComposer onCreated={acceptCreated} />
      <section aria-labelledby="feed-title">
        <div className="feed-heading"><h2 id="feed-title">Latest appreciation</h2><span className="context">Newest first · up to 20 per page</span></div>
        {connection === 'reconnecting' && <div className="connection-error" role="status">The board couldn’t be updated. Retrying… <button type="button" onClick={reconnect}>Reconnect</button></div>}
        {loadError && <div className="connection-error" role="alert">{loadError} <button type="button" onClick={() => void loadPage(page)}>Retry</button></div>}
        {loading && kudos.length === 0 && <p className="empty-state" role="status">Loading the latest kudos…</p>}
        {!loading && !loadError && kudos.length === 0 && <p className="empty-state">No kudos yet. Start with a thank-you.</p>}
        {kudos.length > 0 && (
          <ol className="feed" aria-label="Kudos posts, newest first" aria-busy={loading}>
            {kudos.slice(0, PAGE_SIZE).map((post) => (
              <li key={post.id}>
                <BoardPost
                  id={post.id}
                  author={post.author?.name ?? post.authorId ?? 'Team member'}
                  recipient={post.recipient?.name ?? post.recipientId ?? 'Teammate'}
                  message={post.message}
                  timestamp={post.createdAt}
                  reactions={post.reactions ?? []}
                  memberReaction={post.memberReaction}
                  isTeamLead={isTeamLead}
                  onRemoved={(id) => setKudos((current) => current.filter((item) => item.id !== id))}
                />
              </li>
            ))}
          </ol>
        )}
        <Pagination page={page} hasNext={hasNext} loading={loading} onPageChange={(nextPage) => void loadPage(nextPage)} />
      </section>
      <p className="announcement" role="status" aria-live="polite">{announcement}</p>
      <style jsx>{`
        .board-main { width: min(100%, 760px); margin: 0 auto; padding: 30px 0 56px; }
        .intro { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; margin-bottom: 23px; }
        .eyebrow { margin: 0 0 7px; color: var(--color-primary); font-size: 11px; line-height: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: .13em; }
        h1 { margin: 0; font-size: 32px; line-height: 40px; font-weight: 700; letter-spacing: -.04em; }
        .subtitle { margin: 6px 0 0; color: var(--color-muted-foreground); font-size: 14px; line-height: 21px; }
        .live-pill { display: inline-flex; align-items: center; gap: 8px; margin-bottom: 4px; padding: 7px 11px; color: #315F49; background: #EEF4EF; border: 1px solid #D9E7DC; border-radius: 999px; font-size: 12px; font-weight: 600; white-space: nowrap; }
        .live-pill.reconnecting { color: #805315; background: #FBF3E5; border-color: #E9D7B7; }
        .dot { width: 7px; height: 7px; border-radius: 50%; background: #3E875D; }
        .feed-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
        .feed-heading h2 { margin: 0; font-size: 18px; line-height: 26px; font-weight: 600; }
        .context { color: var(--color-muted-foreground); font-size: 12px; }
        .feed { display: grid; gap: 12px; padding: 0; margin: 0; list-style: none; }
        .feed li { min-width: 0; }
        .empty-state { padding: 24px; border: 1px dashed var(--color-border); border-radius: 10px; color: var(--color-muted-foreground); text-align: center; }
        .connection-error { margin: 0 0 12px; padding: 11px 13px; border: 1px solid #E9D7B7; border-radius: 8px; color: #694712; background: #FBF3E5; font-size: 13px; }
        .connection-error button { margin-left: 8px; padding: 4px 8px; border: 1px solid currentColor; border-radius: 5px; color: inherit; background: transparent; cursor: pointer; }
        .announcement { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }
        @media (max-width: 767px) { .board-main { padding: 24px 0 48px; } .intro { align-items: flex-start; gap: 10px; } h1 { font-size: 28px; line-height: 35px; } .live-pill { padding: 6px 9px; font-size: 11px; } }
        @media (max-width: 450px) { .intro { flex-direction: column; } .context { text-align: right; } }
      `}</style>
    </div>
  )
}
