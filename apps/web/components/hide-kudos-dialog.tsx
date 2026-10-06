'use client'

import { useEffect, useRef, type KeyboardEvent } from 'react'
import { Button } from './ui/button'

type HideKudosDialogProps = {
  author: string
  recipient: string
  message: string
  submitting: boolean
  error?: string
  onCancel: () => void
  onConfirm: () => void
}

export function HideKudosDialog({ author, recipient, message, submitting, error, onCancel, onConfirm }: HideKudosDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    cancelRef.current?.focus()
    return () => previousFocus.current?.focus()
  }, [])

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
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

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) onCancel() }}>
      <div
        id="hide-kudos-dialog"
        ref={dialogRef}
        className="hide-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="hide-dialog-title"
        aria-describedby="hide-dialog-description hide-dialog-target"
        onKeyDown={onKeyDown}
      >
        <h2 id="hide-dialog-title">Hide this kudos?</h2>
        <p id="hide-dialog-description">This kudos will be removed from the board for everyone viewing it.</p>
        <div className="target-kudos" id="hide-dialog-target">
          <p><strong>{author}</strong> to <strong>{recipient}</strong></p>
          <blockquote>{message}</blockquote>
        </div>
        {error && <p className="dialog-error" role="alert">{error}</p>}
        {submitting && <p className="dialog-progress" role="status" aria-live="polite">Hiding kudos…</p>}
        <div className="dialog-actions">
          <button ref={cancelRef} type="button" className="cancel-button" onClick={onCancel} disabled={submitting}>Cancel</button>
          <Button variant="destructive" onClick={onConfirm} disabled={submitting} loading={submitting}>
            {submitting ? 'Hiding kudos…' : 'Hide kudos'}
          </Button>
        </div>
      </div>
      <style jsx>{`
        .dialog-backdrop { position: fixed; z-index: 50; inset: 0; display: grid; place-items: center; padding: 20px; background: rgba(34,42,48,.48); }
        .hide-dialog { width: min(100%, 480px); padding: 24px; border: 1px solid var(--color-border); border-radius: 16px; background: var(--color-card); color: var(--color-foreground); box-shadow: 0 16px 48px rgba(34,42,48,.18); }
        h2 { margin: 0 0 8px; font-size: 20px; line-height: 28px; font-weight: 600; }
        .hide-dialog > p { margin: 0 0 16px; color: var(--color-muted-foreground); font-size: 14px; line-height: 21px; }
        .target-kudos { padding: 12px 14px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-background); }
        .target-kudos p { margin: 0 0 5px; font-size: 13px; line-height: 19px; }
        blockquote { margin: 0; color: var(--color-muted-foreground); font-size: 13px; line-height: 20px; }
        .dialog-error { color: var(--color-destructive) !important; }
        .dialog-progress { color: var(--color-muted-foreground); }
        .dialog-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px; }
        .cancel-button { min-height: 42px; padding: 9px 16px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-card); color: var(--color-foreground); cursor: pointer; }
        .cancel-button:hover:not(:disabled) { background: var(--color-muted); }
        .cancel-button:focus-visible { outline: 3px solid var(--color-ring); outline-offset: 3px; }
        .cancel-button:disabled { cursor: not-allowed; opacity: .62; }
        @media (max-width: 480px) { .hide-dialog { padding: 20px; } }
      `}</style>
    </div>
  )
}
