'use client'

import { useState, type FormEvent } from 'react'
import { ApiError } from '@/lib/api-client'
import { RecipientPicker } from './recipient-picker'

type CreatedKudos = {
  id: string
  authorId?: string
  recipientId: string
  message: string
  createdAt?: string | Date
  [key: string]: unknown
}

type KudosComposerProps = {
  onSubmitKudos: (recipientId: string, message: string) => Promise<CreatedKudos>
  onCreated: (kudos: CreatedKudos) => void
}

export function KudosComposer({ onSubmitKudos, onCreated }: KudosComposerProps) {
  const [recipientId, setRecipientId] = useState('')
  const [message, setMessage] = useState('')
  const [recipientError, setRecipientError] = useState('')
  const [messageError, setMessageError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    const normalizedRecipient = recipientId.trim()
    const normalizedMessage = message.trim()
    setRecipientError(normalizedRecipient ? '' : 'Choose a recipient before posting.')
    setMessageError(normalizedMessage ? '' : 'Write a message before posting.')
    setError('')
    setSuccess('')
    if (!normalizedRecipient || !normalizedMessage) return
    if (message.length > 280) {
      setMessageError('Messages can be no longer than 280 characters.')
      return
    }

    setSubmitting(true)
    try {
      const created = await onSubmitKudos(normalizedRecipient, normalizedMessage)
      onCreated(created)
      setRecipientId('')
      setMessage('')
      setSuccess('Kudos posted.')
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 422) {
        setError(cause.message || 'Please check the recipient and message, then try again.')
      } else {
        setError('Could not post kudos. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="composer" aria-labelledby="composer-title">
      <div className="composer-heading">
        <span className="composer-icon" aria-hidden="true">♥</span>
        <div>
          <h2 id="composer-title">Give someone kudos</h2>
          <p>A thoughtful note can make someone’s day.</p>
        </div>
      </div>
      <form onSubmit={(event) => void submit(event)} noValidate>
        <RecipientPicker value={recipientId} onChange={(value) => { setRecipientId(value); setRecipientError('') }} error={recipientError} disabled={submitting} />
        <div className="message-field">
          <label htmlFor="kudos-message">Message (280 characters max)</label>
          <textarea
            id="kudos-message"
            name="message"
            value={message}
            onChange={(event) => { setMessage(event.target.value); setMessageError('') }}
            maxLength={280}
            rows={4}
            placeholder="What would you like to thank them for?"
            required
            disabled={submitting}
            aria-invalid={Boolean(messageError)}
            aria-describedby={messageError ? 'message-error character-count' : 'message-hint character-count'}
          />
          <div className="message-meta">
            <span id="message-hint">Keep it kind and specific.</span>
            <span id="character-count" className="character-count" aria-live="polite">{message.length} / 280</span>
          </div>
          {messageError && <p id="message-error" className="field-error">{messageError}</p>}
        </div>
        <div className="composer-footer">
          <span className="composer-note">Give a teammate a shout-out.</span>
          <button type="submit" className="post-button" disabled={submitting}>
            {submitting ? 'Posting…' : 'Post kudos'}
          </button>
        </div>
      </form>
      {error && <p className="submit-error" role="alert">{error}</p>}
      {success && <p className="submit-success" role="status" aria-live="polite">{success}</p>}
      <style jsx>{`
        .composer { margin: 0 0 28px; padding: 21px 22px 18px; border: 1px solid var(--color-border); border-radius: 16px; background: var(--color-card); box-shadow: 0 2px 8px rgba(34,42,48,.035); }
        .composer-heading { display: flex; align-items: center; gap: 11px; margin-bottom: 17px; }
        .composer-icon { display: grid; width: 36px; height: 36px; place-items: center; border-radius: 11px; background: #FBF0ED; color: var(--color-primary); font-size: 18px; }
        h2 { margin: 0; font-size: 16px; line-height: 22px; font-weight: 600; }
        .composer-heading p { margin: 1px 0 0; color: var(--color-muted-foreground); font-size: 12px; line-height: 17px; }
        form { display: grid; gap: 13px; }
        .message-field { display: grid; gap: 6px; }
        .message-field label { font-size: 14px; font-weight: 500; }
        textarea { display: block; width: 100%; min-height: 92px; resize: vertical; padding: 12px 13px; border: 1px solid var(--color-border); border-radius: 8px; color: var(--color-foreground); background: #fff; font-size: 14px; line-height: 21px; }
        textarea::placeholder { color: #858C8F; }
        textarea[aria-invalid="true"] { border-color: var(--color-destructive); }
        textarea:focus-visible, button:focus-visible { outline: 3px solid var(--color-ring); outline-offset: 3px; }
        .message-meta { display: flex; align-items: center; justify-content: space-between; gap: 12px; color: var(--color-muted-foreground); font-size: 12px; line-height: 17px; }
        .character-count { font-family: var(--font-mono); }
        .field-error, .submit-error, .submit-success { margin: 0; font-size: 13px; line-height: 19px; }
        .field-error, .submit-error { color: var(--color-destructive); }
        .submit-success { margin-top: 12px; color: var(--color-success); font-weight: 500; }
        .composer-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .composer-note { color: var(--color-muted-foreground); font-size: 12px; }
        .post-button { display: inline-flex; min-height: 40px; align-items: center; justify-content: center; padding: 0 16px; border: 1px solid var(--color-primary); border-radius: 8px; background: var(--color-primary); color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; }
        .post-button:hover:not(:disabled) { background: #9F3D34; }
        .post-button:disabled { opacity: .7; cursor: wait; }
        @media (max-width: 560px) { .composer { padding: 17px 16px 15px; } .composer-note { max-width: 150px; } }
      `}</style>
    </section>
  )
}
