import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { AppHeader } from '@/components/app-header'
import { BoardClient, type BoardKudos } from '@/components/board-client'
import { SESSION_COOKIE_NAME } from '@/lib/session'

const PAGE_SIZE = 20

function readMember(token?: string) {
  try {
    const payload = token?.split('.')[1]
    if (!payload) return { name: 'Team member', isTeamLead: false }
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { name?: string; role?: string }
    return { name: decoded.name ?? 'Team member', isTeamLead: decoded.role === 'TEAM_LEAD' }
  } catch {
    return { name: 'Team member', isTeamLead: false }
  }
}

function newestFirst(items: BoardKudos[]) {
  return [...items].sort((left, right) => {
    const byDate = Date.parse(right.createdAt) - Date.parse(left.createdAt)
    return byDate || right.id.localeCompare(left.id)
  })
}

async function loadFirstPage(cookie: string): Promise<{ kudos: BoardKudos[]; error?: string }> {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  try {
    const response = await fetch(`${base}/kudos?page=1`, {
      headers: { Accept: 'application/json', Cookie: cookie },
      cache: 'no-store',
    })
    if (!response.ok) return { kudos: [], error: "The board couldn't be updated. Retrying…" }
    const data: unknown = await response.json()
    const visible = Array.isArray(data) ? (data as BoardKudos[]).filter((item) => !item.isHidden) : []
    return { kudos: newestFirst(visible).slice(0, PAGE_SIZE) }
  } catch {
    return { kudos: [], error: "The board couldn't be updated. Retrying…" }
  }
}

export default async function BoardPage() {
  const cookieStore = await cookies()
  const session = cookieStore.get(SESSION_COOKIE_NAME)?.value
  if (!session) redirect('/sign-in?callbackUrl=%2Fboard')

  const member = readMember(session)
  const initial = await loadFirstPage(`${SESSION_COOKIE_NAME}=${session}`)
  return (
    <AppShell>
      <AppHeader memberName={member.name} memberRole={member.isTeamLead ? 'lead' : 'member'} />
      <BoardClient initialKudos={initial.kudos} initialError={initial.error} isTeamLead={member.isTeamLead} />
    </AppShell>
  )
}
