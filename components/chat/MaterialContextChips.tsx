'use client'

import { useMaterials } from '@/lib/context/materials-context'
import { cn } from '@/lib/utils'
import { XIcon } from 'lucide-react'

export function MaterialContextChips() {
  const { uploadedFiles, pastedItems, selectedMaterialIds, toggleSelected } = useMaterials()

  const allNamed = [...uploadedFiles, ...pastedItems]
  const selectedNamed = allNamed.filter(m => selectedMaterialIds.has(m.id))
  const canvasCount = Array.from(selectedMaterialIds).filter(id => id.startsWith('canvas_file_')).length

  if (selectedMaterialIds.size === 0) {
    return (
      <p className="text-xs text-muted-foreground px-1">
        No materials selected — all context included
      </p>
    )
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {canvasCount > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-secondary text-secondary-foreground border border-border">
          {canvasCount} Canvas file{canvasCount > 1 ? 's' : ''}
        </span>
      )}
      {selectedNamed.map(material => (
        <span
          key={material.id}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full',
            'bg-secondary text-secondary-foreground border border-border max-w-[160px]'
          )}
        >
          <span className="truncate">{material.label}</span>
          <button
            onClick={() => toggleSelected(material.id)}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <XIcon className="w-2.5 h-2.5" />
          </button>
        </span>
      ))}
    </div>
  )
}
