'use client'

import { useAgentFeed } from '@/lib/context/agent-feed-context'
import { AgentFeedItem } from './AgentFeedItem'
import { cn } from '@/lib/utils'
import { ChevronUpIcon, ChevronDownIcon, Loader2Icon, XIcon } from 'lucide-react'

export function AgentFeedBar() {
  const { events, isCollapsed, isRunning, toggleCollapsed, clearEvents } = useAgentFeed()

  const runningCount = events.filter(e => e.status === 'running').length
  const hasEvents = events.length > 0

  return (
    <div
      className={cn(
        'border-t border-border bg-card transition-all duration-200 shrink-0 flex flex-col',
        isCollapsed ? 'h-8' : 'h-[128px]'
      )}
    >
      {/* Header strip — always visible, click to toggle */}
      <button
        onClick={toggleCollapsed}
        className="flex items-center justify-between px-4 h-8 shrink-0 w-full hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isRunning && (
            <Loader2Icon className="w-3 h-3 animate-spin text-primary" />
          )}
          <span className="text-xs font-medium text-muted-foreground">
            {isRunning
              ? `Agent Activity — ${runningCount} running`
              : hasEvents
              ? `Agent Activity — ${events.length} completed`
              : 'Agent Activity'
            }
          </span>
          {hasEvents && !isRunning && (
            <button
              onClick={e => { e.stopPropagation(); clearEvents() }}
              className="text-muted-foreground hover:text-foreground ml-1"
            >
              <XIcon className="w-3 h-3" />
            </button>
          )}
        </div>
        {isCollapsed
          ? <ChevronUpIcon className="w-3 h-3 text-muted-foreground" />
          : <ChevronDownIcon className="w-3 h-3 text-muted-foreground" />
        }
      </button>

      {/* Agent event list */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto px-2 pb-1">
          {events.length === 0 ? (
            <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
              No agent activity yet
            </div>
          ) : (
            <div className="space-y-0.5">
              {events.map(event => (
                <AgentFeedItem key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
