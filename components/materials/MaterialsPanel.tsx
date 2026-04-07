'use client'

import { useEffect } from 'react'
import { useMaterials } from '@/lib/context/materials-context'
import { useSession } from '@/lib/context/session-context'
import { CanvasSection } from './CanvasSection'
import { UploadedFilesSection } from './UploadedFilesSection'
import { PastedContentSection } from './PastedContentSection'
import { AddMaterialsModal } from './AddMaterialsModal'
import { PlusIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function MaterialsPanel() {
  const { loadCanvasCourses } = useMaterials()
  const { loginType, isAuthenticated } = useSession()

  useEffect(() => {
    if (isAuthenticated && loginType === 'canvas') {
      loadCanvasCourses()
    }
  }, [isAuthenticated, loginType, loadCanvasCourses])

  return (
    <aside className="w-72 flex flex-col border-r border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <h2 className="text-sm font-semibold text-foreground">Materials</h2>
        <AddMaterialsModal>
          <button
            className={cn(
              'flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors',
              'rounded px-2 py-1 hover:bg-secondary'
            )}
          >
            <PlusIcon className="w-3 h-3" />
            Add
          </button>
        </AddMaterialsModal>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto py-2 space-y-1">
        <CanvasSection />
        <UploadedFilesSection />
        <PastedContentSection />
      </div>
    </aside>
  )
}
