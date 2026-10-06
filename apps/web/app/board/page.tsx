import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { AppHeader } from '../../components/app-header'
import { BoardClient, type BoardKudos } from '../../components/board-client'
import { SESSION_COOKIE_NAME } from '../../lib/session'

export const metadata: Metadata = {
  title: 'Team kudos — Kudos Board',
  description: 'Give a teammate a shout-out and browse the latest appreciation.',
}

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')

export default async function BoardPage() {
  const cookieStore = await cookies()
  const session = cookieStore.get(SESSION_COOKIE_NAME)?.value
  if (!session) redirect('/sign-in')

  let kudos: BoardKudos[] = []
  let initialError = false
  try {
    const response = await fetch(`${API_BASE_URL}/kudos?page=1`, {
      cache: 'no-store',
      headers: { Accept: 'application/json', Cookie: `${SESSION_COOKIE_NAME}=${session}` },
    })
    if (!response.ok) throw new Error('Could not load kudos')
    const payload: unknown = await response.json()
    if (!Array.isArray(payload)) throw new Error('Invalid kudos response')
    kudos = payload.slice(0, 20) as BoardKudos[]
  } catch {
    initialError = true
  }

  return (
    <>
      <AppHeader memberName="Team member" />
      <main className="board-main">
        <BoardClient initialKudos={kudos} initialError={initialError} />
      </main>
      <style jsx>{`
        .board-main { width: min(100% - 48px, 760px); margin: 0 auto; padding: 40px 0 64px; }
        @media (max-width: 767px) { .board-main { width: calc(100% - 32px); padding: 28px 0 48px; } }
      `}</style>
    </>
  )
}
