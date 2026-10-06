'use client'

import { useEffect, useRef, useState } from 'react'
import { apiRequest } from '@/lib/api-client'
import { EmojiReactions, type KudosReaction } from './emoji-reactions'
import { HideKudosDialog } from './hide-kudos-dialog'

export type BoardPostProps = {
  id: string
  author: string
  recipient: string
  message: string
  timestamp: string | Date
  reactions?: KudosReaction[]
  selectedEmoji?: string | null
  isSignedIn?: boolean
  isTeamLead?: boolean
  /** Parent board can remove this item too; the API publishes a hidden event for active viewers. */
  onHidden?: (id: string) => void
}

export function BoardPost({
  id,
  author,
  recipient,
  message,
  timestamp,
  reactions = [],
  selectedEmoji,
  isSignedIn = true,
  isTeamLead = false,
  onHidden,
}: BoardPostProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [hiding, setHiding] = useState(false)
  const [hideError, setHideError] = useState('')
  const [hidden, setHidden] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const hideButtonRef = useRef<HTMLButtonElement>(null)
  const wasOpen = useRef(false)
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
  const dateTime = Number.isNaN(date.getTime()) ? undefined : date.toISOString()
  const displayTime = Number.isNaN(date.getTime()) ? String(timestamp) : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)

  useEffect(() => {
    if (wasOpen.current && !dialogOpen && !hidden) hideButtonRef.current?.focus()
    wasOpen.current = dialogOpen
  }, [dialogOpen, hidden])

  async function confirmHide() {
    if (hiding) return
    setHiding(true)
    setHideError('')
    try {
      await apiRequest(`/kudos/${encodeURIComponent(id)}/hide`, { method: 'POST' })
      setHidden(true)
      setDialogOpen(false)
      setAnnouncement('Kudos hidden. Removed from this board for all active viewers.')
      onHidden?.(id)
    } catch {
      setHideError("Couldn't hide this kudos. Try again.")
    } finally {
      setHiding(false)
    }
  }

  return (
    <>
      {!hidden && (
        <article className="board-post" aria-label={`Kudos from ${author} to ${recipient}`}>
          <div className="post-topline">
            <div className="identity">
              <span className="author">{author}</span><span className="connector">recognized</span><h2>{recipient}</h2>
            </div>
            <time dateTime={dateTime}>{displayTime}</time>
            {isTeamLead && isSignedIn && (
              <button ref={hideButtonRef} type="button" className="hide-trigger" aria-label={`Hide kudos from ${author} to ${recipient}`} onClick={() => { setHideError(''); setDialogOpen(true) }}>
                <span aria-hidden="true">⊘</span> Hide
              </button>
            )}
          </div>
          <p className="post-message">{message}</p>
          <div className="post-footer">
            <EmojiReactions kudosId={id} reactions={reactions} selectedEmoji={selectedEmoji} signedIn={isSignedIn} />
          </div>
        </article>
      )}
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</span>
      <HideKudosDialog
        open={dialogOpen && !hidden}
        target={{ author, recipient, message }}
        submitting={hiding}
        error={hideError}
        onCancel={() => { if (!hiding) setDialogOpen(false) }}
        onConfirm={() => void confirmHide()}
      />
      <style jsx>{`
        .board-post { padding: 19px 20px 16px; border: 1px solid #E0DFD9; border-radius: 16px; background: var(--color-card); box-shadow: 0 1px 3px rgba(34,42,48,.045), 0 3px 10px rgba(34,42,48,.025); }
        .post-topline { display: flex; align-items: flex-start; gap: 12px; }
        .identity { min-width: 0; flex: 1; display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 7px; }
        .author { font-size: 14px; font-weight: 600; }
        .connector, time { color: var(--color-muted-foreground); font-size: 12px; }
        h2 { margin: 0; font-size: 16px; line-height: 22px; font-weight: 600; }
        time { flex-shrink: 0; }
        .hide-trigger { display: inline-flex; align-items: center; gap: 6px; min-height: 34px; padding: 0 10px; border: 1px solid var(--color-border); border-radius: 7px; background: #fff; color: #555E62; font-size: 13px; font-weight: 500; cursor: pointer; }
        .hide-trigger:hover { border-color: var(--color-destructive); color: var(--color-destructive); }
        .hide-trigger:focus-visible { outline: 3px solid var(--color-ring); outline-offset: 3px; }
        .post-message { margin: 14px 0; color: var(--color-foreground); font-size: 15px; line-height: 23px; white-space: pre-wrap; overflow-wrap: anywhere; }
        .post-footer { padding-top: 11px; border-top: 1px solid #F0EFEB; }
        .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
        @media (max-width: 560px) { .board-post { padding: 16px 14px; } .post-topline { flex-wrap: wrap; } time { order: 3; width: 100%; } .hide-trigger { margin-left: auto; } }
      `}</style>
    </>
  )
}

export default BoardPost
