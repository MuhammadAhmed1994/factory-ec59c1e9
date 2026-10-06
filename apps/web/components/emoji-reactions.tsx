'use client'

import { useState } from 'react'
import { apiRequest } from '@/lib/api-client'

export type ReactionCount = { emoji: string; count: number }

const EMOJI_CHOICES = ['👏', '❤️', '🙌', '✨', '💛']

type EmojiReactionsProps = {
  kudosId: string
  reactions?: ReactionCount[]
  memberReaction?: string | null
  signedIn?: boolean
}

export function EmojiReactions({
  kudosId,
  reactions = [],
  memberReaction = null,
  signedIn = true,
}: EmojiReactionsProps) {
  const [counts, setCounts] = useState(reactions)
  const [selected, setSelected] = useState(memberReaction)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')

  async function addReaction(emoji: string) {
    if (!signedIn || selected || updating) return
    setUpdating(true)
    setError('')
    try {
      await apiRequest(`/kudos/${encodeURIComponent(kudosId)}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ emoji }),
      })
      setCounts((current) => {
        const found = current.find((reaction) => reaction.emoji === emoji)
        return found
          ? current.map((reaction) => reaction.emoji === emoji ? { ...reaction, count: reaction.count + 1 } : reaction)
          : [...current, { emoji, count: 1 }]
      })
      setSelected(emoji)
      setPickerOpen(false)
    } catch {
      setError("Couldn't add reaction. Try again.")
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="reaction-area" aria-busy={updating}>
      <div className="reaction-list" aria-label="Reactions" aria-live="polite" aria-atomic="true">
        {counts.map(({ emoji, count }) => (
          <button
            key={emoji}
            type="button"
            className={`reaction-pill${selected === emoji ? ' reaction-pill--selected' : ''}`}
            aria-label={`${emoji}, ${count} ${count === 1 ? 'reaction' : 'reactions'}${selected === emoji ? ', selected' : ''}`}
            aria-pressed={selected === emoji}
            disabled={!signedIn || Boolean(selected) || updating}
            onClick={() => void addReaction(emoji)}
          >
            <span aria-hidden="true">{emoji}</span><span>{count}</span>
          </button>
        ))}
        {!selected && (
          <button
            type="button"
            className="add-reaction"
            aria-label="Add reaction"
            aria-expanded={pickerOpen}
            disabled={!signedIn || updating}
            onClick={() => { setPickerOpen((open) => !open); setError('') }}
          >{updating ? 'Updating…' : '+'}</button>
        )}
      </div>
      {!signedIn && <p className="reaction-feedback">Sign in to add a reaction.</p>}
      {updating && <p className="reaction-feedback" role="status">Adding reaction…</p>}
      {error && <p className="reaction-error" role="alert">{error}</p>}
      {pickerOpen && !selected && (
        <div className="emoji-picker" role="group" aria-label="Choose an emoji reaction">
          {EMOJI_CHOICES.map((emoji) => (
            <button key={emoji} type="button" aria-label={`Add ${emoji} reaction`} disabled={updating} onClick={() => void addReaction(emoji)}>{emoji}</button>
          ))}
        </div>
      )}
      <style jsx>{`
        .reaction-area { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; }
        .reaction-list { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; }
        .reaction-pill, .add-reaction, .emoji-picker button { font: inherit; cursor: pointer; }
        .reaction-pill { min-height: 30px; display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px; border: 1px solid var(--color-border); border-radius: 999px; background: var(--color-card); color: var(--color-foreground); font-size: 13px; }
        .reaction-pill:disabled { cursor: default; }
        .reaction-pill--selected { color: #8E392F; border-color: #E9C8C2; background: #F9EAE7; }
        .add-reaction { width: 30px; height: 30px; border: 1px dashed var(--color-border); border-radius: 50%; background: var(--color-card); color: var(--color-muted-foreground); }
        .add-reaction:disabled { cursor: not-allowed; }
        .emoji-picker { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px; border: 1px solid var(--color-border); border-radius: 10px; background: var(--color-card); box-shadow: 0 4px 12px rgba(34,42,48,.08); }
        .emoji-picker button { width: 36px; height: 36px; border: 0; border-radius: 7px; background: transparent; font-size: 20px; }
        .emoji-picker button:hover:not(:disabled) { background: var(--color-muted); }
        .reaction-feedback, .reaction-error { margin: 0; font-size: 12px; }
        .reaction-feedback { color: var(--color-muted-foreground); }
        .reaction-error { color: var(--color-destructive); }
        button:focus-visible { outline: 3px solid var(--color-ring); outline-offset: 2px; }
      `}</style>
    </div>
  )
}
