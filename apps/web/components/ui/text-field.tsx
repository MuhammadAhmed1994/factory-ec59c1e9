import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string
  type?: 'email' | 'password' | 'search' | 'text'
  error?: string
  hint?: string
  leadingIcon?: ReactNode
}

export function TextField({
  id: providedId,
  label,
  type = 'text',
  error,
  hint,
  className = '',
  leadingIcon,
  ...inputProps
}: TextFieldProps) {
  const generatedId = useId()
  const id = providedId ?? `field-${generatedId}`
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [inputProps['aria-describedby'], hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>{label}</label>
      <div className={`field__control ${leadingIcon ? 'field__control--icon' : ''}`}>
        {leadingIcon && <span className="field__icon" aria-hidden="true">{leadingIcon}</span>}
        <input
          {...inputProps}
          id={id}
          type={type}
          className={`field__input ${error ? 'field__input--invalid' : ''} ${className}`.trim()}
          aria-invalid={error ? true : inputProps['aria-invalid']}
          aria-describedby={describedBy}
        />
      </div>
      {hint && <p id={hintId} className="field__hint">{hint}</p>}
      {error && <p id={errorId} className="field__error">{error}</p>}
      <style jsx>{`
        .field { display: grid; gap: 6px; width: 100%; }
        .field__label { color: var(--color-foreground); font-size: 14px; font-weight: 500; line-height: 20px; }
        .field__control { position: relative; }
        .field__input { width: 100%; min-height: 44px; padding: 10px 12px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-card); color: var(--color-foreground); font: 400 16px/22px var(--font-sans); transition: border-color var(--motion-fast) var(--ease-enter), box-shadow var(--motion-fast) var(--ease-enter); }
        .field__input::placeholder { color: var(--color-muted-foreground); }
        .field__input:focus { border-color: var(--color-ring); outline: 3px solid color-mix(in srgb, var(--color-ring) 22%, transparent); outline-offset: 1px; }
        .field__input:disabled { background: var(--color-muted); color: var(--color-muted-foreground); cursor: not-allowed; }
        .field__input--invalid { border-color: #A3312C; }
        .field__control--icon .field__input { padding-left: 40px; }
        .field__icon { position: absolute; z-index: 1; left: 12px; top: 50%; display: flex; color: var(--color-muted-foreground); transform: translateY(-50%); pointer-events: none; }
        .field__hint, .field__error { margin: 0; font-size: 12px; line-height: 16px; }
        .field__hint { color: var(--color-muted-foreground); }
        .field__error { color: #A3312C; }
        @media (prefers-reduced-motion: reduce) { .field__input { transition: none; } }
      `}</style>
    </div>
  )
}
