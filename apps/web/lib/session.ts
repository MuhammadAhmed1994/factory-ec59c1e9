import { cookies } from 'next/headers'

/** Cookie name set by the API for its secure, HttpOnly session. */
export const SESSION_COOKIE_NAME = 'session'

export function hasSessionCookie(cookieHeader: string | null | undefined): boolean {
  if (!cookieHeader) return false
  return cookieHeader.split(';').some((part) => part.trim().startsWith(`${SESSION_COOKIE_NAME}=`))
}

/** Server-side presence check; authorization and validity remain the API's responsibility. */
export async function isSignedIn(): Promise<boolean> {
  const cookieStore = await cookies()
  return Boolean(cookieStore.get(SESSION_COOKIE_NAME)?.value)
}
