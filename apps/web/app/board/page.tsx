import { AppHeader } from '@/components/app-header'
import { BoardClient } from '@/components/board-client'

export default function BoardPage() {
  return (
    <div className="app-shell">
      <AppHeader memberName="Team member" />
      <main className="board-main">
        <BoardClient />
      </main>
      <style jsx>{`
        .board-main { width: min(100% - 48px, 760px); margin: 0 auto; padding: 40px 0 64px; }
        @media (max-width: 767px) { .board-main { width: calc(100% - 32px); padding: 29px 0 48px; } }
      `}</style>
    </div>
  )
}
