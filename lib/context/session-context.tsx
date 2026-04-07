'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type SessionState = {
  isAuthenticated: boolean
  institutionUrl: string | null
  email: string | null
  loginType: 'canvas' | 'email' | null
  loading: boolean
  logout: () => Promise<void>
}

const SessionContext = createContext<SessionState>({
  isAuthenticated: false,
  institutionUrl: null,
  email: null,
  loginType: null,
  loading: true,
  logout: async () => {},
})

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [institutionUrl, setInstitutionUrl] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [loginType, setLoginType] = useState<'canvas' | 'email' | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/session/info')
      .then(r => r.json())
      .then((data: { 
        authenticated: boolean; 
        institutionUrl?: string; 
        email?: string; 
        loginType?: 'canvas' | 'email' 
      }) => {
        setIsAuthenticated(data.authenticated)
        setInstitutionUrl(data.institutionUrl ?? null)
        setEmail(data.email ?? null)
        setLoginType(data.loginType ?? null)
      })
      .catch(() => {
        setIsAuthenticated(false)
      })
      .finally(() => setLoading(false))
  }, [])

  async function logout() {
    await fetch('/api/session/logout', { method: 'POST' })
    setIsAuthenticated(false)
    setInstitutionUrl(null)
    setEmail(null)
    setLoginType(null)
    window.location.href = '/auth/canvas'
  }

  return (
    <SessionContext.Provider value={{ isAuthenticated, institutionUrl, email, loginType, loading, logout }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  return useContext(SessionContext)
}
