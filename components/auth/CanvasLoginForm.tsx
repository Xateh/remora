'use client'

import { useState, useTransition, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { initiateCanvasOAuth } from '@/app/lib/actions/canvas-auth'
import { cn } from '@/lib/utils'
import { Loader2Icon } from 'lucide-react'

export function CanvasLoginForm() {
  const searchParams = useSearchParams()
  const [institutionUrl, setInstitutionUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const urlError = searchParams.get('error')
    if (urlError) {
      const messages: Record<string, string> = {
        invalid_state: 'Authentication failed. Please try again.',
        token_exchange_failed: 'Could not connect to Canvas. Check your institution URL.',
        network_error: 'Network error. Please check your connection.',
      }
      setError(messages[urlError] ?? `Canvas error: ${urlError}`)
    }
  }, [searchParams])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    let url = institutionUrl.trim()
    if (!url) {
      setError('Please enter your Canvas institution URL')
      return
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`
    }

    startTransition(async () => {
      try {
        await initiateCanvasOAuth(url)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="institution-url" className="text-sm font-medium text-foreground">
          Canvas Institution URL
        </label>
        <input
          id="institution-url"
          type="text"
          value={institutionUrl}
          onChange={e => setInstitutionUrl(e.target.value)}
          placeholder="canvas.instructure.com"
          autoComplete="url"
          autoFocus
          disabled={isPending}
          className={cn(
            'w-full px-3 py-2 text-sm rounded-md border bg-background text-foreground',
            'placeholder:text-muted-foreground transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-ring',
            error ? 'border-destructive' : 'border-input',
            isPending && 'opacity-50 cursor-not-allowed'
          )}
        />
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending || !institutionUrl.trim()}
        className={cn(
          'w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md transition-colors',
          'bg-primary text-primary-foreground hover:bg-primary/90',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        {isPending ? (
          <>
            <Loader2Icon className="w-4 h-4 animate-spin" />
            Connecting...
          </>
        ) : (
          'Connect with Canvas'
        )}
      </button>
    </form>
  )
}
