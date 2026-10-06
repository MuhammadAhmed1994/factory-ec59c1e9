'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { apiRequest } from '../lib/api-client'
import { EmojiReactions, type ReactionCount } from './emoji-reactions'
import { HideKudosDialog } from './hide-kudos-dialog'

export type BoardPostProps = {
  id: string
  author: string
  recipient: string
  message: string
  timestamp: string | Date
  reactions?: ReactionCount[]
  selectedEmoji?: string | null
  signedIn?: boolean
  teamLead?: boolean
  onHidden?: (id: string) => void
  /** Set false only when the containing board already owns its shared SSE connection. */
  listenForLiveRemovals?: boolean
}

type RemovalCallback = () => void
const removalSubscribers = new Map<string, Set<RemovalCallback>>()
let removalEventSource: EventSource | null = null

function dispatchRemoval(event: Event) {
  try {
    const payload: unknown = JSON.parse((event as MessageEvent<string>).data)
    if (typeof payload !== 'object' || payload === null || !('id' in payload) || typeof payload.id !== 'string') return
    removalSubscribers.get(payload.id)?.forEach((callback) => callback())
  } catch {
    // Ignore malformed events and keep the visible board intact.
  }
}

function subscribeToRemovals(id: string, callback: RemovalCallback) {
  if (typeof EventSource === 'undefined') return () => undefined
  const callbacks = removalSubscribers.get(id) ?? new Set<RemovalCallback>()
  callbacks.add(callback)
  removalSubscribers.set(id, callbacks)

  if (!removalEventSource) {
    const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')
    try {
      removalEventSource = new EventSource(`${apiBase}/kudos/events`, { withCredentials: true })
      removalEventSource.addEventListener('kudos-removed', dispatchRemoval)
    } catch {
      removalSubscribers.get(id)?.delete(callback)
      if (removalSubscribers.get(id)?.size === 0) removalSubscribers.delete(id)
      return () => undefined
    }
  }

  return () => {
    const current = removalSubscribers.get(id)
    current?.delete(callback)
    if (current?.size === 0) removalSubscribers.delete(id)
    if (removalSubscribers.size === 0 && removalEventSource) {
      removalEventSource.removeEventListener('kudos-removed', dispatchRemoval)
      removalEventSource.close()
      removalEventSource = null
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
  selectedEmoji: initialSelectedEmoji = null,
  signedIn = true,
  teamLead = false,
  onHidden,
  listenForLiveRemovals = true,
}: BoardPostProps) {
  const [reactions, setReactions] = useState(initialReactions)
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(initialSelectedEmoji ?? null)
  const [reacting, setReacting] = useState(false)
  const [reactionError, setReactionError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [hiding, setHiding] = useState(false)
  const [hideError, setHideError] = useState<string | null>(null)
  const [hidden, setHidden] = useState(false)
  const reactionLock = useRef(false)
  const hideLock = useRef(false)
  const alreadyRemoved = useRef(false)
  const hideTrigger = useRef<HTMLButtonElement>(null)

  const removePost = useCallback((announce: boolean) => {
    if (alreadyRemoved.current) return
    alreadyRemoved.current = true
    setHidden(true)
    setDialogOpen(false)
    onHidden?.(id)
    if (announce) setHideError(null)
  }, [id, onHidden])

  useEffect(() => {
    if (!listenForLiveRemovals) return
    return subscribeToRemovals(id, () => removePost(false))
  }, [id, listenForLiveRemovals, removePost])

  async function addReaction(emoji: string) {
    if (!signedIn || reactionLock.current || selectedEmoji) return
    reactionLock.current = true
    setReacting(true)
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
      setSelectedEmoji(emoji)
    } catch {
      setReactionError('Couldn’t add reaction. Try again.')
    } finally {
      reactionLock.current = false
      setReacting(false)
    }
  }

  async function confirmHide() {
    if (hideLock.current) return
    hideLock.current = true
    setHiding(true)
    setHideError(null)
    try {
      await apiRequest(`/kudos/${encodeURIComponent(id)}/hide`, { method: 'POST' })
      removePost(true)
    } catch {
      setHideError('Couldn’t hide this kudos. Try again.')
    } finally {
      hideLock.current = false
      setHiding(false)
    }
  }

  if (hidden) return <p className="post-status" role="status">Kudos hidden. Removed from the board for everyone viewing.</p>

  const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
  const dateTime = Number.isNaN(date.getTime()) ? undefined : date.toISOString()
  const displayTime = Number.isNaN(date.getTime()) ? String(timestamp) : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)

  return (
    <article className="board-post" aria-label={`Kudos from ${author} to ${recipient}`}>
      <div className="board-post__header">
        <div>
          <p className="board-post__people"><strong>{author}</strong><span>recognized</span><strong>{recipient}</strong></p>
          <time className="board-post__time" dateTime={dateTime}>{displayTime}</time>
        </div>
        {teamLead && (
          <button ref={hideTrigger} className="board-post__hide" type="button" aria-label={`Hide kudos from ${author} to ${recipient}`} onClick={() => { setHideError(null); setDialogOpen(true) }}>
            Hide
          </button>
        )}
      </div>
      <p className="board-post__message">{message}</p>
      <div className="board-post__footer">
        <EmojiReactions reactions={reactions} selectedEmoji={selectedEmoji} disabled={!signedIn} updating={reacting} error={reactionError} onAdd={addReaction} />
      </div>
      <HideKudosDialog
        open={dialogOpen}
        target={`“${message}” (from ${author} to ${recipient})`}
        submitting={hiding}
        error={hideError}
        onConfirm={confirmHide}
        onCancel={() => { if (!hiding) setDialogOpen(false) }}
      />
      <style jsx>{`
        .board-post { padding: 20px 22px 16px; border: 1px solid var(--color-border); border-radius: 12px; background: var(--color-card); color: var(--color-foreground); box-shadow: 0 1px 3px rgba(34,42,48,.06), 0 4px 12px rgba(34,42,48,.04); }
        .board-post__header { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; }
        .board-post__people { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px; margin: 0; font-size: 14px; }
        .board-post__people span, .board-post__time { color: var(--color-muted-foreground); }
        .board-post__time { display: block; margin-top: 3px; font-size: 12px; }
        .board-post__message { margin: 17px 0; white-space: pre-wrap; overflow-wrap: anywhere; font-size: 15px; line-height: 23px; }
        .board-post__footer { padding-top: 12px; border-top: 1px solid var(--color-border); }
        .board-post__hide { min-height: 34px; padding: 5px 12px; border: 1px solid var(--color-border); border-radius: 7px; background: var(--color-card); color: var(--color-destructive); font-size: 13px; font-weight: 500; cursor: pointer; }
        .board-post__hide:hover { background: var(--color-muted); }
        .board-post__hide:focus-visible { outline: 3px solid var(--color-ring); outline-offset: 2px; }
        .post-status { margin: 0; padding: 12px 14px; border: 1px solid #D6E5DA; border-radius: var(--radius-card); background: var(--color-card); color: var(--color-success); font-size: 14px; }
        @media (max-width: 560px) { .board-post { padding: 16px; } }
      `}</style>
    </article>
  )
}
