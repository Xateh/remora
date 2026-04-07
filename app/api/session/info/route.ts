import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { sessionOptions } from '@/lib/session'
import type { SessionData } from '@/lib/session'

export async function GET(): Promise<Response> {
  const cookieStore = await cookies()
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions)

  const authenticated = !!(session.canvasToken || session.email)

  if (!authenticated) {
    return Response.json({ authenticated: false })
  }

  return Response.json({
    authenticated: true,
    institutionUrl: session.institutionUrl,
    email: session.email,
    loginType: session.loginType,
  })
}
