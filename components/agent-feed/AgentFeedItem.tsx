'use client'

import type { AgentEvent } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Loader2Icon, CheckCircle2Icon, XCircleIcon, ExternalLinkIcon } from 'lucide-react'

type Props = {
  event: AgentEvent
}

export function AgentFeedItem({ event }: Props) {
  return (
    <div className={cn(
      'flex items-center gap-2 px-2 py-1 rounded-sm text-xs',
      event.status === 'error' && 'text-destructive/70',
      event.status !== 'error' && 'text-muted-foreground'
    )}>
      {/* Status icon */}
      <span className="shrink-0">
        {event.status === 'running' && (
          <Loader2Icon className="w-3 h-3 animate-spin text-primary" />
        )}
        {event.status === 'done' && (
          <CheckCircle2Icon className="w-3 h-3 text-green-500" />
        )}
        {event.status === 'error' && (
          <XCircleIcon className="w-3 h-3 text-destructive" />
        )}
      </span>

      {/* Agent name in monospace */}
      <span className="font-mono text-foreground shrink-0">{event.name}</span>

      {/* Current action */}
      <span className="truncate flex-1">{event.action}</span>

      {/* Live view link if available */}
      {event.streamingUrl && event.status === 'running' && (
        <a
          href={event.streamingUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="shrink-0 flex items-center gap-0.5 text-primary hover:underline"
        >
          watch live
          <ExternalLinkIcon className="w-2.5 h-2.5" />
        </a>
      )}
    </div>
  )
}
