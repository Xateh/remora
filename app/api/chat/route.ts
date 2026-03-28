import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { sessionOptions } from '@/lib/session'
import type { SessionData } from '@/lib/session'
import type { MaterialRef } from '@/lib/types'

export async function POST(request: Request): Promise<Response> {
  const cookieStore = await cookies()
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions)

  if (!session.canvasToken) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json() as {
    messages: Array<{ role: string; content: string }>
    materialRefs?: string[]
    pastedItems?: MaterialRef[]
  }

  const { messages = [], pastedItems = [] } = body

  // Build system prompt
  const materialContext = pastedItems.length > 0
    ? `\n\nMaterials in context:\n${pastedItems.map(m => {
        if (m.content) return `- ${m.label}: ${m.content.slice(0, 500)}${m.content.length > 500 ? '...' : ''}`
        if (m.url) return `- ${m.label} (URL: ${m.url})`
        return `- ${m.label}`
      }).join('\n')}`
    : ''

  const systemPrompt = `You are Remora, a study assistant that helps students understand their course materials. You have access to materials the student has selected from their Canvas LMS courses, uploaded files, and pasted content.

Your role:
- Answer questions about the provided materials clearly and accurately
- Help students understand difficult concepts
- Suggest related topics from top universities when relevant
- Be concise but thorough${materialContext}`

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
