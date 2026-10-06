'use client'

import { useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { apiRequest } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/ui/text-field'

const SIGN_IN_ERROR = "We couldn't sign you in. Check your details and try again."

type SessionResponse = {
  user: {
    id: string
    email: string
    name: string
    role: string
  }
}

export function SignInForm() {
  const router = useRouter()
  const submitting = useRef(false)
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [hasError, setHasError] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') ?? '')
    const password = String(formData.get('password') ?? '')

    submitting.current = true
    setIsLoading(true)
    setHasError(false)
    setStatus('Signing you in…')

    try {
      await apiRequest<SessionResponse>('/auth/sessions', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      setStatus("You're signed in. Opening the kudos board…")
      router.push('/board')
    } catch {
      setHasError(true)
      setStatus(SIGN_IN_ERROR)
    } finally {
      submitting.current = false
      setIsLoading(false)
    }
  }

  return (
    <main className="sign-in-page">
      <section className="sign-in-panel" aria-labelledby="sign-in-title">
        <div className="brand" aria-label="Kudos Board">
          <span className="brand-mark" aria-hidden="true">✦</span>
          <div>
            <div className="brand-name">Kudos Board</div>
            <div className="brand-note">A little appreciation goes a long way.</div>
          </div>
        </div>

        <header className="intro">
          <h1 id="sign-in-title">Sign in to Kudos Board</h1>
          <p>Use your team account to continue.</p>
        </header>

        <form aria-label="Sign in" onSubmit={handleSubmit}>
          <div className="field-group">
            <TextField
              id="email"
              name="email"
              label="Email address"
              type="email"
              autoComplete="email"
              required
            />
          </div>
          <div className="field-group field-group--spaced">
            <TextField
              id="password"
              name="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <Button className="submit-button" type="submit" loading={isLoading} disabled={isLoading}>
            Sign in
          </Button>
        </form>

        <div className={`feedback ${hasError ? 'feedback--error' : ''}`} role={hasError ? 'alert' : 'status'} aria-live={hasError ? 'assertive' : 'polite'}>
          {status}
        </div>
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
          background: radial-gradient(ellipse at 50% 37%, rgba(255, 255, 255, 0.86) 0%, transparent 54%);
        }
        .sign-in-page::before, .sign-in-page::after {
          position: absolute;
          z-index: -1;
          width: 520px;
          height: 520px;
          border: 1px solid rgba(185, 71, 61, 0.08);
          border-radius: 50%;
          content: '';
          pointer-events: none;
        }
        .sign-in-page::before {
          top: -230px;
          right: -180px;
          box-shadow: 0 0 0 34px rgba(185, 71, 61, 0.025), 0 0 0 82px rgba(185, 71, 61, 0.018);
        }
        .sign-in-page::after {
          bottom: -260px;
          left: -220px;
          border-color: rgba(34, 42, 48, 0.055);
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
        .brand { display: flex; align-items: center; gap: 11px; margin-bottom: 36px; }
        .brand-mark {
          display: grid;
          width: 38px;
          height: 38px;
          place-items: center;
          color: var(--color-primary);
          border: 1px solid rgba(185, 71, 61, 0.18);
          border-radius: 12px;
          background: #FBF2EF;
          font-size: 19px;
        }
        .brand-name { color: var(--color-foreground); font-size: 14px; font-weight: 650; letter-spacing: -0.02em; }
        .brand-note { margin-top: 3px; color: var(--color-muted-foreground); font-size: 12px; line-height: 16px; }
        .intro { margin-bottom: 25px; }
        h1 { margin: 0; color: var(--color-foreground); font-size: 24px; font-weight: 600; letter-spacing: -0.035em; line-height: 32px; }
        .intro p { margin: 8px 0 0; color: var(--color-muted-foreground); font-size: 14px; line-height: 21px; }
        .field-group { display: grid; gap: 7px; }
        .field-group--spaced { margin-top: 19px; }
        .submit-button { display: flex; width: 100%; min-height: 48px; margin-top: 25px; }
        .feedback { min-height: 0; margin-top: 16px; color: var(--color-success); font-size: 14px; line-height: 20px; }
        .feedback:empty { display: none; }
        .feedback--error { color: var(--color-destructive); }
        @media (max-width: 520px) {
          .sign-in-page { padding: 32px 16px; }
          .sign-in-panel { width: 100%; padding: 28px 24px 30px; }
          .brand { margin-bottom: 30px; }
        }
        @media (max-width: 360px) { .sign-in-panel { padding-right: 20px; padding-left: 20px; } }
      `}</style>
    </main>
  )
}
