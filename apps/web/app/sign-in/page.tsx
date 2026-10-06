import type { Metadata } from 'next'
import { SignInForm } from '../../components/sign-in-form'

export const metadata: Metadata = {
  title: 'Sign in — Kudos Board',
  description: 'Sign in to your team Kudos Board.',
}

export default function SignInPage() {
  return (
    <main className="signin-page">
      <section className="signin-panel" aria-labelledby="signin-title">
        <div className="signin-brand" aria-label="Kudos Board">
          <span className="signin-brand-mark" aria-hidden="true">✦</span>
          <span className="signin-brand-copy">
            <strong>Kudos Board</strong>
            <span>A little appreciation goes a long way.</span>
          </span>
        </div>

        <header className="signin-intro">
          <h1 id="signin-title">Sign in to Kudos Board</h1>
          <p>Use your team account to continue.</p>
        </header>

        <SignInForm />
      </section>

      <style jsx>{`
        .signin-page {
          position: relative;
          isolation: isolate;
          display: grid;
          min-height: 100vh;
          min-height: 100svh;
          place-items: center;
          overflow: hidden;
          padding: 48px 24px;
          background:
            radial-gradient(ellipse at 50% 37%, rgba(255, 255, 255, .86) 0%, transparent 54%),
            var(--color-background);
        }
        .signin-page::before, .signin-page::after {
          position: absolute;
          z-index: -1;
          width: 520px;
          height: 520px;
          border: 1px solid rgba(185, 71, 61, .08);
          border-radius: 50%;
          content: '';
          pointer-events: none;
        }
        .signin-page::before {
          top: -230px;
          right: -180px;
          box-shadow: 0 0 0 34px rgba(185, 71, 61, .025), 0 0 0 82px rgba(185, 71, 61, .018);
        }
        .signin-page::after {
          bottom: -260px;
          left: -220px;
          border-color: rgba(34, 42, 48, .055);
          box-shadow: 0 0 0 44px rgba(34, 42, 48, .018);
        }
        .signin-panel {
          width: min(100%, 448px);
          padding: 36px 40px 40px;
          border: 1px solid rgba(217, 216, 210, .9);
          border-radius: 16px;
          background: var(--color-card);
          box-shadow: 0 2px 6px rgba(34, 42, 48, .035), 0 18px 52px rgba(34, 42, 48, .075);
        }
        .signin-brand { display: flex; align-items: center; gap: 11px; margin-bottom: 36px; }
        .signin-brand-mark {
          display: grid;
          width: 38px;
          height: 38px;
          flex: 0 0 38px;
          place-items: center;
          color: var(--color-primary);
          border: 1px solid rgba(185, 71, 61, .18);
          border-radius: 12px;
          background: #FBF2EF;
          font-size: 19px;
        }
        .signin-brand-copy { display: grid; gap: 3px; }
        .signin-brand-copy strong { font-size: 14px; font-weight: 650; letter-spacing: -.02em; line-height: 18px; }
        .signin-brand-copy > span { color: var(--color-muted-foreground); font-size: 12px; line-height: 16px; }
        .signin-intro { margin-bottom: 25px; }
        .signin-intro h1 { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -.035em; line-height: 32px; }
        .signin-intro p { margin: 8px 0 0; color: var(--color-muted-foreground); font-size: 14px; line-height: 21px; }
        @media (max-width: 520px) {
          .signin-page { padding: 32px 16px; }
          .signin-panel { width: 100%; padding: 28px 24px 30px; }
          .signin-brand { margin-bottom: 30px; }
        }
        @media (max-width: 360px) { .signin-panel { padding-right: 20px; padding-left: 20px; } }
      `}</style>
    </main>
  )
}
