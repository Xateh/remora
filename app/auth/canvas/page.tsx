import { Suspense } from 'react'
import { CanvasLoginForm } from '@/components/auth/CanvasLoginForm'

export default function CanvasAuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Remora</h1>
          <p className="text-sm text-muted-foreground">
            Connect your Canvas LMS account to get started
          </p>
        </div>
        <Suspense fallback={null}>
          <CanvasLoginForm />
        </Suspense>
        <p className="text-center text-xs text-muted-foreground">
          Your Canvas credentials are handled directly by Canvas.
          <br />
          Remora never sees your password.
        </p>
      </div>
    </div>
  )
}
