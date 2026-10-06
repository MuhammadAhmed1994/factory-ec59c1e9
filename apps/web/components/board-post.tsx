'use client'

import { useRef, useState } from 'react'
import { apiRequest } from '../lib/api-client'
import { EmojiReactions } from './emoji-reactions'
import { HideKudosDialog } from './hide-kudos-dialog'

export type BoardPostReaction = {
  emoji: string
  count: number
  selected?: boolean
}

export type BoardPostData = {
  id: string
  author: string
  recipient: string
  message: string
  createdAt: string | Date
  reactions?: BoardPostReaction[]
}

export type BoardPostProps = {
  post: BoardPostData
  isSignedIn: boolean
  isTeamLead?: boolean
  onAddReaction?: (emoji: string) => Promise<void>
  onHideKudos?: () => Promise<void>
  /** Notify the board owner so it can also discard this id from its live list. */
  onHidden?: (id: string) => void
}

export function BoardPost({ post, isSignedIn, isTeamLead = false, onAddReaction, onHideKudos, onHidden }: BoardPostProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  const hideButtonRef = useRef<HTMLButtonElement>(null)
  const date = post.createdAt instanceof Date ? post.createdAt : new Date(post.createdAt)
  const validDate = !Number.isNaN(date.getTime())
  const displayTime = validDate
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
    : String(post.createdAt)

  async function hideKudos() {
    if (onHideKudos) {
      await onHideKudos()
    } else {
      await apiRequest(`/kudos/${encodeURIComponent(post.id)}/hide`, { method: 'POST' })
    }
    setHidden(true)
    setDialogOpen(false)
    onHidden?.(post.id)
  }

  if (hidden) {
    return <p className="board-post__announcement" role="status" aria-live="polite" aria-atomic="true">Kudos hidden. Removed from this board for all active viewers.</p>
  }

  return (
    <>
      <article className="board-post" aria-label={`Kudos from ${post.author} to ${post.recipient}`}>
        <div className="board-post__header">
          <div className="board-post__identity">
            <p className="board-post__people">
              <strong>{post.author}</strong><span aria-hidden="true">recognized</span><strong>{post.recipient}</strong>
            </p>
            <time dateTime={validDate ? date.toISOString() : undefined}>{displayTime}</time>
          </div>
          {isSignedIn && isTeamLead && (
            <button
              ref={hideButtonRef}
              type="button"
              className="board-post__hide"
              aria-label={`Hide kudos from ${post.author} to ${post.recipient}`}
              onClick={() => setDialogOpen(true)}
            >
              Hide
            </button>
          )}
        </div>
        <p className="board-post__message">{post.message}</p>
        <EmojiReactions
          kudosId={post.id}
          reactions={post.reactions}
          canReact={isSignedIn}
          onAddReaction={onAddReaction}
        />
      </article>
      {dialogOpen && (
        <HideKudosDialog
          author={post.author}
          recipient={post.recipient}
          message={post.message}
          onCancel={() => setDialogOpen(false)}
          onConfirm={hideKudos}
          returnFocusRef={hideButtonRef}
        />
      )}
      <style jsx>{`
        .board-post { padding: 18px 20px 16px; border: 1px solid var(--color-border); border-radius: 12px; background: var(--color-card); color: var(--color-foreground); box-shadow: 0 1px 3px rgba(34,42,48,.06), 0 4px 12px rgba(34,42,48,.04); }
        .board-post__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
        .board-post__identity { min-width: 0; }
        .board-post__people { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 7px; margin: 0; font-size: 14px; line-height: 21px; }
        .board-post__people > span { color: var(--color-muted-foreground); font-size: 12px; }
        .board-post__identity time { display: block; margin-top: 2px; color: var(--color-muted-foreground); font-size: 12px; line-height: 18px; }
        .board-post__message { margin: 14px 0 15px; overflow-wrap: anywhere; white-space: pre-wrap; font-size: 15px; line-height: 23px; }
        .board-post__hide { min-height: 34px; padding: 5px 10px; border: 1px solid var(--color-border); border-radius: 7px; background: var(--color-card); color: var(--color-destructive); font-size: 13px; font-weight: 500; cursor: pointer; }
        .board-post__hide:hover { background: var(--color-muted); }
        .board-post__hide:focus-visible { outline: 3px solid var(--color-ring); outline-offset: 3px; }
        .board-post__announcement { margin: 0; color: var(--color-success); font-size: 14px; line-height: 21px; }
        @media (max-width: 560px) { .board-post { padding: 16px 14px; } .board-post__message { font-size: 14px; line-height: 22px; } }
      `}</style>
    </>
  )
}
