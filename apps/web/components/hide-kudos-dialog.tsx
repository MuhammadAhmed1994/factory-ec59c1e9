'use client'

import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react'

type HideKudosDialogProps = {
  author: string
  recipient: string
  message: string
  onCancel: () => void
  onConfirm: () => Promise<void>
  returnFocusRef: RefObject<HTMLButtonElement | null>
}

export function HideKudosDialog({ author, recipient, message, onCancel, onConfirm, returnFocusRef }: HideKudosDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const busyRef = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    cancelRef.current?.focus()
    return () => {
      if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus()
    }
  }, [returnFocusRef])

  async function confirm() {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setError('')
    try {
      await onConfirm()
    } catch {
      setError("Couldn't hide this kudos. Try again.")
      busyRef.current = false
      setBusy(false)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      if (!busy) onCancel()
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
    <div className="hide-dialog__backdrop">
      <div
        ref={dialogRef}
        className="hide-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hide-dialog-title"
        aria-describedby="hide-dialog-description hide-dialog-target"
        onKeyDown={handleKeyDown}
      >
        <p className="hide-dialog__eyebrow">Lead moderation</p>
        <h2 id="hide-dialog-title">Hide this kudos?</h2>
        <p id="hide-dialog-description">This will remove the post from the board for everyone viewing it.</p>
        <div className="hide-dialog__target" id="hide-dialog-target">
          <strong>{author} recognized {recipient}</strong>
          <p>“{message}”</p>
        </div>
        {error && <p className="hide-dialog__error" role="alert" aria-atomic="true">{error}</p>}
        {busy && <p className="hide-dialog__progress" role="status" aria-atomic="true">Hiding kudos…</p>}
        <div className="hide-dialog__actions">
          <button ref={cancelRef} className="dialog-button dialog-button--secondary" type="button" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="dialog-button dialog-button--destructive" type="button" onClick={() => void confirm()} disabled={busy} aria-busy={busy}>
            {busy ? 'Hiding…' : 'Hide kudos'}
          </button>
        </div>
      </div>
      <style jsx>{`
        .hide-dialog__backdrop { position: fixed; inset: 0; z-index: 20; display: grid; place-items: center; padding: 20px; background: rgba(34,42,48,.48); }
        .hide-dialog { width: min(100%, 460px); padding: 24px; border: 1px solid var(--color-border); border-radius: 16px; background: var(--color-card); color: var(--color-foreground); box-shadow: 0 16px 48px rgba(34,42,48,.18); }
        .hide-dialog__eyebrow { margin: 0 0 5px; color: var(--color-primary); font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
        h2 { margin: 0; font-size: 22px; line-height: 30px; font-weight: 600; }
        .hide-dialog__target { margin-top: 16px; padding: 12px 14px; border-left: 3px solid var(--color-primary); border-radius: 4px; background: var(--color-muted); font-size: 14px; line-height: 21px; }
        .hide-dialog__target p { margin: 6px 0 0; overflow-wrap: anywhere; }
        #hide-dialog-description { margin: 8px 0 0; color: var(--color-muted-foreground); font-size: 14px; line-height: 21px; }
        .hide-dialog__error { margin: 14px 0 0; color: var(--color-destructive); font-size: 13px; }
        .hide-dialog__progress { margin: 14px 0 0; color: var(--color-muted-foreground); font-size: 13px; }
        .hide-dialog__actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px; }
        .dialog-button { min-height: 40px; padding: 8px 14px; border: 1px solid transparent; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; }
        .dialog-button:focus-visible { outline: 3px solid var(--color-ring); outline-offset: 3px; }
        .dialog-button:disabled { cursor: not-allowed; opacity: .62; }
        .dialog-button--secondary { border-color: var(--color-border); background: var(--color-card); color: var(--color-foreground); }
        .dialog-button--destructive { background: var(--color-destructive); color: #fff; }
        @media (max-width: 420px) { .hide-dialog { padding: 20px; } .hide-dialog__actions { flex-wrap: wrap-reverse; } }
      `}</style>
    </div>
  )
}
