'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { apiRequest } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/ui/text-field'

const GENERIC_ERROR = "We couldn't sign you in. Check your details and try again."

type SessionResponse = { user: { id: string; email: string; name: string; role: 'MEMBER' | 'TEAM_LEAD' } }
type SignInFormContentProps = { navigateToBoard: (path: string) => void }

export default function SignInForm() {
  const router = useRouter()
  return <SignInFormContent navigateToBoard={router.push} />
}

export function SignInFormContent({ navigateToBoard }: SignInFormContentProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('')
  const [statusKind, setStatusKind] = useState<'error' | 'success' | 'loading' | ''>('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isLoading) return

    setIsLoading(true)
    setStatusKind('loading')
    setStatus('Signing you in…')
    try {
      // The API sets its session as an HttpOnly cookie; apiRequest includes browser credentials.
      await apiRequest<SessionResponse>('/auth/sessions', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      setStatusKind('success')
      setStatus("You're signed in. Opening the kudos board…")
      navigateToBoard('/board')
    } catch {
      setStatusKind('error')
      setStatus(GENERIC_ERROR)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="sign-in-page">
      <section className="sign-in-panel" aria-labelledby="sign-in-title">
        <div className="sign-in-brand" aria-label="Kudos Board">
          <span className="sign-in-brand-mark" aria-hidden="true">✦</span>
          <span>
            <span className="sign-in-brand-name">Kudos Board</span>
            <span className="sign-in-brand-note">A little appreciation goes a long way.</span>
          </span>
        </div>

        <header className="sign-in-intro">
          <h1 id="sign-in-title">Sign in to Kudos Board</h1>
          <p>Use your team account to continue.</p>
        </header>

        <form className="sign-in-form" aria-label="Sign in" onSubmit={handleSubmit}>
          <TextField
            id="sign-in-email"
            label="Email address"
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <TextField
            id="sign-in-password"
            label="Password"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Button type="submit" className="sign-in-submit" loading={isLoading} disabled={isLoading}>
            Sign in
          </Button>
        </form>

        <p className={`sign-in-status sign-in-status--${statusKind}`} role="status" aria-live="polite" aria-atomic="true">
          {status}
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
            background: radial-gradient(ellipse at 50% 37%, rgba(255,255,255,.86), transparent 54%);
          }
          .sign-in-page::before, .sign-in-page::after {
            position: absolute;
            z-index: -1;
            width: 520px;
            height: 520px;
            border: 1px solid rgba(185,71,61,.08);
            border-radius: 50%;
            content: '';
            pointer-events: none;
          }
          .sign-in-page::before { top: -230px; right: -180px; box-shadow: 0 0 0 34px rgba(185,71,61,.025), 0 0 0 82px rgba(185,71,61,.018); }
          .sign-in-page::after { bottom: -260px; left: -220px; border-color: rgba(34,42,48,.055); box-shadow: 0 0 0 44px rgba(34,42,48,.018); }
          .sign-in-panel {
            width: min(100%, 448px);
            padding: 36px 40px 28px;
            border: 1px solid rgba(217,216,210,.9);
            border-radius: 16px;
            background: var(--color-card);
            box-shadow: 0 2px 6px rgba(34,42,48,.035), 0 18px 52px rgba(34,42,48,.075);
          }
          .sign-in-brand { display: flex; align-items: center; gap: 11px; margin-bottom: 36px; }
          .sign-in-brand-mark { display: grid; width: 38px; height: 38px; place-items: center; color: var(--color-primary); border: 1px solid rgba(185,71,61,.18); border-radius: 12px; background: #FBF2EF; font-size: 21px; }
          .sign-in-brand-name, .sign-in-brand-note { display: block; }
          .sign-in-brand-name { color: var(--color-foreground); font-size: 14px; font-weight: 600; letter-spacing: -.02em; }
          .sign-in-brand-note { margin-top: 3px; color: var(--color-muted-foreground); font-size: 12px; line-height: 16px; }
          .sign-in-intro { margin-bottom: 25px; }
          h1 { margin: 0; color: var(--color-foreground); font-size: 24px; font-weight: 600; letter-spacing: -.035em; line-height: 32px; }
          .sign-in-intro p { margin: 8px 0 0; color: var(--color-muted-foreground); font-size: 14px; line-height: 21px; }
          .sign-in-form { display: grid; gap: 19px; }
          .sign-in-form :global(.field) { gap: 7px; }
          .sign-in-form :global(.field__input) { min-height: 48px; padding: 12px 14px; border-radius: 10px; font-size: 15px; }
          .sign-in-form :global(.button) { width: 100%; min-height: 48px; margin-top: 6px; border-radius: 10px; font-size: 15px; }
          .sign-in-status { min-height: 20px; margin: 16px 0 0; font-size: 13px; line-height: 20px; }
          .sign-in-status:empty { display: none; }
          .sign-in-status--error { color: var(--color-destructive); }
          .sign-in-status--success { color: var(--color-success); }
          .sign-in-status--loading { color: var(--color-muted-foreground); }
          @media (max-width: 520px) {
            .sign-in-page { padding: 32px 16px; }
            .sign-in-panel { padding: 28px 24px 24px; }
            .sign-in-brand { margin-bottom: 30px; }
          }
          @media (max-width: 360px) { .sign-in-panel { padding-right: 20px; padding-left: 20px; } }
        `}</style>
      </section>
    </main>
  )
}
