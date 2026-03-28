'use client'

import { MaterialsPanel } from '@/components/materials/MaterialsPanel'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { AgentFeedBar } from '@/components/agent-feed/AgentFeedBar'

export function DashboardShell() {
  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
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
