'use client'

import { useEffect, useRef, useState } from 'react'
import { apiRequest } from '@/lib/api-client'
import { KudosCard } from './kudos-card'
import { EmojiReactions } from './emoji-reactions'
import { HideKudosDialog } from './hide-kudos-dialog'

type BoardReaction = { emoji: string; count: number; selected?: boolean; label?: string }
export type BoardPostProps = {
  id: string
  author: string
  recipient: string
  message: string
  timestamp: string | Date
  reactions?: BoardReaction[]
  isTeamLead?: boolean
  signedIn?: boolean
  onHidden?: (id: string) => void
  onReactionAdded?: (reaction: BoardReaction) => void
}

export function BoardPost({ id, author, recipient, message, timestamp, reactions = [], isTeamLead = false, signedIn = true, onHidden, onReactionAdded }: BoardPostProps) {
  const [hideOpen, setHideOpen] = useState(false)
  const [hiding, setHiding] = useState(false)
  const [hideError, setHideError] = useState('')
  const [hidden, setHidden] = useState(false)
  const hideTrigger = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    function onKudosHidden(event: Event) {
      const detail = (event as CustomEvent<{ id?: string }>).detail
      if (detail?.id === id) {
        setHidden(true)
        onHidden?.(id)
      }
    }
    window.addEventListener('kudos:hidden', onKudosHidden)
    return () => window.removeEventListener('kudos:hidden', onKudosHidden)
  }, [id, onHidden])

  async function confirmHide() {
    if (hiding) return
    setHiding(true)
    setHideError('')
    try {
      await apiRequest(`/kudos/${encodeURIComponent(id)}/hide`, { method: 'POST' })
      setHideOpen(false)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('kudos:hidden', { detail: { id } }))
        window.dispatchEvent(new CustomEvent('board:announce', { detail: { message: 'Kudos hidden.' } }))
      }
    } catch {
      setHideError('Couldn’t hide this kudos. Try again.')
      setHiding(false)
    }
  }

  function closeDialog() {
    if (hiding) return
    setHideOpen(false)
    setHideError('')
    requestAnimationFrame(() => hideTrigger.current?.focus())
  }

  if (hidden) {
    return (
      <>
        <p className="sr-announcement" role="status" aria-live="polite">Kudos hidden.</p>
        <style jsx>{`.sr-announcement { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }`}</style>
      </>
    )
  }

  return (
    <>
      <div className="board-post" data-kudos-id={id}>
        <KudosCard
          author={author}
          recipient={recipient}
          message={message}
          timestamp={timestamp}
          reactions={[]}
          variant={isTeamLead ? 'lead-moderation' : 'standard'}
        />
        <div className="post-reactions">
          <EmojiReactions kudosId={id} reactions={reactions} signedIn={signedIn} onReactionAdded={onReactionAdded} />
        </div>
        {isTeamLead && (
          <div className="post-moderation">
            <button ref={hideTrigger} className="hide-action" type="button" onClick={() => setHideOpen(true)} disabled={hiding} aria-label="Hide" aria-describedby={`hide-context-${id}`}>
              Hide<span id={`hide-context-${id}`} className="sr-only"> kudos from {author} to {recipient}</span>
            </button>
          </div>
        )}
        <style jsx>{`
          .board-post { position: relative; }
          .post-reactions { position: absolute; bottom: 20px; left: 22px; }
          .post-moderation { position: absolute; right: 18px; bottom: 17px; }
          .hide-action { min-height: 36px; padding: 6px 12px; border: 0; border-radius: 7px; background: transparent; color: var(--color-destructive); font-size: 14px; font-weight: 500; cursor: pointer; }
          .hide-action:hover:not(:disabled) { background: var(--color-muted); }
          .hide-action:focus-visible { outline: 3px solid var(--color-ring); outline-offset: 2px; }
          .hide-action:disabled { cursor: not-allowed; opacity: .62; }
          .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
          :global(.kudos-card__no-reactions) { display: none; }
          :global(.kudos-card__footer) { min-height: 39px; }
          @media (max-width: 560px) { .post-reactions { left: 16px; bottom: 16px; } .post-moderation { right: 12px; bottom: 13px; } }
        `}</style>
      </div>
      <HideKudosDialog
        open={hideOpen}
        author={author}
        recipient={recipient}
        message={message}
        submitting={hiding}
        error={hideError}
        onCancel={closeDialog}
        onConfirm={() => void confirmHide()}
      />
    </>
  )
}
