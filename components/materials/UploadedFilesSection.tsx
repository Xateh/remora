'use client'

import { useMaterials } from '@/lib/context/materials-context'
import { MaterialTreeItem } from './MaterialTreeItem'
import { FileIcon, XIcon } from 'lucide-react'

export function UploadedFilesSection() {
  const { uploadedFiles, selectedMaterialIds, toggleSelected, removeItem } = useMaterials()

  if (uploadedFiles.length === 0) return null

  return (
    <div>
      <p className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Uploaded Files
      </p>
      {uploadedFiles.map(file => (
        <MaterialTreeItem
          key={file.id}
          id={file.id}
          label={file.label}
          icon={<FileIcon className="w-3 h-3" />}
          isSelected={selectedMaterialIds.has(file.id)}
          onToggle={() => toggleSelected(file.id)}
          rightElement={
            <button
              onClick={e => { e.stopPropagation(); removeItem(file.id) }}
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
