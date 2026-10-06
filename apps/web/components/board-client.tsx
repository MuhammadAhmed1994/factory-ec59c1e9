'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { apiRequest } from '../lib/api-client'
import { BoardPost } from './board-post'
import { KudosComposer, type CreatedKudos } from './kudos-composer'
import { LiveStatus } from './live-status'
import { Pagination } from './pagination'

type RawKudos = {
  id: string
  authorId?: string
  author?: string | { name?: string }
  recipientId: string
  recipient?: string | { name?: string }
  message: string
  createdAt: string
  isHidden?: boolean
  reactions?: Array<{ emoji: string; count: number }>
}

export type BoardKudos = {
  id: string
  authorId: string
  author: string
  recipientId: string
  recipient: string
  message: string
  createdAt: string
  reactions: Array<{ emoji: string; count: number }>
}

export type BoardPageData = {
  kudos: RawKudos[]
  page?: number
  pageSize?: number
}

type BoardClientProps = {
  initialPage: BoardPageData | null
  teamLead?: boolean
}

type BoardEventPayload = { id?: string; kudos?: { id?: string } }

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')
const PAGE_SIZE = 20

function personName(person: RawKudos['author'] | RawKudos['recipient'], id: string | undefined): string {
  if (typeof person === 'string') return person
  if (person && typeof person.name === 'string') return person.name
  return id ?? 'Team member'
}

function normalizeKudos(value: RawKudos): BoardKudos {
  return {
    id: value.id,
    authorId: value.authorId ?? (typeof value.author === 'string' ? value.author : ''),
    author: personName(value.author, value.authorId),
    recipientId: value.recipientId,
    recipient: personName(value.recipient, value.recipientId),
    message: value.message,
    createdAt: value.createdAt,
    reactions: Array.isArray(value.reactions) ? value.reactions : [],
  }
}

function newestFirst(posts: BoardKudos[]): BoardKudos[] {
  return [...posts].sort((left, right) => {
    const byDate = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    return byDate || right.id.localeCompare(left.id)
  })
}

function readEventId(event: MessageEvent<string>): string | null {
  try {
    const payload = JSON.parse(event.data) as BoardEventPayload
    return payload.id ?? payload.kudos?.id ?? null
  } catch {
    return null
  }
}

export function BoardClient({ initialPage, teamLead = false }: BoardClientProps) {
  const [posts, setPosts] = useState<BoardKudos[]>(() => newestFirst((initialPage?.kudos ?? []).filter((post) => !post.isHidden).map(normalizeKudos).slice(0, PAGE_SIZE)))
  const [page, setPage] = useState(initialPage?.page ?? 1)
  const [loading, setLoading] = useState(!initialPage)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [liveState, setLiveState] = useState<'live' | 'reconnecting' | 'offline'>('reconnecting')
  const [announcement, setAnnouncement] = useState('')
  const [newAvailable, setNewAvailable] = useState(false)
  const [postedMessage, setPostedMessage] = useState('')
  const firstPageLoad = useRef(true)

  const fetchPage = useCallback(async (targetPage: number, showLoading = true) => {
    if (showLoading) setLoading(true)
    setLoadError(null)
    try {
      const result = await apiRequest<BoardPageData>(`/kudos?page=${targetPage}`)
      const fetchedPosts = newestFirst((result.kudos ?? []).filter((post) => !post.isHidden).map(normalizeKudos).slice(0, PAGE_SIZE))
      setPosts(fetchedPosts)
      setPage(targetPage)
      return fetchedPosts
    } catch {
      setLoadError('The board couldn’t be updated. Retrying…')
      setLiveState('reconnecting')
      return null
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initialPage && firstPageLoad.current) {
      firstPageLoad.current = false
      return
    }
    firstPageLoad.current = false
    void fetchPage(page)
  }, [fetchPage, initialPage, page])

  useEffect(() => {
    if (typeof EventSource === 'undefined') {
      setLiveState('offline')
      return
    }
    let source: EventSource
    try {
      source = new EventSource(`${API_BASE_URL}/kudos/events`, { withCredentials: true })
    } catch {
      setLiveState('reconnecting')
      return
    }
    source.onopen = () => setLiveState('live')
    source.onerror = () => setLiveState('reconnecting')

    const onAdded = async (event: Event) => {
      const id = readEventId(event as MessageEvent<string>)
      if (!id) return
      const latestPage = await apiRequest<BoardPageData>('/kudos?page=1').catch(() => null)
      if (!latestPage) {
        setLiveState('reconnecting')
        setLoadError('The board couldn’t be updated. Retrying…')
        return
      }
      const latest = newestFirst((latestPage.kudos ?? []).filter((post) => !post.isHidden).map(normalizeKudos).slice(0, PAGE_SIZE))
      const eventPost = latest.find((post) => post.id === id)
      if (page === 1 && eventPost) {
        setPosts((current) => newestFirst([...latest, ...current.filter((post) => !latest.some((incoming) => incoming.id === post.id))]).slice(0, PAGE_SIZE))
        setNewAvailable(false)
        setAnnouncement('New kudos added.')
      } else if (page !== 1) {
        setNewAvailable(true)
        setAnnouncement('New kudos are available on the latest page.')
      }
    }

    const onRemoved = (event: Event) => {
      const id = readEventId(event as MessageEvent<string>)
      if (!id) return
      setPosts((current) => current.filter((post) => post.id !== id))
      setAnnouncement('A hidden kudos was removed from the board.')
      void fetchPage(page, false)
    }

    source.addEventListener('kudos-added', onAdded)
    source.addEventListener('kudos-removed', onRemoved)
    return () => {
      source.removeEventListener('kudos-added', onAdded)
      source.removeEventListener('kudos-removed', onRemoved)
      source.close()
    }
  }, [fetchPage, page])

  function addCreatedKudos(created: CreatedKudos) {
    const newPost = normalizeKudos(created as RawKudos)
    setPosts((current) => newestFirst([newPost, ...current.filter((post) => post.id !== newPost.id)]).slice(0, PAGE_SIZE))
    setPage(1)
    setNewAvailable(false)
    setPostedMessage('Kudos posted.')
    setAnnouncement('Kudos posted.')
  }

  function removePost(id: string) {
    setPosts((current) => current.filter((post) => post.id !== id))
    setAnnouncement('Kudos hidden. Removed from the board for everyone viewing.')
  }

  function showLatest() {
    setPage(1)
    setNewAvailable(false)
  }

  return (
    <div className="board">
      <section className="board-intro" aria-labelledby="board-title">
        <div>
          <p className="eyebrow">A little appreciation goes a long way</p>
          <h1 id="board-title">Team kudos</h1>
          <p className="subtitle">Good work deserves to be noticed. Give a teammate a shout-out.</p>
        </div>
        <LiveStatus state={liveState} />
      </section>
      <KudosComposer onCreated={addCreatedKudos} />
      <section aria-labelledby="feed-title">
        <div className="feed-heading">
          <h2 id="feed-title">Latest appreciation</h2>
          <span className="feed-context">Newest first · 20 per page</span>
        </div>
        {newAvailable && <p className="new-available" role="status"><span>New kudos are available.</span> <button type="button" onClick={showLatest}>View latest</button></p>}
        {postedMessage && <p className="post-announcement" role="status">{postedMessage}</p>}
        {announcement && <span className="sr-only" role="status" aria-live="polite">{announcement}</span>}
        {loadError && <div className="board-error" role="alert"><span>{loadError}</span><button type="button" onClick={() => void fetchPage(page)}>Retry</button></div>}
        {loading && posts.length === 0 ? (
          <p className="board-state" role="status">Loading the latest kudos…</p>
        ) : posts.length === 0 ? (
          <p className="board-state">No kudos yet. Start with a thank-you.</p>
        ) : (
          <ol className="board-feed" aria-label="Kudos posts, newest first" aria-busy={loading}>
            {posts.slice(0, PAGE_SIZE).map((post, index) => (
              <li key={post.id}>
                <BoardPost
                  id={post.id}
                  author={post.author}
                  recipient={post.recipient}
                  message={post.message}
                  timestamp={post.createdAt}
                  reactions={post.reactions}
                  teamLead={teamLead}
                  onHidden={removePost}
                  listenForLiveRemovals={false}
                />
                {index === 0 && <span className="sr-only">Newest kudos</span>}
              </li>
            ))}
          </ol>
        )}
        {posts.length > 0 && (page > 1 || posts.length >= PAGE_SIZE) && (
          <Pagination page={page} canGoNext={posts.length >= PAGE_SIZE} loading={loading} onPageChange={setPage} />
        )}
      </section>
      <style jsx>{`
        .board { width: min(100%, 760px); margin: 0 auto; }
        .board-intro { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; margin-bottom: 23px; }
        .eyebrow { margin: 0 0 7px; color: var(--color-primary); font-size: 11px; line-height: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: .13em; }
        h1 { margin: 0; font-size: 32px; line-height: 40px; font-weight: 700; letter-spacing: -.04em; }
        .subtitle { margin: 6px 0 0; color: var(--color-muted-foreground); font-size: 14px; line-height: 21px; }
        .feed-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
        .feed-heading h2 { margin: 0; font-size: 18px; line-height: 26px; font-weight: 600; }
        .feed-context { color: var(--color-muted-foreground); font-size: 12px; white-space: nowrap; }
        .board-feed { display: grid; gap: 12px; padding: 0; margin: 0; list-style: none; }
        .board-feed li:first-child :global(.board-post) { border-color: #E7C8C3; }
        .board-state { margin: 0; padding: 24px 20px; border: 1px solid var(--color-border); border-radius: var(--radius-card); background: var(--color-card); color: var(--color-muted-foreground); text-align: center; }
        .board-error, .new-available, .post-announcement { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin: 0 0 12px; padding: 11px 13px; border-radius: 8px; font-size: 13px; }
        .board-error { justify-content: space-between; border: 1px solid #E7C9C5; background: #FFF9F8; color: var(--color-destructive); }
        .new-available, .post-announcement { border: 1px solid #D9E7DC; background: #F4F8F4; color: var(--color-success); }
        .new-available button, .board-error button { padding: 4px 8px; border: 1px solid currentColor; border-radius: 6px; background: transparent; color: inherit; font-size: 12px; cursor: pointer; }
        @media (max-width: 767px) { h1 { font-size: 28px; line-height: 35px; } .board-intro { align-items: flex-start; gap: 9px; } .subtitle { max-width: 250px; } }
        @media (max-width: 390px) { .board-intro { flex-direction: column; } }
      `}</style>
    </div>
  )
}
