'use client'

import { useEffect, useRef } from 'react'
import { ChatMessage } from './ChatMessage'
import type { UIMessage } from '@ai-sdk/ui-utils'

type Props = {
  messages: UIMessage[]
  isStreaming: boolean
}

export function ChatMessageList({ messages, isStreaming }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-2 max-w-sm">
          <p className="text-foreground font-medium text-sm">Ask anything about your materials</p>
          <p className="text-muted-foreground text-xs">
            Select materials from the sidebar, then ask questions. Remora will research supporting content from top universities.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
      {messages.map(message => (
        <ChatMessage key={message.id} message={message} />
      ))}
      {isStreaming && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex gap-1">
            <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
          Researching...
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
