'use client'

import { useRef, useEffect, KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import { SendIcon } from 'lucide-react'
import { MaterialContextChips } from './MaterialContextChips'

type Props = {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isLoading: boolean
}

export function ChatInput({ value, onChange, onSubmit, isLoading }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [value])

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
      e.preventDefault()
      if (value.trim()) onSubmit()
    }
  }

  return (
    <div className="border-t border-border bg-card px-4 py-3 space-y-2">
      <MaterialContextChips />
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about your materials..."
          rows={1}
          disabled={isLoading}
          className={cn(
            'flex-1 resize-none overflow-hidden text-sm bg-background text-foreground',
            'border border-input rounded-md px-3 py-2',
            'placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-1 focus:ring-ring',
            'disabled:opacity-50',
            'min-h-[38px] max-h-[200px]'
          )}
        />
        <button
          onClick={() => value.trim() && !isLoading && onSubmit()}
          disabled={!value.trim() || isLoading}
          className={cn(
            'shrink-0 flex items-center justify-center w-9 h-9 rounded-md transition-colors',
            'bg-primary text-primary-foreground hover:bg-primary/90',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <SendIcon className="w-4 h-4" />
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Enter to send · Shift+Enter for newline
      </p>
    </div>
  )
}
