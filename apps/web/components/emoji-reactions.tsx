'use client'

import { useState } from 'react'
import { apiRequest } from '@/lib/api-client'

type Reaction = {
  emoji: string
  count: number
  selected?: boolean
}

export type EmojiReactionsProps = {
  kudosId: string
  reactions?: Reaction[]
  signedIn?: boolean
  onAddReaction?: (emoji: string) => Promise<unknown> | unknown
}

const EMOJI_CHOICES = ['👏', '❤️', '🙌', '💡', '🙏', '✨']

export function EmojiReactions({
  kudosId,
  reactions = [],
  signedIn = true,
  onAddReaction,
}: EmojiReactionsProps) {
  const [counts, setCounts] = useState(reactions)
  const [selectedEmoji, setSelectedEmoji] = useState(reactions.find((reaction) => reaction.selected)?.emoji)
  const [chooserOpen, setChooserOpen] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')

  async function addReaction(emoji: string) {
    if (!signedIn || updating || selectedEmoji) return
    setUpdating(true)
    setError('')
    try {
      if (onAddReaction) await onAddReaction(emoji)
      else await apiRequest(`/kudos/${encodeURIComponent(kudosId)}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ emoji }),
      })
      setCounts((current) => {
        const found = current.find((reaction) => reaction.emoji === emoji)
        if (found) return current.map((reaction) => reaction.emoji === emoji ? { ...reaction, count: reaction.count + 1 } : reaction)
        return [...current, { emoji, count: 1 }]
      })
      setSelectedEmoji(emoji)
      setChooserOpen(false)
    } catch {
      setError('Could not add your reaction. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="emoji-reactions">
      <div className="reaction-list" aria-label="Reactions">
        {counts.map((reaction) => {
          const selected = selectedEmoji === reaction.emoji
          return (
            <button
              key={reaction.emoji}
              type="button"
              className={`reaction-chip${selected ? ' reaction-chip--selected' : ''}`}
              aria-label={`${reaction.emoji}, ${reaction.count} ${reaction.count === 1 ? 'reaction' : 'reactions'}${selected ? ', selected' : ''}`}
              aria-pressed={selected}
              disabled={!signedIn || updating}
            >
              <span aria-hidden="true">{reaction.emoji}</span><span>{reaction.count}</span>
            </button>
          )
        })}
        {signedIn && !selectedEmoji && (
          <button
            type="button"
            className="add-reaction"
            aria-label="Add reaction"
            aria-expanded={chooserOpen}
            onClick={() => { setChooserOpen((open) => !open); setError('') }}
            disabled={updating}
          >+</button>
        )}
        {!signedIn && <span className="reaction-hint">Sign in to react.</span>}
      </div>
      {chooserOpen && !selectedEmoji && (
        <div className="emoji-picker" role="group" aria-label="Choose one emoji reaction">
          {EMOJI_CHOICES.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-label={`React with ${emoji}`}
              onClick={() => void addReaction(emoji)}
              disabled={updating}
            >{emoji}</button>
          ))}
        </div>
      )}
      {updating && <p className="reaction-status" role="status">Adding reaction…</p>}
      {error && <p className="reaction-error" role="alert">{error}</p>}
      <style jsx>{`
        .emoji-reactions { display: grid; justify-items: start; gap: 8px; }
        .reaction-list { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; }
        .reaction-chip { min-height: 32px; display: inline-flex; align-items: center; gap: 6px; padding: 0 10px; border: 1px solid var(--color-border); border-radius: 999px; background: var(--color-background); color: var(--color-foreground); font-size: 14px; cursor: default; }
        .reaction-chip--selected { border-color: #E9C8C2; background: #F9EAE7; color: #8E392F; }
        .add-reaction, .emoji-picker button { display: grid; place-items: center; width: 32px; height: 32px; border: 1px dashed #C9C9C2; border-radius: 50%; background: var(--color-card); color: var(--color-muted-foreground); font-size: 18px; cursor: pointer; }
        .add-reaction:disabled, .emoji-picker button:disabled { cursor: wait; opacity: .6; }
        .emoji-picker { display: flex; flex-wrap: wrap; gap: 7px; padding: 8px; border: 1px solid var(--color-border); border-radius: 10px; background: var(--color-card); box-shadow: 0 4px 12px rgba(34,42,48,.08); }
        .emoji-picker button { border-style: solid; color: var(--color-foreground); font-size: 17px; }
        .emoji-picker button:hover:not(:disabled) { background: var(--color-muted); }
        .reaction-hint, .reaction-status, .reaction-error { margin: 0; color: var(--color-muted-foreground); font-size: 12px; line-height: 18px; }
        .reaction-error { color: #A3312C; }
        button:focus-visible { outline: 3px solid var(--color-ring); outline-offset: 3px; }
      `}</style>
    </div>
  )
}
