'use client'

import { useEffect, useRef, type KeyboardEvent } from 'react'

export type HideKudosTarget = {
  author: string
  recipient: string
  message: string
}

type HideKudosDialogProps = {
  open: boolean
  target: HideKudosTarget
  submitting: boolean
  error?: string
  onCancel: () => void
  onConfirm: () => void
}

export function HideKudosDialog({ open, target, submitting, error, onCancel, onConfirm }: HideKudosDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) cancelRef.current?.focus()
  }, [open])

  if (!open) return null

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancel()
      return
    }
    if (event.key !== 'Tab') return
    const focusable = [cancelRef.current, confirmRef.current].filter((item): item is HTMLButtonElement => item !== null && !item.disabled)
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
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="hide-title" aria-describedby="hide-description" onKeyDown={handleKeyDown}>
        <div className="dialog-icon" aria-hidden="true">!</div>
        <h2 id="hide-title">Hide this kudos?</h2>
        <p id="hide-description">This will remove the kudos from the board for everyone currently viewing it.</p>
        <div className="target-summary">
          <p><strong>{target.author}</strong> recognized <strong>{target.recipient}</strong></p>
          <blockquote>{target.message}</blockquote>
        </div>
        {error && <p className="dialog-error" role="alert">{error}</p>}
        {submitting && <p className="progress" role="status">Hiding kudos…</p>}
        <div className="dialog-actions">
          <button ref={cancelRef} type="button" className="cancel-button" onClick={onCancel} disabled={submitting}>Cancel</button>
          <button ref={confirmRef} type="button" className="hide-button" onClick={onConfirm} disabled={submitting} aria-busy={submitting}>
            {submitting ? 'Hiding…' : error ? 'Try again' : 'Hide kudos'}
          </button>
        </div>
      </div>
      <style jsx>{`
        .dialog-backdrop { position: fixed; inset: 0; z-index: 20; display: grid; place-items: center; padding: 20px; background: rgba(34,42,48,.42); }
        .dialog { width: min(100%, 460px); padding: 26px; border: 1px solid var(--color-border); border-radius: 16px; background: var(--color-card); color: var(--color-foreground); box-shadow: 0 16px 48px rgba(34,42,48,.18); }
        .dialog-icon { display: grid; width: 38px; height: 38px; place-items: center; border-radius: 50%; background: #F9EAE7; color: var(--color-destructive); font-weight: 700; }
        h2 { margin: 15px 0 7px; font-size: 20px; line-height: 28px; }
        #hide-description { margin: 0; color: var(--color-muted-foreground); font-size: 14px; line-height: 21px; }
        .target-summary { margin: 17px 0; padding: 13px 14px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-background); font-size: 13px; }
        .target-summary p { margin: 0 0 6px; }
        blockquote { margin: 0; color: var(--color-muted-foreground); overflow-wrap: anywhere; }
        .dialog-error { margin: 0 0 12px; color: var(--color-destructive); font-size: 13px; }
        .progress { margin: 0 0 12px; color: var(--color-muted-foreground); font-size: 13px; }
        .dialog-actions { display: flex; justify-content: flex-end; gap: 9px; margin-top: 20px; }
        .dialog-actions button { min-height: 40px; padding: 0 14px; border-radius: 7px; font: 500 14px/20px var(--font-sans); cursor: pointer; }
        .cancel-button { border: 1px solid var(--color-border); background: var(--color-card); color: var(--color-foreground); }
        .hide-button { border: 1px solid var(--color-destructive); background: var(--color-destructive); color: #fff; }
        .dialog-actions button:disabled { opacity: .65; cursor: not-allowed; }
        .dialog-actions button:focus-visible { outline: 3px solid var(--color-ring); outline-offset: 3px; }
        @media (max-width: 480px) { .dialog { padding: 21px; } }
      `}</style>
    </div>
  )
}
