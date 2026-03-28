'use client'

import { cn } from '@/lib/utils'
import { ScopeSelectionCard } from './ScopeSelectionCard'
import { useAgentFeed } from '@/lib/context/agent-feed-context'
import type { UIMessage } from '@ai-sdk/ui-utils'

type Props = {
  message: UIMessage
}

export function ChatMessage({ message }: Props) {
  const { setScopes } = useAgentFeed()
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className={cn(
          'max-w-[75%] px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm',
          'bg-primary text-primary-foreground'
        )}>
          {message.content}
        </div>
      </div>
    )
  }

  // Assistant message — render parts if available, else fallback to content
  const parts = message.parts ?? []

  if (parts.length === 0) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%] text-sm text-foreground leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] space-y-3">
        {parts.map((part, i) => {
          if (part.type === 'text') {
            return (
              <div key={i} className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {part.text}
              </div>
            )
          }

          if (part.type === 'tool-requestScopeSelection' && (part.state === 'input-available' || part.state === 'output-available')) {
            const scopeList = part.input.scopes as Array<{ id: string; label: string; description: string }>
            return (
              <ScopeSelectionCard
                key={part.toolCallId}
                scopes={scopeList}
                onConfirm={(selectedIds: string[]) => {
                  const labels = selectedIds
                    .map(id => scopeList.find(s => s.id === id)?.label)
                    .filter((l): l is string => l !== undefined)
                  setScopes(labels)
                }}
              />
            )
          }

          if (part.type === 'tool-initiateTinyfishResearch' && part.state === 'input-available') {
            return (
              <div key={part.toolCallId} className="text-xs text-muted-foreground italic">
                Launching research agents...
              </div>
            )
          }

          if (part.type === 'reasoning') {
            return (
              <details key={i} className="text-xs text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground">Thinking...</summary>
                <pre className="mt-2 whitespace-pre-wrap font-mono text-xs opacity-70">{part.reasoning}</pre>
              </details>
            )
          }

          return null
        })}
      </div>
    </div>
  )
}
