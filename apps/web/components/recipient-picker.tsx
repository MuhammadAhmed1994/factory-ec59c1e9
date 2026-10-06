'use client'

type RecipientPickerProps = {
  value: string
  onChange: (recipientId: string) => void
  error?: string | null
  disabled?: boolean
}

/** The API accepts a recipient account ID; no directory endpoint is part of this contract. */
export function RecipientPicker({ value, onChange, error, disabled = false }: RecipientPickerProps) {
  return (
    <div className="recipient-picker">
      <label htmlFor="kudos-recipient">Recipient</label>
      <input
        id="kudos-recipient"
        name="recipientId"
        type="text"
        role="combobox"
        aria-autocomplete="none"
        aria-expanded="false"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? 'recipient-error recipient-help' : 'recipient-help'}
        placeholder="Enter teammate's account ID"
        autoComplete="off"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
      <span id="recipient-help" className="recipient-help">Choose the teammate you’re recognizing.</span>
      {error && <span id="recipient-error" className="recipient-error" role="alert">{error}</span>}
      <style jsx>{`
        .recipient-picker { display: grid; gap: 6px; }
        label { color: var(--color-foreground); font-size: 14px; font-weight: 500; }
        input { width: 100%; min-height: 44px; padding: 10px 12px; border: 1px solid var(--color-border); border-radius: 8px; background: #fff; color: var(--color-foreground); font: inherit; font-size: 14px; }
        input::placeholder { color: #737A7E; }
        input[aria-invalid="true"] { border-color: var(--color-destructive); }
        input:disabled { opacity: .7; }
        .recipient-help { color: var(--color-muted-foreground); font-size: 12px; line-height: 17px; }
        .recipient-error { color: var(--color-destructive); font-size: 13px; }
      `}</style>
    </div>
  )
}
