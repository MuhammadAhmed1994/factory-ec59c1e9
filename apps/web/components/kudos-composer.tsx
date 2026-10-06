'use client'

import { useState, type FormEvent } from 'react'
import { apiRequest } from '@/lib/api-client'
import { Button } from './ui/button'
import { RecipientPicker } from './recipient-picker'

export type BoardKudos = {
  id: string
  authorId: string
  recipientId: string
  message: string
  createdAt: string | Date
  author: { id: string; name: string }
  recipient: { id: string; name: string }
  reactions: { id?: string; emoji: string; userId?: string }[]
}

type KudosComposerProps = {
  onCreated: (kudos: BoardKudos) => void
}

export function KudosComposer({ onCreated }: KudosComposerProps) {
  const [recipientId, setRecipientId] = useState('')
  const [message, setMessage] = useState('')
  const [recipientError, setRecipientError] = useState<string | null>(null)
  const [messageError, setMessageError] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const invalidRecipient = !recipientId.trim()
    const invalidMessage = !message.trim() || message.length > 280
    setRecipientError(invalidRecipient ? 'Choose a recipient before posting.' : null)
    setMessageError(invalidMessage ? (!message.trim() ? 'Enter a message before posting.' : 'Message must be 280 characters or fewer.') : null)
    if (invalidRecipient || invalidMessage) {
      setStatus('idle')
      setError(null)
      return
    }

    setStatus('submitting')
    setError(null)
    try {
      const created = await apiRequest<BoardKudos>('/kudos', {
        method: 'POST',
        body: JSON.stringify({ recipientId: recipientId.trim(), message: message.trim() }),
      })
      setRecipientId('')
      setMessage('')
      setRecipientError(null)
      setMessageError(null)
      setStatus('success')
      onCreated(created)
    } catch {
      setStatus('error')
      setError('Couldn’t post your kudos. Please try again.')
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
      <form onSubmit={submit} noValidate>
        <RecipientPicker
          value={recipientId}
          onChange={(value) => { setRecipientId(value); if (value.trim()) setRecipientError(null) }}
          error={recipientError}
          disabled={status === 'submitting'}
        />
        <div className="message-wrap">
          <label htmlFor="kudos-message">Message</label>
          <textarea
            id="kudos-message"
            name="message"
            maxLength={280}
            aria-invalid={Boolean(messageError)}
            aria-describedby={messageError ? 'message-error char-count' : 'message-help char-count'}
            placeholder="What would you like to thank them for?"
            value={message}
            disabled={status === 'submitting'}
            onChange={(event) => { setMessage(event.target.value); if (event.target.value.trim() && event.target.value.length <= 280) setMessageError(null) }}
          />
          <span className="message-help" id="message-help">Keep it kind and specific.</span>
          <span className="char-count" id="char-count" aria-live="polite">{message.length} / 280</span>
          {messageError && <span id="message-error" className="field-error" role="alert">{messageError}</span>}
        </div>
        <div className="composer-footer">
          <span className="kind-note">A little appreciation goes a long way.</span>
          <Button type="submit" loading={status === 'submitting'} disabled={status === 'submitting'}>Post kudos</Button>
        </div>
      </form>
      {status === 'success' && <p className="feedback success" role="status">Kudos posted. Your appreciation is on the board.</p>}
      {error && <p className="feedback error" role="alert">{error}</p>}
      <style jsx>{`
        .composer { margin: 24px 0 30px; padding: 21px 22px 18px; border: 1px solid var(--color-border); border-radius: 16px; background: var(--color-card); box-shadow: 0 2px 8px rgba(34,42,48,.035); }
        .composer-heading { display: flex; align-items: center; gap: 11px; margin-bottom: 17px; }
        .composer-icon { width: 36px; height: 36px; display: grid; place-items: center; border-radius: 11px; background: #FBF0ED; color: var(--color-primary); font-size: 19px; }
        h2 { margin: 0; font-size: 18px; line-height: 26px; font-weight: 600; }
        .composer-heading p { margin: 1px 0 0; color: var(--color-muted-foreground); font-size: 12px; line-height: 17px; }
        .message-wrap { position: relative; display: grid; gap: 6px; margin-top: 14px; }
        .message-wrap label { font-size: 14px; font-weight: 500; }
        textarea { width: 100%; min-height: 92px; resize: vertical; padding: 11px 13px 29px; border: 1px solid var(--color-border); border-radius: 8px; background: #fff; color: var(--color-foreground); font: inherit; font-size: 14px; line-height: 21px; }
        textarea::placeholder { color: #737A7E; }
        textarea[aria-invalid="true"] { border-color: var(--color-destructive); }
        textarea:disabled { opacity: .7; }
        .message-help { color: var(--color-muted-foreground); font-size: 12px; }
        .char-count { position: absolute; right: 12px; bottom: 28px; color: var(--color-muted-foreground); font-family: var(--font-mono); font-size: 11px; }
        .field-error, .error { color: var(--color-destructive); font-size: 13px; }
        .composer-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 15px; }
        .kind-note { color: var(--color-muted-foreground); font-size: 12px; }
        .feedback { margin: 12px 0 0; font-size: 13px; }
        .success { color: var(--color-success); }
        @media (max-width: 560px) { .composer { padding: 17px 16px 15px; } .composer-footer { align-items: flex-start; flex-direction: column; } }
      `}</style>
    </section>
  )
}
