'use client'

export type RecipientOption = { id: string; name: string }

type RecipientPickerProps = {
  options: RecipientOption[]
  value: string
  onChange: (recipientId: string, displayValue: string) => void
  error?: string
}

export function RecipientPicker({ options, value, onChange, error }: RecipientPickerProps) {
  const listId = 'recipient-options'
  return (
    <div className="recipient-field">
      <label htmlFor="kudos-recipient">Recipient</label>
      <input
        id="kudos-recipient"
        name="recipient"
        type="text"
        list={listId}
        autoComplete="off"
        value={value}
        placeholder="Choose a teammate or enter their member ID"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? 'recipient-error recipient-help' : 'recipient-help'}
        onChange={(event) => {
          const displayValue = event.currentTarget.value
          const match = options.find((option) => option.name.toLocaleLowerCase() === displayValue.trim().toLocaleLowerCase())
            ?? options.find((option) => option.id === displayValue.trim())
          onChange(match?.id ?? displayValue.trim(), displayValue)
        }}
      />
      <datalist id={listId}>
        {options.map((option) => <option key={option.id} value={option.name} />)}
      </datalist>
      <span className="field-help" id="recipient-help">Choose a name from recent kudos, or enter the teammate’s member ID.</span>
      {error && <span className="field-error" id="recipient-error" role="alert">{error}</span>}
      <style jsx>{`
        .recipient-field { display: grid; gap: 6px; }
        label { color: var(--color-foreground); font-size: 14px; font-weight: 500; }
        input { width: 100%; min-height: 44px; padding: 10px 13px; border: 1px solid var(--color-border); border-radius: 8px; background: #fff; color: var(--color-foreground); font-size: 14px; }
        input::placeholder { color: #737A7E; }
        input[aria-invalid="true"] { border-color: var(--color-destructive); }
        .field-help, .field-error { font-size: 12px; line-height: 18px; }
        .field-help { color: var(--color-muted-foreground); }
        .field-error { color: var(--color-destructive); }
      `}</style>
    </div>
  )
}
