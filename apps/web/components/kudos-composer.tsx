'use client'

import { useState, type FormEvent } from 'react'
import { apiRequest } from '@/lib/api-client'
import { RecipientPicker } from './recipient-picker'
import { Button } from './ui/button'

export type CreatedKudos = {
  id: string
  authorId?: string
  recipientId?: string
  message: string
  createdAt: string
  author?: { id?: string; name?: string }
  recipient?: { id?: string; name?: string }
}

type KudosComposerProps = {
  onCreated: (kudos: CreatedKudos) => void
}

export function KudosComposer({ onCreated }: KudosComposerProps) {
  const [recipient, setRecipient] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [recipientError, setRecipientError] = useState('')
  const [messageError, setMessageError] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('')
    setError('')
    const recipientValue = recipient.trim()
    const messageValue = message.trim()
    setRecipientError(recipientValue ? '' : 'Choose a recipient before posting.')
    setMessageError(messageValue ? (messageValue.length > 280 ? 'Message must be 280 characters or fewer.' : '') : 'Write a message before posting.')
    if (!recipientValue || !messageValue || messageValue.length > 280) return

    setSubmitting(true)
    try {
      const created = await apiRequest<CreatedKudos>('/kudos', {
        method: 'POST',
        body: JSON.stringify({ recipientId: recipientValue, message: messageValue }),
      })
      onCreated(created)
      setRecipient('')
      setMessage('')
      setRecipientError('')
      setMessageError('')
      setStatus('Kudos posted.')
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? cause.message : 'Could not post kudos. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="composer" aria-labelledby="composer-heading">
      <div className="heading">
        <span className="mark" aria-hidden="true">♥</span>
        <div><h2 id="composer-heading">Give someone kudos</h2><p>A thoughtful note can make someone’s day.</p></div>
      </div>
      <form onSubmit={(event) => void submit(event)} noValidate aria-busy={submitting}>
        <RecipientPicker value={recipient} onChange={(value) => { setRecipient(value); setRecipientError('') }} error={recipientError} disabled={submitting} />
        <div className="message-wrap">
          <label htmlFor="kudos-message">Message (280 characters max)</label>
          <textarea
            id="kudos-message"
            name="message"
            value={message}
            maxLength={280}
            aria-describedby={`message-count${messageError ? ' message-error' : ''}`}
            aria-invalid={Boolean(messageError)}
            placeholder="What would you like to thank them for?"
            onChange={(event) => { setMessage(event.currentTarget.value); setMessageError('') }}
            disabled={submitting}
            required
          />
          <span id="message-count" className="count" aria-live="polite">{message.length} / 280</span>
          {messageError && <p className="field-error" id="message-error">{messageError}</p>}
        </div>
        <div className="footer">
          <span className="hint">Keep it kind and specific</span>
          <Button type="submit" variant="primary" loading={submitting} disabled={submitting}>Post kudos</Button>
        </div>
      </form>
      {status && <p className="success" role="status" aria-live="polite">{status}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      <style jsx>{`
        .composer { padding: 21px 22px 18px; margin: 0 0 28px; background: var(--color-card); border: 1px solid var(--color-border); border-radius: 16px; box-shadow: 0 2px 8px rgba(34,42,48,.035); }
        .heading { display: flex; align-items: center; gap: 11px; margin-bottom: 17px; }
        .mark { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; color: var(--color-primary); background: #FBF0ED; font-size: 19px; }
        h2 { margin: 0; font-size: 18px; line-height: 26px; font-weight: 600; }
        .heading p { margin: 1px 0 0; color: var(--color-muted-foreground); font-size: 12px; line-height: 17px; }
        form { display: grid; gap: 12px; }
        .message-wrap { position: relative; display: grid; gap: 7px; }
        .message-wrap label { font-size: 14px; font-weight: 500; }
        textarea { width: 100%; min-height: 102px; resize: vertical; padding: 11px 13px 28px; border: 1px solid var(--color-border); border-radius: 8px; background: #fff; color: var(--color-foreground); font-size: 14px; line-height: 21px; }
        textarea::placeholder { color: #858C8F; }
        textarea[aria-invalid="true"] { border-color: var(--color-destructive); }
        .count { position: absolute; right: 12px; bottom: 9px; color: var(--color-muted-foreground); font-family: var(--font-mono); font-size: 11px; }
        .field-error, .error { margin: 0; color: var(--color-destructive); font-size: 13px; }
        .footer { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
        .hint { color: var(--color-muted-foreground); font-size: 12px; }
        .success { margin: 12px 0 0; color: var(--color-success); font-size: 14px; }
        .error { margin-top: 12px; }
        @media (max-width: 560px) { .composer { padding: 17px 16px 15px; margin-bottom: 24px; } .footer { align-items: flex-start; } }
      `}</style>
    </section>
  )
}
