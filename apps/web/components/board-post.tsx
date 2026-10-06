'use client'

import { useEffect, useRef, useState } from 'react'
import { apiRequest } from '@/lib/api-client'
import { EmojiReactions, type EmojiReactionsProps } from './emoji-reactions'
import { HideKudosDialog } from './hide-kudos-dialog'

type PostReaction = NonNullable<EmojiReactionsProps['reactions']>[number]

export type BoardPostProps = {
  id: string
  author: string
  recipient: string
  message: string
  timestamp: string | Date
  reactions?: PostReaction[]
  isTeamLead?: boolean
  signedIn?: boolean
  onAddReaction?: (emoji: string) => Promise<unknown> | unknown
  onHide?: () => Promise<unknown> | unknown
  onRemoved?: (id: string) => void
}

export function BoardPost({
  id,
  author,
  recipient,
  message,
  timestamp,
  reactions = [],
  isTeamLead = false,
  signedIn = true,
  onAddReaction,
  onHide,
  onRemoved,
}: BoardPostProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [hiding, setHiding] = useState(false)
  const [hideError, setHideError] = useState('')
  const [removed, setRemoved] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const hideButtonRef = useRef<HTMLButtonElement>(null)
  const hadDialogOpen = useRef(false)

  useEffect(() => {
    if (hadDialogOpen.current && !dialogOpen && !removed) hideButtonRef.current?.focus()
    hadDialogOpen.current = dialogOpen
  }, [dialogOpen, removed])

  async function confirmHide() {
    if (hiding) return
    setHiding(true)
    setHideError('')
    try {
      if (onHide) await onHide()
      else await apiRequest(`/kudos/${encodeURIComponent(id)}/hide`, { method: 'POST' })
      setRemoved(true)
      setDialogOpen(false)
      setAnnouncement('Kudos hidden. Removed from this board for all active viewers.')
      onRemoved?.(id)
    } catch {
      setHideError("Couldn't hide this kudos. Try again.")
    } finally {
      setHiding(false)
    }
  }

  const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
  const formattedTime = Number.isNaN(date.getTime())
    ? String(timestamp)
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)

  return (
    <div className="board-post-shell">
      {announcement && <p className="announcement" role="status" aria-live="polite">{announcement}</p>}
      {!removed && (
        <article className="board-post" aria-label={`Kudos from ${author} to ${recipient}`}>
          <div className="post-heading">
            <div>
              <p className="people"><strong>{author}</strong><span aria-hidden="true">recognized</span><strong>{recipient}</strong></p>
              <time dateTime={Number.isNaN(date.getTime()) ? undefined : date.toISOString()}>{formattedTime}</time>
            </div>
            {isTeamLead && (
              <button
                ref={hideButtonRef}
                className="hide-action"
                type="button"
                onClick={() => { setHideError(''); setDialogOpen(true) }}
                aria-label={`Hide kudos from ${author} to ${recipient}`}
              >Hide</button>
            )}
          </div>
          <p className="message">{message}</p>
          <EmojiReactions kudosId={id} reactions={reactions} signedIn={signedIn} onAddReaction={onAddReaction} />
        </article>
      )}
      <HideKudosDialog
        open={dialogOpen}
        author={author}
        recipient={recipient}
        message={message}
        submitting={hiding}
        error={hideError}
        onCancel={() => { if (!hiding) setDialogOpen(false) }}
        onConfirm={() => void confirmHide()}
      />
      <style jsx>{`
        .board-post { padding: 19px 20px 16px; border: 1px solid var(--color-border); border-radius: var(--radius-card, 10px); background: var(--color-card); color: var(--color-foreground); box-shadow: 0 1px 3px rgba(34,42,48,.06), 0 4px 12px rgba(34,42,48,.04); }
        .post-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
        .people { display: flex; flex-wrap: wrap; align-items: baseline; gap: 7px; margin: 0; font-size: 14px; }
        .people span, time { color: var(--color-muted-foreground); }
        time { display: block; margin-top: 4px; font-size: 12px; }
        .message { margin: 14px 0 15px; color: var(--color-foreground); font-size: 15px; line-height: 23px; white-space: pre-wrap; overflow-wrap: anywhere; }
        .hide-action { min-height: 34px; padding: 0 12px; border: 1px solid var(--color-border); border-radius: 7px; background: var(--color-card); color: var(--color-destructive, #A3312C); font: inherit; font-size: 13px; font-weight: 500; cursor: pointer; }
        .hide-action:hover { background: var(--color-muted); }
        .hide-action:focus-visible { outline: 3px solid var(--color-ring); outline-offset: 3px; }
        .announcement { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }
        @media (max-width: 560px) { .board-post { padding: 16px 14px; } .message { font-size: 14px; line-height: 22px; } }
        @media (prefers-reduced-motion: reduce) { .board-post { transition: none; } }
      `}</style>
    </div>
  )
}
