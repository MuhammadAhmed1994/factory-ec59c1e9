'use client'

import { Button } from './ui/button'

type KudosReaction = {
  emoji: string
  count: number
  label?: string
  selected?: boolean
}

export type KudosCardProps = {
  author: string
  recipient: string
  message: string
  timestamp: string | Date
  reactions?: KudosReaction[]
  variant?: 'standard' | 'new' | 'lead-moderation'
  onReact?: (emoji: string) => void
  onHide?: () => void
  reacting?: boolean
  hiding?: boolean
  className?: string
}

export function KudosCard({
  author,
  recipient,
  message,
  timestamp,
  reactions = [],
  variant = 'standard',
  onReact,
  onHide,
  reacting = false,
  hiding = false,
  className = '',
}: KudosCardProps) {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
  const dateTime = Number.isNaN(date.getTime()) ? undefined : date.toISOString()
  const displayTime = Number.isNaN(date.getTime()) ? String(timestamp) : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
  const newPost = variant === 'new'

  return (
    <article className={`kudos-card kudos-card--${variant} ${className}`.trim()} aria-label={`Kudos for ${recipient}`}>
      <div className="kudos-card__topline">
        <div className="kudos-card__people">
          <span className="kudos-card__author">{author}</span>
          <span className="kudos-card__connector" aria-hidden="true">recognized</span>
          <h2 className="kudos-card__recipient">{recipient}</h2>
        </div>
        <time className="kudos-card__time" dateTime={dateTime}>{displayTime}</time>
      </div>
      {newPost && <p className="kudos-card__new-label"><span aria-hidden="true">✦</span> New kudos</p>}
      <p className="kudos-card__message">{message}</p>
      <div className="kudos-card__footer">
        {reactions.length > 0 ? (
          <div className="kudos-card__reactions" aria-label="Reactions">
            {reactions.map((reaction, index) => (
              <button
                key={`${reaction.emoji}-${index}`}
                className={`reaction ${reaction.selected ? 'reaction--selected' : ''}`}
                type="button"
                onClick={() => onReact?.(reaction.emoji)}
                disabled={!onReact || reacting}
                aria-label={`${reaction.label ?? reaction.emoji} reaction, ${reaction.count}${reaction.selected ? ', selected' : ''}`}
                aria-pressed={reaction.selected ?? false}
              >
                <span aria-hidden="true">{reaction.emoji}</span><span>{reaction.count}</span>
              </button>
            ))}
          </div>
        ) : <span className="kudos-card__no-reactions">No reactions yet</span>}
        {variant === 'lead-moderation' && onHide && (
          <Button variant="quiet" className="kudos-card__hide" onClick={onHide} disabled={hiding} loading={hiding} aria-label={`Hide kudos for ${recipient}`}>
            Hide kudos
          </Button>
        )}
      </div>
      <style jsx>{`
        .kudos-card { padding: 20px 22px; border: 1px solid var(--color-border); border-radius: var(--radius-card); background: var(--color-card); color: var(--color-foreground); box-shadow: 0 1px 3px rgba(34,42,48,.06), 0 4px 12px rgba(34,42,48,.04); transition: border-color var(--motion-base) var(--ease-enter), background-color var(--motion-base) var(--ease-enter); }
        .kudos-card--new { border-color: #D9948D; background: #FFFCFB; }
        .kudos-card--lead-moderation { border-left: 3px solid var(--color-info); }
        .kudos-card__topline { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
        .kudos-card__people { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px; min-width: 0; }
        .kudos-card__author { color: var(--color-muted-foreground); font-size: 14px; font-weight: 500; }
        .kudos-card__connector { color: var(--color-muted-foreground); font-size: 12px; }
        .kudos-card__recipient { margin: 0; color: var(--color-foreground); font-size: 18px; font-weight: 600; line-height: 26px; }
        .kudos-card__time { flex-shrink: 0; color: var(--color-muted-foreground); font-size: 12px; line-height: 18px; }
        .kudos-card__new-label { display: flex; align-items: center; gap: 6px; margin: 12px 0 -4px; color: #9F3C34; font-size: 12px; font-weight: 600; }
        .kudos-card__message { margin: 16px 0 20px; white-space: pre-wrap; overflow-wrap: anywhere; font-size: 16px; line-height: 24px; }
        .kudos-card__footer { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding-top: 12px; border-top: 1px solid var(--color-border); }
        .kudos-card__reactions { display: flex; flex-wrap: wrap; gap: 8px; }
        .reaction { display: inline-flex; align-items: center; gap: 6px; min-height: 34px; padding: 4px 10px; border: 1px solid var(--color-border); border-radius: 999px; background: var(--color-background); color: var(--color-foreground); font-size: 14px; cursor: pointer; transition: background-color var(--motion-fast) var(--ease-enter), border-color var(--motion-fast) var(--ease-enter); }
        .reaction:hover:not(:disabled) { background: var(--color-muted); border-color: var(--color-muted-foreground); }
        .reaction:focus-visible { outline: 3px solid var(--color-ring); outline-offset: 2px; }
        .reaction:disabled { cursor: default; }
        .reaction--selected { border-color: var(--color-primary); background: #F9EDEA; }
        .kudos-card__no-reactions { color: var(--color-muted-foreground); font-size: 12px; }
        :global(.kudos-card__hide) { color: #A3312C; }
        @media (max-width: 560px) { .kudos-card { padding: 16px; } .kudos-card__topline { flex-direction: column; gap: 4px; } }
        @media (prefers-reduced-motion: reduce) { .kudos-card, .reaction { transition: none; } }
      `}</style>
    </article>
  )
}
