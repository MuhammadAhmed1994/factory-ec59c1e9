type LiveStatusState = 'live' | 'reconnecting' | 'offline'

type LiveStatusProps = {
  state: LiveStatusState
  className?: string
}

const statusContent: Record<LiveStatusState, { icon: string; text: string }> = {
  live: { icon: '●', text: 'Live' },
  reconnecting: { icon: '↻', text: 'Reconnecting' },
  offline: { icon: '×', text: 'Offline' },
}

export function LiveStatus({ state, className = '' }: LiveStatusProps) {
  const content = statusContent[state]
  return (
    <span className={`live-status live-status--${state} ${className}`.trim()} role="status" aria-label={`Board connection: ${content.text}`}>
      <span className="live-status__icon" aria-hidden="true">{content.icon}</span>
      <span>{content.text}</span>
      <style jsx>{`
        .live-status { display: inline-flex; align-items: center; gap: 7px; min-height: 28px; padding: 3px 10px; border: 1px solid var(--color-border); border-radius: 999px; background: var(--color-card); color: var(--color-foreground); font-size: 12px; font-weight: 500; line-height: 18px; }
        .live-status__icon { display: inline-grid; width: 16px; height: 16px; place-items: center; font-size: 11px; font-weight: 700; }
        .live-status--live .live-status__icon { color: #28684A; }
        .live-status--reconnecting .live-status__icon { color: #805315; }
        .live-status--offline .live-status__icon { color: #A3312C; }
        .live-status--reconnecting .live-status__icon { animation: turn 1.4s linear infinite; }
        @keyframes turn { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { .live-status--reconnecting .live-status__icon { animation: none; } }
      `}</style>
    </span>
  )
}
