import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { sessionOptions } from '@/lib/session'
import type { SessionData } from '@/lib/session'

export async function GET(): Promise<Response> {
  const cookieStore = await cookies()
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions)

  if (!session.canvasToken) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const res = await fetch(
    `${session.institutionUrl}/api/v1/courses?per_page=50&enrollment_state=active`,
    {
      headers: { Authorization: `Bearer ${session.canvasToken}` },
    }
  )

  if (!res.ok) {
    return Response.json({ error: 'Canvas API error' }, { status: res.status })
  }

  const courses = await res.json()
  return Response.json(courses)
}
