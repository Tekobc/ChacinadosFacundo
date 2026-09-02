import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CalendarClock, Filter } from 'lucide-react'
import { StatusBadge } from '../../components/StatusBadge'
import { supabase } from '../../lib/supabaseClient'

type VencimientoRow = {
  fuente: 'proveedor' | 'documento'
  descripcion: string
  referencia_id: string
  fecha_vencimiento: string
  dias_restantes: number
  semaforo: 'vencido' | 'critico' | 'proximo' | 'vigente'
}

const semaforoLabels: Record<VencimientoRow['semaforo'], string> = {
  vencido: 'Vencido',
  critico: 'Crítico',
  proximo: 'Próximo',
  vigente: 'Vigente',
}

const semaforoTone: Record<VencimientoRow['semaforo'], 'danger' | 'warning' | 'info' | 'success'> = {
  vencido: 'danger',
  critico: 'warning',
  proximo: 'info',
  vigente: 'success',
}

function formatDate(value: string) {
  const date = new Date(value)
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

export function VencimientosPage() {
  const [items, setItems] = useState<VencimientoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroSemaforo, setFiltroSemaforo] = useState<'todos' | VencimientoRow['semaforo']>('todos')
  const [filtroFuente, setFiltroFuente] = useState<'todos' | VencimientoRow['fuente']>('todos')

  useEffect(() => {
    const loadVencimientos = async () => {
      setLoading(true)
      const { data, error } = await supabase.rpc('vencimientos_activos')

      if (error) {
        console.error(error)
        setItems([])
        setLoading(false)
        return
      }

      setItems((data ?? []) as VencimientoRow[])
      setLoading(false)
    }

    void loadVencimientos()
  }, [])

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSemaforo = filtroSemaforo === 'todos' || item.semaforo === filtroSemaforo
      const matchesFuente = filtroFuente === 'todos' || item.fuente === filtroFuente
      return matchesSemaforo && matchesFuente
    })
  }, [filtroFuente, filtroSemaforo, items])

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[var(--color-primary)]/10 p-3 text-[var(--color-primary)]">
            <CalendarClock size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[var(--color-text)]">Vencimientos</h1>
            <p className="text-sm text-[var(--color-muted)]">Semáforo consolidado de proveedores y documentos</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-muted)]">
            <Filter size={16} />
            <select
              value={filtroFuente}
              onChange={(event) => setFiltroFuente(event.target.value as 'todos' | VencimientoRow['fuente'])}
              className="bg-transparent text-sm text-[var(--color-text)] outline-none"
            >
              <option value="todos">Todos</option>
              <option value="proveedor">Proveedor</option>
              <option value="documento">Documento</option>
            </select>
          </label>

          <label className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-muted)]">
            <AlertCircle size={16} />
            <select
              value={filtroSemaforo}
              onChange={(event) => setFiltroSemaforo(event.target.value as 'todos' | VencimientoRow['semaforo'])}
              className="bg-transparent text-sm text-[var(--color-text)] outline-none"
            >
              <option value="todos">Todas</option>
              <option value="vencido">Vencidos</option>
              <option value="critico">Críticos</option>
              <option value="proximo">Próximos</option>
              <option value="vigente">Vigentes</option>
            </select>
          </label>
        </div>
      </div>

      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
        {loading ? (
          <div className="flex min-h-40 items-center justify-center text-sm text-[var(--color-muted)]">Cargando vencimientos...</div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-alt)] p-8 text-center text-sm text-[var(--color-muted)]">
            No hay vencimientos para los filtros seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[var(--color-muted)]">
                  <th className="py-3 pr-4 font-medium">Fuente</th>
                  <th className="py-3 pr-4 font-medium">Descripción</th>
                  <th className="py-3 pr-4 font-medium">Vencimiento</th>
                  <th className="py-3 pr-4 font-medium">Días</th>
                  <th className="py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={`${item.fuente}-${item.referencia_id}`} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="py-3 pr-4 text-[var(--color-text)]">{item.fuente === 'proveedor' ? 'Proveedor' : 'Documento'}</td>
                    <td className="py-3 pr-4 font-medium text-[var(--color-text)]">{item.descripcion}</td>
                    <td className="py-3 pr-4 font-mono text-xs text-[var(--color-text)]">{formatDate(item.fecha_vencimiento)}</td>
                    <td className="py-3 pr-4 text-[var(--color-muted)]">{item.dias_restantes}</td>
                    <td className="py-3">
                      <StatusBadge label={semaforoLabels[item.semaforo]} tone={semaforoTone[item.semaforo]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
