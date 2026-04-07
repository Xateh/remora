import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { sessionOptions } from '@/lib/session'
import type { SessionData } from '@/lib/session'

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Handle OAuth errors from Canvas
  if (error) {
    return Response.redirect(new URL(`/auth/canvas?error=${encodeURIComponent(error)}`, request.url))
  }

  const cookieStore = await cookies()
  const expectedState = cookieStore.get('canvas_oauth_state')?.value
  const institutionUrl = cookieStore.get('canvas_institution_url')?.value

  // Validate CSRF state and required params
  if (!code || !state || state !== expectedState || !institutionUrl) {
    return Response.redirect(new URL('/auth/canvas?error=invalid_state', request.url))
  }

  // Clear temp cookies
  cookieStore.delete('canvas_oauth_state')
  cookieStore.delete('canvas_institution_url')

  // Exchange code for access token
  let access_token: string
  try {
    const tokenRes = await fetch(`${institutionUrl}/login/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: process.env.CANVAS_CLIENT_ID,
        client_secret: process.env.CANVAS_CLIENT_SECRET,
        redirect_uri: process.env.CANVAS_REDIRECT_URI,
        code,
      }),
    })

    if (!tokenRes.ok) {
      return Response.redirect(new URL('/auth/canvas?error=token_exchange_failed', request.url))
    }

    const tokenData = await tokenRes.json() as { access_token: string }
    access_token = tokenData.access_token
  } catch {
    return Response.redirect(new URL('/auth/canvas?error=network_error', request.url))
  }

  // Store in encrypted iron-session cookie
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions)
  session.canvasToken = access_token
  session.institutionUrl = institutionUrl
  session.loginType = 'canvas'
  await session.save()

  return Response.redirect(new URL('/dashboard', request.url))
}
