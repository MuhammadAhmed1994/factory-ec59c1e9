import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { AppShell } from '../../components/app-shell'
import { BoardClient, type BoardPageData } from '../../components/board-client'

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')

function sessionIsTeamLead(token: string | undefined): boolean {
  const secret = process.env.JWT_SECRET ?? process.env.SESSION_SECRET
  if (!token || !secret) return false
  const parts = token.split('.')
  if (parts.length !== 3) return false

  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as { alg?: unknown }
    if (header.alg !== 'HS256') return false
    const expected = createHmac('sha256', secret).update(`${parts[0]}.${parts[1]}`).digest()
    const actual = Buffer.from(parts[2], 'base64url')
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as { role?: unknown; exp?: unknown; nbf?: unknown }
    const now = Math.floor(Date.now() / 1000)
    return payload.role === 'TEAM_LEAD' && !(typeof payload.exp === 'number' && payload.exp <= now) && !(typeof payload.nbf === 'number' && payload.nbf > now)
  } catch {
    return false
  }
}

async function getInitialBoardPage(): Promise<BoardPageData | null> {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.toString()
  try {
    const response = await fetch(`${API_BASE_URL}/kudos?page=1`, {
      headers: { Accept: 'application/json', Cookie: cookieHeader },
      cache: 'no-store',
    })
    if (!response.ok) return null
    return await response.json() as BoardPageData
  } catch {
    return null
  }
}

export default async function BoardPage() {
  const cookieStore = await cookies()
  const [initialPage, teamLead] = await Promise.all([
    getInitialBoardPage(),
    Promise.resolve(sessionIsTeamLead(cookieStore.get('session')?.value)),
  ])

  return (
    <AppShell>
      <BoardClient initialPage={initialPage} teamLead={teamLead} />
    </AppShell>
  )
}
