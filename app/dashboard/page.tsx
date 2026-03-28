import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { sessionOptions } from '@/lib/session'
import type { SessionData } from '@/lib/session'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/DashboardShell'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions)

  if (!session.canvasToken) {
    redirect('/auth/canvas')
  }

  return <DashboardShell />
}
