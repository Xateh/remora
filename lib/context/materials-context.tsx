'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
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

  // Load from localStorage on mount
  useEffect(() => {
    const savedUploads = localStorage.getItem('remora_uploads')
    const savedPasted = localStorage.getItem('remora_pasted')
    const savedSelected = localStorage.getItem('remora_selected')

    if (savedUploads) setUploadedFiles(JSON.parse(savedUploads))
    if (savedPasted) setPastedItems(JSON.parse(savedPasted))
    if (savedSelected) setSelectedMaterialIds(new Set(JSON.parse(savedSelected)))
  }, [])

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('remora_uploads', JSON.stringify(uploadedFiles))
    localStorage.setItem('remora_pasted', JSON.stringify(pastedItems))
    localStorage.setItem('remora_selected', JSON.stringify(Array.from(selectedMaterialIds)))
  }, [uploadedFiles, pastedItems, selectedMaterialIds])

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
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1]
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file: base64, fileName: file.name }),
          })
          
          if (!res.ok) throw new Error('Upload failed')
          
          const data = await res.json() as { sessionId: string }
          const ref: MaterialRef = {
            id: data.sessionId,
            type: 'upload',
            label: file.name,
            mimeType: file.type,
          }
          
          setUploadedFiles(prev => [...prev, ref])
          // Auto-select the newly uploaded file
          setSelectedMaterialIds(prev => {
            const next = new Set(prev)
            next.add(data.sessionId)
            return next
          })
          resolve()
        } catch (e) {
          reject(e)
        }
      }
      reader.onerror = () => reject(new Error('File reading failed'))
      reader.readAsDataURL(file)
    })
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
    setSelectedMaterialIds(prev => {
      const next = new Set(prev)
      next.add(ref.id)
      return next
    })
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
