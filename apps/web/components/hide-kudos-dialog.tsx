'use client'

import { useEffect, useRef, type KeyboardEvent } from 'react'

export type HideKudosDialogProps = {
  open: boolean
  author: string
  recipient: string
  message: string
  submitting?: boolean
  error?: string
  onCancel: () => void
  onConfirm: () => void
}

export function HideKudosDialog({
  open,
  author,
  recipient,
  message,
  submitting = false,
  error,
  onCancel,
  onConfirm,
}: HideKudosDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) cancelRef.current?.focus()
  }, [open])

  if (!open) return null

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      if (!submitting) onCancel()
      return
    }
    if (event.key !== 'Tab') return
    const focusable = [cancelRef.current, confirmRef.current].filter((element): element is HTMLButtonElement => Boolean(element && !element.disabled))
    if (!focusable.length) return
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
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="hide-dialog-title"
        aria-describedby="hide-dialog-description"
        onKeyDown={onKeyDown}
      >
        <p className="eyebrow">Team lead action</p>
        <h2 id="hide-dialog-title">Hide this kudos?</h2>
        <p id="hide-dialog-description">This will remove the kudos from the board for everyone viewing it.</p>
        <div className="target-context">
          <p><strong>{author}</strong> recognized <strong>{recipient}</strong></p>
          <blockquote>{message}</blockquote>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        {submitting && <p className="progress" role="status">Hiding kudos…</p>}
        <div className="actions">
          <button ref={cancelRef} className="cancel-button" type="button" onClick={onCancel} disabled={submitting}>Cancel</button>
          <button ref={confirmRef} className="confirm-button" type="button" onClick={onConfirm} disabled={submitting} aria-busy={submitting} aria-label="Confirm hide kudos">
            {submitting ? 'Hiding…' : 'Hide kudos'}
          </button>
        </div>
      </div>
      <style jsx>{`
        .dialog-backdrop { position: fixed; z-index: 100; inset: 0; display: grid; place-items: center; padding: 20px; background: rgba(34,42,48,.48); }
        .dialog { width: min(100%, 480px); padding: 24px; border: 1px solid var(--color-border); border-radius: 16px; background: var(--color-card); color: var(--color-foreground); box-shadow: 0 16px 48px rgba(34,42,48,.18); }
        .eyebrow { margin: 0 0 6px; color: #A3312C; font-size: 12px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
        h2 { margin: 0; font-size: 22px; line-height: 30px; }
        #hide-dialog-description { margin: 10px 0 16px; color: var(--color-muted-foreground); font-size: 14px; line-height: 21px; }
        .target-context { padding: 12px 14px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-background); font-size: 14px; }
        .target-context p { margin: 0; }
        blockquote { margin: 8px 0 0; color: var(--color-muted-foreground); }
        .error { margin: 14px 0 0; color: #A3312C; font-size: 14px; }
        .progress { margin: 14px 0 0; color: var(--color-muted-foreground); font-size: 14px; }
        .actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px; }
        .actions button { min-height: 42px; padding: 9px 16px; border: 1px solid var(--color-border); border-radius: 8px; font: 500 14px/20px var(--font-sans); cursor: pointer; }
        .actions button:disabled { cursor: wait; opacity: .65; }
        .cancel-button { background: var(--color-card); color: var(--color-foreground); }
        .confirm-button { border-color: #A3312C !important; background: #A3312C; color: #fff; }
        .actions button:focus-visible { outline: 3px solid var(--color-ring); outline-offset: 3px; }
        @media (max-width: 420px) { .dialog { padding: 20px; } .actions button { flex: 1; } }
        @media (prefers-reduced-motion: reduce) { .dialog { animation: none; } }
      `}</style>
    </div>
  )
}
