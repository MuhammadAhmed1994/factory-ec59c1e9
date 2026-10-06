'use client'

import { useState, type FormEvent } from 'react'
import { apiRequest } from '../lib/api-client'
import { Button } from './ui/button'
import { RecipientPicker } from './recipient-picker'

export type CreatedKudos = {
  id: string
  authorId?: string
  recipientId: string
  message: string
  createdAt: string
  isHidden?: boolean
}

type KudosComposerProps = {
  onCreated: (kudos: CreatedKudos) => void
}

export function KudosComposer({ onCreated }: KudosComposerProps) {
  const [recipientId, setRecipientId] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [recipientError, setRecipientError] = useState(false)
  const [messageError, setMessageError] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const hasRecipient = Boolean(recipientId.trim())
    const cleanMessage = message.trim()
    setRecipientError(!hasRecipient)
    setMessageError(!cleanMessage ? 'Enter a message.' : message.length > 280 ? 'Message must be 280 characters or fewer.' : '')
    setStatus('')
    setError('')
    if (!hasRecipient || !cleanMessage || message.length > 280) return

    setSubmitting(true)
    try {
      const created = await apiRequest<CreatedKudos>('/kudos', {
        method: 'POST',
        body: JSON.stringify({ recipientId: recipientId.trim(), message: cleanMessage }),
      })
      onCreated(created)
      setRecipientId('')
      setMessage('')
      setRecipientError(false)
      setMessageError('')
      setStatus('Kudos posted.')
    } catch {
      setError('Could not post kudos. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="composer" aria-labelledby="composer-title">
      <header className="composer-heading">
        <span className="icon" aria-hidden="true">♡</span>
        <div>
          <h2 id="composer-title">Give someone kudos</h2>
          <p>A thoughtful note can make someone’s day.</p>
        </div>
      </header>
      <form onSubmit={(event) => void submit(event)} noValidate aria-busy={submitting}>
        <RecipientPicker value={recipientId} onChange={(value) => { setRecipientId(value); setRecipientError(false) }} invalid={recipientError} disabled={submitting} />
        <div className="message-field">
          <label htmlFor="kudos-message">Message <span>(280 characters max)</span></label>
          <textarea
            id="kudos-message"
            name="message"
            value={message}
            onChange={(event) => { setMessage(event.currentTarget.value.slice(0, 280)); setMessageError('') }}
            maxLength={280}
            rows={4}
            placeholder="What would you like to thank them for?"
            aria-describedby="message-count message-help message-error"
            aria-invalid={Boolean(messageError) || undefined}
            disabled={submitting}
            required
          />
          <div className="message-meta">
            <span id="message-help">Keep it kind and specific.</span>
            <span id="message-count" className="count" aria-live="polite">{message.length} / 280</span>
          </div>
          {messageError && <p id="message-error" className="field-error" role="alert">{messageError}</p>}
        </div>
        <div className="form-footer">
          <span className="helper">A little appreciation goes a long way.</span>
          <Button type="submit" loading={submitting}>Post kudos</Button>
        </div>
      </form>
      {status && <p className="success" role="status" aria-live="polite">{status}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      <style jsx>{`
        .composer { margin-bottom: 28px; padding: 21px 22px 18px; border: 1px solid var(--color-border); border-radius: 16px; background: var(--color-card); box-shadow: 0 2px 8px rgba(34,42,48,.035); }
        .composer-heading { display: flex; align-items: center; gap: 11px; margin-bottom: 17px; }
        .icon { display: grid; width: 36px; height: 36px; place-items: center; border-radius: 11px; background: #FBF0ED; color: var(--color-primary); font-size: 23px; }
        h2 { margin: 0; font-size: 17px; line-height: 23px; font-weight: 600; }
        .composer-heading p { margin: 2px 0 0; color: var(--color-muted-foreground); font-size: 12px; }
        form { display: grid; gap: 14px; }
        .message-field { display: grid; gap: 7px; }
        .message-field label { font-size: 14px; font-weight: 500; }
        .message-field label span { color: var(--color-muted-foreground); font-weight: 400; }
        textarea { width: 100%; min-height: 96px; resize: vertical; padding: 12px 13px; border: 1px solid var(--color-border); border-radius: 8px; background: #fff; color: var(--color-foreground); font-size: 14px; line-height: 21px; }
        textarea::placeholder { color: #777F83; }
        textarea[aria-invalid="true"] { border-color: var(--color-destructive); }
        .message-meta { display: flex; justify-content: space-between; gap: 12px; color: var(--color-muted-foreground); font-size: 12px; }
        .count { color: #596167; font-family: var(--font-mono); }
        .form-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .helper { color: var(--color-muted-foreground); font-size: 12px; }
        .field-error, .error { margin: 0; color: var(--color-destructive); font-size: 13px; }
        .success { margin: 12px 0 0; color: var(--color-success); font-size: 13px; }
        @media (max-width: 560px) { .composer { padding: 17px 16px 15px; } .helper { max-width: 145px; font-size: 11px; line-height: 15px; } }
      `}</style>
    </section>
  )
}
