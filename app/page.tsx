import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { sessionOptions } from '@/lib/session'
import type { SessionData } from '@/lib/session'
import { redirect } from 'next/navigation'

export default async function Home() {
  const cookieStore = await cookies()
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions)

  const isAuthed = session.canvasToken || session.email

  if (isAuthed) {
    redirect('/dashboard')
  } else {
    redirect('/auth/canvas')
  }
}
