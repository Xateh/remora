import { randomUUID } from 'crypto'

type StoredFile = {
  buffer: Buffer
  mimeType: string
  filename: string
  size: number
}

// Module-level store — persists within Node.js process lifetime
// Note: resets on cold start; not shared across instances
// Production upgrade path: @vercel/blob
const fileStore = new Map<string, StoredFile>()

export function storeFile(buffer: Buffer, mimeType: string, filename: string): string {
  const id = randomUUID()
  fileStore.set(id, { buffer, mimeType, filename, size: buffer.length })
  return id
}

export function getFile(id: string): StoredFile | undefined {
  return fileStore.get(id)
}

export function deleteFile(id: string): void {
  fileStore.delete(id)
}
