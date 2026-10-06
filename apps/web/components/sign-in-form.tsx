'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiRequest } from '@/lib/api-client'

type SessionResponse = {
  user: {
    id: string
    email: string
    name: string
    role: string
  }
}

const SIGN_IN_ERROR = "We couldn't sign you in. Check your details and try again."

export default function SignInForm() {
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
      // The API sets its secure, HttpOnly session cookie; apiRequest includes credentials.
      await apiRequest<SessionResponse>('/auth/sessions', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      setMessage("You're signed in. Opening the kudos board…")
      router.push('/board')
    } catch {
      setFailed(true)
      setMessage(SIGN_IN_ERROR)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="sign-in-page">
      <section className="sign-in-panel" aria-labelledby="sign-in-title">
        <div className="sign-in-brand" aria-label="Kudos Board">
          <div className="sign-in-mark" aria-hidden="true">✦</div>
          <div>
            <div className="sign-in-brand-name">Kudos Board</div>
            <div className="sign-in-brand-note">A little appreciation goes a long way.</div>
          </div>
        </div>

        <header className="sign-in-intro">
          <h1 id="sign-in-title">Sign in to Kudos Board</h1>
          <p>Use your team account to continue.</p>
        </header>

        <form aria-label="Sign in" onSubmit={handleSubmit}>
          <div className="sign-in-field-group">
            <label htmlFor="sign-in-email">Email address</label>
            <input
              className="sign-in-field"
              id="sign-in-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={submitting}
              aria-invalid={failed || undefined}
            />
          </div>
          <div className="sign-in-field-group sign-in-password-group">
            <label htmlFor="sign-in-password">Password</label>
            <input
              className="sign-in-field"
              id="sign-in-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={submitting}
              aria-invalid={failed || undefined}
            />
          </div>
          <button className="sign-in-button" type="submit" disabled={submitting}>
            {submitting ? 'Signing you in…' : 'Sign in'}
          </button>
        </form>

        {message && (
          <div className={`sign-in-feedback${failed ? ' is-error' : ''}`} role="status" aria-live="polite">
            {message}
          </div>
        )}
      </section>

      <style jsx>{`
        .sign-in-page {
          position: relative;
          isolation: isolate;
          display: grid;
          min-height: 100vh;
          min-height: 100svh;
          place-items: center;
          overflow: hidden;
          padding: 48px 24px;
          background: radial-gradient(ellipse at 50% 37%, rgba(255, 255, 255, 0.86) 0%, rgba(255, 255, 255, 0) 54%);
        }
        .sign-in-page::before, .sign-in-page::after {
          position: absolute;
          z-index: -1;
          content: '';
          pointer-events: none;
          width: 520px;
          height: 520px;
          border-radius: 50%;
        }
        .sign-in-page::before {
          top: -230px;
          right: -180px;
          border: 1px solid rgba(185, 71, 61, 0.08);
          box-shadow: 0 0 0 34px rgba(185, 71, 61, 0.025), 0 0 0 82px rgba(185, 71, 61, 0.018);
        }
        .sign-in-page::after {
          bottom: -260px;
          left: -220px;
          border: 1px solid rgba(34, 42, 48, 0.055);
          box-shadow: 0 0 0 44px rgba(34, 42, 48, 0.018);
        }
        .sign-in-panel {
          width: min(100%, 448px);
          padding: 36px 40px 40px;
          border: 1px solid rgba(217, 216, 210, 0.9);
          border-radius: 16px;
          background: var(--color-card);
          box-shadow: 0 2px 6px rgba(34, 42, 48, 0.035), 0 18px 52px rgba(34, 42, 48, 0.075);
        }
        .sign-in-brand { display: flex; align-items: center; gap: 11px; margin-bottom: 36px; }
        .sign-in-mark {
          display: grid;
          width: 38px;
          height: 38px;
          place-items: center;
          color: var(--color-primary);
          border: 1px solid rgba(185, 71, 61, 0.18);
          border-radius: 12px;
          background: #fbf2ef;
          font-size: 20px;
        }
        .sign-in-brand-name { font-size: 14px; font-weight: 600; letter-spacing: -0.02em; }
        .sign-in-brand-note { margin-top: 3px; color: var(--color-muted-foreground); font-size: 12px; line-height: 16px; }
        .sign-in-intro { margin-bottom: 25px; }
        h1 { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.035em; line-height: 32px; }
        .sign-in-intro p { margin: 8px 0 0; color: var(--color-muted-foreground); font-size: 14px; line-height: 21px; }
        .sign-in-field-group { display: grid; gap: 7px; }
        .sign-in-password-group { margin-top: 19px; }
        label { font-size: 14px; font-weight: 500; line-height: 20px; }
        .sign-in-field {
          width: 100%;
          height: 48px;
          padding: 0 14px;
          color: var(--color-foreground);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-card);
          background: #fff;
          font-size: 15px;
          outline: none;
        }
        .sign-in-field:focus-visible, .sign-in-button:focus-visible { outline: 3px solid rgba(36, 107, 138, 0.28); outline-offset: 2px; border-color: var(--color-ring); }
        .sign-in-button {
          display: flex;
          width: 100%;
          min-height: 48px;
          align-items: center;
          justify-content: center;
          margin-top: 25px;
          padding: 12px 18px;
          color: #fff;
          border: 1px solid var(--color-primary);
          border-radius: var(--radius-card);
          background: var(--color-primary);
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 120ms ease;
        }
        .sign-in-button:hover:not(:disabled) { background: #a63d35; }
        .sign-in-button:disabled { cursor: wait; opacity: 0.8; }
        .sign-in-feedback { margin-top: 17px; color: var(--color-muted-foreground); font-size: 14px; line-height: 20px; }
        .sign-in-feedback.is-error { color: var(--color-destructive); }
        @media (max-width: 520px) {
          .sign-in-page { padding: 32px 16px; }
          .sign-in-panel { width: 100%; padding: 28px 24px 30px; }
          .sign-in-brand { margin-bottom: 30px; }
        }
        @media (max-width: 360px) { .sign-in-panel { padding-right: 20px; padding-left: 20px; } }
      `}</style>
    </main>
  )
}
