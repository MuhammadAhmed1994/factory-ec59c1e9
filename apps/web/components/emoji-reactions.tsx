'use client'

import { useEffect, useState } from 'react'
import { apiRequest } from '@/lib/api-client'

type Reaction = { emoji: string; count: number; selected?: boolean; label?: string }
type EmojiReactionsProps = {
  kudosId: string
  reactions?: Reaction[]
  signedIn?: boolean
  onReactionAdded?: (reaction: Reaction) => void
}

const EMOJI_OPTIONS = ['👏', '❤️', '🙌', '✨', '💡', '🙏']
const EMPTY_REACTIONS: Reaction[] = []

export function EmojiReactions({ kudosId, reactions = EMPTY_REACTIONS, signedIn = true, onReactionAdded }: EmojiReactionsProps) {
  const [items, setItems] = useState(reactions)
  const [selectedEmoji, setSelectedEmoji] = useState(reactions.find((reaction) => reaction.selected)?.emoji)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setItems(reactions)
    setSelectedEmoji(reactions.find((reaction) => reaction.selected)?.emoji)
  }, [reactions])

  async function addReaction(emoji: string) {
    if (!signedIn || updating || selectedEmoji) return
    setUpdating(true)
    setError('')
    try {
      await apiRequest(`/kudos/${encodeURIComponent(kudosId)}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ emoji }),
      })
      setItems((current) => {
        const found = current.some((item) => item.emoji === emoji)
        return found
          ? current.map((item) => item.emoji === emoji ? { ...item, count: item.count + 1, selected: true } : item)
          : [...current, { emoji, count: 1, selected: true }]
      })
      setSelectedEmoji(emoji)
      setPickerOpen(false)
      onReactionAdded?.({ emoji, count: (items.find((item) => item.emoji === emoji)?.count ?? 0) + 1, selected: true })
    } catch {
      setError('Couldn’t add your reaction. Try again.')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="emoji-reactions" aria-busy={updating}>
      <div className="reaction-list" aria-label="Reactions">
        {items.map((reaction) => {
          const selected = Boolean(reaction.selected || selectedEmoji === reaction.emoji)
          return (
            <button key={reaction.emoji} type="button" className={`reaction-count${selected ? ' reaction-count--selected' : ''}`} aria-label={`${reaction.emoji} ${reaction.count} reactions${selected ? ', selected' : ''}`} aria-pressed={selected} disabled>
              <span aria-hidden="true">{reaction.emoji}</span><span>{reaction.count}</span>
            </button>
          )
        })}
        {!selectedEmoji && (
          <button type="button" className="add-reaction" aria-label="Add reaction" aria-expanded={pickerOpen} onClick={() => setPickerOpen((open) => !open)} disabled={!signedIn || updating}>
            <span aria-hidden="true">＋</span>
          </button>
        )}
      </div>
      {!signedIn && <p className="reaction-feedback">Sign in to add a reaction.</p>}
      {updating && <p className="reaction-feedback" role="status">Adding reaction…</p>}
      {error && <p className="reaction-error" role="alert">{error}</p>}
      {pickerOpen && !selectedEmoji && (
        <div className="emoji-picker" role="group" aria-label="Choose one reaction">
          {EMOJI_OPTIONS.map((emoji) => (
            <button key={emoji} type="button" aria-label={`Add ${emoji} reaction`} onClick={() => void addReaction(emoji)} disabled={updating}>
              {emoji}
            </button>
          ))}
        </div>
      )}
      <style jsx>{`
        .emoji-reactions { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; }
        .reaction-list, .emoji-picker { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; }
        .reaction-count { display: inline-flex; align-items: center; gap: 6px; min-height: 30px; padding: 3px 9px; border: 1px solid var(--color-border); border-radius: 999px; background: var(--color-background); color: var(--color-foreground); font-size: 13px; }
        .reaction-count--selected { border-color: var(--color-primary); background: #F9EDEA; }
        .add-reaction, .emoji-picker button { display: inline-grid; place-items: center; min-width: 32px; min-height: 32px; border: 1px solid var(--color-border); border-radius: 999px; background: var(--color-card); cursor: pointer; }
        .add-reaction { color: var(--color-muted-foreground); font-size: 19px; }
        .emoji-picker { padding: 6px; border: 1px solid var(--color-border); border-radius: 10px; background: var(--color-card); box-shadow: 0 4px 12px rgba(34,42,48,.08); }
        .emoji-picker button { border-color: transparent; font-size: 18px; }
        .add-reaction:hover:not(:disabled), .emoji-picker button:hover:not(:disabled) { background: var(--color-muted); }
        button:focus-visible { outline: 3px solid var(--color-ring); outline-offset: 2px; }
        button:disabled { cursor: not-allowed; opacity: .82; }
        .reaction-feedback, .reaction-error { margin: 0; color: var(--color-muted-foreground); font-size: 12px; }
        .reaction-error { color: var(--color-destructive); }
      `}</style>
    </div>
  )
}
