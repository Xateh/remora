'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import { useMaterials } from '@/lib/context/materials-context'
import { cn } from '@/lib/utils'
import { XIcon, UploadIcon } from 'lucide-react'

export function AddMaterialsModal({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [urlValue, setUrlValue] = useState('')
  const [textValue, setTextValue] = useState('')
  const [uploading, setUploading] = useState(false)
  const { addUploadedFile, addPastedItem } = useMaterials()

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await addUploadedFile(file)
      setOpen(false)
    } catch {
      alert('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  function handleAddUrl() {
    if (!urlValue.trim()) return
    try {
      const parsed = new URL(urlValue.trim())
      addPastedItem({ url: urlValue.trim(), label: parsed.hostname })
      setUrlValue('')
      setOpen(false)
    } catch {
      alert('Invalid URL')
    }
  }

  function handleAddText() {
    if (!textValue.trim()) return
    const label = textValue.trim().slice(0, 50) + (textValue.length > 50 ? '...' : '')
    addPastedItem({ content: textValue.trim(), label })
    setTextValue('')
    setOpen(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
        <Dialog.Content className={cn(
          'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
          'w-full max-w-md bg-card border border-border rounded-lg shadow-2xl p-6',
          'focus:outline-none'
        )}>
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-sm font-semibold text-foreground">Add Materials</Dialog.Title>
            <Dialog.Description className="sr-only">
              Upload files, add URLs, or paste text to include in your research session.
            </Dialog.Description>
            <Dialog.Close className="text-muted-foreground hover:text-foreground transition-colors">
              <XIcon className="w-4 h-4" />
            </Dialog.Close>
          </div>

          <Tabs.Root defaultValue="upload">
            <Tabs.List className="flex gap-1 border-b border-border mb-4">
              {['upload', 'url', 'text'].map(tab => (
                <Tabs.Trigger
                  key={tab}
                  value={tab}
                  className={cn(
                    'px-3 py-2 text-xs font-medium capitalize transition-colors',
                    'text-muted-foreground hover:text-foreground',
                    'border-b-2 border-transparent -mb-px',
                    'data-[state=active]:text-foreground data-[state=active]:border-primary'
                  )}
                >
                  {tab === 'upload' ? '↑ Upload File' : tab === 'url' ? '🔗 URL' : '📝 Paste Text'}
                </Tabs.Trigger>
              ))}
            </Tabs.List>

            <Tabs.Content value="upload" className="space-y-3">
              <p className="text-xs text-muted-foreground">Upload a PDF, DOCX, or PPTX file.</p>
              <label className={cn(
                'flex flex-col items-center gap-2 p-6 border-2 border-dashed border-border rounded-md cursor-pointer',
                'hover:border-primary/50 hover:bg-secondary/30 transition-colors',
                uploading && 'opacity-50 pointer-events-none'
              )}>
                <UploadIcon className="w-6 h-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {uploading ? 'Uploading...' : 'Click to select or drag & drop'}
                </span>
                <input
                  type="file"
                  accept=".pdf,.docx,.pptx"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
              </label>
            </Tabs.Content>

            <Tabs.Content value="url" className="space-y-3">
              <p className="text-xs text-muted-foreground">Add a URL to a resource (paper, webpage, etc.)</p>
              <input
                type="url"
                value={urlValue}
                onChange={e => setUrlValue(e.target.value)}
                placeholder="https://example.com/paper.pdf"
                className={cn(
                  'w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground',
                  'placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring'
                )}
                onKeyDown={e => e.key === 'Enter' && handleAddUrl()}
              />
              <button
                onClick={handleAddUrl}
                disabled={!urlValue.trim()}
                className={cn(
                  'w-full py-2 text-sm font-medium rounded-md transition-colors',
                  'bg-primary text-primary-foreground hover:bg-primary/90',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                Add URL
              </button>
            </Tabs.Content>

            <Tabs.Content value="text" className="space-y-3">
              <p className="text-xs text-muted-foreground">Paste notes, a transcript, or any raw text.</p>
              <textarea
                value={textValue}
                onChange={e => setTextValue(e.target.value)}
                placeholder="Paste your text here..."
                rows={6}
                className={cn(
                  'w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground resize-none',
                  'placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring'
                )}
              />
              <button
                onClick={handleAddText}
                disabled={!textValue.trim()}
                className={cn(
                  'w-full py-2 text-sm font-medium rounded-md transition-colors',
                  'bg-primary text-primary-foreground hover:bg-primary/90',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                Add Text
              </button>
            </Tabs.Content>
          </Tabs.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
