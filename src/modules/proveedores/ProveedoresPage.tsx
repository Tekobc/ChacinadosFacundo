import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle, PencilLine, Plus, Search, Save, Truck } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { proveedorSchema, type ProveedorFormData } from '../../lib/validations/schemas'

type ProveedorRow = {
  id: string
  razon_social: string
  cuit?: string | null
  contacto_nombre?: string | null
  contacto_telefono?: string | null
  contacto_email?: string | null
  tipo_insumo?: string | null
  rne_rpe?: string | null
  habilitacion_senasa?: string | null
  vencimiento_habilitacion?: string | null
  estado: 'activo' | 'en_evaluacion' | 'suspendido'
  observaciones?: string | null
}

const defaultValues: ProveedorFormData = {
  razon_social: '',
  cuit: '',
  contacto_nombre: '',
  contacto_telefono: '',
  contacto_email: '',
  tipo_insumo: '',
  rne_rpe: '',
  habilitacion_senasa: '',
  vencimiento_habilitacion: '',
  estado: 'activo',
  observaciones: '',
}

const estadoLabels: Record<ProveedorRow['estado'], string> = {
  activo: 'Activo',
  en_evaluacion: 'En evaluación',
  suspendido: 'Suspendido',
}

function EstadoBadge({ estado }: { estado: ProveedorRow['estado'] }) {
  const map: Record<ProveedorRow['estado'], string> = {
    activo: 'bg-[rgba(76,122,107,0.12)] text-[var(--color-success)]',
    en_evaluacion: 'bg-[rgba(217,164,65,0.12)] text-[var(--color-warning)]',
    suspendido: 'bg-[rgba(178,58,52,0.12)] text-[var(--color-danger)]',
  }

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${map[estado]}`}>
      {estadoLabels[estado]}
    </span>
  )
}

export function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<ProveedorRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState<'todos' | ProveedorRow['estado']>('todos')
  const [editingId, setEditingId] = useState<string | null>(null)

  const form = useForm({
    resolver: zodResolver(proveedorSchema),
    defaultValues,
  })

  const fetchProveedores = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('proveedores')
      .select('*')
      .order('razon_social', { ascending: true })

    if (error) {
      console.error(error)
      setProveedores([])
      setLoading(false)
      return
    }

    setProveedores((data ?? []) as ProveedorRow[])
    setLoading(false)
  }

  useEffect(() => {
    void fetchProveedores()
  }, [])

  const proveedoresFiltrados = useMemo(() => {
    if (filtroEstado === 'todos') {
      return proveedores
    }

    return proveedores.filter((proveedor) => proveedor.estado === filtroEstado)
  }, [filtroEstado, proveedores])

  const onSubmit = async (values: ProveedorFormData) => {
    setSaving(true)

    const payload = {
      ...values,
      cuit: values.cuit ? values.cuit.trim() : null,
      contacto_email: values.contacto_email || null,
      vencimiento_habilitacion: values.vencimiento_habilitacion || null,
      tipo_insumo: values.tipo_insumo || null,
      rne_rpe: values.rne_rpe || null,
      habilitacion_senasa: values.habilitacion_senasa || null,
      observaciones: values.observaciones || null,
      contacto_nombre: values.contacto_nombre || null,
      contacto_telefono: values.contacto_telefono || null,
    }

    const { error } = editingId
      ? await supabase.from('proveedores').update(payload).eq('id', editingId)
      : await supabase.from('proveedores').insert([payload])

    if (error) {
      console.error(error)
      setSaving(false)
      return
    }

    form.reset(defaultValues)
    setEditingId(null)
    await fetchProveedores()
    setSaving(false)
  }

  const handleEdit = (proveedor: ProveedorRow) => {
    setEditingId(proveedor.id)
    form.reset({
      razon_social: proveedor.razon_social,
      cuit: proveedor.cuit ?? '',
      contacto_nombre: proveedor.contacto_nombre ?? '',
      contacto_telefono: proveedor.contacto_telefono ?? '',
      contacto_email: proveedor.contacto_email ?? '',
      tipo_insumo: proveedor.tipo_insumo ?? '',
      rne_rpe: proveedor.rne_rpe ?? '',
      habilitacion_senasa: proveedor.habilitacion_senasa ?? '',
      vencimiento_habilitacion: proveedor.vencimiento_habilitacion ?? '',
      estado: proveedor.estado,
      observaciones: proveedor.observaciones ?? '',
    })
  }

  const handleCancel = () => {
    setEditingId(null)
    form.reset(defaultValues)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[var(--color-primary)]/10 p-3 text-[var(--color-primary)]">
            <Truck size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[var(--color-text)]">Proveedores</h1>
            <p className="text-sm text-[var(--color-muted)]">Habilitaciones, contactos y estado de evaluación.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-muted)]">
            <Search size={16} />
            <select
              value={filtroEstado}
              onChange={(event) => setFiltroEstado(event.target.value as 'todos' | ProveedorRow['estado'])}
              className="bg-transparent text-sm text-[var(--color-text)] outline-none"
            >
              <option value="todos">Todos</option>
              <option value="activo">Activos</option>
              <option value="en_evaluacion">En evaluación</option>
              <option value="suspendido">Suspendidos</option>
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <section className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Listado</h2>
            <span className="text-sm text-[var(--color-muted)]">{proveedoresFiltrados.length} registros</span>
          </div>

          {loading ? (
            <div className="flex min-h-40 items-center justify-center gap-2 text-[var(--color-muted)]">
              <LoaderCircle className="animate-spin" size={18} />
              Cargando proveedores...
            </div>
          ) : proveedoresFiltrados.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-alt)] p-8 text-center text-[var(--color-muted)]">
              No hay proveedores para este filtro.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-[var(--color-muted)]">
                    <th className="py-3 pr-4 font-medium">Razón social</th>
                    <th className="py-3 pr-4 font-medium">CUIT</th>
                    <th className="py-3 pr-4 font-medium">Tipo</th>
                    <th className="py-3 pr-4 font-medium">Estado</th>
                    <th className="py-3 pr-4 font-medium">Observaciones</th>
                    <th className="py-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {proveedoresFiltrados.map((proveedor) => (
                    <tr key={proveedor.id} className="border-b border-[var(--color-border)] last:border-0">
                      <td className="py-3 pr-4">
                        <div className="font-medium text-[var(--color-text)]">{proveedor.razon_social}</div>
                        <div className="text-xs text-[var(--color-muted)]">{proveedor.contacto_nombre || 'Sin contacto asignado'}</div>
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs text-[var(--color-text)]">{proveedor.cuit || '—'}</td>
                      <td className="py-3 pr-4 text-[var(--color-muted)]">{proveedor.tipo_insumo || '—'}</td>
                      <td className="py-3 pr-4">
                        <EstadoBadge estado={proveedor.estado} />
                      </td>
                      <td className="py-3 pr-4 max-w-xs text-xs text-[var(--color-muted)] truncate" title={proveedor.observaciones || undefined}>
                        {proveedor.observaciones || '—'}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleEdit(proveedor)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-white px-2.5 py-1.5 text-xs font-medium text-[var(--color-text)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                        >
                          <PencilLine size={14} />
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">
              {editingId ? 'Editar proveedor' : 'Nuevo proveedor'}
            </h2>
            {editingId ? (
              <button
                type="button"
                onClick={handleCancel}
                className="text-sm text-[var(--color-muted)] transition hover:text-[var(--color-text)]"
              >
                Cancelar
              </button>
            ) : null}
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Razón social</label>
              <input {...form.register('razon_social')} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-primary)]" placeholder="Ej: Carnes del Sur" />
              {form.formState.errors.razon_social ? <p className="mt-1 text-xs text-[var(--color-danger)]">{form.formState.errors.razon_social.message}</p> : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">CUIT (opcional)</label>
                <input {...form.register('cuit')} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-primary)]" placeholder="20-12345678-9" />
                {form.formState.errors.cuit ? <p className="mt-1 text-xs text-[var(--color-danger)]">{form.formState.errors.cuit.message}</p> : null}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Estado</label>
                <select {...form.register('estado')} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-primary)]">
                  <option value="activo">Activo</option>
                  <option value="en_evaluacion">En evaluación</option>
                  <option value="suspendido">Suspendido</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Contacto</label>
                <input {...form.register('contacto_nombre')} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-primary)]" placeholder="Nombre y apellido" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Teléfono</label>
                <input {...form.register('contacto_telefono')} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-primary)]" placeholder="(299) 123-4567" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Email</label>
                <input {...form.register('contacto_email')} type="email" className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-primary)]" placeholder="contacto@proveedor.com" />
                {form.formState.errors.contacto_email ? <p className="mt-1 text-xs text-[var(--color-danger)]">{form.formState.errors.contacto_email.message}</p> : null}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Tipo de insumo</label>
                <input {...form.register('tipo_insumo')} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-primary)]" placeholder="Carne vacuna" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">RNE / RPE</label>
                <input {...form.register('rne_rpe')} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-primary)]" placeholder="Número" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Habilitación SENASA</label>
                <input {...form.register('habilitacion_senasa')} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-primary)]" placeholder="N° habilitación" />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Vencimiento habilitación</label>
              <input
                type="date"
                {...form.register('vencimiento_habilitacion')}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-primary)]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Observaciones</label>
              <textarea {...form.register('observaciones')} rows={4} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-primary)]" placeholder="Notas internas" />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? <LoaderCircle className="animate-spin" size={16} /> : <Save size={16} />}
                {saving ? 'Guardando...' : editingId ? 'Actualizar proveedor' : 'Guardar proveedor'}
              </button>

              {!editingId ? (
                <button
                  type="button"
                  onClick={() => form.reset(defaultValues)}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-text)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                >
                  <Plus size={16} />
                  Limpiar
                </button>
              ) : null}
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}
