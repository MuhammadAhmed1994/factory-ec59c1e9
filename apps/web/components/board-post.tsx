'use client'

import { useState } from 'react'
import { apiRequest } from '@/lib/api-client'
import { EmojiReactions } from './emoji-reactions'
import { HideKudosDialog } from './hide-kudos-dialog'

export type BoardPostProps = {
  id: string
  author: string
  recipient: string
  message: string
  timestamp: string | Date
  reactions?: { emoji: string; count: number }[]
  memberReaction?: string | null
  signedIn?: boolean
  isTeamLead?: boolean
  hidden?: boolean
  onRemoved?: (id: string) => void
}

export function BoardPost({
  id,
  author,
  recipient,
  message,
  timestamp,
  reactions = [],
  memberReaction = null,
  signedIn = true,
  isTeamLead = false,
  hidden = false,
  onRemoved,
}: BoardPostProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [hiding, setHiding] = useState(false)
  const [hideError, setHideError] = useState('')
  const [removed, setRemoved] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
  const displayDate = Number.isNaN(date.getTime()) ? String(timestamp) : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
  const dateTime = Number.isNaN(date.getTime()) ? undefined : date.toISOString()

  async function confirmHide() {
    if (hiding || removed || hidden) return
    setHiding(true)
    setHideError('')
    try {
      await apiRequest(`/kudos/${encodeURIComponent(id)}/hide`, { method: 'POST' })
      setRemoved(true)
      setAnnouncement('Kudos hidden. Removed from this board for all active viewers.')
      setDialogOpen(false)
      onRemoved?.(id)
    } catch {
      setHideError("Couldn't hide this kudos. Try again.")
    } finally {
      setHiding(false)
    }
  }

  return (
    <>
      {!removed && !hidden && (
        <article className="board-post" aria-label={`Kudos from ${author} to ${recipient}`}>
          <div className="post-heading">
            <div className="people">
              <span className="author">{author}</span>
              <span className="connector">recognized</span>
              <h2>{recipient}</h2>
            </div>
            <time dateTime={dateTime}>{displayDate}</time>
            {isTeamLead && (
              <button type="button" className="hide-trigger" aria-label={`Hide kudos from ${author} to ${recipient}`} onClick={() => { setHideError(''); setDialogOpen(true) }}>
                Hide
              </button>
            )}
          </div>
          <p className="message">{message}</p>
          <div className="post-footer">
            <EmojiReactions
              kudosId={id}
              reactions={reactions}
              memberReaction={memberReaction}
              signedIn={signedIn}
            />
          </div>
        </article>
      )}
      <HideKudosDialog
        open={dialogOpen && !removed && !hidden}
        author={author}
        recipient={recipient}
        message={message}
        submitting={hiding}
        error={hideError}
        onCancel={() => { if (!hiding) setDialogOpen(false) }}
        onConfirm={() => void confirmHide()}
      />
      {announcement && <p className="announcement" role="status" aria-live="polite">{announcement}</p>}
      <style jsx>{`
        .board-post { padding: 18px 20px 16px; border: 1px solid var(--color-border); border-radius: 12px; background: var(--color-card); box-shadow: 0 1px 3px rgba(34,42,48,.06), 0 4px 12px rgba(34,42,48,.04); }
        .post-heading { display: flex; align-items: baseline; flex-wrap: wrap; gap: 8px 12px; }
        .people { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px; flex: 1; min-width: 0; }
        .author { font-size: 14px; font-weight: 600; }
        .connector, time { color: var(--color-muted-foreground); font-size: 12px; }
        h2 { margin: 0; font-size: 18px; line-height: 26px; font-weight: 600; }
        .hide-trigger { min-height: 34px; padding: 5px 11px; border: 1px solid var(--color-border); border-radius: 7px; background: var(--color-card); color: var(--color-destructive); font-size: 13px; font-weight: 500; cursor: pointer; }
        .hide-trigger:hover { background: var(--color-muted); }
        .hide-trigger:focus-visible { outline: 3px solid var(--color-ring); outline-offset: 2px; }
        .message { margin: 14px 0 16px; white-space: pre-wrap; overflow-wrap: anywhere; font-size: 15px; line-height: 23px; }
        .post-footer { padding-top: 12px; border-top: 1px solid var(--color-border); }
        .announcement { margin: 8px 0 0; color: var(--color-success); font-size: 13px; }
        @media (max-width: 560px) { .board-post { padding: 16px; } .post-heading { align-items: flex-start; } }
      `}</style>
    </>
  )
}
