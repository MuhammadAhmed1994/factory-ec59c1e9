'use client'

type RecipientPickerProps = {
  value: string
  onChange: (value: string) => void
  error?: string
  disabled?: boolean
}

export function RecipientPicker({ value, onChange, error, disabled = false }: RecipientPickerProps) {
  const errorId = error ? 'recipient-error' : undefined
  return (
    <div className="recipient-field">
      <label htmlFor="kudos-recipient">Recipient</label>
      <input
        id="kudos-recipient"
        name="recipientId"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Enter a teammate’s member ID"
        autoComplete="off"
        required
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId ?? 'recipient-hint'}
      />
      {error ? <p id={errorId} className="field-error">{error}</p> : <p id="recipient-hint" className="field-hint">Choose a teammate to recognize.</p>}
      <style jsx>{`
        .recipient-field { display: grid; gap: 6px; }
        label { color: var(--color-foreground); font-size: 14px; font-weight: 500; }
        input { width: 100%; min-height: 44px; padding: 10px 13px; border: 1px solid var(--color-border); border-radius: 8px; background: #fff; color: var(--color-foreground); font-size: 14px; }
        input::placeholder { color: #737A7E; }
        input[aria-invalid="true"] { border-color: var(--color-destructive); }
        input:focus-visible { outline: 3px solid var(--color-ring); outline-offset: 2px; }
        .field-hint, .field-error { margin: 0; font-size: 12px; line-height: 17px; }
        .field-hint { color: var(--color-muted-foreground); }
        .field-error { color: var(--color-destructive); }
      `}</style>
    </div>
  )
}
