import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        navigate('/', { replace: true })
        return
      }

      setSessionReady(true)
    }

    void loadSession()
  }, [navigate])

  if (!sessionReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-page)] text-[var(--color-text)]">
        <div className="rounded-xl border border-[var(--color-border)] bg-white px-6 py-4 text-sm text-[var(--color-muted)]">
          Verificando sesión...
        </div>
      </div>
    )
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-page)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[0_10px_30px_rgba(30,36,34,0.05)]">
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-primary)]">
            Calidad Chacinados
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--color-text)]">Ingresar al sistema</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--color-text)]">Email</span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" size={16} />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-10 pr-3 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)]"
                placeholder="usuario@empresa.com"
                autoComplete="email"
                required
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--color-text)]">Contraseña</span>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" size={16} />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-10 pr-3 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)]"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>
          </label>

          {error ? (
            <div className="rounded-lg border border-[var(--color-danger)]/25 bg-[var(--color-danger)]/5 px-3 py-2 text-sm text-[var(--color-danger)]">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
            {!loading ? <ArrowRight size={16} /> : null}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-[var(--color-muted)]">
          Crear el usuario desde Supabase Auth en el proyecto de desarrollo antes de probar el sistema.
        </p>
      </div>
    </div>
  )
}
