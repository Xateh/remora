export type MaterialRef = {
  id: string
  type: 'canvas_file' | 'upload' | 'paste'
  label: string
  canvasCourseId?: string
  canvasFileId?: string
  mimeType?: string
  content?: string  // for paste items
  url?: string      // for URL items
}

export type CanvasCourse = {
  id: number
  name: string
  course_code: string
  enrollment_term_id: number
}

export type CanvasFile = {
  id: number
  display_name: string
  filename: string
  contentType: string
  size: number
  url: string
}

export type AgentEvent = {
  id: string           // run_id from tinyfish
  name: string         // display name e.g. "Research Agent 1"
  action: string       // current action e.g. "scraping MIT OCW"
  status: 'running' | 'done' | 'error'
  streamingUrl?: string // live browser view URL from tinyfish STREAMING_URL event
  timestamp: number
}

export type TinyfishSSEEvent =
  | { type: 'STARTED'; run_id: string; timestamp: string }
  | { type: 'STREAMING_URL'; run_id: string; streaming_url: string; timestamp: string }
  | { type: 'PROGRESS'; run_id: string; purpose: string; timestamp: string }
  | { type: 'COMPLETE'; run_id: string; status: 'COMPLETED' | 'FAILED' | 'CANCELLED'; result: unknown; error?: string; timestamp: string }
  | { type: 'HEARTBEAT'; timestamp: string }
