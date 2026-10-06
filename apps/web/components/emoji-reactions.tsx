'use client'

import { useState } from 'react'
import { apiRequest } from '@/lib/api-client'

export type KudosReaction = {
  emoji: string
  count: number
  selected?: boolean
  label?: string
}

type EmojiReactionsProps = {
  kudosId: string
  reactions?: KudosReaction[]
  selectedEmoji?: string | null
  signedIn?: boolean
}

// The product has no prescribed catalog; keep this small set keyboard-operable and
// allow only one successful add for each member and post.
const EMOJI_CHOICES = ['👏', '❤️', '🙌', '💡', '🙏']

export function EmojiReactions({ kudosId, reactions = [], selectedEmoji, signedIn = true }: EmojiReactionsProps) {
  const [counts, setCounts] = useState<KudosReaction[]>(reactions)
  const [chosenEmoji, setChosenEmoji] = useState<string | null>(selectedEmoji ?? reactions.find((reaction) => reaction.selected)?.emoji ?? null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function addReaction(emoji: string) {
    if (!signedIn || chosenEmoji || updating) return
    setUpdating(true)
    setError('')
    setNotice('')
    try {
      await apiRequest(`/kudos/${encodeURIComponent(kudosId)}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ emoji }),
      })
      setCounts((current) => {
        const existing = current.find((reaction) => reaction.emoji === emoji)
        if (existing) return current.map((reaction) => reaction.emoji === emoji ? { ...reaction, count: reaction.count + 1, selected: true } : reaction)
        return [...current, { emoji, count: 1, selected: true }]
      })
      setChosenEmoji(emoji)
      setPickerOpen(false)
      setNotice('Reaction added.')
    } catch {
      setError("Couldn't add your reaction. Try again.")
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="reaction-area">
      <div className="reaction-row" role="group" aria-label="Reactions" aria-busy={updating}>
        {counts.map(({ emoji, count, label, selected }) => {
          const isSelected = selected || chosenEmoji === emoji
          return (
            <button
              key={emoji}
              type="button"
              className={`reaction ${isSelected ? 'reaction--selected' : ''}`}
              aria-label={`${emoji} ${count} ${count === 1 ? 'reaction' : 'reactions'}${isSelected ? ', selected' : ''}`}
              aria-pressed={isSelected}
              disabled={!signedIn || Boolean(chosenEmoji) || updating}
              onClick={() => void addReaction(emoji)}
            >
              <span aria-hidden="true">{emoji}</span><span className="count">{count}</span>
              {label && <span className="sr-only">{label}</span>}
            </button>
          )
        })}
        {!chosenEmoji && (
          <button
            type="button"
            className="add-reaction"
            aria-label="Add reaction"
            aria-expanded={pickerOpen}
            aria-haspopup="true"
            disabled={!signedIn || updating}
            onClick={() => { setPickerOpen((open) => !open); setError('') }}
          >+</button>
        )}
        {updating && <span className="reaction-progress" role="status">Adding reaction…</span>}
      </div>
      {pickerOpen && !chosenEmoji && (
        <div className="emoji-picker" role="group" aria-label="Choose one emoji reaction">
          {EMOJI_CHOICES.map((emoji) => (
            <button key={emoji} type="button" aria-label={`Add ${emoji} reaction`} disabled={updating} onClick={() => void addReaction(emoji)}>{emoji}</button>
          ))}
        </div>
      )}
      {!signedIn && <p className="reaction-hint">Sign in to add a reaction.</p>}
      {error && <p className="reaction-error" role="alert">{error}</p>}
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{notice}</span>
      <style jsx>{`
        .reaction-area { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; }
        .reaction-row { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; }
        .reaction { min-height: 30px; display: inline-flex; align-items: center; gap: 6px; padding: 0 9px; border: 1px solid #E6E4DE; border-radius: 999px; background: #F7F6F2; color: #41494D; font-size: 13px; cursor: pointer; }
        .reaction:hover:not(:disabled), .add-reaction:hover:not(:disabled) { border-color: var(--color-primary); }
        .reaction:disabled { cursor: default; }
        .reaction--selected { border-color: #E9C8C2; background: #F9EAE7; color: #9E3D34; }
        .count { color: #5E676B; font-size: 12px; font-weight: 600; }
        .add-reaction { width: 30px; height: 30px; display: grid; place-items: center; border: 1px dashed #C9C9C2; border-radius: 50%; background: #fff; color: #70797D; cursor: pointer; }
        .emoji-picker { display: flex; gap: 6px; padding: 7px; border: 1px solid var(--color-border); border-radius: 10px; background: var(--color-card); box-shadow: 0 4px 12px rgba(34,42,48,.08); }
        .emoji-picker button { width: 36px; height: 36px; border: 0; border-radius: 7px; background: transparent; font-size: 20px; cursor: pointer; }
        .emoji-picker button:hover:not(:disabled) { background: var(--color-muted); }
        .reaction-progress, .reaction-hint { margin: 0; color: var(--color-muted-foreground); font-size: 12px; }
        .reaction-error { margin: 0; color: var(--color-destructive); font-size: 13px; }
        .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
      `}</style>
    </div>
  )
}
