'use client'

import { useChat } from '@ai-sdk/react'
import { useMaterials } from '@/lib/context/materials-context'
import { ChatMessageList } from './ChatMessageList'
import { ChatInput } from './ChatInput'

export function ChatPanel() {
  const { selectedMaterialIds, pastedItems, uploadedFiles } = useMaterials()

  // Build the list of selected named material refs to pass as context
  const selectedPastedItems = pastedItems.filter(m => selectedMaterialIds.has(m.id))
  const selectedUploadIds = uploadedFiles
    .filter(m => selectedMaterialIds.has(m.id))
    .map(m => m.id)
  const selectedCanvasIds = Array.from(selectedMaterialIds).filter(id =>
    id.startsWith('canvas_file_')
  )

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
    append({ role: 'user', content: input })
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
