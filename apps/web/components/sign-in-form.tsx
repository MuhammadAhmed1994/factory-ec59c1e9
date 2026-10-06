'use client'

import { useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { apiRequest } from '../lib/api-client'
import { Button } from './ui/button'
import { TextField } from './ui/text-field'

const SIGN_IN_ERROR = "We couldn't sign you in. Check your details and try again."

type SessionResponse = { user?: { id: string; email: string } }

export default function SignInForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const submittingRef = useRef(false)
  const hasError = message === SIGN_IN_ERROR

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submittingRef.current) return

    submittingRef.current = true
    setIsSubmitting(true)
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
      setMessage(SIGN_IN_ERROR)
      submittingRef.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <main className="sign-in-page">
      <section className="sign-in-panel" aria-labelledby="sign-in-title">
        <div className="sign-in-brand" aria-label="Kudos Board">
          <span className="sign-in-brand-mark" aria-hidden="true">✦</span>
          <div>
            <div className="sign-in-brand-name">Kudos Board</div>
            <div className="sign-in-brand-note">A little appreciation goes a long way.</div>
          </div>
        </div>

        <header className="sign-in-intro">
          <h1 id="sign-in-title">Sign in to Kudos Board</h1>
          <p>Use your team account to continue.</p>
        </header>

        <form aria-label="Sign in" onSubmit={handleSubmit} aria-busy={isSubmitting}>
          <div className="sign-in-field">
            <TextField
              id="sign-in-email"
              label="Email address"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={isSubmitting}
              aria-describedby={hasError ? 'sign-in-status' : undefined}
            />
          </div>
          <div className="sign-in-field sign-in-field--password">
            <TextField
              id="sign-in-password"
              label="Password"
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={isSubmitting}
              aria-describedby={hasError ? 'sign-in-status' : undefined}
            />
          </div>
          <Button type="submit" className="sign-in-submit" loading={isSubmitting} disabled={isSubmitting}>
            {isSubmitting ? 'Signing you in…' : 'Sign in'}
          </Button>
        </form>

        <p
          id="sign-in-status"
          className={`sign-in-status ${hasError ? 'sign-in-status--error' : ''}`}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {message}
        </p>

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
            background: radial-gradient(ellipse at 50% 37%, rgba(255, 255, 255, .86), transparent 54%);
          }
          .sign-in-page::before, .sign-in-page::after {
            position: absolute;
            z-index: -1;
            content: '';
            pointer-events: none;
            border: 1px solid rgba(185, 71, 61, .08);
            border-radius: 50%;
          }
          .sign-in-page::before { top: -230px; right: -180px; width: 520px; height: 520px; box-shadow: 0 0 0 34px rgba(185,71,61,.025), 0 0 0 82px rgba(185,71,61,.018); }
          .sign-in-page::after { bottom: -260px; left: -220px; width: 520px; height: 520px; border-color: rgba(34,42,48,.055); box-shadow: 0 0 0 44px rgba(34,42,48,.018); }
          .sign-in-panel { width: min(100%, 448px); padding: 36px 40px 40px; border: 1px solid rgba(217,216,210,.9); border-radius: 16px; background: var(--color-card); box-shadow: 0 2px 6px rgba(34,42,48,.035), 0 18px 52px rgba(34,42,48,.075); }
          .sign-in-brand { display: flex; align-items: center; gap: 11px; margin-bottom: 36px; }
          .sign-in-brand-mark { display: grid; width: 38px; height: 38px; place-items: center; color: var(--color-primary); border: 1px solid rgba(185,71,61,.18); border-radius: 12px; background: #FBF2EF; font-size: 21px; }
          .sign-in-brand-name { color: var(--color-foreground); font-size: 14px; font-weight: 650; letter-spacing: -.02em; }
          .sign-in-brand-note { margin-top: 3px; color: var(--color-muted-foreground); font-size: 12px; line-height: 16px; }
          .sign-in-intro { margin-bottom: 25px; }
          h1 { margin: 0; color: var(--color-foreground); font-size: 24px; font-weight: 600; letter-spacing: -.035em; line-height: 32px; }
          .sign-in-intro p { margin: 8px 0 0; color: var(--color-muted-foreground); font-size: 14px; line-height: 21px; }
          .sign-in-field :global(.field) { gap: 7px; }
          .sign-in-field :global(.field__input) { height: 48px; padding: 0 14px; border-radius: 10px; font-size: 15px; }
          .sign-in-field--password { margin-top: 19px; }
          .sign-in-submit { display: flex; width: 100%; min-height: 48px; margin-top: 25px; border-radius: 10px; font-size: 15px; }
          .sign-in-status { min-height: 0; margin: 17px 0 0; padding: 0; border: 0 solid transparent; border-radius: 10px; font-size: 13px; line-height: 19px; }
          .sign-in-status:not(:empty) { padding: 14px 15px; border-width: 1px; border-color: #D6E7DC; background: #F2F8F4; color: #315F45; }
          .sign-in-status--error { border-color: #E8C9C6 !important; background: #FCF3F2 !important; color: var(--color-destructive) !important; }
          @media (max-width: 520px) {
            .sign-in-page { padding: 32px 16px; }
            .sign-in-panel { padding: 28px 24px 30px; }
            .sign-in-brand { margin-bottom: 30px; }
          }
          @media (max-width: 360px) { .sign-in-panel { padding-right: 20px; padding-left: 20px; } }
        `}</style>
      </section>
    </main>
  )
}
