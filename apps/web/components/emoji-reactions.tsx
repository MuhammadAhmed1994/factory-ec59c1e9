'use client'

import { useId, useState } from 'react'

export type ReactionCount = {
  emoji: string
  count: number
}

export const REACTION_CHOICES = ['👏', '❤️', '🙌', '💡', '🎉', '🙏'] as const

type EmojiReactionsProps = {
  reactions: ReactionCount[]
  selectedEmoji?: string | null
  disabled?: boolean
  updating?: boolean
  error?: string | null
  onAdd: (emoji: string) => void
}

export function EmojiReactions({
  reactions,
  selectedEmoji,
  disabled = false,
  updating = false,
  error,
  onAdd,
}: EmojiReactionsProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerId = useId()
  const unavailable = disabled || updating || Boolean(selectedEmoji)

  function choose(emoji: string) {
    setPickerOpen(false)
    onAdd(emoji)
  }

  return (
    <section className="reaction-control" aria-label="Reactions">
      <div className="reaction-control__counts" aria-label="Reaction counts">
        {reactions.map(({ emoji, count }) => {
          const selected = selectedEmoji === emoji
          return (
            <button
              className={`reaction-chip ${selected ? 'reaction-chip--selected' : ''}`}
              key={emoji}
              type="button"
              disabled
              aria-pressed={selected}
              aria-label={`${emoji} reaction, ${count}${selected ? ', selected' : ''}`}
            >
              <span aria-hidden="true">{emoji}</span><span>{count}</span>
            </button>
          )
        })}
        {!reactions.length && <span className="reaction-control__empty">No reactions yet</span>}
      </div>
      {selectedEmoji ? (
        <p className="reaction-control__note">You’ve added one reaction to this kudos.</p>
      ) : (
        <div className="reaction-control__action">
          <button
            type="button"
            className="reaction-add"
            aria-label="Add reaction"
            aria-expanded={pickerOpen}
            aria-controls={pickerId}
            disabled={unavailable}
            onClick={() => setPickerOpen((open) => !open)}
          >
            Add reaction <span aria-hidden="true">＋</span>
          </button>
          {updating && <span className="reaction-control__feedback" role="status">Adding reaction…</span>}
          {disabled && !updating && <span className="reaction-control__feedback">Sign in to add a reaction.</span>}
          {pickerOpen && !unavailable && (
            <div className="reaction-picker" id={pickerId} role="group" aria-label="Choose one reaction">
              {REACTION_CHOICES.map((emoji) => (
                <button key={emoji} type="button" aria-label={`Add ${emoji} reaction`} onClick={() => choose(emoji)}>
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {error && <p className="reaction-control__error" role="alert">{error}</p>}
      <style jsx>{`
        .reaction-control { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; }
        .reaction-control__counts, .reaction-control__action { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; }
        .reaction-chip { display: inline-flex; align-items: center; gap: 6px; min-height: 30px; padding: 3px 9px; border: 1px solid var(--color-border); border-radius: 999px; background: var(--color-background); color: var(--color-foreground); font-size: 13px; }
        .reaction-chip:disabled { cursor: default; opacity: 1; }
        .reaction-chip--selected { border-color: var(--color-primary); background: #F9EDEA; }
        .reaction-control__empty, .reaction-control__note, .reaction-control__feedback { color: var(--color-muted-foreground); font-size: 12px; }
        .reaction-control__note { margin: 0; }
        .reaction-add, .reaction-picker button { min-height: 34px; border: 1px solid var(--color-border); border-radius: 999px; background: var(--color-card); color: var(--color-foreground); cursor: pointer; }
        .reaction-add { padding: 5px 11px; font-size: 12px; }
        .reaction-add:hover:not(:disabled), .reaction-picker button:hover { background: var(--color-muted); }
        .reaction-add:focus-visible, .reaction-picker button:focus-visible { outline: 3px solid var(--color-ring); outline-offset: 2px; }
        .reaction-add:disabled { cursor: not-allowed; opacity: .65; }
        .reaction-picker { display: flex; flex-wrap: wrap; gap: 5px; }
        .reaction-picker button { width: 36px; font-size: 18px; }
        .reaction-control__error { flex-basis: 100%; margin: 0; color: var(--color-destructive); font-size: 13px; }
      `}</style>
    </section>
  )
}
