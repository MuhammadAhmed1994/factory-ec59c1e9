'use client'

export type RecipientOption = { id: string; name: string }

type RecipientPickerProps = {
  value: string
  onChange: (recipientId: string) => void
  recipients: RecipientOption[]
  invalid?: boolean
}

export function RecipientPicker({ value, onChange, recipients, invalid = false }: RecipientPickerProps) {
  const describedBy = invalid ? 'recipient-error' : undefined

  if (recipients.length > 0) {
    return (
      <div className="recipient-picker">
        <label htmlFor="kudos-recipient">Recipient</label>
        <select
          id="kudos-recipient"
          name="recipientId"
          required
          value={value}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Choose a teammate</option>
          {recipients.map((recipient) => <option key={recipient.id} value={recipient.id}>{recipient.name}</option>)}
        </select>
        {invalid && <span id="recipient-error" className="field-error">Choose a recipient before posting.</span>}
        <style jsx>{`
          .recipient-picker { display: grid; gap: 6px; }
          label { color: var(--color-foreground); font-size: 14px; font-weight: 500; }
          select { width: 100%; min-height: 44px; padding: 9px 12px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-card); color: var(--color-foreground); }
          select[aria-invalid="true"] { border-color: var(--color-destructive); }
          .field-error { color: var(--color-destructive); font-size: 12px; }
        `}</style>
      </div>
    )
  }

  // The board API currently has no people-directory endpoint. Until one is available,
  // keep the composer usable on an empty board by accepting the recipient's member ID.
  return (
    <div className="recipient-picker">
      <label htmlFor="kudos-recipient">Recipient</label>
      <input
        id="kudos-recipient"
        name="recipientId"
        required
        value={value}
        aria-invalid={invalid}
        aria-describedby={describedBy ?? 'recipient-help'}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Choose a teammate or enter their member ID"
      />
      {!invalid && <span id="recipient-help" className="helper">Enter the teammate's member ID.</span>}
      {invalid && <span id="recipient-error" className="field-error">Choose a recipient before posting.</span>}
      <style jsx>{`
        .recipient-picker { display: grid; gap: 6px; }
        label { color: var(--color-foreground); font-size: 14px; font-weight: 500; }
        input { width: 100%; min-height: 44px; padding: 9px 12px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-card); color: var(--color-foreground); }
        input[aria-invalid="true"] { border-color: var(--color-destructive); }
        .helper, .field-error { font-size: 12px; }
        .helper { color: var(--color-muted-foreground); }
        .field-error { color: var(--color-destructive); }
      `}</style>
    </div>
  )
}
