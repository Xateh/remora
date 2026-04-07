'use client'

import { useState, Suspense } from 'react'
import { CanvasLoginForm } from '@/components/auth/CanvasLoginForm'
import { EmailLoginForm } from '@/components/auth/EmailLoginForm'
import { cn } from '@/lib/utils'

export function AuthContainer() {
  const [method, setMethod] = useState<'canvas' | 'email'>('canvas')

  return (
    <div className="space-y-6">
      <div className="flex p-1 bg-muted rounded-lg">
        <button
          onClick={() => setMethod('canvas')}
          className={cn(
            "flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all",
            method === 'canvas' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Canvas
        </button>
        <button
          onClick={() => setMethod('email')}
          className={cn(
            "flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all",
            method === 'email' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Email
        </button>
      </div>

      <div className="min-h-[220px]">
        {method === 'canvas' ? (
          <div className="space-y-4">
            <Suspense fallback={null}>
              <CanvasLoginForm />
            </Suspense>
            <p className="text-center text-xs text-muted-foreground">
              Your Canvas credentials are handled directly by Canvas.
              <br />
              Remora never sees your password.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <EmailLoginForm />
            <p className="text-center text-xs text-muted-foreground">
              No Canvas account? Use your university email to get started manually.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
