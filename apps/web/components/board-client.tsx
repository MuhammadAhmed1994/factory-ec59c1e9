'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiRequest } from '../lib/api-client'
import { AppHeader } from './app-header'
import { BoardPost, type BoardPostData } from './board-post'
import { KudosComposer } from './kudos-composer'
import { LiveStatus } from './live-status'
import { Pagination } from './pagination'
import type { RecipientOption } from './recipient-picker'

const PAGE_SIZE = 20
const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')
type ConnectionState = 'live' | 'reconnecting' | 'offline'
type BoardItem = BoardPostData & { authorId?: string; recipientId?: string }

function orderAndLimit(posts: BoardPostData[]): BoardPostData[] {
  return [...posts]
    .sort((left, right) => {
      const leftTime = left.createdAt instanceof Date ? left.createdAt.getTime() : new Date(left.createdAt).getTime()
      const rightTime = right.createdAt instanceof Date ? right.createdAt.getTime() : new Date(right.createdAt).getTime()
      const timeDifference = rightTime - leftTime
      return timeDifference || right.id.localeCompare(left.id)
    })
    .slice(0, PAGE_SIZE)
}

function parseKudos(value: unknown): BoardItem | null {
  if (typeof value !== 'object' || value === null) return null
  const item = value as Record<string, unknown>
  const author = item.author as { id?: string; name?: string } | undefined
  const recipient = item.recipient as { id?: string; name?: string } | undefined
  if (typeof item.id !== 'string' || typeof item.message !== 'string') return null
  return {
    id: item.id,
    author: author?.name ?? 'A teammate',
    recipient: recipient?.name ?? 'A teammate',
    message: item.message,
    createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
    reactions: Array.isArray(item.reactions) ? item.reactions as BoardPostData['reactions'] : [],
    authorId: typeof item.authorId === 'string' ? item.authorId : author?.id,
    recipientId: typeof item.recipientId === 'string' ? item.recipientId : recipient?.id,
  }
}

export default function BoardClient() {
  const [posts, setPosts] = useState<BoardPostData[]>([])
  const [page, setPage] = useState(1)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [connection, setConnection] = useState<ConnectionState>('reconnecting')
  const [loadError, setLoadError] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const pageRef = useRef(page)
  const postsRef = useRef(posts)

  useEffect(() => { pageRef.current = page }, [page])
  useEffect(() => { postsRef.current = posts }, [posts])

  const loadPage = useCallback(async (requestedPage: number) => {
    setLoading(true)
    try {
      const result = await apiRequest<unknown>(`/kudos?page=${requestedPage}`)
      const pagePosts = Array.isArray(result) ? result.map(parseKudos).filter((post): post is BoardItem => post !== null) : []
      const ordered = orderAndLimit(pagePosts)
      let nextAvailable = false
      if (pagePosts.length >= PAGE_SIZE) {
        try {
          const next = await apiRequest<unknown>(`/kudos?page=${requestedPage + 1}`)
          nextAvailable = Array.isArray(next) && next.length > 0
        } catch {
          nextAvailable = true
        }
      }
      setPosts(ordered)
      postsRef.current = ordered
      setPage(requestedPage)
      pageRef.current = requestedPage
      setHasNextPage(nextAvailable)
      setLoadError('')
    } catch {
      setLoadError("The board couldn't be updated. Retrying…")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadPage(1) }, [loadPage])

  useEffect(() => {
    let source: EventSource
    try {
      source = new EventSource(`${API_ORIGIN}/kudos/events`, { withCredentials: true })
    } catch {
      setConnection('reconnecting')
      return
    }

    source.onopen = () => setConnection('live')
    source.onerror = () => setConnection('reconnecting')

    const added = (event: MessageEvent<string>) => {
      setConnection('live')
      let id = ''
      try {
        const payload = JSON.parse(event.data) as { id?: string; kudos?: { id?: string }; data?: { kudos?: { id?: string } } }
        id = payload.id ?? payload.kudos?.id ?? payload.data?.kudos?.id ?? ''
      } catch {
        return
      }
      if (!id || pageRef.current !== 1) return
      void apiRequest<unknown>('/kudos?page=1').then((result) => {
        if (!Array.isArray(result)) return
        const incoming = result.map(parseKudos).filter((post): post is BoardItem => post !== null)
        const existingIds = new Set(postsRef.current.map((post) => post.id))
        const fresh = incoming.filter((post) => !existingIds.has(post.id))
        if (fresh.length > 0 || incoming.some((post) => post.id === id)) {
          const merged = orderAndLimit([...fresh, ...postsRef.current])
          setPosts(merged)
          postsRef.current = merged
          setAnnouncement('New kudos added.')
        }
      }).catch(() => {
        setConnection('reconnecting')
        setLoadError("The board couldn't be updated. Retrying…")
      })
    }

    const removed = (event: MessageEvent<string>) => {
      setConnection('live')
      try {
        const payload = JSON.parse(event.data) as { id?: string; data?: { id?: string } }
        const id = payload.id ?? payload.data?.id
        if (!id) return
        const remaining = postsRef.current.filter((post) => post.id !== id)
        if (remaining.length !== postsRef.current.length) {
          setPosts(remaining)
          postsRef.current = remaining
          setAnnouncement('A hidden kudos was removed from the board.')
        }
      } catch {
        // Ignore malformed events and leave the current board undisturbed.
      }
    }

    source.addEventListener('kudos-added', added as EventListener)
    source.addEventListener('kudos-removed', removed as EventListener)
    source.addEventListener('message', (event) => {
      const message = event as MessageEvent<string>
      try {
        const payload = JSON.parse(message.data) as { type?: string }
        if (payload.type === 'added') added(message)
        if (payload.type === 'removed') removed(message)
      } catch {
        // Keep the stream open if an unrelated event is malformed.
      }
    })
    return () => source.close()
  }, [])

  const recipients = useMemo(() => {
    const byId = new Map<string, RecipientOption>()
    for (const item of posts as BoardItem[]) {
      if (item.authorId) byId.set(item.authorId, { id: item.authorId, name: item.author })
      if (item.recipientId) byId.set(item.recipientId, { id: item.recipientId, name: item.recipient })
    }
    return [...byId.values()]
  }, [posts])

  function onCreated(post: BoardPostData) {
    const nextPosts = orderAndLimit([post, ...postsRef.current])
    setPosts(nextPosts)
    postsRef.current = nextPosts
    setPage(1)
    pageRef.current = 1
    setAnnouncement('Kudos posted.')
  }

  function changePage(nextPage: number) {
    if (nextPage < 1 || nextPage === page || (nextPage > page && !hasNextPage)) return
    void loadPage(nextPage)
  }

  return (
    <div className="board-page">
      <AppHeader memberName="Signed in" />
      <main className="board-main">
        <section className="intro" aria-labelledby="board-title">
          <div>
            <p className="eyebrow">A little appreciation goes a long way</p>
            <h1 id="board-title">Team kudos</h1>
            <p className="subtitle">Good work deserves to be noticed. Give a teammate a shout-out.</p>
          </div>
          <LiveStatus state={connection} />
        </section>

        <KudosComposer recipients={recipients} onCreated={onCreated} />

        <section aria-labelledby="feed-title">
          <div className="feed-heading">
            <h2 id="feed-title">Latest appreciation</h2>
            <span className="feed-context">Newest first · Up to 20 per page</span>
          </div>
          {loadError && <p className="board-error" role="status">{loadError} <button type="button" onClick={() => void loadPage(page)}>Retry</button></p>}
          {loading && posts.length === 0 ? (
            <p className="loading" role="status">Loading the latest kudos…</p>
          ) : posts.length === 0 ? (
            <p className="empty">No kudos yet. Start with a thank-you.</p>
          ) : (
            <ol className="feed" aria-label="Kudos posts, newest first">
              {posts.slice(0, PAGE_SIZE).map((post, index) => (
                <li key={post.id}>
                  <BoardPost
                    post={post}
                    isSignedIn
                    variant={page === 1 && index === 0 ? 'new' : 'standard'}
                    onHidden={(id) => {
                      const remaining = postsRef.current.filter((item) => item.id !== id)
                      setPosts(remaining)
                      postsRef.current = remaining
                    }}
                  />
                </li>
              ))}
            </ol>
          )}
          {announcement && <p className="sr-only" role="status" aria-live="polite">{announcement}</p>}
          <Pagination page={page} hasNextPage={hasNextPage} loading={loading} onPageChange={changePage} />
        </section>
      </main>
      <style jsx>{`
        .board-page { min-height: 100vh; }
        .board-main { width: min(100% - 48px, 760px); margin: 0 auto; padding: 41px 0 64px; }
        .intro { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; margin-bottom: 23px; }
        .eyebrow { margin: 0 0 7px; color: var(--color-primary); font-size: 11px; line-height: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: .13em; }
        h1 { margin: 0; font-size: 32px; line-height: 40px; font-weight: 700; letter-spacing: -.04em; }
        .subtitle { margin: 6px 0 0; color: var(--color-muted-foreground); font-size: 14px; line-height: 21px; }
        .feed-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
        .feed-heading h2 { margin: 0; font-size: 18px; line-height: 26px; font-weight: 600; }
        .feed-context { color: var(--color-muted-foreground); font-size: 12px; }
        .feed { display: grid; gap: 12px; padding: 0; margin: 0; list-style: none; }
        .loading, .empty { margin: 0; padding: 22px; border: 1px solid var(--color-border); border-radius: 12px; background: var(--color-card); color: var(--color-muted-foreground); }
        .board-error { margin: 0 0 12px; color: var(--color-destructive); font-size: 13px; }
        .board-error button { margin-left: 6px; border: 0; color: inherit; background: transparent; text-decoration: underline; cursor: pointer; }
        .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
        @media (max-width: 767px) { .board-main { width: calc(100% - 36px); padding: 29px 0 48px; } .intro { align-items: flex-start; margin-bottom: 20px; } h1 { font-size: 28px; line-height: 35px; } }
        @media (max-width: 390px) { .board-main { width: calc(100% - 30px); } .intro { gap: 9px; } .subtitle { max-width: 225px; font-size: 13px; } }
      `}</style>
    </div>
  )
}
