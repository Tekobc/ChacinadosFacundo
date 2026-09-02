import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChefHat, LoaderCircle, Plus, Save, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { parteProduccionSchema, recetaSchema, type ParteProduccionFormData, type RecetaFormData } from '../../lib/validations/schemas'

type RecetaRow = {
  id: string
  nombre_producto: string
  version: number
  activa: boolean
  ingredientes: Array<{ nombre: string; porcentaje: number }>
  pasos: Array<{ orden: number; descripcion: string }>
  parametros_control?: Record<string, string | number> | null
}

type RecepcionOption = {
  id: string
  producto: string
  lote_proveedor?: string | null
  proveedores?: {
    razon_social: string
  }[] | null
}

type ParteProduccionRow = {
  id: string
  receta_id: string
  fecha: string
  cantidad_producida: number
  unidad: string
  observaciones?: string | null
  recetas?: {
    nombre_producto: string
    version: number
  } | null
  partes_produccion_recepciones?: Array<{
    recepcion_id: string
    recepciones_mp?: {
      producto: string
      lote_proveedor?: string | null
      proveedores?: {
        razon_social: string
      } | null
    } | null
  }> | null
}

const emptyRecetaValues: RecetaFormData = {
  nombre_producto: '',
  version: 1,
  ingredientes: [{ nombre: '', porcentaje: 0 }],
  pasos: [{ orden: 1, descripcion: '' }],
  parametros_control: { temp_coccion: '', tiempo_maduracion: '' },
  activa: true,
}

const emptyParteValues: ParteProduccionFormData = {
  receta_id: '',
  fecha: new Date().toISOString().slice(0, 10),
  cantidad_producida: 0,
  unidad: 'kg',
  observaciones: '',
  recepcion_ids: [],
}

export function ProduccionPage() {
  const [recetas, setRecetas] = useState<RecetaRow[]>([])
  const [recepciones, setRecepciones] = useState<RecepcionOption[]>([])
  const [partes, setPartes] = useState<ParteProduccionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [savingReceta, setSavingReceta] = useState(false)
  const [savingParte, setSavingParte] = useState(false)
  const [selectedRecepciones, setSelectedRecepciones] = useState<string[]>([])

  const recetaForm = useForm<RecetaFormData>({
    resolver: zodResolver(recetaSchema),
    defaultValues: emptyRecetaValues,
  })

  const parteForm = useForm<ParteProduccionFormData>({
    resolver: zodResolver(parteProduccionSchema),
    defaultValues: emptyParteValues,
  })

  const fetchRecetas = async () => {
    const { data, error } = await supabase
      .from('recetas')
      .select('*')
      .order('nombre_producto', { ascending: true })

    if (!error) {
      setRecetas((data ?? []) as RecetaRow[])
    }
  }

  const fetchRecepciones = async () => {
    const { data, error } = await supabase
      .from('recepciones_mp')
      .select('id, producto, lote_proveedor, proveedores:proveedor_id ( razon_social )')
      .order('fecha_recepcion', { ascending: false })

    if (!error) {
      setRecepciones((data ?? []) as RecepcionOption[])
    }
  }

  const fetchPartes = async () => {
    const { data, error } = await supabase
      .from('partes_produccion')
      .select('*, recetas:receta_id ( id, nombre_producto, version ), partes_produccion_recepciones ( recepcion_id, recepciones_mp:recepcion_id ( id, producto, lote_proveedor, proveedores:proveedor_id ( razon_social ) ) )')
      .order('fecha', { ascending: false })

    if (!error) {
      setPartes((data ?? []) as ParteProduccionRow[])
    }
  }

  useEffect(() => {
    void (async () => {
      setLoading(true)
      await Promise.all([fetchRecetas(), fetchRecepciones(), fetchPartes()])
      setLoading(false)
    })()
  }, [])

  const updateSelectedRecepciones = (recepcionId: string) => {
    const next = selectedRecepciones.includes(recepcionId)
      ? selectedRecepciones.filter((item) => item !== recepcionId)
      : [...selectedRecepciones, recepcionId]

    setSelectedRecepciones(next)
    parteForm.setValue('recepcion_ids', next)
  }

  const onRecetaSubmit = async (values: RecetaFormData) => {
    setSavingReceta(true)

    const payload = {
      nombre_producto: values.nombre_producto,
      version: Number(values.version) || 1,
      ingredientes: values.ingredientes,
      pasos: values.pasos.map((paso) => ({ ...paso, orden: Number(paso.orden) })),
      parametros_control: values.parametros_control ?? {},
      activa: values.activa,
    }

    const { error } = await supabase.from('recetas').insert([payload])

    if (error) {
      console.error(error)
      setSavingReceta(false)
      return
    }

    recetaForm.reset(emptyRecetaValues)
    await fetchRecetas()
    setSavingReceta(false)
  }

  const onParteSubmit = async (values: ParteProduccionFormData) => {
    setSavingParte(true)

    if (!values.recepcion_ids.length) {
      parteForm.setError('recepcion_ids', { message: 'Seleccioná al menos un lote de materia prima' })
      setSavingParte(false)
      return
    }

    const { data: parteData, error: parteError } = await supabase
      .from('partes_produccion')
      .insert([
        {
          receta_id: values.receta_id,
          fecha: values.fecha,
          cantidad_producida: Number(values.cantidad_producida),
          unidad: values.unidad,
          observaciones: values.observaciones || null,
        },
      ])
      .select()
      .single()

    if (parteError || !parteData) {
      console.error(parteError)
      setSavingParte(false)
      return
    }

    const inserts = values.recepcion_ids.map((recepcionId) => ({
      parte_id: parteData.id,
      recepcion_id: recepcionId,
    }))

    const { error: puenteError } = await supabase.from('partes_produccion_recepciones').insert(inserts)

    if (puenteError) {
      console.error(puenteError)
      setSavingParte(false)
      return
    }

    parteForm.reset(emptyParteValues)
    setSelectedRecepciones([])
    await fetchPartes()
    setSavingParte(false)
  }

  const addIngrediente = () => {
    const current = recetaForm.getValues('ingredientes') ?? []
    recetaForm.setValue('ingredientes', [...current, { nombre: '', porcentaje: 0 }])
  }

  const removeIngrediente = (index: number) => {
    const current = recetaForm.getValues('ingredientes') ?? []
    if (current.length <= 1) {
      return
    }
    recetaForm.setValue(
      'ingredientes',
      current.filter((_, i) => i !== index),
    )
  }

  const addPaso = () => {
    const current = recetaForm.getValues('pasos') ?? []
    recetaForm.setValue('pasos', [...current, { orden: current.length + 1, descripcion: '' }])
  }

  const removePaso = (index: number) => {
    const current = recetaForm.getValues('pasos') ?? []
    if (current.length <= 1) {
      return
    }
    recetaForm.setValue(
      'pasos',
      current.filter((_, i) => i !== index).map((paso, idx) => ({ ...paso, orden: idx + 1 })),
    )
  }

  const ingredientes = recetaForm.watch('ingredientes') ?? []
  const pasos = recetaForm.watch('pasos') ?? []

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-[var(--color-primary)]/10 p-3 text-[var(--color-primary)]">
          <ChefHat size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text)]">Recetas y Producción</h1>
          <p className="text-sm text-[var(--color-muted)]">Versionado de recetas y trazabilidad desde materia prima hasta producción.</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Recetas</h2>
            <span className="text-sm text-[var(--color-muted)]">{recetas.length} registros</span>
          </div>

          {loading ? (
            <div className="flex min-h-40 items-center justify-center gap-2 text-[var(--color-muted)]">
              <LoaderCircle className="animate-spin" size={18} />
              Cargando recetas...
            </div>
          ) : recetas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-alt)] p-8 text-center text-[var(--color-muted)]">
              Todavía no hay recetas cargadas.
            </div>
          ) : (
            <div className="space-y-3">
              {recetas.map((receta) => (
                <div key={receta.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--color-text)]">{receta.nombre_producto}</p>
                      <p className="text-xs text-[var(--color-muted)]">Versión {receta.version}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${receta.activa ? 'bg-[rgba(76,122,107,0.12)] text-[var(--color-success)]' : 'bg-[rgba(30,36,34,0.08)] text-[var(--color-muted)]'}`}>
                      {receta.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    <div>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">Ingredientes</p>
                      <ul className="space-y-1 text-xs text-[var(--color-text)]">
                        {receta.ingredientes.map((ingrediente, index) => (
                          <li key={`${receta.id}-${ingrediente.nombre}-${index}`}>
                            {ingrediente.nombre}: {ingrediente.porcentaje}%
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">Pasos</p>
                      <ul className="space-y-1 text-xs text-[var(--color-text)]">
                        {receta.pasos.map((paso) => (
                          <li key={`${receta.id}-paso-${paso.orden}`}>
                            {paso.orden}. {paso.descripcion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
          <h2 className="mb-4 text-lg font-semibold text-[var(--color-text)]">Nueva receta</h2>

          <form onSubmit={recetaForm.handleSubmit(onRecetaSubmit)} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Nombre del producto</label>
              <input {...recetaForm.register('nombre_producto')} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-primary)]" placeholder="Ej: Chorizo tradicional" />
              {recetaForm.formState.errors.nombre_producto ? <p className="mt-1 text-xs text-[var(--color-danger)]">{recetaForm.formState.errors.nombre_producto.message}</p> : null}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Versión</label>
                <input type="number" min={1} {...recetaForm.register('version', { valueAsNumber: true })} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-primary)]" />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5 text-sm text-[var(--color-text)]">
                  <input type="checkbox" {...recetaForm.register('activa')} className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)]" />
                  Activa
                </label>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-[var(--color-text)]">Ingredientes</label>
                <button type="button" onClick={addIngrediente} className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-primary)] hover:underline">
                  <Plus size={14} /> Agregar
                </button>
              </div>
              <div className="space-y-2">
                {ingredientes.map((ingrediente, index) => (
                  <div key={`ingrediente-${index}`} className="grid gap-2 md:grid-cols-[1fr_110px_36px]">
                    <input
                      value={ingrediente.nombre}
                      onChange={(event) => {
                        const next = [...ingredientes]
                        next[index] = { ...next[index], nombre: event.target.value }
                        recetaForm.setValue('ingredientes', next)
                      }}
                      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-primary)]"
                      placeholder="Ingrediente"
                    />
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={ingrediente.porcentaje}
                      onChange={(event) => {
                        const next = [...ingredientes]
                        next[index] = { ...next[index], porcentaje: Number(event.target.value) }
                        recetaForm.setValue('ingredientes', next)
                      }}
                      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-primary)]"
                      placeholder="%"
                    />
                    <button type="button" onClick={() => removeIngrediente(index)} className="rounded-lg border border-[var(--color-border)] bg-white p-2 text-[var(--color-danger)] hover:border-[var(--color-danger)]" aria-label="Eliminar ingrediente">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-[var(--color-text)]">Pasos</label>
                <button type="button" onClick={addPaso} className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-primary)] hover:underline">
                  <Plus size={14} /> Agregar
                </button>
              </div>
              <div className="space-y-2">
                {pasos.map((paso, index) => (
                  <div key={`paso-${index}`} className="grid gap-2 md:grid-cols-[44px_1fr_36px]">
                    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5 text-center text-sm font-medium text-[var(--color-text)]">
                      {index + 1}
                    </div>
                    <input
                      value={paso.descripcion}
                      onChange={(event) => {
                        const next = [...pasos]
                        next[index] = { ...next[index], descripcion: event.target.value, orden: index + 1 }
                        recetaForm.setValue('pasos', next)
                      }}
                      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-primary)]"
                      placeholder="Descripción del paso"
                    />
                    <button type="button" onClick={() => removePaso(index)} className="rounded-lg border border-[var(--color-border)] bg-white p-2 text-[var(--color-danger)] hover:border-[var(--color-danger)]" aria-label="Eliminar paso">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Parámetros de control</label>
              <textarea
                rows={3}
                value={JSON.stringify(recetaForm.watch('parametros_control') ?? {}, null, 2)}
                onChange={(event) => {
                  try {
                    const next = JSON.parse(event.target.value)
                    recetaForm.setValue('parametros_control', next)
                  } catch {
                    // Espera JSON válido para no romper el form.
                  }
                }}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-primary)]"
                placeholder='{"temp_coccion": 72, "tiempo_maduracion": "48h"}'
              />
            </div>

            <button type="submit" disabled={savingReceta} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)] disabled:opacity-60">
              {savingReceta ? <LoaderCircle className="animate-spin" size={16} /> : <Save size={16} />}
              {savingReceta ? 'Guardando...' : 'Guardar receta'}
            </button>
          </form>
        </section>
      </div>

      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Partes de producción</h2>
          <span className="text-sm text-[var(--color-muted)]">Trazabilidad lote a producción</span>
        </div>

        <form onSubmit={parteForm.handleSubmit(onParteSubmit)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Receta</label>
              <select {...parteForm.register('receta_id')} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-primary)]">
                <option value="">Seleccioná una receta</option>
                {recetas.filter((receta) => receta.activa).map((receta) => (
                  <option key={receta.id} value={receta.id}>{receta.nombre_producto} · v{receta.version}</option>
                ))}
              </select>
              {parteForm.formState.errors.receta_id ? <p className="mt-1 text-xs text-[var(--color-danger)]">{parteForm.formState.errors.receta_id.message}</p> : null}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Fecha</label>
              <input type="date" {...parteForm.register('fecha')} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-primary)]" />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Cantidad producida</label>
              <input type="number" step="0.01" {...parteForm.register('cantidad_producida', { valueAsNumber: true })} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-primary)]" placeholder="0" />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Unidad</label>
              <input {...parteForm.register('unidad')} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-primary)]" placeholder="kg" />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">Lotes de materia prima asociados</label>
            <div className="grid gap-2 md:grid-cols-2">
              {recepciones.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4 text-sm text-[var(--color-muted)]">
                  No hay recepciones cargadas para asociar.
                </div>
              ) : (
                recepciones.map((recepcion) => (
                  <label key={recepcion.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5 text-sm text-[var(--color-text)]">
                    <div>
                      <span className="font-medium">{recepcion.producto}</span>
                      <span className="block text-xs text-[var(--color-muted)]">{recepcion.lote_proveedor || 'Lote sin número'} · {recepcion.proveedores?.[0]?.razon_social ?? 'Proveedor sin nombre'}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedRecepciones.includes(recepcion.id)}
                      onChange={() => updateSelectedRecepciones(recepcion.id)}
                      className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)]"
                    />
                  </label>
                ))
              )}
            </div>
            {parteForm.formState.errors.recepcion_ids ? <p className="mt-1 text-xs text-[var(--color-danger)]">{parteForm.formState.errors.recepcion_ids.message}</p> : null}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Observaciones</label>
            <textarea {...parteForm.register('observaciones')} rows={3} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-primary)]" placeholder="Notas del parte de producción" />
          </div>

          <button type="submit" disabled={savingParte} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)] disabled:opacity-60">
            {savingParte ? <LoaderCircle className="animate-spin" size={16} /> : <Save size={16} />}
            {savingParte ? 'Guardando...' : 'Guardar parte de producción'}
          </button>
        </form>

        <div className="mt-6 space-y-3">
          <h3 className="text-base font-semibold text-[var(--color-text)]">Historial de producción</h3>
          {partes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-alt)] p-6 text-center text-sm text-[var(--color-muted)]">
              Todavía no se registraron partes de producción.
            </div>
          ) : (
            partes.map((parte) => (
              <div key={parte.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--color-text)]">{parte.recetas?.nombre_producto ?? 'Receta sin nombre'}</p>
                    <p className="text-xs text-[var(--color-muted)]">v{parte.recetas?.version ?? 1} · {parte.fecha}</p>
                  </div>
                  <span className="text-sm font-semibold text-[var(--color-text)]">{parte.cantidad_producida} {parte.unidad}</span>
                </div>

                <div className="mt-3">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">Lotes asociados</p>
                  <ul className="space-y-1 text-xs text-[var(--color-text)]">
                    {(parte.partes_produccion_recepciones ?? []).map((vinculo) => (
                      <li key={`${parte.id}-${vinculo.recepcion_id}`}>
                        {vinculo.recepciones_mp?.producto ?? 'Lote'} · {vinculo.recepciones_mp?.lote_proveedor ?? 'Sin lote'}
                        {vinculo.recepciones_mp?.proveedores?.razon_social ? ` · ${vinculo.recepciones_mp.proveedores.razon_social}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
