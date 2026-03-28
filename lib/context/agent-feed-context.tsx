'use client'

import { createContext, useContext, useRef, useState, useCallback } from 'react'
import type { AgentEvent, TinyfishSSEEvent } from '@/lib/types'

type AgentFeedState = {
  events: AgentEvent[]
  isCollapsed: boolean
  isRunning: boolean
  startTinyfishRun: (url: string, goal: string) => Promise<void>
  toggleCollapsed: () => void
  clearEvents: () => void
}

const AgentFeedContext = createContext<AgentFeedState>({
  events: [],
  isCollapsed: true,
  isRunning: false,
  startTinyfishRun: async () => {},
  toggleCollapsed: () => {},
  clearEvents: () => {},
})

export function AgentFeedProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<AgentEvent[]>([])
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [isRunning, setIsRunning] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const upsertEvent = useCallback((update: AgentEvent) => {
    setEvents(prev => {
      const idx = prev.findIndex(e => e.id === update.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = update
        return next
      }
      return [...prev, update]
    })
  }, [])

  const startTinyfishRun = useCallback(async (url: string, goal: string) => {
    // Abort any existing run
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setIsRunning(true)
    setIsCollapsed(false) // Auto-expand when a run starts

    try {
      const res = await fetch('/api/tinyfish/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, goal }),
        signal: abortRef.current.signal,
      })

      if (!res.ok || !res.body) {
        setIsRunning(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw || raw === '[DONE]') continue

          try {
            const event = JSON.parse(raw) as TinyfishSSEEvent

            if (event.type === 'STARTED') {
              const agentEvent: AgentEvent = {
                id: event.run_id,
                name: `Research Agent`,
                action: 'Starting...',
                status: 'running',
                timestamp: new Date(event.timestamp).getTime(),
              }
              upsertEvent(agentEvent)
            } else if (event.type === 'STREAMING_URL') {
              upsertEvent({
                id: event.run_id,
                name: `Research Agent`,
                action: 'Browsing...',
                status: 'running',
                streamingUrl: event.streaming_url,
                timestamp: new Date(event.timestamp).getTime(),
              })
            } else if (event.type === 'PROGRESS') {
              upsertEvent({
                id: event.run_id,
                name: `Research Agent`,
                action: event.purpose,
                status: 'running',
                timestamp: new Date(event.timestamp).getTime(),
              })
            } else if (event.type === 'COMPLETE') {
              upsertEvent({
                id: event.run_id,
                name: `Research Agent`,
                action: event.status === 'COMPLETED' ? 'Done' : `Failed: ${event.error ?? 'unknown'}`,
                status: event.status === 'COMPLETED' ? 'done' : 'error',
                timestamp: new Date(event.timestamp).getTime(),
              })
            }
          } catch {
            // Skip malformed events
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
    } finally {
      setIsRunning(false)
    }
  }, [upsertEvent])

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed(prev => !prev)
  }, [])

  const clearEvents = useCallback(() => {
    setEvents([])
  }, [])

  return (
    <AgentFeedContext.Provider value={{
      events, isCollapsed, isRunning,
      startTinyfishRun, toggleCollapsed, clearEvents,
    }}>
      {children}
    </AgentFeedContext.Provider>
  )
}

export function useAgentFeed() {
  return useContext(AgentFeedContext)
}
