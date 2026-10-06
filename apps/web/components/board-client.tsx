'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiRequest } from '@/lib/api-client'
import { BoardPost } from './board-post'
import { KudosComposer, type CreatedKudos } from './kudos-composer'
import { LiveStatus } from './live-status'
import { Pagination } from './pagination'
import type { RecipientOption } from './recipient-picker'

type Person = { id?: string; name: string }
export type BoardKudos = {
  id: string
  authorId?: string
  recipientId: string
  message: string
  createdAt: string
  isHidden?: boolean
  author: Person
  recipient: Person
}

const PAGE_SIZE = 20
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')

function newestFirst(items: BoardKudos[]) {
  return [...items].sort((left, right) => {
    const byDate = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    return byDate || right.id.localeCompare(left.id)
  })
}

function normalizePost(post: CreatedKudos | BoardKudos): BoardKudos {
  const item = post as BoardKudos
  return {
    ...item,
    author: item.author ?? { name: 'You' },
    recipient: item.recipient ?? { id: item.recipientId, name: item.recipientId },
    createdAt: item.createdAt ?? new Date().toISOString(),
  }
}

function eventPayload(event: Event): Record<string, unknown> {
  try {
    return JSON.parse((event as MessageEvent<string>).data) as Record<string, unknown>
  } catch {
    return {}
  }
}

export function BoardClient() {
  const [posts, setPosts] = useState<BoardKudos[]>([])
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [pageLoading, setPageLoading] = useState(false)
  const [boardError, setBoardError] = useState('')
  const [connection, setConnection] = useState<'live' | 'reconnecting' | 'offline'>('reconnecting')
  const [announcement, setAnnouncement] = useState('')
  const pageRef = useRef(1)
  const postsRef = useRef<BoardKudos[]>([])
  const requestId = useRef(0)

  useEffect(() => { postsRef.current = posts }, [posts])
  useEffect(() => { pageRef.current = page }, [page])

  const loadPage = useCallback(async (targetPage: number) => {
    const request = ++requestId.current
    if (postsRef.current.length === 0) setInitialLoading(true)
    else setPageLoading(true)
    setBoardError('')
    try {
      const result = await apiRequest<BoardKudos[]>(`/kudos?page=${targetPage}`)
      if (request !== requestId.current) return
      const visible = newestFirst((Array.isArray(result) ? result : []).filter((post) => !post.isHidden)).slice(0, PAGE_SIZE)
      setPosts(visible)
      postsRef.current = visible
      setPage(targetPage)
      pageRef.current = targetPage
      setHasNext(visible.length === PAGE_SIZE)
    } catch {
      if (request === requestId.current) setBoardError("The board couldn't be updated. Retrying…")
    } finally {
      if (request === requestId.current) {
        setInitialLoading(false)
        setPageLoading(false)
      }
    }
  }, [])

  useEffect(() => { void loadPage(1) }, [loadPage])

  useEffect(() => {
    const source = new EventSource(`${API_BASE_URL}/kudos/events`, { withCredentials: true })
    source.onopen = () => setConnection('live')
    source.onerror = () => setConnection('reconnecting')

    const onAdded = () => {
      setAnnouncement('New kudos added.')
      if (pageRef.current !== 1) return
      // The stream carries only an id; refresh the visible first page without moving the reader.
      void apiRequest<BoardKudos[]>('/kudos?page=1').then((result) => {
        const incoming = newestFirst((Array.isArray(result) ? result : []).filter((post) => !post.isHidden)).slice(0, PAGE_SIZE)
        const merged = new Map<string, BoardKudos>()
        for (const post of incoming) merged.set(post.id, post)
        for (const post of postsRef.current) if (!merged.has(post.id)) merged.set(post.id, post)
        const updated = newestFirst([...merged.values()]).slice(0, PAGE_SIZE)
        setPosts(updated)
        postsRef.current = updated
        setHasNext(incoming.length === PAGE_SIZE)
        setBoardError('')
      }).catch(() => {
        // Keep the existing feed visible and report that the stream is reconnecting.
        setConnection('reconnecting')
      })
    }
    const onRemoved = (event: Event) => {
      const payload = eventPayload(event)
      const data = payload.data && typeof payload.data === 'object' ? payload.data as Record<string, unknown> : payload
      const nestedKudos = data.kudos && typeof data.kudos === 'object' ? data.kudos as Record<string, unknown> : undefined
      const id = typeof data.id === 'string' ? data.id : typeof nestedKudos?.id === 'string' ? nestedKudos.id : undefined
      if (id) {
        const remaining = postsRef.current.filter((post) => post.id !== id)
        setPosts(remaining)
        postsRef.current = remaining
        setAnnouncement('A hidden kudos was removed from the board.')
      }
    }
    source.addEventListener('kudos-added', onAdded)
    source.addEventListener('kudos-removed', onRemoved)
    return () => source.close()
  }, [])

  const recipientOptions = useMemo(() => {
    const options = new Map<string, RecipientOption>()
    for (const post of posts) {
      if (post.author?.id && post.author.name) options.set(post.author.id, { id: post.author.id, name: post.author.name })
      if (post.recipient?.id && post.recipient.name) options.set(post.recipient.id, { id: post.recipient.id, name: post.recipient.name })
    }
    return [...options.values()]
  }, [posts])

  function onCreated(created: CreatedKudos) {
    const post = normalizePost(created)
    if (pageRef.current !== 1) {
      setPage(1)
      pageRef.current = 1
    }
    const updated = newestFirst([post, ...postsRef.current.filter((item) => item.id !== post.id)]).slice(0, PAGE_SIZE)
    setPosts(updated)
    postsRef.current = updated
    setHasNext((current) => current || updated.length === PAGE_SIZE)
    setAnnouncement('Kudos posted and added to the top of the board.')
  }

  const retry = () => void loadPage(pageRef.current)

  return (
    <div className="board">
      <section className="intro" aria-labelledby="board-title">
        <div>
          <p className="eyebrow">A little appreciation goes a long way</p>
          <h1 id="board-title">Team kudos</h1>
          <p className="subtitle">Good work deserves to be noticed. Give a teammate a shout-out.</p>
        </div>
        <LiveStatus state={connection} />
      </section>

      <KudosComposer recipientOptions={recipientOptions} onCreated={onCreated} />

      <section aria-labelledby="feed-heading">
        <div className="feed-heading">
          <h2 id="feed-heading">Latest appreciation</h2>
          <span className="feed-context">Newest first · 20 per page</span>
        </div>
        {boardError && (
          <div className="board-message board-error" role="alert">
            <span>{boardError}</span>
            <button type="button" onClick={retry}>Retry</button>
          </div>
        )}
        {initialLoading ? (
          <p className="board-message" role="status">Loading the latest kudos…</p>
        ) : posts.length === 0 ? (
          boardError ? null : <p className="board-message">No kudos yet. Start with a thank-you.</p>
        ) : (
          <ol className="feed" aria-label="Kudos posts, newest first" aria-live="polite" aria-relevant="additions removals">
            {posts.map((post) => (
              <li key={post.id}>
                <BoardPost id={post.id} author={post.author.name} recipient={post.recipient.name} message={post.message} timestamp={post.createdAt} />
              </li>
            ))}
          </ol>
        )}
        <Pagination page={page} hasNext={hasNext} loading={pageLoading} onPageChange={(nextPage) => void loadPage(nextPage)} />
        {pageLoading && !initialLoading && <p className="page-status" role="status">Loading page…</p>}
      </section>
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</span>
      <style jsx>{`
        .board { width: min(100%, 760px); margin: 0 auto; }
        .intro { display: flex; justify-content: space-between; align-items: flex-end; gap: 18px; margin-bottom: 23px; }
        .eyebrow { margin: 0 0 6px; color: var(--color-primary); font-size: 11px; line-height: 16px; font-weight: 700; letter-spacing: .13em; text-transform: uppercase; }
        h1 { margin: 0; font-size: 32px; line-height: 40px; font-weight: 700; letter-spacing: -.04em; }
        .subtitle { margin: 6px 0 0; color: var(--color-muted-foreground); font-size: 14px; line-height: 21px; }
        .feed-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
        .feed-heading h2 { margin: 0; font-size: 18px; line-height: 26px; font-weight: 600; }
        .feed-context { color: var(--color-muted-foreground); font-size: 12px; white-space: nowrap; }
        .feed { display: grid; gap: 12px; padding: 0; margin: 0; list-style: none; }
        .board-message { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 72px; margin: 0 0 12px; padding: 20px; border: 1px solid var(--color-border); border-radius: 12px; background: var(--color-card); color: var(--color-muted-foreground); font-size: 14px; }
        .board-error { color: var(--color-destructive); }
        .board-error button { min-height: 36px; padding: 0 12px; border: 1px solid var(--color-border); border-radius: 7px; background: var(--color-card); color: var(--color-foreground); cursor: pointer; }
        .page-status { margin: 10px 0 0; color: var(--color-muted-foreground); font-size: 12px; }
        .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
        @media (max-width: 767px) { h1 { font-size: 28px; line-height: 36px; } .intro { align-items: flex-start; } }
        @media (max-width: 420px) { .intro { gap: 8px; } .subtitle { max-width: 220px; font-size: 13px; } }
      `}</style>
    </div>
  )
}
