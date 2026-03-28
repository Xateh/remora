'use client'

import { useState } from 'react'
import { useMaterials } from '@/lib/context/materials-context'
import { MaterialTreeItem } from './MaterialTreeItem'
import type { CanvasFile } from '@/lib/types'
import { ChevronRightIcon, ChevronDownIcon, BookOpenIcon, FileIcon, Loader2Icon } from 'lucide-react'

export function CanvasSection() {
  const { canvasCourses, canvasCoursesLoading, selectedMaterialIds, toggleSelected } = useMaterials()
  const [expandedCourseIds, setExpandedCourseIds] = useState<Set<number>>(new Set())
  const [courseFiles, setCourseFiles] = useState<Record<number, CanvasFile[]>>({})
  const [loadingCourseIds, setLoadingCourseIds] = useState<Set<number>>(new Set())

  async function toggleCourse(courseId: number) {
    if (expandedCourseIds.has(courseId)) {
      setExpandedCourseIds(prev => {
        const next = new Set(prev)
        next.delete(courseId)
        return next
      })
      return
    }

    // Expand: fetch files if not already loaded
    setExpandedCourseIds(prev => new Set([...prev, courseId]))

    if (!courseFiles[courseId]) {
      setLoadingCourseIds(prev => new Set([...prev, courseId]))
      try {
        const res = await fetch(`/api/canvas/files?courseId=${courseId}`)
        if (res.ok) {
          const files = await res.json() as CanvasFile[]
          setCourseFiles(prev => ({ ...prev, [courseId]: files }))
        }
      } finally {
        setLoadingCourseIds(prev => {
          const next = new Set(prev)
          next.delete(courseId)
          return next
        })
      }
    }
  }

  if (canvasCoursesLoading) {
    return (
      <div className="px-4 py-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2Icon className="w-3 h-3 animate-spin" />
        Loading courses...
      </div>
    )
  }

  if (canvasCourses.length === 0) {
    return (
      <div className="px-4 py-2 text-xs text-muted-foreground">
        No Canvas courses found
      </div>
    )
  }

  return (
    <div>
      <p className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Canvas
      </p>
      {canvasCourses.map(course => {
        const isExpanded = expandedCourseIds.has(course.id)
        const isLoading = loadingCourseIds.has(course.id)
        const files = courseFiles[course.id] ?? []

        return (
          <div key={course.id}>
            <button
              onClick={() => toggleCourse(course.id)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-secondary rounded-sm transition-colors"
            >
              <span className="text-muted-foreground">
                {isExpanded
                  ? <ChevronDownIcon className="w-3 h-3" />
                  : <ChevronRightIcon className="w-3 h-3" />}
              </span>
              <BookOpenIcon className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="truncate flex-1 text-left">{course.name}</span>
              {isLoading && <Loader2Icon className="w-3 h-3 animate-spin text-muted-foreground shrink-0" />}
            </button>

            {isExpanded && !isLoading && (
              <div>
                {files.length === 0 ? (
                  <p className="pl-10 py-1 text-xs text-muted-foreground">No files</p>
                ) : (
                  files.map(file => {
                    const fileId = `canvas_file_${course.id}_${file.id}`
                    return (
                      <MaterialTreeItem
                        key={file.id}
                        id={fileId}
                        label={file.display_name}
                        icon={<FileIcon className="w-3 h-3" />}
                        isSelected={selectedMaterialIds.has(fileId)}
                        onToggle={() => toggleSelected(fileId)}
                        depth={1}
                      />
                    )
                  })
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
