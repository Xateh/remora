'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { sessionOptions, SessionData } from '@/lib/session'

export async function loginWithEmail(email: string) {
  const cookieStore = await cookies()
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions)

  // In a real app, you'd send a magic link or check a password here.
  // For now, we'll just start the session as requested.
  session.email = email
  session.loginType = 'email'
  
  await session.save()
  
  redirect('/dashboard')
}
