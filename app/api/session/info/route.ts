import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { sessionOptions } from '@/lib/session'
import type { SessionData } from '@/lib/session'

export async function GET(): Promise<Response> {
  const cookieStore = await cookies()
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions)

  if (!session.canvasToken) {
    return Response.json({ authenticated: false })
  }

  return Response.json({
    authenticated: true,
    institutionUrl: session.institutionUrl,
  })
}
