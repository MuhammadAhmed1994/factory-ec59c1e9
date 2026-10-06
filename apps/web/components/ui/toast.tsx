'use client'

import type { ReactNode } from 'react'

type ToastProps = {
  variant?: 'success' | 'error' | 'info'
  title?: string
  children: ReactNode
  onDismiss?: () => void
  className?: string
}

const presentation = {
  success: { icon: '✓', label: 'Success' },
  error: { icon: '!', label: 'Error' },
  info: { icon: 'i', label: 'Information' },
} as const

export function Toast({ variant = 'info', title, children, onDismiss, className = '' }: ToastProps) {
  const tone = presentation[variant]
  return (
    <div className={`toast toast--${variant} ${className}`.trim()} role="status" aria-live="polite" aria-atomic="true">
      <span className="toast__icon" aria-hidden="true">{tone.icon}</span>
      <div className="toast__body">
        <span className="toast__kind">{title ?? tone.label}</span>
        <div className="toast__message">{children}</div>
      </div>
      {onDismiss && <button className="toast__dismiss" type="button" onClick={onDismiss} aria-label="Dismiss notification">×</button>}
      <style jsx>{`
        .toast { display: flex; align-items: flex-start; gap: 12px; width: 100%; padding: 14px 16px; border: 1px solid var(--color-border); border-left: 4px solid var(--tone); border-radius: 8px; background: var(--color-card); color: var(--color-foreground); box-shadow: 0 2px 8px rgba(34,42,48,.06); }
        .toast--success { --tone: #28684A; }
        .toast--error { --tone: #A3312C; }
        .toast--info { --tone: #285E78; }
        .toast__icon { display: grid; flex: 0 0 22px; width: 22px; height: 22px; place-items: center; border: 1px solid var(--tone); border-radius: 50%; color: var(--tone); font-size: 13px; font-weight: 700; }
        .toast__body { flex: 1; min-width: 0; }
        .toast__kind { display: block; margin-bottom: 2px; font-size: 14px; font-weight: 600; line-height: 20px; }
        .toast__message { font-size: 14px; line-height: 20px; }
        .toast__dismiss { display: grid; flex: 0 0 32px; width: 32px; height: 32px; margin: -5px -6px 0 0; place-items: center; border: 0; border-radius: 6px; background: transparent; color: var(--color-muted-foreground); font-size: 22px; cursor: pointer; }
        .toast__dismiss:hover { background: var(--color-muted); color: var(--color-foreground); }
        .toast__dismiss:focus-visible { outline: 3px solid var(--color-ring); outline-offset: 2px; }
      `}</style>
    </div>
  )
}
