'use client'

export type RecipientOption = { id: string; name: string }

type RecipientPickerProps = {
  value: string
  options?: RecipientOption[]
  onChange: (recipientId: string) => void
  error?: string
}

export function RecipientPicker({ value, options = [], onChange, error }: RecipientPickerProps) {
  const fieldId = 'kudos-recipient'
  const errorId = 'recipient-error'
  const hintId = 'recipient-hint'
  const listId = 'recipient-options'
  const match = options.find((option) => option.name === value || option.id === value)

  return (
    <div className="recipient-field">
      <label htmlFor={fieldId}>Recipient</label>
      <input
        id={fieldId}
        type="text"
        role="combobox"
        aria-required="true"
        aria-autocomplete="list"
        aria-expanded={options.length > 0}
        aria-controls={listId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${hintId} ${errorId}` : hintId}
        list={listId}
        value={match?.name ?? value}
        placeholder="Choose a teammate"
        autoComplete="off"
        onChange={(event) => {
          const next = event.currentTarget.value
          const selected = options.find((option) => option.name === next || option.id === next)
          onChange(selected?.id ?? next)
        }}
      />
      <datalist id={listId}>
        {options.map((option) => <option key={option.id} value={option.name} />)}
      </datalist>
      <span className="recipient-hint" id={hintId}>{options.length ? 'Choose a teammate from the list.' : 'Enter a teammate’s member ID.'}</span>
      {error && <span className="field-error" id={errorId}>{error}</span>}
      <style jsx>{`
        .recipient-field { display: grid; gap: 6px; }
        label { color: var(--color-foreground); font-size: 14px; font-weight: 500; }
        input { width: 100%; min-height: 44px; padding: 10px 12px; border: 1px solid var(--color-border); border-radius: 8px; background: #fff; color: var(--color-foreground); font-size: 14px; }
        input[aria-invalid="true"] { border-color: var(--color-destructive); }
        .recipient-hint { color: var(--color-muted-foreground); font-size: 12px; }
        .field-error { color: var(--color-destructive); font-size: 13px; }
      `}</style>
    </div>
  )
}
