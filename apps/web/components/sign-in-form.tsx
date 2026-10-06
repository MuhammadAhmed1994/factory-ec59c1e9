'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState, type FormEvent } from 'react'
import { apiRequest } from '../lib/api-client'
import { Button } from './ui/button'
import { TextField } from './ui/text-field'

const SIGN_IN_ERROR = "We couldn't sign you in. Check your details and try again."

export default function SignInForm() {
  const router = useRouter()
  const submittingRef = useRef(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submittingRef.current) return

    submittingRef.current = true
    setSubmitting(true)
    setFailed(false)
    setMessage('Signing you in…')
    try {
      // The API sets its HttpOnly session cookie; include credentials so the browser stores it.
      await apiRequest<void>('/auth/sessions', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      setMessage("You're signed in. Opening the kudos board…")
      router.push('/board')
    } catch {
      setFailed(true)
      setMessage(SIGN_IN_ERROR)
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <form aria-label="Sign in" onSubmit={handleSubmit}>
      <div className="form-fields">
        <TextField
          id="sign-in-email"
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <TextField
          id="sign-in-password"
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      <Button type="submit" className="sign-in-submit" loading={submitting} disabled={submitting}>
        {submitting ? 'Signing you in…' : 'Sign in'}
      </Button>
      <p className={`sign-in-status ${failed ? 'sign-in-status--error' : ''}`} role="status" aria-live="polite" aria-atomic="true">
        {message}
      </p>
      <style jsx>{`
        .form-fields { display: grid; gap: 19px; }
        .sign-in-submit { width: 100%; min-height: 48px; margin-top: 25px; border-radius: 10px; background: var(--color-success); color: #fff; font-size: 15px; }
        .sign-in-submit:hover:not(:disabled) { background: #22583f; }
        .sign-in-status { min-height: 0; margin: 0; color: var(--color-muted-foreground); font-size: 13px; line-height: 19px; }
        .sign-in-status:not(:empty) { margin-top: 16px; }
        .sign-in-status--error { color: #A3312C; }
      `}</style>
    </form>
  )
}
