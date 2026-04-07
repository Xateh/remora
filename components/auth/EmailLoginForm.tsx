'use client'

import { useState, useTransition } from 'react'
import { loginWithEmail } from '@/app/lib/actions/email-auth'
import { cn } from '@/lib/utils'
import { Loader2Icon, MailIcon } from 'lucide-react'

export function EmailLoginForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    startTransition(async () => {
      try {
        await loginWithEmail(trimmedEmail)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Email Address
        </label>
        <div className="relative">
          <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@university.edu"
            autoComplete="email"
            autoFocus
            disabled={isPending}
            className={cn(
              'w-full pl-10 pr-3 py-2 text-sm rounded-md border bg-background text-foreground',
              'placeholder:text-muted-foreground transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-ring',
              error ? 'border-destructive' : 'border-input',
              isPending && 'opacity-50 cursor-not-allowed'
            )}
          />
        </div>
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending || !email.trim()}
        className={cn(
          'w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md transition-colors',
          'bg-primary text-primary-foreground hover:bg-primary/90',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        {isPending ? (
          <>
            <Loader2Icon className="w-4 h-4 animate-spin" />
            Signing in...
          </>
        ) : (
          'Sign in with Email'
        )}
      </button>
    </form>
  )
}
