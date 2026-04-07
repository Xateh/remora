import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { sessionOptions } from '@/lib/session'
import type { SessionData } from '@/lib/session'
import type { MaterialRef } from '@/lib/types'

export async function POST(request: Request): Promise<Response> {
  const cookieStore = await cookies()
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions)

  const isAuthed = session.canvasToken || session.email
  if (!isAuthed) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json() as {
    messages: Array<{ role: string; content: string }>
    materialRefs?: string[]
    pastedItems?: MaterialRef[]
  }

  const { messages = [], pastedItems = [], materialRefs = [] } = body
  const { store } = await import('@/lib/store')

  // Build context from multiple sources:
  // 1. Pasted items (already have content)
  // 2. Uploaded files (fetch from store by ID)
  // 3. Research results (fetch from store by ID)
  
  const contextParts: string[] = []

  // Handle pasted items
  pastedItems.forEach(m => {
    if (m.content) contextParts.push(`[Pasted Content - ${m.label}]:\n${m.content.slice(0, 1000)}`)
    else if (m.url) contextParts.push(`[URL Reference - ${m.label}]: ${m.url}`)
  })

  // Handle uploaded files and research results from store
  materialRefs.forEach(id => {
    const session = store.get(id)
    if (session) {
      if (session.slidesContent) {
        contextParts.push(`[Document - ${session.courseIdentity || id}]:\n${session.slidesContent.slice(0, 2000)}`)
      }
      if (session.results?.resources) {
        const researchText = session.results.resources
          .map(r => `- ${r.title}: ${r.summary}\n  AI Insight: ${r.commentary}`)
          .join('\n')
        contextParts.push(`[Research Results for ${session.courseIdentity || id}]:\n${researchText}`)
      }
      if (session.results?.gapAnalysis) {
        contextParts.push(`[Gap Analysis for ${session.courseIdentity || id}]:\n${session.results.gapAnalysis}`)
      }
    }
  })

  const materialContext = contextParts.length > 0
    ? `\n\nMaterials and Research Context:\n${contextParts.join('\n\n')}`
    : ''

  const systemPrompt = `You are Remora, a specialized study assistant.
  
  CONTEXT RECEIVED: There are ${contextParts.length} distinct material/research blocks provided below.
  
  YOUR CRITICAL MISSION: Use the "Materials and Research Context" section below to answer user questions. If this section is non-empty, you MUST NOT say you don't have access to documents.
  
  Your role:
  - Analyze the provided context (original docs + research findings).
  - If a specific file is mentioned, look for a matching [Document] or [Research] block.
  - Explain concepts clearly, suggest related high-tier university topics, and identify gaps.
  - Be professional and thorough.

[Materials and Research Context START]
${materialContext}
[Materials and Research Context END]`

  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    // Mock streaming fallback when no API key configured
    const lastMessage = messages[messages.length - 1]?.content ?? ''
    const mockResponse = `I received your question: "${lastMessage}"\n\nThe AI model is not yet configured. Please set the OPENAI_API_KEY environment variable to enable real AI responses.`

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        const words = mockResponse.split(' ')
        let i = 0
        const interval = setInterval(() => {
          if (i < words.length) {
            const escaped = (words[i] + ' ').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')
            controller.enqueue(encoder.encode(`0:"${escaped}"\n`))
            i++
          } else {
            controller.enqueue(encoder.encode('d:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n'))
            controller.close()
            clearInterval(interval)
          }
        }, 50)
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'x-vercel-ai-data-stream': 'v1',
        'Cache-Control': 'no-cache',
      },
    })
  }

  // Real OpenAI streaming
  const OpenAI = (await import('openai')).default
  const client = new OpenAI({ apiKey })

  const openaiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ]

  const openaiStream = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: openaiMessages,
    stream: true,
  })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of openaiStream) {
          const delta = chunk.choices[0]?.delta?.content
          if (delta) {
            const escaped = delta.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')
            controller.enqueue(encoder.encode(`0:"${escaped}"\n`))
          }
          if (chunk.choices[0]?.finish_reason) {
            controller.enqueue(encoder.encode('d:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n'))
          }
        }
      } catch (err) {
        controller.error(err)
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'x-vercel-ai-data-stream': 'v1',
      'Cache-Control': 'no-cache',
    },
  })
}
