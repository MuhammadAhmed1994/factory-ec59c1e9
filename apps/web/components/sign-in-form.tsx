'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { apiRequest } from '@/lib/api-client'

const SIGN_IN_ERROR = "We couldn't sign you in. Check your details and try again."

type SessionResponse = { user: { id: string; email: string; name: string; role: string } }

export default function SignInForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)
    setError('')
    setStatus('Signing you in…')

    try {
      await apiRequest<SessionResponse>('/auth/sessions', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      setStatus("You're signed in. Opening the kudos board…")
      router.push('/board')
    } catch {
      setError(SIGN_IN_ERROR)
      setStatus('')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form aria-label="Sign in" aria-busy={isSubmitting} onSubmit={handleSubmit}>
      <div className="field-group">
        <label htmlFor="sign-in-email">Email address</label>
        <input
          id="sign-in-email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-describedby={error ? 'sign-in-error' : undefined}
          required
        />
      </div>
      <div className="field-group">
        <label htmlFor="sign-in-password">Password</label>
        <input
          id="sign-in-password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-describedby={error ? 'sign-in-error' : undefined}
          required
        />
      </div>

      <button className="sign-in-submit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Signing you in…' : 'Sign in'}
      </button>
      {status && <p className="sign-in-status" role="status" aria-live="polite">{status}</p>}
      {error && <p id="sign-in-error" className="sign-in-error" role="alert" aria-live="assertive">{error}</p>}

      <style jsx>{`
        .field-group { display: grid; gap: 7px; }
        .field-group + .field-group { margin-top: 19px; }
        label { color: var(--color-foreground); font-size: 14px; font-weight: 500; line-height: 20px; }
        input {
          width: 100%;
          height: 48px;
          padding: 0 14px;
          color: var(--color-foreground);
          border: 1px solid var(--color-border);
          border-radius: 10px;
          background: #fff;
          font: 400 15px/20px var(--font-sans);
          outline: none;
          transition: border-color var(--motion-fast) var(--ease-enter), box-shadow var(--motion-fast) var(--ease-enter);
        }
        input:focus-visible { border-color: var(--color-ring); outline: 3px solid rgba(36, 107, 138, .28); outline-offset: 2px; }
        .sign-in-submit {
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
          transition: background-color var(--motion-fast) var(--ease-enter);
        }
        .sign-in-submit:hover:not(:disabled) { background: #9f3c34; }
        .sign-in-submit:focus-visible { outline: 3px solid rgba(36, 107, 138, .35); outline-offset: 2px; }
        .sign-in-submit:disabled { cursor: wait; opacity: .72; }
        .sign-in-status, .sign-in-error { margin: 16px 0 0; padding: 12px 14px; border-radius: 8px; font-size: 14px; line-height: 20px; }
        .sign-in-status { border: 1px solid #D6E7DC; background: #F2F8F4; color: #28684A; }
        .sign-in-error { border: 1px solid #E8C9C6; background: #FBF2F1; color: #A3312C; }
        @media (prefers-reduced-motion: reduce) { input, .sign-in-submit { transition: none; } }
      `}</style>
    </form>
  )
}
