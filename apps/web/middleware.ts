import { NextResponse, type NextRequest } from 'next/server'

const SESSION_COOKIE_NAME = 'session'

export function middleware(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE_NAME)
  if (hasSession) return NextResponse.next()

  const signInUrl = new URL('/sign-in', request.url)
  signInUrl.searchParams.set('callbackUrl', `${request.nextUrl.pathname}${request.nextUrl.search}`)
  return NextResponse.redirect(signInUrl)
}

export const config = {
  matcher: ['/board/:path*'],
}
