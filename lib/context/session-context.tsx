'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type SessionState = {
  isAuthenticated: boolean
  institutionUrl: string | null
  loading: boolean
  logout: () => Promise<void>
}

const SessionContext = createContext<SessionState>({
  isAuthenticated: false,
  institutionUrl: null,
  loading: true,
  logout: async () => {},
})

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [institutionUrl, setInstitutionUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/session/info')
      .then(r => r.json())
      .then((data: { authenticated: boolean; institutionUrl?: string }) => {
        setIsAuthenticated(data.authenticated)
        setInstitutionUrl(data.institutionUrl ?? null)
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
    window.location.href = '/auth/canvas'
  }

  return (
    <SessionContext.Provider value={{ isAuthenticated, institutionUrl, loading, logout }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  return useContext(SessionContext)
}
