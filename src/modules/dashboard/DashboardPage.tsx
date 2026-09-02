import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, LayoutDashboard, ShieldCheck, Truck } from 'lucide-react'
import { MetricCard } from '../../components/MetricCard'
import { StatusBadge } from '../../components/StatusBadge'
import { supabase } from '../../lib/supabaseClient'

type VencimientoResumen = {
  fuente: 'proveedor' | 'documento'
  descripcion: string
  fecha_vencimiento: string
  dias_restantes: number
  semaforo: 'vencido' | 'critico' | 'proximo' | 'vigente'
}

function formatDate(value: string | null) {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function DashboardPage() {
  const [vencimientos, setVencimientos] = useState<VencimientoResumen[]>([])
  const [recepcionesMes, setRecepcionesMes] = useState(0)
  const [rechazosRecientes, setRechazosRecientes] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true)

      const today = new Date()
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      const startOfMonth = firstDay.toISOString()
      const endOfMonth = lastDay.toISOString()
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

      const [{ data: vencimientosData, error: vencimientosError }, { count: recepcionesCount, error: recepcionesError }, { count: rechazosCount, error: rechazosError }] = await Promise.all([
        supabase.rpc('vencimientos_activos'),
        supabase
          .from('recepciones_mp')
          .select('id', { count: 'exact' })
          .gte('fecha_recepcion', startOfMonth)
          .lte('fecha_recepcion', endOfMonth),
        supabase
          .from('recepciones_mp')
          .select('id', { count: 'exact' })
          .eq('estado_organoleptico', 'rechazado')
          .gte('fecha_recepcion', thirtyDaysAgo),
      ])

      if (!vencimientosError) {
        setVencimientos((vencimientosData ?? []) as VencimientoResumen[])
      }

      if (!recepcionesError) {
        setRecepcionesMes(recepcionesCount ?? 0)
      }

      if (!rechazosError) {
        setRechazosRecientes(rechazosCount ?? 0)
      }

      setLoading(false)
    }

    void loadDashboard()
  }, [])

  const vencimientosProximos = useMemo(
    () => vencimientos.filter((item) => item.semaforo === 'critico' || item.semaforo === 'proximo').length,
    [vencimientos],
  )

  const proximos = useMemo(
    () => vencimientos.filter((item) => item.semaforo !== 'vigente').slice(0, 3),
    [vencimientos],
  )

  const semaforoLabel = {
    vencido: 'Vencido',
    critico: 'Crítico',
    proximo: 'Próximo',
    vigente: 'Vigente',
  } as const

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-[var(--color-primary)]/10 p-3 text-[var(--color-primary)]">
          <LayoutDashboard size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text)]">Dashboard</h1>
          <p className="text-sm text-[var(--color-muted)]">Resumen general del sistema de calidad</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Vencimientos próximos" value={loading ? '…' : vencimientosProximos} hint="En los próximos 30 días" tone="warning" />
        <MetricCard title="Recepciones del mes" value={loading ? '…' : recepcionesMes} hint="Total del período actual" tone="primary" />
        <MetricCard title="Rechazos recientes" value={loading ? '…' : rechazosRecientes} hint="Últimos 30 días" tone="danger" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-[var(--color-warning)]" />
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Alertas activas</h2>
          </div>

          {proximos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-alt)] p-8 text-center text-sm text-[var(--color-muted)]">
              No hay vencimientos próximos ni vencidos en este momento.
            </div>
          ) : (
            <div className="space-y-3">
              {proximos.map((item) => (
                <div key={`${item.fuente}-${item.descripcion}`} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">{item.descripcion}</p>
                    <p className="text-xs text-[var(--color-muted)]">{item.fuente === 'proveedor' ? 'Proveedor' : 'Documento'} · Vence {formatDate(item.fecha_vencimiento)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge label={semaforoLabel[item.semaforo]} tone={item.semaforo === 'vencido' ? 'danger' : item.semaforo === 'critico' ? 'warning' : 'info'} />
                    <span className="text-xs font-medium text-[var(--color-muted)]">{item.dias_restantes} días</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck size={18} className="text-[var(--color-success)]" />
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Estado operativo</h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5">
              <div className="flex items-center gap-2 text-sm text-[var(--color-text)]">
                <Truck size={15} className="text-[var(--color-primary)]" />
                Proveedores activos
              </div>
              <span className="text-sm font-semibold text-[var(--color-text)]">{vencimientos.filter((item) => item.fuente === 'proveedor' && item.semaforo !== 'vencido').length}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5">
              <div className="flex items-center gap-2 text-sm text-[var(--color-text)]">
                <AlertTriangle size={15} className="text-[var(--color-warning)]" />
                Vencimientos críticos
              </div>
              <span className="text-sm font-semibold text-[var(--color-text)]">{vencimientos.filter((item) => item.semaforo === 'critico').length}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5">
              <div className="flex items-center gap-2 text-sm text-[var(--color-text)]">
                <ShieldCheck size={15} className="text-[var(--color-success)]" />
                Documentos al día
              </div>
              <span className="text-sm font-semibold text-[var(--color-text)]">{vencimientos.filter((item) => item.fuente === 'documento' && item.semaforo === 'vigente').length}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
