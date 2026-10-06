'use client'

import { useRef, useState } from 'react'
import { apiRequest } from '../lib/api-client'

export type ReactionCount = {
  emoji: string
  count: number
  selected?: boolean
  label?: string
}

const EMOJI_OPTIONS = ['👏', '❤️', '🙌', '✨', '💡']

type EmojiReactionsProps = {
  kudosId: string
  reactions?: ReactionCount[]
  signedIn: boolean
}

export function EmojiReactions({ kudosId, reactions = [], signedIn }: EmojiReactionsProps) {
  const [counts, setCounts] = useState(reactions)
  const [selectedEmoji, setSelectedEmoji] = useState(reactions.find((reaction) => reaction.selected)?.emoji ?? null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [updatingEmoji, setUpdatingEmoji] = useState<string | null>(null)
  const [error, setError] = useState('')
  const submissionLock = useRef(false)

  async function addReaction(emoji: string) {
    if (!signedIn || selectedEmoji || submissionLock.current) return
    submissionLock.current = true
    setUpdatingEmoji(emoji)
    setError('')
    try {
      const added = await apiRequest<{ emoji?: string }>(`/kudos/${encodeURIComponent(kudosId)}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ emoji }),
      })
      const addedEmoji = added?.emoji ?? emoji
      setCounts((current) => {
        const existing = current.find((reaction) => reaction.emoji === addedEmoji)
        return existing
          ? current.map((reaction) => reaction.emoji === addedEmoji ? { ...reaction, count: reaction.count + 1, selected: true } : reaction)
          : [...current, { emoji: addedEmoji, count: 1, selected: true }]
      })
      setSelectedEmoji(addedEmoji)
      setPickerOpen(false)
    } catch {
      setError("Couldn't add your reaction. Try again.")
    } finally {
      submissionLock.current = false
      setUpdatingEmoji(null)
    }
  }

  return (
    <div className="emoji-reactions" aria-label="Kudos reactions">
      <div className="reaction-list" aria-label="Reaction counts">
        {counts.map((reaction) => {
          const selected = selectedEmoji === reaction.emoji || Boolean(reaction.selected && !selectedEmoji)
          return (
            <button
              className={`reaction-count${selected ? ' reaction-count--selected' : ''}`}
              type="button"
              key={reaction.emoji}
              aria-label={`${reaction.emoji} ${reaction.count} ${reaction.count === 1 ? 'reaction' : 'reactions'}${selected ? ', selected' : ''}`}
              aria-pressed={selected}
              disabled
            >
              <span aria-hidden="true">{reaction.emoji}</span><span>{reaction.count}</span>
            </button>
          )
        })}
      </div>
      {!selectedEmoji && (
        <div className="reaction-picker">
          <button
            type="button"
            className="add-reaction"
            aria-label="Add reaction"
            aria-expanded={pickerOpen}
            aria-haspopup="true"
            disabled={!signedIn || Boolean(updatingEmoji)}
            onClick={() => { setPickerOpen((open) => !open); setError('') }}
          >
            <span aria-hidden="true">＋</span>
          </button>
          {pickerOpen && (
            <div className="emoji-options" role="group" aria-label="Choose an emoji reaction">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  aria-label={`React with ${emoji}`}
                  disabled={Boolean(updatingEmoji)}
                  aria-busy={updatingEmoji === emoji || undefined}
                  onClick={() => void addReaction(emoji)}
                >
                  {updatingEmoji === emoji ? 'Adding…' : emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <p className="reaction-status" role="status" aria-live="polite">
        {updatingEmoji ? 'Adding reaction…' : error || (selectedEmoji ? 'Reaction added.' : !signedIn ? 'Sign in to add a reaction.' : '')}
      </p>
      <style jsx>{`
        .emoji-reactions { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
        .reaction-list { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; }
        .reaction-count { min-height: 30px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 0 9px; border: 1px solid #E6E4DE; border-radius: 999px; background: #F7F6F2; color: #41494D; font-size: 13px; }
        .reaction-count--selected { background: #F9EAE7; border-color: #E9C8C2; color: #9E3D34; }
        .reaction-count:disabled { opacity: 1; cursor: default; }
        .reaction-picker { position: relative; }
        .add-reaction { width: 32px; height: 32px; display: grid; place-items: center; border: 1px dashed #C9C9C2; border-radius: 50%; background: #fff; color: #626A70; font-size: 20px; line-height: 1; cursor: pointer; }
        .add-reaction:hover:not(:disabled) { background: var(--color-muted); }
        button:focus-visible { outline: 3px solid var(--color-ring); outline-offset: 2px; }
        button:disabled { cursor: not-allowed; opacity: .62; }
        .emoji-options { position: absolute; z-index: 2; left: 0; bottom: calc(100% + 8px); display: flex; gap: 4px; padding: 6px; border: 1px solid var(--color-border); border-radius: 10px; background: #fff; box-shadow: 0 4px 16px rgba(34,42,48,.14); }
        .emoji-options button { width: 36px; height: 36px; border: 0; border-radius: 6px; background: transparent; font-size: 20px; cursor: pointer; }
        .emoji-options button:hover:not(:disabled) { background: var(--color-muted); }
        .reaction-status { flex-basis: 100%; min-height: 0; margin: 0; color: var(--color-muted-foreground); font-size: 12px; line-height: 18px; }
        .reaction-status:empty { display: none; }
        @media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition: none !important; } }
      `}</style>
    </div>
  )
}
