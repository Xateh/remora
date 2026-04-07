'use client'

import { useState } from 'react'
import { PlusIcon, MessageSquareIcon } from 'lucide-react'
import { MaterialsPanel } from '@/components/materials/MaterialsPanel'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { AgentFeedBar } from '@/components/agent-feed/AgentFeedBar'
import { useSession } from '@/lib/context/session-context'
import { RemoraWizard } from '@/app/components/RemoraWizard'
import { cn } from '@/lib/utils'

export function DashboardShell() {
  const { institutionUrl, email, logout } = useSession()
  const [view, setView] = useState<'chat' | 'research'>('chat')

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <header className="h-12 border-b flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-sm">Remora</span>
          <nav className="flex items-center bg-secondary/50 rounded-md p-1 ml-4">
            <button
              onClick={() => setView('chat')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-sm transition-all',
                view === 'chat' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <MessageSquareIcon className="w-3 h-3" />
              Chat
            </button>
            <button
              onClick={() => setView('research')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-sm transition-all',
                view === 'research' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <PlusIcon className="w-3 h-3" />
              New Research
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {institutionUrl ? (
            <span>{institutionUrl}</span>
          ) : (
            <span>{email}</span>
          )}
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
        <main className="flex-1 overflow-hidden relative">
          {view === 'chat' ? (
            <ChatPanel />
          ) : (
            <div className="absolute inset-0 overflow-y-auto">
              <RemoraWizard />
            </div>
          )}
        </main>
      </div>
      <AgentFeedBar />
    </div>
  )
}
