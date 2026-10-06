'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiRequest } from '../lib/api-client'
import { BoardPost } from './board-post'
import { KudosComposer, type BoardKudos } from './kudos-composer'
import { LiveStatus } from './live-status'
import { Pagination } from './pagination'
import type { RecipientOption } from './recipient-picker'

const PAGE_SIZE = 20
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')

type BoardClientProps = { initialKudos?: BoardKudos[]; isTeamLead?: boolean }

type StreamPayload = { id?: string; type?: string; kudos?: { id?: string } }

function newestFirst(items: BoardKudos[]): BoardKudos[] {
  return [...items].sort((a, b) => {
    const byDate = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    return byDate || b.id.localeCompare(a.id)
  }).slice(0, PAGE_SIZE)
}

function eventPayload(event: Event): StreamPayload | null {
  try {
    const raw = (event as MessageEvent<string>).data
    return typeof raw === 'string' ? JSON.parse(raw) as StreamPayload : null
  } catch {
    return null
  }
}

export function BoardClient({ initialKudos, isTeamLead = false }: BoardClientProps) {
  const [page, setPage] = useState(1)
  const [kudos, setKudos] = useState<BoardKudos[]>(initialKudos ? newestFirst(initialKudos) : [])
  const [hasNext, setHasNext] = useState(initialKudos?.length === PAGE_SIZE)
  const [loading, setLoading] = useState(!initialKudos)
  const [loadError, setLoadError] = useState('')
  const [connection, setConnection] = useState<'live' | 'reconnecting'>('reconnecting')
  const [announcement, setAnnouncement] = useState('')
  const currentPage = useRef(page)
  currentPage.current = page

  const loadPage = useCallback(async (requestedPage: number, quiet = false) => {
    if (!quiet) setLoading(true)
    setLoadError('')
    try {
      const result = await apiRequest<BoardKudos[]>(`/kudos?page=${requestedPage}`)
      if (!Array.isArray(result)) throw new Error('Unexpected board response')
      const visible = newestFirst(result)
      setKudos(visible)
      setHasNext(result.length === PAGE_SIZE)
      setConnection('live')
    } catch {
      setLoadError('The board couldn’t be updated. Retrying…')
      setConnection('reconnecting')
    } finally {
      if (!quiet) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!initialKudos) void loadPage(1)
  }, [initialKudos, loadPage])

  useEffect(() => {
    if (page !== 1 || initialKudos) void loadPage(page)
  }, [page, initialKudos, loadPage])

  useEffect(() => {
    if (typeof EventSource === 'undefined') return
    const stream = new EventSource(`${API_BASE_URL}/kudos/events`, { withCredentials: true })
    const onOpen = () => setConnection('live')
    const onError = () => setConnection('reconnecting')
    const onAdded = () => {
      setConnection('live')
      void loadPage(currentPage.current, true)
      setAnnouncement('New kudos added to the board.')
    }
    const onRemoved = (event: Event) => {
      const payload = eventPayload(event)
      const id = payload?.id ?? payload?.kudos?.id
      if (!id) return
      setKudos((items) => items.filter((item) => item.id !== id))
      setAnnouncement('A hidden kudos was removed from the board.')
    }
    stream.addEventListener('open', onOpen)
    stream.addEventListener('error', onError)
    stream.addEventListener('kudos-added', onAdded)
    stream.addEventListener('kudos-removed', onRemoved)
    return () => {
      stream.removeEventListener('open', onOpen)
      stream.removeEventListener('error', onError)
      stream.removeEventListener('kudos-added', onAdded)
      stream.removeEventListener('kudos-removed', onRemoved)
      stream.close()
    }
  }, [loadPage])

  const recipientOptions = useMemo(() => {
    const people = new Map<string, RecipientOption>()
    kudos.forEach((item) => {
      const recipientId = item.recipient.id ?? item.recipientId
      const authorId = item.author.id ?? item.authorId
      if (recipientId && item.recipient.name) people.set(recipientId, { id: recipientId, name: item.recipient.name })
      if (authorId && item.author.name) people.set(authorId, { id: authorId, name: item.author.name })
    })
    return [...people.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [kudos])

  function created(createdKudos: BoardKudos) {
    setPage(1)
    setKudos((items) => newestFirst([createdKudos, ...items.filter((item) => item.id !== createdKudos.id)]))
    setHasNext((available) => available || kudos.length >= PAGE_SIZE)
    setAnnouncement('Kudos posted.')
  }

  function hidden(id: string) {
    setKudos((items) => items.filter((item) => item.id !== id))
    setAnnouncement('Kudos hidden.')
  }

  return (
    <main className="board-main" aria-labelledby="board-title">
      <section className="intro" aria-labelledby="board-title">
        <div>
          <p className="eyebrow">A little appreciation goes a long way</p>
          <h1 id="board-title">Team kudos</h1>
          <p className="subtitle">Good work deserves to be noticed. Give a teammate a shout-out.</p>
        </div>
        <LiveStatus state={connection} />
      </section>

      <KudosComposer recipients={recipientOptions} onCreated={created} />

      <section aria-labelledby="feed-title">
        <div className="feed-heading">
          <h2 id="feed-title">Latest appreciation</h2>
          <span className="feed-context">Newest first <span aria-hidden="true">·</span> Up to 20 per page</span>
        </div>
        {loadError && <div className="board-error" role="alert"><span>{loadError}</span><button type="button" onClick={() => void loadPage(page)}>Retry</button></div>}
        {loading ? (
          <div className="loading-state" role="status" aria-label="Loading the latest kudos"><span className="skeleton" /><span className="skeleton" /><span className="skeleton" /></div>
        ) : kudos.length === 0 ? (
          <p className="empty-state">{loadError ? 'The board is temporarily unavailable.' : 'No kudos yet. Start with a thank-you.'}</p>
        ) : (
          <ol className="feed" aria-label="Kudos posts, newest first" aria-busy={loading}>
            {kudos.map((item) => (
              <li key={item.id}>
                <BoardPost
                  id={item.id}
                  author={item.author.name}
                  recipient={item.recipient.name}
                  message={item.message}
                  timestamp={item.createdAt}
                  reactions={item.reactions ?? []}
                  isTeamLead={isTeamLead}
                  onHidden={hidden}
                />
              </li>
            ))}
          </ol>
        )}
        <Pagination page={page} hasNext={hasNext} loading={loading} onPageChange={(nextPage) => { if (nextPage >= 1 && nextPage !== page) setPage(nextPage) }} />
      </section>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>

      <style jsx>{`
        .board-main { width: min(100% - 48px, 760px); margin: 0 auto; padding: 41px 0 64px; }
        .intro { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; margin-bottom: 23px; }
        .eyebrow { margin: 0 0 7px; color: var(--color-primary); font-size: 11px; line-height: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: .13em; }
        h1 { margin: 0; font-size: 32px; line-height: 40px; font-weight: 700; letter-spacing: -.035em; }
        .subtitle { margin: 6px 0 0; color: var(--color-muted-foreground); font-size: 14px; line-height: 21px; }
        .feed-heading { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 12px; }
        .feed-heading h2 { margin: 0; font-size: 18px; line-height: 26px; font-weight: 600; }
        .feed-context { color: var(--color-muted-foreground); font-size: 12px; }
        .feed { display: grid; gap: 12px; padding: 0; margin: 0; list-style: none; }
        .empty-state { padding: 24px; border: 1px solid var(--color-border); border-radius: 10px; background: var(--color-card); color: var(--color-muted-foreground); text-align: center; }
        .loading-state { display: grid; gap: 12px; }
        .skeleton { height: 142px; border: 1px solid var(--color-border); border-radius: 12px; background: linear-gradient(90deg, #EFEEE9 25%, #f7f6f2 50%, #EFEEE9 75%); background-size: 200% 100%; animation: shimmer 1.5s ease-in-out infinite; }
        @keyframes shimmer { to { background-position: -200% 0; } }
        .board-error { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px; padding: 11px 13px; border: 1px solid #E6D4B4; border-radius: 8px; background: #FFF9EE; color: #684410; font-size: 13px; }
        .board-error button { border: 1px solid currentColor; border-radius: 6px; padding: 5px 10px; background: transparent; color: inherit; cursor: pointer; }
        .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
        @media (max-width: 767px) { .board-main { width: calc(100% - 36px); padding: 29px 0 48px; } .intro { align-items: flex-start; margin-bottom: 20px; } h1 { font-size: 28px; line-height: 35px; } }
        @media (prefers-reduced-motion: reduce) { .skeleton { animation: none; } }
      `}</style>
    </main>
  )
}
