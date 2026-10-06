'use client'

import { useEffect, useRef } from 'react'

export type HideKudosDialogProps = {
  open: boolean
  author: string
  recipient: string
  message: string
  submitting: boolean
  error?: string
  onCancel: () => void
  onConfirm: () => void
}

export function HideKudosDialog({
  open,
  author,
  recipient,
  message,
  submitting,
  error,
  onCancel,
  onConfirm,
}: HideKudosDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    cancelRef.current?.focus()
    return () => previousFocus.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape' && !submitting) {
        event.preventDefault()
        onCancel()
      }
      if (event.key === 'Tab') {
        const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled)')
        if (!controls?.length) return
        const first = controls[0]
        const last = controls[controls.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, submitting, onCancel])

  if (!open) return null

  return (
    <div className="dialog-backdrop">
      <div
        ref={dialogRef}
        className="hide-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="hide-dialog-title"
        aria-describedby="hide-dialog-description hide-dialog-message"
      >
        <p className="eyebrow">Team lead action</p>
        <h2 id="hide-dialog-title">Hide this kudos?</h2>
        <p id="hide-dialog-description" className="target-description">
          This will remove the kudos from <strong>{author}</strong> to <strong>{recipient}</strong> from the board for everyone.
        </p>
        <blockquote id="hide-dialog-message">{message}</blockquote>
        {error && <p className="dialog-error" role="alert">{error}</p>}
        {submitting && <p className="progress" role="status">Hiding kudos…</p>}
        <div className="dialog-actions">
          <button ref={cancelRef} type="button" className="cancel-button" disabled={submitting} onClick={onCancel}>Cancel</button>
          <button type="button" className="confirm-button" disabled={submitting} aria-busy={submitting} onClick={onConfirm}>
            {submitting ? 'Hiding…' : error ? 'Retry hide' : 'Hide kudos'}
          </button>
        </div>
      </div>
      <style jsx>{`
        .dialog-backdrop { position: fixed; inset: 0; z-index: 20; display: grid; place-items: center; padding: 20px; background: rgba(34,42,48,.42); }
        .hide-dialog { width: min(100%, 460px); padding: 26px; border: 1px solid var(--color-border); border-radius: 16px; background: var(--color-card); color: var(--color-foreground); box-shadow: 0 16px 48px rgba(34,42,48,.18); }
        .eyebrow { margin: 0 0 6px; color: var(--color-muted-foreground); font-size: 12px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
        h2 { margin: 0; font-size: 22px; line-height: 30px; font-weight: 600; }
        .target-description { margin: 12px 0; line-height: 24px; }
        blockquote { margin: 0; padding: 12px 14px; border-left: 3px solid var(--color-border); border-radius: 0 6px 6px 0; background: var(--color-muted); color: var(--color-muted-foreground); font-size: 14px; line-height: 21px; }
        .dialog-error, .progress { margin: 12px 0 0; font-size: 13px; }
        .dialog-error { color: var(--color-destructive); }
        .progress { color: var(--color-muted-foreground); }
        .dialog-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; }
        .dialog-actions button { min-height: 40px; padding: 8px 15px; border-radius: 8px; font: 500 14px/20px var(--font-sans); cursor: pointer; }
        .cancel-button { border: 1px solid var(--color-border); background: var(--color-card); color: var(--color-foreground); }
        .confirm-button { border: 1px solid var(--color-destructive); background: var(--color-destructive); color: #fff; }
        .dialog-actions button:disabled { opacity: .65; cursor: not-allowed; }
        .dialog-actions button:focus-visible { outline: 3px solid var(--color-ring); outline-offset: 3px; }
        @media (max-width: 480px) { .hide-dialog { padding: 22px 18px; } }
      `}</style>
    </div>
  )
}
