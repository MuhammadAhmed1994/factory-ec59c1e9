'use client'

export type RecipientPickerProps = {
  value: string
  onChange: (value: string) => void
  error?: string
  disabled?: boolean
}

/** The API accepts a recipient identifier but does not expose a people-list endpoint. */
export function RecipientPicker({ value, onChange, error, disabled = false }: RecipientPickerProps) {
  const errorId = error ? 'recipient-error' : undefined
  return (
    <div className="recipient-field">
      <label htmlFor="kudos-recipient">Recipient</label>
      <input
        id="kudos-recipient"
        name="recipient"
        type="text"
        role="combobox"
        aria-autocomplete="none"
        aria-required="true"
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        autoComplete="off"
        placeholder="Enter a teammate’s name or ID"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        disabled={disabled}
        required
      />
      {error && <p className="field-error" id={errorId} role="alert">{error}</p>}
      <style jsx>{`
        .recipient-field { display: grid; gap: 7px; }
        label { font-size: 14px; font-weight: 500; }
        input { width: 100%; min-height: 44px; padding: 10px 12px; color: var(--color-foreground); background: #fff; border: 1px solid var(--color-border); border-radius: 8px; }
        input::placeholder { color: var(--color-muted-foreground); }
        input[aria-invalid="true"] { border-color: var(--color-destructive); }
        .field-error { margin: 0; color: var(--color-destructive); font-size: 13px; }
      `}</style>
    </div>
  )
}
