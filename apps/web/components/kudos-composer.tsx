'use client'

import { useState, type FormEvent } from 'react'
import { apiRequest } from '../lib/api-client'
import { Button } from './ui/button'
import { RecipientPicker, type RecipientOption } from './recipient-picker'
import type { BoardPostData } from './board-post'

type KudosComposerProps = {
  recipients: RecipientOption[]
  onCreated: (post: BoardPostData) => void
}

export function KudosComposer({ recipients, onCreated }: KudosComposerProps) {
  const [recipientId, setRecipientId] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [attempted, setAttempted] = useState(false)
  const recipientInvalid = attempted && !recipientId.trim()
  const messageInvalid = attempted && !message.trim()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAttempted(true)
    setSuccess('')
    if (!recipientId.trim() || !message.trim()) {
      setError('Choose a recipient and enter a message to post kudos.')
      return
    }
    if (message.length > 280) {
      setError('Your message must be 280 characters or fewer.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const created = await apiRequest<{
        id: string
        message: string
        createdAt: string
        author?: { name: string }
        recipient?: { id?: string; name: string }
        recipientId?: string
      }>('/kudos', {
        method: 'POST',
        body: JSON.stringify({ recipientId: recipientId.trim(), message: message.trim() }),
      })
      const post: BoardPostData = {
        id: created.id,
        author: created.author?.name ?? 'You',
        recipient: created.recipient?.name ?? recipients.find((item) => item.id === (created.recipientId ?? recipientId))?.name ?? created.recipientId ?? recipientId,
        message: created.message,
        createdAt: created.createdAt,
      }
      onCreated(post)
      setRecipientId('')
      setMessage('')
      setAttempted(false)
      setSuccess('Kudos posted.')
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Couldn't post kudos. Try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="composer" aria-labelledby="composer-title">
      <div className="heading">
        <span className="mark" aria-hidden="true">♥</span>
        <div>
          <h2 id="composer-title">Give someone kudos</h2>
          <p>A thoughtful note can make someone’s day.</p>
        </div>
      </div>
      <form onSubmit={submit} noValidate>
        <RecipientPicker value={recipientId} onChange={(value) => { setRecipientId(value); setError(''); setSuccess('') }} recipients={recipients} invalid={recipientInvalid} />
        <div className="message-field">
          <label htmlFor="kudos-message">Message (280 characters max)</label>
          <textarea
            id="kudos-message"
            name="message"
            value={message}
            maxLength={280}
            aria-describedby="message-count message-error"
            aria-invalid={messageInvalid}
            onChange={(event) => { setMessage(event.target.value); setError(''); setSuccess('') }}
            placeholder="What would you like to thank them for?"
            rows={4}
            required
          />
          <span id="message-count" className="count" aria-live="polite">{message.length} / 280</span>
          {messageInvalid && <span id="message-error" className="field-error">Enter a message before posting.</span>}
        </div>
        {error && <p className="feedback error" role="alert">{error}</p>}
        {success && <p className="feedback success" role="status" aria-live="polite">{success}</p>}
        <div className="footer">
          <span className="hint">Keep it kind and specific</span>
          <Button type="submit" variant="primary" loading={submitting} disabled={submitting}>Post kudos</Button>
        </div>
      </form>
      <style jsx>{`
        .composer { margin: 0 0 28px; padding: 21px 22px 18px; border: 1px solid var(--color-border); border-radius: 16px; background: var(--color-card); box-shadow: 0 2px 8px rgba(34,42,48,.035); }
        .heading { display: flex; align-items: center; gap: 11px; margin-bottom: 17px; }
        .mark { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; background: #FBF0ED; color: var(--color-primary); font-size: 18px; }
        h2 { margin: 0; font-size: 16px; line-height: 22px; font-weight: 600; }
        .heading p { margin: 1px 0 0; color: var(--color-muted-foreground); font-size: 12px; line-height: 17px; }
        form { display: grid; gap: 12px; }
        .message-field { position: relative; display: grid; gap: 6px; }
        .message-field label { font-size: 14px; font-weight: 500; }
        textarea { width: 100%; min-height: 100px; padding: 12px 13px 30px; resize: vertical; border: 1px solid var(--color-border); border-radius: 8px; color: var(--color-foreground); background: var(--color-card); font-size: 14px; line-height: 21px; }
        textarea[aria-invalid="true"] { border-color: var(--color-destructive); }
        textarea:focus-visible { outline: 3px solid var(--color-ring); outline-offset: 2px; }
        .count { position: absolute; right: 12px; bottom: 9px; color: var(--color-muted-foreground); font-family: var(--font-mono); font-size: 11px; }
        .field-error, .error { color: var(--color-destructive); }
        .feedback { margin: 0; font-size: 13px; }
        .success { color: var(--color-success); }
        .footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .hint { color: var(--color-muted-foreground); font-size: 12px; }
        @media (max-width: 560px) { .composer { padding: 17px 16px 15px; } .footer { align-items: flex-start; } .hint { max-width: 145px; } }
      `}</style>
    </section>
  )
}
