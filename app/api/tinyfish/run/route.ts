import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { sessionOptions } from '@/lib/session'
import type { SessionData } from '@/lib/session'

export async function POST(request: Request): Promise<Response> {
  const cookieStore = await cookies()
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions)

  const isAuthed = session.canvasToken || session.email
  if (!isAuthed) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.TINYFISH_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'Tinyfish not configured' }, { status: 503 })
  }

  let body: { url: string; goal: string }
  try {
    body = await request.json() as { url: string; goal: string }
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.url || !body.goal) {
    return Response.json({ error: 'url and goal are required' }, { status: 400 })
  }

  const tinyfishRes = await fetch('https://agent.tinyfish.ai/v1/automation/run-sse', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify({ url: body.url, goal: body.goal }),
  })

  if (!tinyfishRes.ok || !tinyfishRes.body) {
    const errorText = await tinyfishRes.text()
    return Response.json({ error: `Tinyfish error: ${errorText}` }, { status: tinyfishRes.status })
  }

  // Pipe the tinyfish SSE stream directly to the client
  return new Response(tinyfishRes.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',  // Disable nginx buffering
    },
  })
}
