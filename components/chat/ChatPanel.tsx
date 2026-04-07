'use client'

import { useChat } from '@ai-sdk/react'
import { useMaterials } from '@/lib/context/materials-context'
import { ChatMessageList } from './ChatMessageList'
import { ChatInput } from './ChatInput'

export function ChatPanel() {
  const { selectedMaterialIds, pastedItems, uploadedFiles } = useMaterials()

  // Build the list of material refs to pass as context
  // Logic: If any are selected, send ONLY selected. If NONE are selected, send ALL.
  const hasSelection = selectedMaterialIds.size > 0

  const selectedPastedItems = hasSelection 
    ? pastedItems.filter(m => selectedMaterialIds.has(m.id))
    : pastedItems

  const selectedUploadIds = hasSelection
    ? uploadedFiles.filter(m => selectedMaterialIds.has(m.id)).map(m => m.id)
    : uploadedFiles.map(m => m.id)

  const selectedCanvasIds = hasSelection
    ? Array.from(selectedMaterialIds).filter(id => id.startsWith('canvas_file_'))
    : [] // Canvas files still need an ID pattern; we'll stick to selected for now or all if we had them.


  const {
    messages,
    input,
    setInput,
    status,
    append,
  } = useChat({
    api: '/api/chat',
    // Send material context along with every request
    body: {
      materialRefs: [...selectedUploadIds, ...selectedCanvasIds],
      pastedItems: selectedPastedItems,
    },
  })

  const isLoading = status === 'submitted' || status === 'streaming'

  function handleSubmit() {
    if (!input.trim() || isLoading) return
    
    // Explicitly pass the body to append to ensure the latest context is sent
    append({ role: 'user', content: input }, {
      body: {
        materialRefs: [...selectedUploadIds, ...selectedCanvasIds],
        pastedItems: selectedPastedItems,
      }
    })
    
    setInput('')
  }

  return (
    <div className="flex flex-col h-full">
      <ChatMessageList
        messages={messages}
        isStreaming={status === 'streaming'}
      />
      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  )
}
