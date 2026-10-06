'use client'

import { useEffect, useRef } from 'react'
import { Button } from './ui/button'

type HideKudosDialogProps = {
  open: boolean
  author: string
  recipient: string
  message: string
  submitting?: boolean
  error?: string
  onCancel: () => void
  onConfirm: () => void
}

export function HideKudosDialog({ open, author, recipient, message, submitting = false, error, onCancel, onConfirm }: HideKudosDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    dialogRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !submitting) {
        event.preventDefault()
        onCancel()
      }
      if (event.key === 'Tab' && dialogRef.current) {
        const controls = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled)'))
        if (!controls.length) return
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
      <div ref={dialogRef} className="dialog" role="alertdialog" aria-modal="true" aria-busy={submitting} aria-labelledby="hide-title" aria-describedby="hide-description">
        <p className="eyebrow">Team lead moderation</p>
        <h2 id="hide-title">Hide this kudos?</h2>
        <p id="hide-description">This will remove the post from the board for everyone currently viewing.</p>
        <div className="target-post">
          <p className="target-people"><strong>{author}</strong> recognized <strong>{recipient}</strong></p>
          <p className="target-message">“{message}”</p>
        </div>
        {error && <p className="dialog-error" role="alert">{error}</p>}
        {submitting && <p className="progress" role="status">Hiding kudos…</p>}
        <div className="actions">
          <Button variant="secondary" onClick={onCancel} disabled={submitting}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={submitting} loading={submitting}>Hide kudos</Button>
        </div>
      </div>
      <style jsx>{`
        .dialog-backdrop { position: fixed; z-index: 20; inset: 0; display: grid; place-items: center; padding: 20px; background: rgba(34,42,48,.48); }
        .dialog { width: min(100%, 460px); padding: 24px; border: 1px solid var(--color-border); border-radius: 16px; background: var(--color-card); box-shadow: 0 16px 48px rgba(34,42,48,.18); }
        .eyebrow { margin: 0 0 6px; color: var(--color-primary); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; }
        h2 { margin: 0 0 8px; font-size: 20px; line-height: 28px; }
        #hide-description { margin: 0 0 16px; color: var(--color-muted-foreground); font-size: 14px; }
        .target-post { padding: 12px 14px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-background); }
        .target-people, .target-message { margin: 0; font-size: 14px; }
        .target-message { margin-top: 7px; color: var(--color-muted-foreground); }
        .dialog-error { color: var(--color-destructive); font-size: 14px; }
        .progress { color: var(--color-muted-foreground); font-size: 13px; }
        .actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px; }
        @media (max-width: 480px) { .dialog { padding: 20px; } .actions { flex-wrap: wrap; } }
      `}</style>
    </div>
  )
}
