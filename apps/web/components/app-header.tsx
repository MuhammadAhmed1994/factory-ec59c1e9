import Link from 'next/link'
import type { ReactNode } from 'react'

export type AppHeaderProps = {
  memberName: string
  memberRole?: 'member' | 'lead'
  actions?: ReactNode
}

export function AppHeader({ memberName, memberRole = 'member', actions }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header-inner">
        <Link className="app-brand" href="/board" aria-label="Kudos Board home">Kudos Board</Link>
        <nav className="app-nav" aria-label="Member navigation">
          <Link href="/board">Board</Link>
          {actions}
          <span className="member-identity">
            <span className="member-name">{memberName}</span>
            <span className="member-role">{memberRole === 'lead' ? 'Team lead' : 'Team member'}</span>
          </span>
        </nav>
      </div>
      <style jsx>{`
        .member-identity { display: inline-flex; align-items: center; gap: 8px; margin-left: 8px; color: var(--color-foreground); font-size: 14px; }
        .member-name { font-weight: 600; }
        .member-role { padding: 3px 8px; border-radius: 999px; background: var(--color-muted); color: var(--color-muted-foreground); font-size: 12px; }
        @media (max-width: 560px) { .app-header-inner { flex-wrap: wrap; padding: 10px 0; } .app-nav { display: flex; flex-wrap: wrap; align-items: center; } }
      `}</style>
    </header>
  )
}
