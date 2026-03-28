'use client'

import { useMaterials } from '@/lib/context/materials-context'
import { MaterialTreeItem } from './MaterialTreeItem'
import { LinkIcon, AlignLeftIcon, XIcon } from 'lucide-react'

export function PastedContentSection() {
  const { pastedItems, selectedMaterialIds, toggleSelected, removeItem } = useMaterials()

  if (pastedItems.length === 0) return null

  return (
    <div>
      <p className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Pasted Content
      </p>
      {pastedItems.map(item => (
        <MaterialTreeItem
          key={item.id}
          id={item.id}
          label={item.label}
          icon={item.url
            ? <LinkIcon className="w-3 h-3" />
            : <AlignLeftIcon className="w-3 h-3" />
          }
          isSelected={selectedMaterialIds.has(item.id)}
          onToggle={() => toggleSelected(item.id)}
          rightElement={
            <button
              onClick={e => { e.stopPropagation(); removeItem(item.id) }}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
            >
              <XIcon className="w-3 h-3" />
            </button>
          }
        />
      ))}
    </div>
  )
}
