import Link from 'next/link'
import type { ReactNode } from 'react'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <Link className="app-brand" href="/board">Team Kudos</Link>
          <nav className="app-nav" aria-label="Main navigation">
            <Link href="/board">Kudos board</Link>
          </nav>
        </div>
      </header>
      <main className="app-main">{children}</main>
    </div>
  )
}
