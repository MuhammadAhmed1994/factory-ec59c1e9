'use client'

import { useState, type FormEvent } from 'react'
import { apiRequest } from '../lib/api-client'
import { RecipientPicker, type RecipientOption } from './recipient-picker'

export type BoardKudos = {
  id: string
  authorId?: string
  recipientId: string
  message: string
  createdAt: string
  author: { id?: string; name: string }
  recipient: { id?: string; name: string }
  reactions?: { emoji: string; count: number; selected?: boolean }[]
}

type KudosComposerProps = {
  recipients: RecipientOption[]
  onCreated: (kudos: BoardKudos) => void
}

export function KudosComposer({ recipients, onCreated }: KudosComposerProps) {
  const [recipientId, setRecipientId] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [recipientError, setRecipientError] = useState('')
  const [messageError, setMessageError] = useState('')
  const count = message.length

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setStatus('')
    const trimmedMessage = message.trim()
    const recipientInvalid = !recipientId.trim()
    const messageInvalid = !trimmedMessage || trimmedMessage.length > 280
    setRecipientError(recipientInvalid ? 'Choose a recipient before posting.' : '')
    setMessageError(messageInvalid ? 'Enter a message of 1 to 280 characters.' : '')
    if (recipientInvalid || messageInvalid || submitting) return

    setSubmitting(true)
    try {
      const created = await apiRequest<BoardKudos>('/kudos', {
        method: 'POST',
        body: JSON.stringify({ recipientId: recipientId.trim(), message: trimmedMessage }),
      })
      onCreated(created)
      setRecipientId('')
      setMessage('')
      setRecipientError('')
      setMessageError('')
      setStatus('Kudos posted.')
    } catch {
      setError('Couldn’t post your kudos. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="composer" aria-labelledby="composer-title">
      <div className="composer-heading">
        <span className="composer-icon" aria-hidden="true">♥</span>
        <div><h2 id="composer-title">Give someone kudos</h2><p>A thoughtful note can make someone’s day.</p></div>
      </div>
      <form onSubmit={(event) => void submit(event)} noValidate>
        <RecipientPicker
          value={recipientId}
          options={recipients}
          onChange={(value) => { setRecipientId(value); setRecipientError('') }}
          error={recipientError}
        />
        <div className="message-wrap">
          <label htmlFor="kudos-message">Message</label>
          <textarea
            id="kudos-message"
            value={message}
            maxLength={280}
            required
            aria-required="true"
            aria-describedby="message-count message-hint message-error"
            aria-invalid={Boolean(messageError)}
            placeholder="What would you like to thank them for?"
            onChange={(event) => { setMessage(event.currentTarget.value); setMessageError('') }}
          />
          <div className="message-meta"><span id="message-hint">Keep it kind and specific.</span><span id="message-count" aria-live="polite">{count} / 280</span></div>
          {messageError && <span className="field-error" id="message-error">{messageError}</span>}
        </div>
        <div className="composer-footer">
          <span aria-hidden="true">A little appreciation goes a long way.</span>
          <button type="submit" disabled={submitting}>{submitting ? 'Posting…' : 'Post kudos'}</button>
        </div>
        {status && <p className="success" role="status" aria-live="polite">{status}</p>}
        {error && <p className="error" role="alert">{error}</p>}
      </form>
      <style jsx>{`
        .composer { margin-bottom: 28px; padding: 21px 22px 18px; border: 1px solid var(--color-border); border-radius: 16px; background: var(--color-card); box-shadow: 0 2px 8px rgba(34,42,48,.035); }
        .composer-heading { display: flex; align-items: center; gap: 11px; margin-bottom: 17px; }
        .composer-icon { display: grid; width: 36px; height: 36px; place-items: center; border-radius: 11px; background: #FBF0ED; color: var(--color-primary); font-size: 20px; }
        h2 { margin: 0; font-size: 18px; line-height: 26px; font-weight: 600; }
        .composer-heading p { margin: 1px 0 0; color: var(--color-muted-foreground); font-size: 12px; }
        .message-wrap { display: grid; gap: 6px; margin-top: 12px; }
        label { color: var(--color-foreground); font-size: 14px; font-weight: 500; }
        textarea { width: 100%; min-height: 92px; resize: vertical; padding: 12px 13px; border: 1px solid var(--color-border); border-radius: 8px; background: #fff; color: var(--color-foreground); font-size: 14px; line-height: 21px; }
        textarea[aria-invalid="true"] { border-color: var(--color-destructive); }
        .message-meta { display: flex; justify-content: space-between; gap: 12px; color: var(--color-muted-foreground); font-size: 12px; }
        #message-count { font-family: var(--font-mono); white-space: nowrap; }
        .composer-footer { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 14px; color: var(--color-muted-foreground); font-size: 12px; }
        button { min-height: 40px; padding: 0 16px; border: 1px solid var(--color-primary); border-radius: 8px; background: var(--color-primary); color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; }
        button:disabled { opacity: .75; cursor: wait; }
        button:focus-visible { outline: 3px solid var(--color-ring); outline-offset: 2px; }
        .field-error, .error { color: var(--color-destructive); font-size: 13px; }
        .success { color: var(--color-success); font-size: 13px; }
        @media (max-width: 560px) { .composer { padding: 17px 16px 15px; } .composer-footer { align-items: flex-end; } .composer-footer > span { max-width: 145px; } }
      `}</style>
    </section>
  )
}
