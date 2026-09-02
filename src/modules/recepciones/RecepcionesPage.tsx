import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Files, LoaderCircle, PackageSearch, PencilLine, Plus, Save, Search } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { recepcionSchema, type RecepcionFormData } from '../../lib/validations/schemas'

type ProveedorOption = {
  id: string
  razon_social: string
}

type RecepcionRow = {
  id: string
  proveedor_id: string
  producto: string
  lote_proveedor?: string | null
  fecha_recepcion: string
  cantidad: number
  unidad: string
  temperatura_recepcion?: number | null
  estado_organoleptico: 'ok' | 'observado' | 'rechazado'
  motivo_rechazo?: string | null
  observaciones?: string | null
  remito_url?: string[] | null
  proveedores?: {
    razon_social: string
  } | null
}

const emptyValues: RecepcionFormData = {
  proveedor_id: '',
  producto: '',
  lote_proveedor: '',
  fecha_recepcion: new Date().toISOString().slice(0, 10),
  cantidad: 0,
  unidad: 'kg',
  temperatura_recepcion: null,
  estado_organoleptico: 'ok',
  motivo_rechazo: '',
  observaciones: '',
  remito_url: [],
}

const estadoLabels = {
  ok: 'OK',
  observado: 'Observado',
  rechazado: 'Rechazado',
} as const

function EstadoBadge({ estado }: { estado: RecepcionRow['estado_organoleptico'] }) {
  const map = {
    ok: 'bg-[rgba(76,122,107,0.12)] text-[var(--color-success)]',
    observado: 'bg-[rgba(217,164,65,0.12)] text-[var(--color-warning)]',
    rechazado: 'bg-[rgba(178,58,52,0.12)] text-[var(--color-danger)]',
  }

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${map[estado]}`}>
      {estadoLabels[estado]}
    </span>
  )
}

export function RecepcionesPage() {
  const [proveedores, setProveedores] = useState<ProveedorOption[]>([])
  const [recepciones, setRecepciones] = useState<RecepcionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<'todos' | RecepcionRow['estado_organoleptico']>('todos')
  const [subiendoArchivo, setSubiendoArchivo] = useState(false)

  const form = useForm<RecepcionFormData>({
    resolver: zodResolver(recepcionSchema),
    defaultValues: emptyValues,
  })

  const fetchProveedores = async () => {
    const { data, error } = await supabase.from('proveedores').select('id, razon_social').order('razon_social', { ascending: true })

    if (!error) {
      setProveedores((data ?? []) as ProveedorOption[])
    }
  }

  const fetchRecepciones = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('recepciones_mp')
      .select('*, proveedores:proveedor_id ( razon_social )')
      .order('fecha_recepcion', { ascending: false })

    if (error) {
      console.error(error)
      setRecepciones([])
      setLoading(false)
      return
    }

    setRecepciones((data ?? []) as RecepcionRow[])
    setLoading(false)
  }

  useEffect(() => {
    void Promise.all([fetchProveedores(), fetchRecepciones()])
  }, [])

  const recepcionesFiltradas = useMemo(() => {
    if (filtroEstado === 'todos') {
      return recepciones
    }

    return recepciones.filter((recepcion) => recepcion.estado_organoleptico === filtroEstado)
  }, [filtroEstado, recepciones])

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setSubiendoArchivo(true)
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`
    const storagePath = `recepciones_mp/${fileName}`

    const { data, error } = await supabase.storage.from('recepciones_mp').upload(storagePath, file)

    if (error) {
      console.error(error)
      setSubiendoArchivo(false)
      return
    }

    const { data: publicUrlData } = supabase.storage.from('recepciones_mp').getPublicUrl(data.path)
    form.setValue('remito_url', [publicUrlData.publicUrl])
    setSubiendoArchivo(false)
  }

  const onSubmit = async (values: RecepcionFormData) => {
    setSaving(true)

    const temperatura = values.temperatura_recepcion
    const remitoUrl = form.getValues('remito_url')?.length ? form.getValues('remito_url') : null

    const payload = {
      proveedor_id: values.proveedor_id,
      producto: values.producto,
      lote_proveedor: values.lote_proveedor || null,
      fecha_recepcion: new Date(`${values.fecha_recepcion}T12:00:00`).toISOString(),
      cantidad: Number(values.cantidad),
      unidad: values.unidad,
      temperatura_recepcion: temperatura == null || Number.isNaN(temperatura) ? null : Number(temperatura),
      estado_organoleptico: values.estado_organoleptico,
      motivo_rechazo: values.estado_organoleptico === 'rechazado' ? values.motivo_rechazo || null : null,
      observaciones: values.observaciones || null,
      remito_url: remitoUrl,
    }

    const { error } = editingId
      ? await supabase.from('recepciones_mp').update(payload).eq('id', editingId)
      : await supabase.from('recepciones_mp').insert([payload])

    if (error) {
      console.error(error)
      setSaving(false)
      return
    }

    form.reset(emptyValues)
    setEditingId(null)
    await fetchRecepciones()
    setSaving(false)
  }

  const handleEdit = (recepcion: RecepcionRow) => {
    setEditingId(recepcion.id)
    form.reset({
      proveedor_id: recepcion.proveedor_id,
      producto: recepcion.producto,
      lote_proveedor: recepcion.lote_proveedor ?? '',
      fecha_recepcion: recepcion.fecha_recepcion ? recepcion.fecha_recepcion.slice(0, 10) : new Date().toISOString().slice(0, 10),
      cantidad: Number(recepcion.cantidad),
      unidad: recepcion.unidad,
      temperatura_recepcion: recepcion.temperatura_recepcion ?? null,
      estado_organoleptico: recepcion.estado_organoleptico,
      motivo_rechazo: recepcion.motivo_rechazo ?? '',
      observaciones: recepcion.observaciones ?? '',
      remito_url: recepcion.remito_url ?? [],
    })
  }

  const handleCancel = () => {
    setEditingId(null)
    form.reset(emptyValues)
  }

  const estadoActual = form.watch('estado_organoleptico') ?? 'ok'

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[var(--color-primary)]/10 p-3 text-[var(--color-primary)]">
            <PackageSearch size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[var(--color-text)]">Recepción de Materia Prima</h1>
            <p className="text-sm text-[var(--color-muted)]">Control de ingreso, temperatura y estado organoléptico.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-muted)]">
            <Search size={16} />
            <select
              value={filtroEstado}
              onChange={(event) => setFiltroEstado(event.target.value as 'todos' | RecepcionRow['estado_organoleptico'])}
              className="bg-transparent text-sm text-[var(--color-text)] outline-none"
            >
              <option value="todos">Todos</option>
              <option value="ok">OK</option>
              <option value="observado">Observado</option>
              <option value="rechazado">Rechazado</option>
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Últimas recepciones</h2>
            <span className="text-sm text-[var(--color-muted)]">{recepcionesFiltradas.length} registros</span>
          </div>

          {loading ? (
            <div className="flex min-h-40 items-center justify-center gap-2 text-[var(--color-muted)]">
              <LoaderCircle className="animate-spin" size={18} />
              Cargando recepciones...
            </div>
          ) : recepcionesFiltradas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-alt)] p-8 text-center text-[var(--color-muted)]">
              No hay recepciones para este filtro.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-[var(--color-muted)]">
                    <th className="py-3 pr-4 font-medium">Fecha</th>
                    <th className="py-3 pr-4 font-medium">Proveedor</th>
                    <th className="py-3 pr-4 font-medium">Producto</th>
                    <th className="py-3 pr-4 font-medium">Estado</th>
                    <th className="py-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {recepcionesFiltradas.map((recepcion) => (
                    <tr key={recepcion.id} className="border-b border-[var(--color-border)] last:border-0">
                      <td className="py-3 pr-4 font-mono text-xs text-[var(--color-text)]">
                        {new Date(recepcion.fecha_recepcion).toLocaleDateString('es-AR')}
                      </td>
                      <td className="py-3 pr-4 text-[var(--color-text)]">{recepcion.proveedores?.razon_social ?? '—'}</td>
                      <td className="py-3 pr-4">
                        <div className="font-medium text-[var(--color-text)]">{recepcion.producto}</div>
                        <div className="text-xs text-[var(--color-muted)]">{recepcion.lote_proveedor || 'Sin lote'}</div>
                      </td>
                      <td className="py-3 pr-4">
                        <EstadoBadge estado={recepcion.estado_organoleptico} />
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleEdit(recepcion)}
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
              {editingId ? 'Editar recepción' : 'Nueva recepción'}
            </h2>
            {editingId ? (
              <button type="button" onClick={handleCancel} className="text-sm text-[var(--color-muted)] transition hover:text-[var(--color-text)]">
                Cancelar
              </button>
            ) : null}
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Proveedor</label>
              <select {...form.register('proveedor_id')} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-primary)]">
                <option value="">Seleccioná un proveedor</option>
                {proveedores.map((proveedor) => (
                  <option key={proveedor.id} value={proveedor.id}>
                    {proveedor.razon_social}
                  </option>
                ))}
              </select>
              {form.formState.errors.proveedor_id ? <p className="mt-1 text-xs text-[var(--color-danger)]">{form.formState.errors.proveedor_id.message}</p> : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Producto</label>
                <input {...form.register('producto')} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-primary)]" placeholder="Carne vacuna" />
                {form.formState.errors.producto ? <p className="mt-1 text-xs text-[var(--color-danger)]">{form.formState.errors.producto.message}</p> : null}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Lote proveedor</label>
                <input {...form.register('lote_proveedor')} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-primary)]" placeholder="LT-001" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Fecha recepción</label>
                <input type="date" {...form.register('fecha_recepcion')} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-primary)]" />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Unidad</label>
                <select {...form.register('unidad')} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-primary)]">
                  <option value="kg">kg</option>
                  <option value="unidades">unidades</option>
                  <option value="litros">litros</option>
                  <option value="cajas">cajas</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Cantidad</label>
                <input type="number" step="0.01" {...form.register('cantidad', { valueAsNumber: true })} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-primary)]" placeholder="0" />
                {form.formState.errors.cantidad ? <p className="mt-1 text-xs text-[var(--color-danger)]">{form.formState.errors.cantidad.message}</p> : null}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Temperatura (°C)</label>
                <input type="number" step="0.1" {...form.register('temperatura_recepcion', { valueAsNumber: true })} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-primary)]" placeholder="4" />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Estado organoléptico</label>
              <select {...form.register('estado_organoleptico')} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-primary)]">
                <option value="ok">OK</option>
                <option value="observado">Observado</option>
                <option value="rechazado">Rechazado</option>
              </select>
            </div>

            {estadoActual === 'rechazado' ? (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Motivo de rechazo</label>
                <textarea {...form.register('motivo_rechazo')} rows={3} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-primary)]" placeholder="Describí el motivo del rechazo" />
                {form.formState.errors.motivo_rechazo ? <p className="mt-1 text-xs text-[var(--color-danger)]">{form.formState.errors.motivo_rechazo.message}</p> : null}
              </div>
            ) : null}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Observaciones</label>
              <textarea {...form.register('observaciones')} rows={3} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-primary)]" placeholder="Notas del ingreso" />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Remito / foto</label>
              <div className="flex items-center gap-3 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-3">
                <Files size={18} className="text-[var(--color-muted)]" />
                <input type="file" accept="image/*,.pdf" onChange={handleFileChange} className="w-full text-sm text-[var(--color-text)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-primary)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white" />
              </div>
              {subiendoArchivo ? <p className="mt-2 text-xs text-[var(--color-muted)]">Subiendo archivo...</p> : null}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? <LoaderCircle className="animate-spin" size={16} /> : <Save size={16} />}
                {saving ? 'Guardando...' : editingId ? 'Actualizar recepción' : 'Guardar recepción'}
              </button>

              {!editingId ? (
                <button
                  type="button"
                  onClick={() => form.reset(emptyValues)}
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
