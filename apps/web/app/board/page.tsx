import type { Metadata } from 'next'
import { AppShell } from '@/components/app-shell'
import { BoardClient } from '@/components/board-client'

export const metadata: Metadata = {
  title: 'Team kudos — Kudos Board',
  description: 'Share appreciation and browse your team’s latest kudos.',
}

export default function BoardPage() {
  return (
    <AppShell>
      <BoardClient />
    </AppShell>
  )
}
