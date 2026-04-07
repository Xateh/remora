'use client'

import { cn } from '@/lib/utils'

type Props = {
  id: string
  label: string
  icon?: React.ReactNode
  isSelected: boolean
  onToggle: () => void
  depth?: number
  rightElement?: React.ReactNode
}

export function MaterialTreeItem({ id, label, icon, isSelected, onToggle, depth = 0, rightElement }: Props) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onToggle()
        }
      }}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-sm text-left transition-colors group cursor-pointer select-none',
        'hover:bg-secondary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        isSelected && 'bg-primary/10 text-primary',
        !isSelected && 'text-foreground'
      )}
      style={{ paddingLeft: `${12 + depth * 16}px` }}
      title={label}
    >
      {/* Selection indicator */}
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full shrink-0 transition-colors',
          isSelected ? 'bg-primary' : 'bg-transparent group-hover:bg-muted-foreground/30'
        )}
      />
      {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
      <span className="truncate flex-1">{label}</span>
      {rightElement}
    </div>
  )
}
