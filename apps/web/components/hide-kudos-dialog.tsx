'use client'

import { useEffect, useRef, type KeyboardEvent } from 'react'

export type HideKudosDialogProps = {
  open: boolean
  author: string
  recipient: string
  message: string
  submitting?: boolean
  error?: string | null
  onCancel: () => void
  onConfirm: () => void
}

export function HideKudosDialog({
  open,
  author,
  recipient,
  message,
  submitting = false,
  error = null,
  onCancel,
  onConfirm,
}: HideKudosDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) cancelRef.current?.focus()
  }, [open])

  if (!open) return null

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && !submitting) {
      event.preventDefault()
      onCancel()
      return
    }
    if (event.key !== 'Tab') return

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), [href], input:not(:disabled), [tabindex]:not([tabindex="-1"])',
    )
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
    <div className="hide-dialog__backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !submitting) onCancel()
    }}>
      <div
        className="hide-dialog"
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-busy={submitting}
        aria-labelledby="hide-dialog-title"
        aria-describedby="hide-dialog-description"
        onKeyDown={onKeyDown}
      >
        <p className="hide-dialog__eyebrow">Team lead action</p>
        <h2 id="hide-dialog-title">Hide this kudos?</h2>
        <p id="hide-dialog-description">This will remove the kudos from the board for everyone viewing it.</p>
        <div className="hide-dialog__target">
          <p><strong>{author}</strong> recognized <strong>{recipient}</strong></p>
          <blockquote>{message}</blockquote>
        </div>
        {error && <p className="hide-dialog__error" role="alert">{error}</p>}
        {submitting && <p className="hide-dialog__progress" role="status">Hiding kudos…</p>}
        <div className="hide-dialog__actions">
          <button ref={cancelRef} type="button" className="hide-dialog__cancel" onClick={onCancel} disabled={submitting}>Cancel</button>
          <button type="button" className="hide-dialog__confirm" onClick={onConfirm} disabled={submitting}>
            {submitting ? 'Hiding…' : error ? 'Try again' : 'Hide kudos'}
          </button>
        </div>
      </div>
      <style jsx>{`
        .hide-dialog__backdrop { position: fixed; inset: 0; z-index: 20; display: grid; place-items: center; padding: 20px; background: rgba(34,42,48,.48); }
        .hide-dialog { width: min(100%, 480px); max-height: min(90vh, 700px); overflow-y: auto; padding: 24px; border: 1px solid var(--color-border); border-radius: 16px; background: var(--color-card); color: var(--color-foreground); box-shadow: 0 16px 48px rgba(34,42,48,.18); }
        .hide-dialog__eyebrow { margin: 0 0 6px; color: var(--color-muted-foreground); font-size: 12px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
        h2 { margin: 0; font-size: 22px; line-height: 30px; }
        #hide-dialog-description { margin: 10px 0 16px; color: var(--color-muted-foreground); font-size: 14px; line-height: 21px; }
        .hide-dialog__target { padding: 14px; border: 1px solid var(--color-border); border-radius: 10px; background: var(--color-background); }
        .hide-dialog__target p { margin: 0 0 8px; font-size: 14px; }
        blockquote { margin: 0; color: var(--color-muted-foreground); font-size: 14px; line-height: 21px; }
        .hide-dialog__error { color: #A3312C; font-size: 14px; }
        .hide-dialog__progress { color: var(--color-muted-foreground); font-size: 14px; }
        .hide-dialog__actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; }
        .hide-dialog__actions button { min-height: 40px; padding: 0 16px; border: 1px solid var(--color-border); border-radius: 8px; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
        .hide-dialog__actions button:focus-visible { outline: 3px solid var(--color-ring); outline-offset: 2px; }
        .hide-dialog__actions button:disabled { opacity: .65; cursor: not-allowed; }
        .hide-dialog__cancel { color: var(--color-foreground); background: var(--color-card); }
        .hide-dialog__confirm { border-color: #A3312C !important; color: #fff; background: #A3312C; }
        @media (max-width: 480px) { .hide-dialog { padding: 20px; } }
      `}</style>
    </div>
  )
}
