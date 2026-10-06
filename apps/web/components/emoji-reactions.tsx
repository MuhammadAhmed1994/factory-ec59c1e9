'use client'

import { useState } from 'react'

export type ReactionCount = {
  emoji: string
  count: number
}

type EmojiReactionsProps = {
  reactions?: ReactionCount[]
  currentUserEmoji?: string | null
  disabled?: boolean
  updating?: boolean
  error?: string | null
  onAdd: (emoji: string) => void | Promise<void>
}

const EMOJI_CHOICES = ['👏', '❤️', '🙌', '💡', '🙏', '🎉']

export function EmojiReactions({
  reactions = [],
  currentUserEmoji = null,
  disabled = false,
  updating = false,
  error = null,
  onAdd,
}: EmojiReactionsProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const hasReacted = Boolean(currentUserEmoji)
  const unavailable = disabled || updating || hasReacted

  async function addReaction(emoji: string) {
    if (unavailable) return
    setPickerOpen(false)
    await onAdd(emoji)
  }

  return (
    <div className="emoji-reactions">
      <div className="emoji-reactions__row" role="group" aria-label="Reactions">
        {reactions.map(({ emoji, count }) => {
          const selected = currentUserEmoji === emoji
          return (
            <button
              className={`emoji-reactions__item${selected ? ' emoji-reactions__item--selected' : ''}`}
              key={emoji}
              type="button"
              disabled
              aria-label={`${emoji}, ${count} ${count === 1 ? 'reaction' : 'reactions'}${selected ? ', selected' : ''}`}
              aria-pressed={selected}
            >
              <span aria-hidden="true">{emoji}</span>
              <span className="emoji-reactions__count">{count}</span>
            </button>
          )
        })}
        {!hasReacted && (
          <button
            type="button"
            className="emoji-reactions__add"
            aria-label="Add reaction"
            aria-expanded={pickerOpen}
            aria-haspopup="true"
            disabled={disabled || updating}
            onClick={() => setPickerOpen((open) => !open)}
          >
            {updating ? '…' : '+'}
          </button>
        )}
      </div>
      {pickerOpen && !unavailable && (
        <div className="emoji-reactions__picker" role="group" aria-label="Choose one reaction">
          {EMOJI_CHOICES.map((emoji) => (
            <button key={emoji} type="button" aria-label={`React with ${emoji}`} onClick={() => void addReaction(emoji)}>
              {emoji}
            </button>
          ))}
        </div>
      )}
      {updating && <span className="emoji-reactions__status" role="status">Adding reaction…</span>}
      {error && <span className="emoji-reactions__error" role="alert">{error}</span>}
      {disabled && !hasReacted && <span className="emoji-reactions__status">Sign in to add a reaction.</span>}
      <style jsx>{`
        .emoji-reactions { position: relative; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
        .emoji-reactions__row { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; }
        .emoji-reactions__item, .emoji-reactions__add { min-height: 32px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 0 9px; color: var(--color-foreground); background: var(--color-muted); border: 1px solid var(--color-border); border-radius: 999px; font: inherit; font-size: 13px; }
        .emoji-reactions__item:disabled { opacity: 1; cursor: default; }
        .emoji-reactions__item--selected { color: #8E392F; background: #F9EAE7; border-color: #E9C8C2; }
        .emoji-reactions__count { color: var(--color-muted-foreground); font-size: 12px; font-weight: 600; }
        .emoji-reactions__add { width: 32px; padding: 0; cursor: pointer; background: var(--color-card); border-style: dashed; font-size: 18px; }
        .emoji-reactions__add:hover:not(:disabled), .emoji-reactions__picker button:hover { background: var(--color-muted); }
        .emoji-reactions__add:disabled { cursor: not-allowed; opacity: .65; }
        .emoji-reactions__picker { position: absolute; z-index: 2; top: calc(100% + 8px); left: 0; display: flex; gap: 4px; padding: 8px; background: var(--color-card); border: 1px solid var(--color-border); border-radius: 10px; box-shadow: 0 8px 24px rgba(34,42,48,.14); }
        .emoji-reactions__picker button { width: 36px; height: 36px; padding: 0; border: 0; border-radius: 8px; background: transparent; cursor: pointer; font-size: 19px; }
        .emoji-reactions__picker button:focus-visible, .emoji-reactions__add:focus-visible { outline: 3px solid var(--color-ring); outline-offset: 2px; }
        .emoji-reactions__status, .emoji-reactions__error { font-size: 12px; }
        .emoji-reactions__status { color: var(--color-muted-foreground); }
        .emoji-reactions__error { color: #A3312C; }
        @media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition: none !important; } }
      `}</style>
    </div>
  )
}
