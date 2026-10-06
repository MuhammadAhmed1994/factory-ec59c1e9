import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { AppHeader } from '../../components/app-header'
import { BoardClient } from '../../components/board-client'
import { SESSION_COOKIE_NAME } from '../../lib/session'

export const metadata: Metadata = {
  title: 'Team kudos — Kudos Board',
  description: 'Share appreciation and browse the latest kudos from your team.',
}

type SessionClaims = { name?: string; role?: string }

async function readDisplayClaims(): Promise<SessionClaims> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value
  const payload = token?.split('.')[1]
  if (!payload) return {}
  try {
    // These claims only control presentation; the API authorizes every protected action.
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SessionClaims
  } catch {
    return {}
  }
}

export default async function BoardPage() {
  const claims = await readDisplayClaims()
  const isTeamLead = claims.role === 'TEAM_LEAD'
  return (
    <div className="app-shell">
      <AppHeader memberName={claims.name || 'Signed-in member'} memberRole={isTeamLead ? 'lead' : 'member'} />
      <BoardClient isTeamLead={isTeamLead} />
    </div>
  )
}
