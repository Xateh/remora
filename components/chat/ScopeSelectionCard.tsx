'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { CheckIcon } from 'lucide-react'

type Scope = { id: string; label: string; description: string }

type Props = {
  scopes: Scope[]
  onConfirm?: (selectedIds: string[]) => void
}

export function ScopeSelectionCard({ scopes, onConfirm }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmed, setConfirmed] = useState(false)

  function toggleScope(id: string) {
    if (confirmed) return
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleConfirm() {
    if (selectedIds.size === 0) return
    setConfirmed(true)
    onConfirm?.(Array.from(selectedIds))
  }

  return (
    <div className="border border-border rounded-lg p-4 bg-card space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Multiple topics found — select focus areas
      </p>
      <div className="space-y-2">
        {scopes.map(scope => {
          const isSelected = selectedIds.has(scope.id)
          return (
            <button
              key={scope.id}
              onClick={() => toggleScope(scope.id)}
              disabled={confirmed}
              className={cn(
                'w-full text-left p-3 rounded-md border text-sm transition-colors',
                isSelected
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border bg-background text-muted-foreground hover:text-foreground hover:border-border/80',
                confirmed && 'cursor-default',
                confirmed && !isSelected && 'opacity-40'
              )}
            >
              <div className="flex items-center gap-2">
                <span className={cn(
                  'w-4 h-4 rounded border flex items-center justify-center shrink-0',
                  isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                )}>
                  {isSelected && <CheckIcon className="w-2.5 h-2.5 text-primary-foreground" />}
                </span>
                <div>
                  <p className="font-medium text-foreground">{scope.label}</p>
                  <p className="text-xs text-muted-foreground">{scope.description}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>
      {!confirmed && (
        <button
          onClick={handleConfirm}
          disabled={selectedIds.size === 0}
          className={cn(
            'w-full py-2 text-sm font-medium rounded-md transition-colors',
            'bg-primary text-primary-foreground hover:bg-primary/90',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          Confirm Selection ({selectedIds.size})
        </button>
      )}
    </div>
  )
}
