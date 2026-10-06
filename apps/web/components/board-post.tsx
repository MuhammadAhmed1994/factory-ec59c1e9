'use client'

import { useRef, useState } from 'react'
import { apiRequest } from '../lib/api-client'
import { EmojiReactions, type ReactionCount } from './emoji-reactions'
import { HideKudosDialog } from './hide-kudos-dialog'

type BoardPostProps = {
  id: string
  author: string
  recipient: string
  message: string
  timestamp: string | Date
  reactions?: ReactionCount[]
  signedIn: boolean
  isTeamLead?: boolean
  hidden?: boolean
  onHidden?: (id: string) => void
}

export function BoardPost({
  id,
  author,
  recipient,
  message,
  timestamp,
  reactions = [],
  signedIn,
  isTeamLead = false,
  hidden = false,
  onHidden,
}: BoardPostProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [hiding, setHiding] = useState(false)
  const [hideError, setHideError] = useState('')
  const [removed, setRemoved] = useState(hidden)
  const [announcement, setAnnouncement] = useState('')
  const submitLock = useRef(false)
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
  const validDate = !Number.isNaN(date.getTime())
  const displayTime = validDate ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date) : String(timestamp)

  async function confirmHide() {
    if (submitLock.current || hiding) return
    submitLock.current = true
    setHiding(true)
    setHideError('')
    try {
      await apiRequest(`/kudos/${encodeURIComponent(id)}/hide`, { method: 'POST' })
      setRemoved(true)
      setDialogOpen(false)
      setAnnouncement('Kudos hidden. Removed from this board for all active viewers.')
      onHidden?.(id)
    } catch {
      setHideError("Couldn't hide this kudos. Try again.")
    } finally {
      submitLock.current = false
      setHiding(false)
    }
  }

  if (removed || hidden) {
    return announcement ? <p className="post-announcement" role="status" aria-live="polite">{announcement}</p> : null
  }

  return (
    <>
      <article className={`board-post${isTeamLead ? ' board-post--lead' : ''}`} aria-label={`Kudos from ${author} to ${recipient}`}>
        <header className="post-header">
          <div className="post-people">
            <span className="post-author">{author}</span>
            <span className="post-connector">recognized</span>
            <h2>{recipient}</h2>
          </div>
          <time dateTime={validDate ? date.toISOString() : undefined}>{displayTime}</time>
          {isTeamLead && signedIn && (
            <button
              className="hide-trigger"
              type="button"
              aria-label={`Hide kudos from ${author} to ${recipient}`}
              aria-haspopup="dialog"
              aria-controls="hide-kudos-dialog"
              onClick={() => { setHideError(''); setDialogOpen(true) }}
            >
              Hide
            </button>
          )}
        </header>
        <p className="post-message">{message}</p>
        <footer className="post-footer">
          <EmojiReactions kudosId={id} reactions={reactions} signedIn={signedIn} />
        </footer>
      </article>
      {dialogOpen && (
        <HideKudosDialog
          author={author}
          recipient={recipient}
          message={message}
          submitting={hiding}
          error={hideError}
          onCancel={() => { if (!hiding) setDialogOpen(false) }}
          onConfirm={() => void confirmHide()}
        />
      )}
      {announcement && <p className="post-announcement" role="status" aria-live="polite">{announcement}</p>}
      <style jsx>{`
        .board-post { padding: 19px 20px 16px; border: 1px solid #E0DFD9; border-radius: 16px; background: var(--color-card); color: var(--color-foreground); box-shadow: 0 1px 3px rgba(34,42,48,.045), 0 3px 10px rgba(34,42,48,.025); }
        .board-post--lead { border-left: 3px solid #E5C6C0; }
        .post-header { display: flex; align-items: flex-start; gap: 10px; }
        .post-people { min-width: 0; flex: 1; display: flex; flex-wrap: wrap; align-items: baseline; gap: 3px 6px; }
        .post-author { font-size: 14px; font-weight: 600; }
        .post-connector { color: var(--color-muted-foreground); font-size: 13px; }
        h2 { margin: 0; font-size: 15px; line-height: 21px; font-weight: 600; }
        time { flex: 0 0 auto; color: var(--color-muted-foreground); font-size: 12px; line-height: 18px; }
        .hide-trigger { min-height: 32px; margin: -5px -4px 0 2px; padding: 0 10px; border: 1px solid var(--color-border); border-radius: 7px; background: #fff; color: var(--color-destructive); font-size: 13px; font-weight: 500; cursor: pointer; }
        .hide-trigger:hover { background: #FAF0EF; }
        .hide-trigger:focus-visible { outline: 3px solid var(--color-ring); outline-offset: 2px; }
        .post-message { margin: 14px 0; color: #293238; font-size: 15px; line-height: 23px; overflow-wrap: anywhere; white-space: pre-wrap; }
        .post-footer { padding-top: 12px; border-top: 1px solid #F0EFEB; }
        .post-announcement { margin: 0; padding: 10px 0; color: var(--color-success); font-size: 13px; }
        @media (max-width: 600px) { .board-post { padding: 16px 14px 13px; } .post-header { flex-wrap: wrap; } time { order: 3; flex-basis: 100%; } .hide-trigger { margin-left: auto; } }
      `}</style>
    </>
  )
}
