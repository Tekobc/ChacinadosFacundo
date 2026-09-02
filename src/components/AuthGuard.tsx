import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export function AuthGuard() {
  const [sessionReady, setSessionReady] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session))
      setSessionReady(true)
    })

    void supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(Boolean(session))
      setSessionReady(true)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  if (!sessionReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-page)] text-[var(--color-text)]">
        <div className="rounded-xl border border-[var(--color-border)] bg-white px-6 py-4 text-sm text-[var(--color-muted)]">
          Verificando sesión...
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
