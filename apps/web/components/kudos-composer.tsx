'use client'

import { useState, type FormEvent } from 'react'
import { apiRequest } from '@/lib/api-client'
import { RecipientPicker, type RecipientOption } from './recipient-picker'

export type CreatedKudos = {
  id: string
  authorId?: string
  recipientId: string
  message: string
  createdAt: string
  author?: { id?: string; name: string }
  recipient?: { id?: string; name: string }
  isHidden?: boolean
}

type KudosComposerProps = {
  recipientOptions: RecipientOption[]
  onCreated: (kudos: CreatedKudos) => void
}

export function KudosComposer({ recipientOptions, onCreated }: KudosComposerProps) {
  const [recipientId, setRecipientId] = useState('')
  const [recipientValue, setRecipientValue] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [recipientError, setRecipientError] = useState('')
  const [messageError, setMessageError] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    const recipientValid = recipientId.trim().length > 0
    const messageValid = message.trim().length > 0 && message.length <= 280
    setRecipientError(recipientValid ? '' : 'Choose a recipient to recognize.')
    setMessageError(messageValid ? '' : message.length > 280 ? 'Message must be 280 characters or fewer.' : 'Write a message before posting.')
    setError('')
    setNotice('')
    if (!recipientValid || !messageValid) return

    setSubmitting(true)
    try {
      const created = await apiRequest<CreatedKudos>('/kudos', {
        method: 'POST',
        body: JSON.stringify({ recipientId: recipientId.trim(), message: message.trim() }),
      })
      onCreated(created)
      setRecipientId('')
      setRecipientValue('')
      setMessage('')
      setRecipientError('')
      setMessageError('')
      setNotice('Kudos posted.')
    } catch {
      setError("Couldn't post your kudos. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="composer" aria-labelledby="composer-title">
      <div className="composer-heading">
        <span className="composer-mark" aria-hidden="true">♡</span>
        <div><h2 id="composer-title">Give someone kudos</h2><p>A thoughtful note can make someone’s day.</p></div>
      </div>
      <form aria-label="Post kudos" onSubmit={(event) => void submit(event)} noValidate>
        <RecipientPicker
          options={recipientOptions}
          value={recipientValue}
          error={recipientError}
          onChange={(id, displayValue) => { setRecipientId(id); setRecipientValue(displayValue); setRecipientError('') }}
        />
        <div className="message-field">
          <label htmlFor="kudos-message">Message <span>(280 characters max)</span></label>
          <div className="message-wrap">
            <textarea
              id="kudos-message"
              name="message"
              maxLength={280}
              value={message}
              onChange={(event) => { setMessage(event.currentTarget.value); setMessageError('') }}
              placeholder="What would you like to thank them for?"
              aria-invalid={Boolean(messageError)}
              aria-describedby={messageError ? 'message-error character-count' : 'character-count'}
            />
            <span id="character-count" className="character-count" aria-live="polite">{message.length} / 280</span>
          </div>
          {messageError && <span className="field-error" id="message-error" role="alert">{messageError}</span>}
        </div>
        <div className="composer-footer">
          <span className="note">Keep it kind and specific</span>
          <button type="submit" disabled={submitting} aria-busy={submitting}>
            {submitting ? 'Posting…' : 'Post kudos'}
          </button>
        </div>
      </form>
      {error && <p className="submit-error" role="alert">{error}</p>}
      {notice && <p className="submit-success" role="status" aria-live="polite">{notice}</p>}
      <style jsx>{`
        .composer { margin: 0 0 28px; padding: 21px 22px 18px; border: 1px solid var(--color-border); border-radius: 16px; background: var(--color-card); box-shadow: 0 2px 8px rgba(34,42,48,.035); }
        .composer-heading { display: flex; align-items: center; gap: 11px; margin-bottom: 18px; }
        .composer-mark { display: grid; width: 36px; height: 36px; place-items: center; border-radius: 11px; background: #FBF0ED; color: var(--color-primary); font-size: 22px; }
        h2 { margin: 0; font-size: 17px; line-height: 23px; font-weight: 600; }
        .composer-heading p { margin: 2px 0 0; color: var(--color-muted-foreground); font-size: 12px; }
        form { display: grid; gap: 13px; }
        .message-field { display: grid; gap: 6px; }
        .message-field label { color: var(--color-foreground); font-size: 14px; font-weight: 500; }
        .message-field label span { color: var(--color-muted-foreground); font-size: 12px; font-weight: 400; }
        .message-wrap { position: relative; }
        textarea { display: block; width: 100%; min-height: 100px; resize: vertical; padding: 11px 13px 30px; border: 1px solid var(--color-border); border-radius: 8px; background: #fff; color: var(--color-foreground); font-size: 14px; line-height: 21px; }
        textarea::placeholder { color: #737A7E; }
        textarea[aria-invalid="true"] { border-color: var(--color-destructive); }
        .character-count { position: absolute; right: 12px; bottom: 8px; color: var(--color-muted-foreground); font-family: var(--font-mono); font-size: 11px; }
        .field-error, .submit-error { color: var(--color-destructive); font-size: 13px; }
        .field-error { display: block; }
        .composer-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .note { color: var(--color-muted-foreground); font-size: 12px; }
        button { min-height: 40px; padding: 0 16px; border: 1px solid var(--color-primary); border-radius: 8px; background: var(--color-primary); color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; }
        button:hover:not(:disabled) { background: #9F3C34; }
        button:disabled { opacity: .68; cursor: wait; }
        .submit-error, .submit-success { margin: 12px 0 0; font-size: 13px; }
        .submit-success { color: var(--color-success); }
        @media (max-width: 560px) { .composer { padding: 17px 16px 15px; } .note { max-width: 145px; font-size: 11px; } button { padding: 0 12px; } }
      `}</style>
    </section>
  )
}
