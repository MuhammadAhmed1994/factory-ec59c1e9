'use client'

import type { ChangeEvent } from 'react'

type RecipientPickerProps = {
  value: string
  onChange: (value: string) => void
  invalid?: boolean
  disabled?: boolean
}

/** The API contract identifies recipients by member id, so the picker accepts that id. */
export function RecipientPicker({ value, onChange, invalid = false, disabled = false }: RecipientPickerProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.currentTarget.value)
  }

  return (
    <div className="recipient-field">
      <label htmlFor="kudos-recipient">Recipient</label>
      <input
        id="kudos-recipient"
        name="recipientId"
        autoComplete="off"
        value={value}
        onChange={handleChange}
        placeholder="Enter a teammate’s member ID"
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? 'recipient-error' : 'recipient-hint'}
        disabled={disabled}
        required
      />
      {invalid ? <span id="recipient-error" className="field-error" role="alert">Choose a recipient.</span> : <span id="recipient-hint" className="hint">Choose the teammate you’d like to recognize.</span>}
      <style jsx>{`
        .recipient-field { display: grid; gap: 7px; }
        label { color: var(--color-foreground); font-size: 14px; font-weight: 500; }
        input { width: 100%; min-height: 44px; padding: 10px 13px; border: 1px solid var(--color-border); border-radius: 8px; background: #fff; color: var(--color-foreground); font-size: 14px; }
        input::placeholder { color: #737A7E; }
        input[aria-invalid="true"] { border-color: var(--color-destructive); }
        input:focus-visible { outline: 3px solid var(--color-ring); outline-offset: 2px; }
        .hint, .field-error { color: var(--color-muted-foreground); font-size: 12px; line-height: 17px; }
        .field-error { color: var(--color-destructive); }
      `}</style>
    </div>
  )
}
