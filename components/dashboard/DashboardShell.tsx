'use client'

import { MaterialsPanel } from '@/components/materials/MaterialsPanel'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { AgentFeedBar } from '@/components/agent-feed/AgentFeedBar'
import { useSession } from '@/lib/context/session-context'

export function DashboardShell() {
  const { institutionUrl, logout } = useSession()

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <header className="h-12 border-b flex items-center justify-between px-4 shrink-0">
        <span className="font-semibold text-sm">Remora</span>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {institutionUrl && <span>{institutionUrl}</span>}
          <button
            onClick={logout}
            className="text-sm hover:text-foreground transition-colors"
          >
            Log out
          </button>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <MaterialsPanel />
        <main className="flex-1 overflow-hidden">
          <ChatPanel />
        </main>
      </div>
      <AgentFeedBar />
    </div>
  )
}
