'use client'

type RecipientPickerProps = {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  error?: string | null
}

export function RecipientPicker({ value, onChange, disabled = false, error }: RecipientPickerProps) {
  return (
    <div className="recipient-field">
      <label htmlFor="kudos-recipient">Recipient</label>
      <input
        id="kudos-recipient"
        name="recipientId"
        type="text"
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Enter a teammate’s account ID"
        disabled={disabled}
        required
        aria-invalid={Boolean(error)}
        aria-describedby={error ? 'recipient-error recipient-help' : 'recipient-help'}
      />
      <span id="recipient-help" className="recipient-help">Choose the teammate you’d like to recognize.</span>
      {error && <span id="recipient-error" className="recipient-error">{error}</span>}
      <style jsx>{`
        .recipient-field { display: grid; gap: 7px; }
        label { color: var(--color-foreground); font-size: 14px; font-weight: 500; }
        input { width: 100%; min-height: 44px; padding: 10px 13px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-card); color: var(--color-foreground); font-size: 14px; }
        input::placeholder { color: var(--color-muted-foreground); }
        input[aria-invalid="true"] { border-color: var(--color-destructive); }
        input:disabled { opacity: .7; }
        .recipient-help, .recipient-error { font-size: 12px; line-height: 17px; }
        .recipient-help { color: var(--color-muted-foreground); }
        .recipient-error { color: var(--color-destructive); }
      `}</style>
    </div>
  )
}
