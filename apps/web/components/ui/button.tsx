import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'destructive'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  loading?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <>
      <button
        {...props}
        type={type}
        className={`button button--${variant} ${className}`.trim()}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
      >
        <span className="button__label" aria-hidden={loading || undefined}>{children}</span>
        {loading && <span className="button__spinner" aria-hidden="true" />}
        {loading && <span className="button__loading-text">Loading</span>}
      </button>
      <style jsx>{`
        .button {
          position: relative;
          display: inline-flex;
          min-height: 42px;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 9px 16px;
          border: 1px solid transparent;
          border-radius: 8px;
          font: 500 14px/20px var(--font-sans);
          cursor: pointer;
          transition: background-color var(--motion-fast) var(--ease-enter), border-color var(--motion-fast) var(--ease-enter), color var(--motion-fast) var(--ease-enter), transform var(--motion-fast) var(--ease-enter);
        }
        .button:hover:not(:disabled) { transform: translateY(-1px); }
        .button:focus-visible { outline: 3px solid var(--color-ring); outline-offset: 3px; }
        .button:disabled { cursor: not-allowed; opacity: .62; }
        .button--primary { background: var(--color-primary); color: #fff; }
        .button--primary:hover:not(:disabled) { background: #9f3c34; }
        .button--secondary { border-color: var(--color-border); background: var(--color-card); color: var(--color-foreground); }
        .button--secondary:hover:not(:disabled) { background: var(--color-muted); }
        .button--quiet { background: transparent; color: var(--color-foreground); }
        .button--quiet:hover:not(:disabled) { background: var(--color-muted); }
        .button--destructive { background: #A3312C; color: #fff; }
        .button--destructive:hover:not(:disabled) { background: #842822; }
        .button__label { white-space: nowrap; }
        .button__spinner { position: absolute; width: 16px; height: 16px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: spin .8s linear infinite; }
        .button__loading-text { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { .button, .button__spinner { transition: none; animation-duration: 0.01ms; } }
      `}</style>
    </>
  )
}
