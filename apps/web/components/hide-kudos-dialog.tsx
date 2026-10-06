'use client'

import { useEffect, useRef, type KeyboardEvent } from 'react'

type HideKudosDialogProps = {
  open: boolean
  target: string
  submitting: boolean
  error?: string | null
  onConfirm: () => void
  onCancel: () => void
}

export function HideKudosDialog({ open, target, submitting, error, onConfirm, onCancel }: HideKudosDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    cancelRef.current?.focus()
    return () => previouslyFocused?.focus()
  }, [open])

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      if (!submitting) onCancel()
      return
    }
    if (event.key !== 'Tab') return

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled)')
    if (!focusable?.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  if (!open) return null

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) onCancel() }}>
      <div
        className="hide-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="hide-dialog-title"
        aria-describedby="hide-dialog-description"
        ref={dialogRef}
        onKeyDown={handleKeyDown}
      >
        <p className="hide-dialog__eyebrow">Team lead moderation</p>
        <h2 id="hide-dialog-title">Hide this kudos?</h2>
        <p id="hide-dialog-description">This will remove the kudos for <strong>{target}</strong> from the board for everyone viewing it. This action can’t be undone.</p>
        {error && <p className="hide-dialog__error" role="alert">{error}</p>}
        {submitting && <p className="hide-dialog__progress" role="status">Hiding kudos…</p>}
        <div className="hide-dialog__actions">
          <button ref={cancelRef} className="dialog-button dialog-button--secondary" type="button" onClick={onCancel} disabled={submitting}>Cancel</button>
          <button className="dialog-button dialog-button--destructive" type="button" onClick={onConfirm} disabled={submitting} aria-busy={submitting}>
            {submitting ? 'Hiding…' : 'Hide kudos'}
          </button>
        </div>
      </div>
      <style jsx>{`
        .dialog-backdrop { position: fixed; z-index: 20; inset: 0; display: grid; place-items: center; padding: 20px; background: rgba(34,42,48,.48); }
        .hide-dialog { width: min(100%, 440px); padding: 24px; border: 1px solid var(--color-border); border-radius: 16px; background: var(--color-card); color: var(--color-foreground); box-shadow: 0 16px 48px rgba(34,42,48,.18); }
        .hide-dialog__eyebrow { margin: 0 0 7px; color: var(--color-destructive); font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; }
        h2 { margin: 0; font-size: 20px; line-height: 28px; }
        #hide-dialog-description { margin: 12px 0 20px; color: var(--color-muted-foreground); font-size: 14px; line-height: 21px; }
        .hide-dialog__error { margin: 0 0 14px; color: var(--color-destructive); font-size: 14px; }
        .hide-dialog__progress { margin: 0 0 14px; color: var(--color-muted-foreground); font-size: 14px; }
        .hide-dialog__actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 8px; }
        .dialog-button { min-height: 42px; padding: 9px 16px; border: 1px solid transparent; border-radius: 8px; font: 500 14px/20px var(--font-sans); cursor: pointer; }
        .dialog-button:focus-visible { outline: 3px solid var(--color-ring); outline-offset: 3px; }
        .dialog-button:disabled { cursor: not-allowed; opacity: .62; }
        .dialog-button--secondary { border-color: var(--color-border); background: var(--color-card); color: var(--color-foreground); }
        .dialog-button--secondary:hover:not(:disabled) { background: var(--color-muted); }
        .dialog-button--destructive { background: var(--color-destructive); color: #fff; }
        .dialog-button--destructive:hover:not(:disabled) { background: #842822; }
        @media (max-width: 420px) { .dialog-button { flex: 1; } }
      `}</style>
    </div>
  )
}
