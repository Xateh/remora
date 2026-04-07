import { AuthContainer } from '@/components/auth/AuthContainer'

export default function AuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 animate-in fade-in zoom-in duration-300">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Remora</h1>
          <p className="text-sm text-muted-foreground">
            Attach to university materials and supercharge your learning
          </p>
        </div>
        
        <AuthContainer />
      </div>
    </div>
  )
}
