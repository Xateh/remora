'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'

export async function initiateCanvasOAuth(institutionUrl: string): Promise<never> {
  // Validate URL format
  let url: URL
  try {
    url = new URL(institutionUrl)
  } catch {
    throw new Error('Invalid institution URL')
  }

  // Generate CSRF state token
  const state = randomBytes(16).toString('hex')

  const cookieStore = await cookies()

  // Store state and institution URL in temp cookies (5 min TTL)
  cookieStore.set('canvas_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 300,
    path: '/',
  })
  cookieStore.set('canvas_institution_url', url.origin, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 300,
    path: '/',
  })

  const params = new URLSearchParams({
    client_id: process.env.CANVAS_CLIENT_ID!,
    redirect_uri: process.env.CANVAS_REDIRECT_URI!,
    response_type: 'code',
    state,
  })

  redirect(`${url.origin}/login/oauth2/auth?${params}`)
}
