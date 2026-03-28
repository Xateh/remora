'use client'

import { SessionProvider } from '@/lib/context/session-context'
import { MaterialsProvider } from '@/lib/context/materials-context'
import { AgentFeedProvider } from '@/lib/context/agent-feed-context'
import { TooltipProvider } from '@/components/ui/tooltip'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <MaterialsProvider>
        <AgentFeedProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </AgentFeedProvider>
      </MaterialsProvider>
    </SessionProvider>
  )
}
