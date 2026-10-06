'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { apiRequest } from '@/lib/api-client'
import { EmojiReactions, type ReactionCount } from './emoji-reactions'
import { HideKudosDialog } from './hide-kudos-dialog'

export type BoardPostProps = {
  id: string
  author: string
  recipient: string
  message: string
  timestamp: string | Date
  reactions?: ReactionCount[]
  currentUserEmoji?: string | null
  isSignedIn?: boolean
  isTeamLead?: boolean
  onHidden?: (id: string) => void
}

type RemovalListener = (id: string) => void
let removalSource: EventSource | null = null
const removalListeners = new Set<RemovalListener>()

function subscribeToHiddenEvents(listener: RemovalListener) {
  removalListeners.add(listener)
  if (typeof window !== 'undefined' && typeof EventSource !== 'undefined' && !removalSource) {
    const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')
    removalSource = new EventSource(`${base}/kudos/events`, { withCredentials: true })
    const receive = (event: MessageEvent<string>) => {
      try {
        const data = JSON.parse(event.data) as { id?: string; kudos?: { id?: string } }
        const id = data.id ?? data.kudos?.id
        if (id) removalListeners.forEach((notify) => notify(id))
      } catch {
        // Ignore malformed events; the stream can continue delivering valid updates.
      }
    }
    removalSource.addEventListener('kudos-removed', receive as EventListener)
    removalSource.onmessage = receive
  }
  return () => {
    removalListeners.delete(listener)
    if (removalListeners.size === 0 && removalSource) {
      removalSource.close()
      removalSource = null
    }
  }
}

export function BoardPost({
  id,
  author,
  recipient,
  message,
  timestamp,
  reactions: initialReactions = [],
  currentUserEmoji = null,
  isSignedIn = false,
  isTeamLead = false,
  onHidden,
}: BoardPostProps) {
  const [reactions, setReactions] = useState(initialReactions)
  const [myEmoji, setMyEmoji] = useState(currentUserEmoji)
  const [reactionUpdating, setReactionUpdating] = useState(false)
  const [reactionError, setReactionError] = useState<string | null>(null)
  const [hideOpen, setHideOpen] = useState(false)
  const [hiding, setHiding] = useState(false)
  const [hideError, setHideError] = useState<string | null>(null)
  const [hidden, setHidden] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const hideButtonRef = useRef<HTMLButtonElement>(null)
  const hadDialogOpen = useRef(false)

  const removeLocally = useCallback((hiddenId: string) => {
    if (hiddenId !== id) return
    setHidden(true)
    setAnnouncement('Kudos hidden. Removed from the board for everyone viewing.')
    onHidden?.(id)
  }, [id, onHidden])

  useEffect(() => subscribeToHiddenEvents(removeLocally), [removeLocally])
  useEffect(() => {
    if (hadDialogOpen.current && !hideOpen && !hidden) hideButtonRef.current?.focus()
    hadDialogOpen.current = hideOpen
  }, [hideOpen, hidden])

  async function addReaction(emoji: string) {
    if (!isSignedIn || myEmoji || reactionUpdating) return
    setReactionUpdating(true)
    setReactionError(null)
    try {
      await apiRequest(`/kudos/${encodeURIComponent(id)}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ emoji }),
      })
      setReactions((current) => {
        const existing = current.find((reaction) => reaction.emoji === emoji)
        return existing
          ? current.map((reaction) => reaction.emoji === emoji ? { ...reaction, count: reaction.count + 1 } : reaction)
          : [...current, { emoji, count: 1 }]
      })
      setMyEmoji(emoji)
      setAnnouncement('Reaction added.')
    } catch {
      setReactionError('Couldn’t add your reaction. Please try again.')
    } finally {
      setReactionUpdating(false)
    }
  }

  async function confirmHide() {
    if (hiding) return
    setHiding(true)
    setHideError(null)
    try {
      await apiRequest(`/kudos/${encodeURIComponent(id)}/hide`, { method: 'POST' })
      setHideOpen(false)
      setHiding(false)
      removeLocally(id)
      window.dispatchEvent(new CustomEvent('kudos:hidden', { detail: { id } }))
    } catch {
      setHideError('Couldn’t hide this kudos. Try again.')
      setHiding(false)
    }
  }

  const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
  const displayTime = Number.isNaN(date.getTime())
    ? String(timestamp)
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)

  if (hidden) {
    return <div className="board-post__announcement" role="status" aria-live="polite">{announcement}</div>
  }

  return (
    <>
      <article className={`board-post${isTeamLead ? ' board-post--lead' : ''}`} aria-label={`Kudos from ${author} to ${recipient}`}>
        <div className="board-post__header">
          <div className="board-post__identity">
            <span className="board-post__author">{author}</span>
            <span className="board-post__connector">recognized</span>
            <h2>{recipient}</h2>
          </div>
          <time dateTime={Number.isNaN(date.getTime()) ? undefined : date.toISOString()}>{displayTime}</time>
        </div>
        <p className="board-post__message">{message}</p>
        <div className="board-post__footer">
          <EmojiReactions
            reactions={reactions}
            currentUserEmoji={myEmoji}
            disabled={!isSignedIn}
            updating={reactionUpdating}
            error={reactionError}
            onAdd={addReaction}
          />
          {isTeamLead && (
            <button
              ref={hideButtonRef}
              type="button"
              className="board-post__hide"
              aria-label={`Hide kudos from ${author} to ${recipient}`}
              disabled={hiding}
              onClick={() => { setHideError(null); setHideOpen(true) }}
            >
              Hide
            </button>
          )}
        </div>
        <style jsx>{`
          .board-post { padding: 19px 20px 16px; border: 1px solid var(--color-border); border-radius: var(--radius-card, 10px); background: var(--color-card); color: var(--color-foreground); box-shadow: 0 1px 3px rgba(34,42,48,.06), 0 4px 12px rgba(34,42,48,.04); }
          .board-post--lead { border-left: 3px solid #D9948D; }
          .board-post__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
          .board-post__identity { display: flex; flex-wrap: wrap; align-items: baseline; gap: 5px; }
          .board-post__author { font-size: 14px; font-weight: 600; }
          .board-post__connector { color: var(--color-muted-foreground); font-size: 13px; }
          h2 { margin: 0; font-size: 18px; line-height: 26px; font-weight: 600; }
          time { flex: none; color: var(--color-muted-foreground); font-size: 12px; }
          .board-post__message { margin: 14px 0 16px; color: var(--color-foreground); font-size: 15px; line-height: 23px; white-space: pre-wrap; overflow-wrap: anywhere; }
          .board-post__footer { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding-top: 12px; border-top: 1px solid var(--color-border); }
          .board-post__hide { min-height: 34px; padding: 0 12px; border: 1px solid var(--color-border); border-radius: 7px; color: #555E62; background: var(--color-card); font: inherit; font-size: 13px; font-weight: 500; cursor: pointer; }
          .board-post__hide:hover:not(:disabled) { background: var(--color-muted); }
          .board-post__hide:disabled { cursor: not-allowed; opacity: .65; }
          .board-post__hide:focus-visible { outline: 3px solid var(--color-ring); outline-offset: 2px; }
          .board-post__announcement { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; }
          @media (max-width: 560px) { .board-post { padding: 16px 14px; } .board-post__header { flex-direction: column; } }
          @media (prefers-reduced-motion: reduce) { .board-post { transition: none; } }
        `}</style>
      </article>
      <div className="board-post__announcement" role="status" aria-live="polite">{announcement}</div>
      <HideKudosDialog
        open={hideOpen}
        author={author}
        recipient={recipient}
        message={message}
        submitting={hiding}
        error={hideError}
        onCancel={() => { if (!hiding) setHideOpen(false) }}
        onConfirm={() => void confirmHide()}
      />
    </>
  )
}
