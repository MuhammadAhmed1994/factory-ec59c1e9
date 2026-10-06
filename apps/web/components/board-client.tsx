'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest } from '@/lib/api-client'
import { BoardPost } from './board-post'
import { KudosComposer } from './kudos-composer'
import { LiveStatus } from './live-status'
import { Pagination } from './pagination'

type BoardKudos = {
  id: string
  authorId?: string
  recipientId: string
  author?: string | { name?: string }
  recipient?: string | { name?: string }
  message: string
  createdAt?: string | Date
  reactions?: Array<{ emoji: string; count: number; selected?: boolean }>
  [key: string]: unknown
}

const PAGE_SIZE = 20
const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')

function displayName(value: BoardKudos['author'] | BoardKudos['recipient'], fallback: string): string {
  if (typeof value === 'string' && value.trim()) return value
  if (value && typeof value === 'object' && value.name) return value.name
  return fallback
}

function timestampValue(value?: string | Date): number {
  return value instanceof Date ? value.getTime() : new Date(value ?? 0).getTime()
}

function newestFirst(posts: BoardKudos[]): BoardKudos[] {
  return [...posts].sort((a, b) => timestampValue(b.createdAt) - timestampValue(a.createdAt) || b.id.localeCompare(a.id))
}

export function BoardClient({ initialKudos = [], initialPage = 1 }: { initialKudos?: BoardKudos[]; initialPage?: number }) {
  const [posts, setPosts] = useState<BoardKudos[]>(newestFirst(initialKudos).slice(0, PAGE_SIZE))
  const [page, setPage] = useState(initialPage)
  const [hasNext, setHasNext] = useState(initialKudos.length >= PAGE_SIZE)
  const [loading, setLoading] = useState(initialKudos.length === 0)
  const [feedError, setFeedError] = useState('')
  const [connection, setConnection] = useState<'live' | 'reconnecting' | 'offline'>('reconnecting')
  const [announcement, setAnnouncement] = useState('')

  const fetchPage = useCallback(async (targetPage: number, showLoading = true) => {
    if (showLoading) setLoading(true)
    setFeedError('')
    try {
      const results = await apiRequest<BoardKudos[]>(`/kudos?page=${targetPage}`)
      const safeResults = Array.isArray(results) ? results.slice(0, PAGE_SIZE) : []
      setPosts(newestFirst(safeResults))
      setPage(targetPage)
      setHasNext(safeResults.length === PAGE_SIZE)
    } catch {
      setFeedError("The board couldn't be updated. Retrying…")
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initialKudos.length === 0) void fetchPage(initialPage)
  }, [fetchPage, initialKudos.length, initialPage])

  const refreshTopPage = useCallback(async () => {
    try {
      const results = await apiRequest<BoardKudos[]>('/kudos?page=1')
      const safeResults = Array.isArray(results) ? results.slice(0, PAGE_SIZE) : []
      if (page === 1) {
        setPosts(newestFirst(safeResults))
        setHasNext(safeResults.length === PAGE_SIZE)
      }
    } catch {
      setConnection('reconnecting')
    }
  }, [page])

  useEffect(() => {
    let hadError = false
    const source = new EventSource(`${API_BASE}/kudos/events`, { withCredentials: true })
    source.onopen = () => {
      setConnection('live')
      if (hadError) {
        hadError = false
        void refreshTopPage()
      }
    }
    source.onerror = () => {
      hadError = true
      setConnection('reconnecting')
    }
    const handleMessage = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as { type?: string; id?: string; kudos?: { id?: string } }
        const kind = payload.type
        const removedId = kind === 'removed' || kind === 'kudos-removed' ? payload.id : undefined
        const addedId = kind === 'added' || kind === 'kudos-added' ? payload.kudos?.id ?? payload.id : undefined
        if (removedId) {
          setPosts((current) => current.filter((post) => post.id !== removedId))
          setAnnouncement('A hidden kudos was removed from the board.')
        } else if (addedId) {
          setAnnouncement('New kudos added.')
          if (page === 1) void refreshTopPage()
        }
      } catch {
        // Ignore malformed events and keep the current board content intact.
      }
    }
    source.onmessage = handleMessage
    source.addEventListener('kudos-added', handleMessage as EventListener)
    source.addEventListener('kudos-removed', handleMessage as EventListener)
    return () => source.close()
  }, [page, refreshTopPage])

  async function submitKudos(recipientId: string, message: string): Promise<BoardKudos> {
    return apiRequest<BoardKudos>('/kudos', { method: 'POST', body: JSON.stringify({ recipientId, message }) })
  }

  function addCreatedPost(created: BoardKudos) {
    setPage(1)
    setPosts((current) => newestFirst([created, ...current.filter((post) => post.id !== created.id)]).slice(0, PAGE_SIZE))
    setAnnouncement('Kudos posted and added to the top of the board.')
  }

  const visiblePosts = useMemo(() => newestFirst(posts).slice(0, PAGE_SIZE), [posts])

  return (
    <>
      <section className="intro" aria-labelledby="board-title">
        <div>
          <p className="eyebrow">A little appreciation goes a long way</p>
          <h1 id="board-title">Team kudos</h1>
          <p className="subtitle">Good work deserves to be noticed. Give a teammate a shout-out.</p>
        </div>
        <LiveStatus state={connection} />
      </section>
      <KudosComposer onSubmitKudos={submitKudos} onCreated={addCreatedPost} />
      <section aria-labelledby="feed-title">
        <div className="feed-heading"><h2 id="feed-title">Latest appreciation</h2><span className="feed-context">Page {page} · Newest first</span></div>
        {feedError && <div className="feed-error" role="alert"><p>{feedError}</p><button type="button" onClick={() => void fetchPage(page)}>Retry</button></div>}
        {loading && visiblePosts.length === 0 ? <p className="feed-message" role="status">Loading the latest kudos…</p> : visiblePosts.length === 0 ? <p className="feed-message">No kudos yet. Start with a thank-you.</p> : (
          <ol className="feed" aria-label="Kudos posts, newest first" aria-busy={loading}>
            {visiblePosts.map((post) => <li key={post.id}><BoardPost id={post.id} author={displayName(post.author, 'Team member')} recipient={displayName(post.recipient, post.recipientId)} message={post.message} timestamp={post.createdAt ?? ''} reactions={post.reactions} onRemoved={(id) => setPosts((current) => current.filter((entry) => entry.id !== id))} /></li>)}
          </ol>
        )}
        <Pagination page={page} hasPrevious={page > 1} hasNext={hasNext} loading={loading} onPageChange={(target) => void fetchPage(target)} />
      </section>
      {announcement && <p className="sr-announcement" role="status" aria-live="polite">{announcement}</p>}
      <style jsx>{`
        .intro { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; margin-bottom: 23px; }
        .eyebrow { margin: 0 0 7px; color: var(--color-primary); font-size: 11px; line-height: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: .13em; }
        h1 { margin: 0; font-size: 32px; line-height: 40px; font-weight: 700; letter-spacing: -.045em; }
        .subtitle { margin: 6px 0 0; color: var(--color-muted-foreground); font-size: 14px; line-height: 21px; }
        .feed-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
        .feed-heading h2 { margin: 0; font-size: 18px; line-height: 26px; font-weight: 600; letter-spacing: -.025em; }
        .feed-context { color: var(--color-muted-foreground); font-size: 12px; }
        .feed { display: grid; gap: 12px; padding: 0; margin: 0; list-style: none; }
        .feed-message { padding: 22px; border: 1px solid var(--color-border); border-radius: var(--radius-card); background: var(--color-card); color: var(--color-muted-foreground); font-size: 14px; }
        .feed-error { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; padding: 12px 14px; border: 1px solid #E6D6B9; border-radius: 8px; background: #FFF9ED; color: #67420E; font-size: 13px; }
        .feed-error p { margin: 0; }
        .feed-error button { min-height: 34px; padding: 0 12px; border: 1px solid var(--color-border); border-radius: 6px; background: #fff; color: var(--color-foreground); cursor: pointer; }
        .sr-announcement { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
        @media (max-width: 767px) { .intro { align-items: flex-start; margin-bottom: 20px; } h1 { font-size: 28px; line-height: 35px; } .subtitle { max-width: 255px; font-size: 13px; } }
        @media (max-width: 390px) { .intro { gap: 9px; } .feed-context { max-width: 120px; white-space: normal; text-align: right; } }
      `}</style>
    </>
  )
}
