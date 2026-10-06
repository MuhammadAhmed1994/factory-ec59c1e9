'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { apiRequest } from '../lib/api-client'
import { Button } from './ui/button'
import { TextField } from './ui/text-field'

const GENERIC_SIGN_IN_ERROR = "We couldn't sign you in. Check your details and try again."
const SIGN_IN_SUCCESS = "You're signed in. Opening the kudos board…"

export function SignInForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    setSubmitting(true)
    setFailed(false)
    setMessage('Signing you in…')

    try {
      // The API establishes the HttpOnly session cookie on this credentialed response.
      await apiRequest('/auth/sessions', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      setMessage(SIGN_IN_SUCCESS)
      router.push('/board')
    } catch {
      setFailed(true)
      setMessage(GENERIC_SIGN_IN_ERROR)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="signin-form" aria-label="Sign in" onSubmit={handleSubmit}>
      <TextField
        id="signin-email"
        label="Email address"
        type="email"
        name="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />
      <TextField
        id="signin-password"
        label="Password"
        type="password"
        name="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />
      <Button className="signin-submit" type="submit" loading={submitting} disabled={submitting}>
        {submitting ? 'Signing you in…' : 'Sign in'}
      </Button>
      <p className={`signin-status ${failed ? 'signin-status--error' : ''}`} role="status" aria-live="polite">
        {message}
      </p>
      <style jsx>{`
        .signin-form { display: grid; gap: 19px; }
        .signin-form :global(.signin-submit) { width: 100%; min-height: 48px; margin-top: 6px; background: var(--color-primary); font-size: 15px; }
        .signin-form :global(.signin-submit:hover:not(:disabled)) { background: #9f3c34; }
        .signin-status { min-height: 0; margin: -5px 0 0; color: var(--color-success); font-size: 13px; line-height: 19px; }
        .signin-status:empty { display: none; }
        .signin-status--error { margin-top: -5px; padding: 12px 14px; border: 1px solid #E6C7C3; border-radius: 8px; background: #FCF4F2; color: var(--color-destructive); }
      `}</style>
    </form>
  )
}
