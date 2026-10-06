'use client'

import { useState, type FormEvent } from 'react'
import { apiRequest } from '../lib/api-client'
import { RecipientPicker } from './recipient-picker'

export type CreatedKudos = {
  id: string
  authorId?: string
  author?: string
  recipientId: string
  recipient?: string
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
  const [recipientError, setRecipientError] = useState<string | null>(null)
  const [messageError, setMessageError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const recipient = recipientId.trim()
    const content = message.trim()
    setRecipientError(recipient ? null : 'Choose a recipient before posting.')
    setMessageError(content ? null : 'Enter a message for your kudos.')
    setError(null)
    setSuccess(null)
    if (!recipient || !content || message.length > 280) return

    setSubmitting(true)
    try {
      const created = await apiRequest<CreatedKudos>('/kudos', {
        method: 'POST',
        body: JSON.stringify({ recipientId: recipient, message }),
      })
      onCreated(created)
      setRecipientId('')
      setMessage('')
      setSuccess('Kudos posted.')
    } catch {
      setError('Couldn’t post kudos. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="composer" aria-labelledby="composer-title">
      <div className="composer-heading">
        <span className="composer-icon" aria-hidden="true">♡</span>
        <div>
          <h2 id="composer-title">Give someone kudos</h2>
          <p>A thoughtful note can make someone’s day.</p>
        </div>
      </div>
      <form onSubmit={submit} noValidate>
        <RecipientPicker
          value={recipientId}
          onChange={(value) => { setRecipientId(value); if (value.trim()) setRecipientError(null) }}
          disabled={submitting}
          error={recipientError}
        />
        <div className="message-field">
          <label htmlFor="kudos-message">Message <span>(280 characters max)</span></label>
          <div className="message-wrap">
            <textarea
              id="kudos-message"
              name="message"
              value={message}
              onChange={(event) => { setMessage(event.target.value); if (event.target.value.trim()) setMessageError(null) }}
              maxLength={280}
              required
              disabled={submitting}
              aria-invalid={Boolean(messageError)}
              aria-describedby={messageError ? 'message-count message-error' : 'message-count'}
              placeholder="What would you like to thank them for?"
            />
            <span id="message-count" className="char-count" aria-live="polite">{message.length} / 280</span>
          </div>
          {messageError && <span id="message-error" className="field-error">{messageError}</span>}
        </div>
        <div className="composer-footer">
          <span className="composer-note">Keep it kind and specific</span>
          <button className="post-button" type="submit" disabled={submitting} aria-busy={submitting}>
            {submitting ? 'Posting…' : 'Post kudos'}
          </button>
        </div>
      </form>
      {error && <p className="form-error" role="alert">{error}</p>}
      {success && <p className="form-success" role="status">{success}</p>}
      <style jsx>{`
        .composer { margin-bottom: 28px; padding: 21px 22px 18px; border: 1px solid var(--color-border); border-radius: 16px; background: var(--color-card); box-shadow: 0 2px 8px rgba(34,42,48,.035); }
        .composer-heading { display: flex; align-items: center; gap: 11px; margin-bottom: 17px; }
        .composer-icon { width: 36px; height: 36px; display: grid; place-items: center; border-radius: 11px; background: #FBF0ED; color: var(--color-primary); font-size: 23px; }
        h2 { margin: 0; font-size: 16px; line-height: 22px; font-weight: 600; }
        .composer-heading p { margin: 1px 0 0; color: var(--color-muted-foreground); font-size: 12px; line-height: 17px; }
        form { display: grid; gap: 14px; }
        .message-field { display: grid; gap: 7px; }
        .message-field label { color: var(--color-foreground); font-size: 14px; font-weight: 500; }
        .message-field label span { color: var(--color-muted-foreground); font-size: 12px; font-weight: 400; }
        .message-wrap { position: relative; }
        textarea { width: 100%; min-height: 92px; resize: vertical; padding: 12px 13px 30px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-card); color: var(--color-foreground); font-size: 14px; line-height: 21px; }
        textarea::placeholder { color: var(--color-muted-foreground); }
        textarea[aria-invalid="true"] { border-color: var(--color-destructive); }
        textarea:disabled { opacity: .7; }
        .char-count { position: absolute; right: 12px; bottom: 8px; color: var(--color-muted-foreground); font: 12px/16px var(--font-mono); }
        .field-error, .form-error { color: var(--color-destructive); font-size: 13px; }
        .composer-footer { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
        .composer-note { color: var(--color-muted-foreground); font-size: 12px; }
        .post-button { min-height: 40px; padding: 0 16px; border: 1px solid var(--color-primary); border-radius: 8px; background: var(--color-primary); color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; }
        .post-button:hover:not(:disabled) { background: #9f3c34; }
        .post-button:disabled { cursor: wait; opacity: .72; }
        .form-error, .form-success { margin: 12px 0 0; }
        .form-success { color: var(--color-success); font-size: 14px; }
        @media (max-width: 560px) { .composer { padding: 17px 16px 15px; } .composer-note { max-width: 150px; font-size: 11px; } }
      `}</style>
    </section>
  )
}
