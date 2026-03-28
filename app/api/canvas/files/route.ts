import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { sessionOptions } from '@/lib/session'
import type { SessionData } from '@/lib/session'

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url)
  const courseId = searchParams.get('courseId')

  if (!courseId) {
    return Response.json({ error: 'courseId required' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions)

  if (!session.canvasToken) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const res = await fetch(
    `${session.institutionUrl}/api/v1/courses/${courseId}/files?per_page=100`,
    {
      headers: { Authorization: `Bearer ${session.canvasToken}` },
    }
  )

  if (!res.ok) {
    return Response.json({ error: 'Canvas API error' }, { status: res.status })
  }

  const files = await res.json()
  return Response.json(files)
}
