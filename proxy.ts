import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Routes that don't need auth
  const isPublic =
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/session/') ||
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    pathname === '/'

  if (isPublic) {
    return NextResponse.next()
  }

  // Check for session cookie (lightweight — actual validity verified per route)
  const hasSession = request.cookies.has('canvas_session')

  if (!hasSession) {
    return NextResponse.redirect(new URL('/auth/canvas', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/canvas/:path*',
    '/api/chat/:path*',
    '/api/upload/:path*',
    '/api/tinyfish/:path*',
  ],
}
