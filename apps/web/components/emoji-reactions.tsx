'use client'

import { useState } from 'react'
import { apiRequest } from '../lib/api-client'

type Reaction = {
  emoji: string
  count: number
  selected?: boolean
}

type EmojiReactionsProps = {
  kudosId: string
  reactions?: Reaction[]
  canReact: boolean
  onAddReaction?: (emoji: string) => Promise<void>
}

const EMOJI_OPTIONS = [
  { emoji: '👏', name: 'Clap' },
  { emoji: '❤️', name: 'Heart' },
  { emoji: '🙌', name: 'Celebrate' },
  { emoji: '💡', name: 'Insightful' },
  { emoji: '🙏', name: 'Thanks' },
]

export function EmojiReactions({ kudosId, reactions = [], canReact, onAddReaction }: EmojiReactionsProps) {
  const [items, setItems] = useState(reactions)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const hasReacted = items.some((reaction) => reaction.selected)

  async function addReaction(emoji: string) {
    if (updating || hasReacted || !canReact) return
    setUpdating(true)
    setError('')
    setSuccess(false)
    try {
      if (onAddReaction) {
        await onAddReaction(emoji)
      } else {
        await apiRequest(`/kudos/${encodeURIComponent(kudosId)}/reactions`, {
          method: 'POST',
          body: JSON.stringify({ emoji }),
        })
      }
      setItems((current) => {
        const existing = current.find((reaction) => reaction.emoji === emoji)
        if (existing) {
          return current.map((reaction) => reaction.emoji === emoji
            ? { ...reaction, count: reaction.count + 1, selected: true }
            : reaction)
        }
        return [...current, { emoji, count: 1, selected: true }]
      })
      setSuccess(true)
      setPickerOpen(false)
    } catch {
      setError('Could not add your reaction. Choose it again to retry.')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <section className="emoji-reactions" aria-label="Reactions" aria-busy={updating}>
      <div className="emoji-reactions__row">
        {items.map((reaction) => (
          <button
            key={reaction.emoji}
            className={`emoji-reactions__count ${reaction.selected ? 'is-selected' : ''}`}
            type="button"
            disabled
            aria-pressed={Boolean(reaction.selected)}
            aria-label={`${reaction.emoji} ${reaction.count} ${reaction.count === 1 ? 'reaction' : 'reactions'}${reaction.selected ? ', selected' : ''}`}
          >
            <span aria-hidden="true">{reaction.emoji}</span><span>{reaction.count}</span>
          </button>
        ))}
        {!hasReacted && (
          <button
            className="emoji-reactions__add"
            type="button"
            aria-label="Add reaction"
            aria-expanded={pickerOpen}
            disabled={!canReact || updating}
            onClick={() => { setPickerOpen((open) => !open); setError(''); setSuccess(false) }}
          >
            <span aria-hidden="true">＋</span>
          </button>
        )}
      </div>
      {!canReact && <p className="emoji-reactions__hint">Sign in to add a reaction.</p>}
      {updating && <p className="emoji-reactions__status" role="status">Adding reaction…</p>}
      {success && <p className="emoji-reactions__status" role="status" aria-atomic="true">Reaction added.</p>}
      {error && <p className="emoji-reactions__error" role="alert">{error}</p>}
      {pickerOpen && !hasReacted && (
        <div className="emoji-reactions__picker" role="group" aria-label="Choose one reaction">
          {EMOJI_OPTIONS.map(({ emoji, name }) => (
            <button
              key={emoji}
              type="button"
              disabled={updating}
              aria-label={`${emoji} ${name}`}
              onClick={() => void addReaction(emoji)}
            >
              {emoji}<span className="emoji-reactions__option-name">{name}</span>
            </button>
          ))}
        </div>
      )}
      <style jsx>{`
        .emoji-reactions { display: grid; justify-items: start; gap: 7px; }
        .emoji-reactions__row { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; }
        .emoji-reactions__count, .emoji-reactions__add { min-height: 31px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 0 9px; border: 1px solid #E6E4DE; border-radius: 999px; background: var(--color-background); color: var(--color-foreground); font-size: 13px; }
        .emoji-reactions__count:disabled { opacity: 1; }
        .emoji-reactions__count.is-selected { border-color: #E9C8C2; background: #F9EAE7; color: #8E392F; }
        .emoji-reactions__add { width: 31px; padding: 0; border-style: dashed; background: var(--color-card); color: var(--color-muted-foreground); font-size: 20px; cursor: pointer; }
        .emoji-reactions__add:hover:not(:disabled), .emoji-reactions__picker button:hover:not(:disabled) { background: var(--color-muted); }
        button:focus-visible { outline: 3px solid var(--color-ring); outline-offset: 2px; }
        button:disabled { cursor: default; }
        .emoji-reactions__hint, .emoji-reactions__status, .emoji-reactions__error { margin: 0; font-size: 12px; line-height: 18px; }
        .emoji-reactions__hint, .emoji-reactions__status { color: var(--color-muted-foreground); }
        .emoji-reactions__error { color: var(--color-destructive); }
        .emoji-reactions__picker { display: flex; flex-wrap: wrap; gap: 5px; padding: 6px; border: 1px solid var(--color-border); border-radius: 10px; background: var(--color-card); box-shadow: 0 4px 12px rgba(34,42,48,.08); }
        .emoji-reactions__picker button { display: inline-flex; align-items: center; gap: 5px; min-height: 34px; padding: 4px 8px; border: 0; border-radius: 6px; background: transparent; cursor: pointer; }
        .emoji-reactions__option-name { font-size: 12px; }
        @media (max-width: 420px) { .emoji-reactions__option-name { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; } }
      `}</style>
    </section>
  )
}
