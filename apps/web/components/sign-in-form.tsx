'use client'

import { useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { apiRequest } from '../lib/api-client'

const SIGN_IN_ERROR = "We couldn't sign you in. Check your details and try again."

export function SignInForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [hasError, setHasError] = useState(false)
  const submitting = useRef(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return

    submitting.current = true
    setLoading(true)
    setHasError(false)
    setMessage('Signing you in…')

    try {
      await apiRequest('/auth/sessions', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      setMessage("You're signed in. Opening the kudos board…")
      router.push('/board')
    } catch {
      setHasError(true)
      setMessage(SIGN_IN_ERROR)
      submitting.current = false
      setLoading(false)
    }
  }

  return (
    <main className="sign-in-page">
      <section className="sign-in-panel" aria-labelledby="sign-in-heading">
        <div className="brand" aria-label="Kudos Board">
          <span className="brand-mark" aria-hidden="true">✦</span>
          <div>
            <div className="brand-name">Kudos Board</div>
            <div className="brand-note">A little appreciation goes a long way.</div>
          </div>
        </div>

        <header className="intro">
          <h1 id="sign-in-heading">Sign in to Kudos Board</h1>
          <p>Use your team account to continue.</p>
        </header>

        <form aria-label="Sign in" onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="sign-in-email">Email address</label>
            <input
              className="field"
              id="sign-in-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="field-group field-group--password">
            <label htmlFor="sign-in-password">Password</label>
            <input
              className="field"
              id="sign-in-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          <button className="submit-button" type="submit" disabled={loading} aria-busy={loading}>
            {loading ? 'Signing you in…' : 'Sign in'}
          </button>
        </form>

        {message && (
          <p className={`form-status${hasError ? ' form-status--error' : ''}`} role="status" aria-live="polite">
            {message}
          </p>
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
          background:
            radial-gradient(ellipse at 50% 37%, rgba(255, 255, 255, .86) 0%, rgba(255, 255, 255, 0) 54%),
            var(--color-background);
        }
        .sign-in-page::before, .sign-in-page::after {
          position: absolute;
          z-index: -1;
          width: 520px;
          height: 520px;
          border: 1px solid rgba(185, 71, 61, .08);
          border-radius: 50%;
          content: '';
          pointer-events: none;
        }
        .sign-in-page::before { top: -230px; right: -180px; box-shadow: 0 0 0 34px rgba(185, 71, 61, .025), 0 0 0 82px rgba(185, 71, 61, .018); }
        .sign-in-page::after { bottom: -260px; left: -220px; border-color: rgba(34, 42, 48, .055); box-shadow: 0 0 0 44px rgba(34, 42, 48, .018); }
        .sign-in-panel {
          width: min(100%, 448px);
          padding: 36px 40px 40px;
          border: 1px solid rgba(217, 216, 210, .9);
          border-radius: 16px;
          background: var(--color-card);
          box-shadow: 0 2px 6px rgba(34, 42, 48, .035), 0 18px 52px rgba(34, 42, 48, .075);
        }
        .brand { display: flex; align-items: center; gap: 11px; margin-bottom: 36px; }
        .brand-mark {
          display: grid;
          width: 38px;
          height: 38px;
          place-items: center;
          color: var(--color-primary);
          border: 1px solid rgba(185, 71, 61, .18);
          border-radius: 12px;
          background: #FBF2EF;
          font-size: 21px;
        }
        .brand-name { color: var(--color-foreground); font-size: 14px; font-weight: 600; letter-spacing: -.02em; }
        .brand-note { margin-top: 3px; color: var(--color-muted-foreground); font-size: 12px; line-height: 16px; }
        .intro { margin-bottom: 25px; }
        h1 { margin: 0; color: var(--color-foreground); font-size: 24px; font-weight: 600; letter-spacing: -.035em; line-height: 32px; }
        .intro p { margin: 8px 0 0; color: var(--color-muted-foreground); font-size: 14px; line-height: 21px; }
        .field-group { display: grid; gap: 7px; }
        .field-group--password { margin-top: 19px; }
        label { color: var(--color-foreground); font-size: 14px; font-weight: 500; line-height: 20px; }
        .field {
          width: 100%;
          height: 48px;
          padding: 0 14px;
          color: var(--color-foreground);
          border: 1px solid var(--color-border);
          border-radius: 10px;
          background: #fff;
          font: 400 15px/20px var(--font-sans);
        }
        .field:focus-visible, .submit-button:focus-visible { outline: 3px solid rgba(36, 107, 138, .28); outline-offset: 2px; border-color: var(--color-ring); }
        .submit-button {
          display: flex;
          width: 100%;
          min-height: 48px;
          align-items: center;
          justify-content: center;
          margin-top: 25px;
          padding: 12px 18px;
          color: #fff;
          border: 1px solid var(--color-primary);
          border-radius: 10px;
          background: var(--color-primary);
          font: 600 15px/22px var(--font-sans);
          cursor: pointer;
          transition: background-color 120ms ease;
        }
        .submit-button:hover:not(:disabled) { background: #9f3c34; }
        .submit-button:disabled { cursor: wait; opacity: .78; }
        .form-status { margin: 17px 0 0; color: var(--color-success); font-size: 14px; line-height: 21px; }
        .form-status--error { color: var(--color-destructive); }
        @media (max-width: 520px) {
          .sign-in-page { padding: 32px 16px; }
          .sign-in-panel { width: 100%; padding: 28px 24px 30px; }
          .brand { margin-bottom: 30px; }
        }
        @media (max-width: 360px) { .sign-in-panel { padding-right: 20px; padding-left: 20px; } }
        @media (prefers-reduced-motion: reduce) { .submit-button { transition: none; } }
      `}</style>
    </main>
  )
}
