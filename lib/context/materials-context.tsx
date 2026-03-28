'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import type { MaterialRef, CanvasCourse } from '@/lib/types'

type MaterialsState = {
  canvasCourses: CanvasCourse[]
  canvasCoursesLoading: boolean
  uploadedFiles: MaterialRef[]
  pastedItems: MaterialRef[]
  selectedMaterialIds: Set<string>
  loadCanvasCourses: () => Promise<void>
  addUploadedFile: (file: File) => Promise<void>
  addPastedItem: (item: { content?: string; url?: string; label: string }) => void
  removeItem: (id: string) => void
  toggleSelected: (id: string) => void
  clearSelection: () => void
}

const MaterialsContext = createContext<MaterialsState>({
  canvasCourses: [],
  canvasCoursesLoading: false,
  uploadedFiles: [],
  pastedItems: [],
  selectedMaterialIds: new Set(),
  loadCanvasCourses: async () => {},
  addUploadedFile: async () => {},
  addPastedItem: () => {},
  removeItem: () => {},
  toggleSelected: () => {},
  clearSelection: () => {},
})

let idCounter = 0
function genId() {
  return `material-${Date.now()}-${++idCounter}`
}

export function MaterialsProvider({ children }: { children: React.ReactNode }) {
  const [canvasCourses, setCanvasCourses] = useState<CanvasCourse[]>([])
  const [canvasCoursesLoading, setCanvasCoursesLoading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<MaterialRef[]>([])
  const [pastedItems, setPastedItems] = useState<MaterialRef[]>([])
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<Set<string>>(new Set())

  const loadCanvasCourses = useCallback(async () => {
    setCanvasCoursesLoading(true)
    try {
      const res = await fetch('/api/canvas/courses')
      if (res.ok) {
        const courses = await res.json() as CanvasCourse[]
        setCanvasCourses(courses)
      }
    } finally {
      setCanvasCoursesLoading(false)
    }
  }, [])

  const addUploadedFile = useCallback(async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: form })
    if (!res.ok) throw new Error('Upload failed')
    const data = await res.json() as { id: string; filename: string; mimeType: string }
    const ref: MaterialRef = {
      id: data.id,
      type: 'upload',
      label: data.filename,
      mimeType: data.mimeType,
    }
    setUploadedFiles(prev => [...prev, ref])
    setSelectedMaterialIds(prev => new Set([...prev, data.id]))
  }, [])

  const addPastedItem = useCallback((item: { content?: string; url?: string; label: string }) => {
    const ref: MaterialRef = {
      id: genId(),
      type: 'paste',
      label: item.label,
      content: item.content,
      url: item.url,
    }
    setPastedItems(prev => [...prev, ref])
    setSelectedMaterialIds(prev => new Set([...prev, ref.id]))
  }, [])

  const removeItem = useCallback((id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id))
    setPastedItems(prev => prev.filter(f => f.id !== id))
    setSelectedMaterialIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const toggleSelected = useCallback((id: string) => {
    setSelectedMaterialIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedMaterialIds(new Set())
  }, [])

  return (
    <MaterialsContext.Provider value={{
      canvasCourses, canvasCoursesLoading,
      uploadedFiles, pastedItems,
      selectedMaterialIds,
      loadCanvasCourses, addUploadedFile, addPastedItem,
      removeItem, toggleSelected, clearSelection,
    }}>
      {children}
    </MaterialsContext.Provider>
  )
}

export function useMaterials() {
  return useContext(MaterialsContext)
}
