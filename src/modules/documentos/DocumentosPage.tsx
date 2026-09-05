import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FileText, FileUp, LoaderCircle, PencilLine, Save, Search } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { documentoSchema, type DocumentoFormData } from '../../lib/validations/schemas'

type ProveedorOption = {
  id: string
  razon_social: string
}

type DocumentoRow = {
  id: string
  titulo: string
  categoria: 'habilitacion_proveedor' | 'procedimiento_interno' | 'appcc' | 'analisis_laboratorio' | 'certificado' | 'otro'
  archivo_url: string
  proveedor_id?: string | null
  fecha_vencimiento?: string | null
  proveedores?: {
    razon_social: string
  } | null
}

const categoriaLabels: Record<DocumentoRow['categoria'], string> = {
  habilitacion_proveedor: 'Habilitación proveedor',
  procedimiento_interno: 'Procedimiento interno',
  appcc: 'APPCC',
  analisis_laboratorio: 'Análisis laboratorio',
  certificado: 'Certificado',
  otro: 'Otro',
}

const emptyValues: DocumentoFormData = {
  titulo: '',
  categoria: 'habilitacion_proveedor',
  proveedor_id: '',
  fecha_vencimiento: '',
  archivo_url: '',
}

export function DocumentosPage() {
  const [proveedores, setProveedores] = useState<ProveedorOption[]>([])
  const [documentos, setDocumentos] = useState<DocumentoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [subiendoArchivo, setSubiendoArchivo] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filtroCategoria, setFiltroCategoria] = useState<'todos' | DocumentoRow['categoria']>('todos')
  const [filtroProveedor, setFiltroProveedor] = useState<string>('todos')

  const form = useForm<DocumentoFormData>({
    resolver: zodResolver(documentoSchema),
    defaultValues: emptyValues,
  })

  const fetchProveedores = async () => {
    const { data, error } = await supabase.from('proveedores').select('id, razon_social').order('razon_social', { ascending: true })
    if (!error) {
      setProveedores((data ?? []) as ProveedorOption[])
    }
  }

  const fetchDocumentos = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('documentos')
      .select('*, proveedores:proveedor_id ( razon_social )')
      .order('fecha_vencimiento', { ascending: true, nullsFirst: false })

    if (error) {
      console.error(error)
      setDocumentos([])
      setLoading(false)
      return
    }

    setDocumentos((data ?? []) as DocumentoRow[])
    setLoading(false)
  }

  useEffect(() => {
    void Promise.all([fetchProveedores(), fetchDocumentos()])
  }, [])

  const documentosFiltrados = useMemo(() => {
    return documentos.filter((documento) => {
      const matchCategoria = filtroCategoria === 'todos' || documento.categoria === filtroCategoria
      const matchProveedor =
        filtroProveedor === 'todos'
          ? true
          : filtroProveedor === 'sin_proveedor'
          ? !documento.proveedor_id
          : documento.proveedor_id === filtroProveedor

      return matchCategoria && matchProveedor
    })
  }, [documentos, filtroCategoria, filtroProveedor])

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setSubiendoArchivo(true)
    const storagePath = `documentos/${Date.now()}-${file.name.replace(/\s+/g, '-')}`

    const { data, error } = await supabase.storage.from('documentos').upload(storagePath, file)

    if (error) {
      console.error(error)
      form.setError('archivo_url', { message: 'No se pudo subir el archivo. Revisá el bucket de Supabase Storage.' })
      setSubiendoArchivo(false)
      return
    }

    const { data: publicUrlData } = supabase.storage.from('documentos').getPublicUrl(data.path)
    form.setValue('archivo_url', publicUrlData.publicUrl)
    setSubiendoArchivo(false)
  }

  const onSubmit = async (values: DocumentoFormData) => {
    setSaving(true)

    const payload = {
      titulo: values.titulo,
      categoria: values.categoria,
      proveedor_id: values.proveedor_id || null,
      fecha_vencimiento: values.fecha_vencimiento || null,
      archivo_url: values.archivo_url || '',
    }

    const { error } = editingId
      ? await supabase.from('documentos').update(payload).eq('id', editingId)
      : await supabase.from('documentos').insert([payload])

    if (error) {
      console.error(error)
      setSaving(false)
      return
    }

    form.reset(emptyValues)
    setEditingId(null)
    await fetchDocumentos()
    setSaving(false)
  }

  const handleEdit = (documento: DocumentoRow) => {
    setEditingId(documento.id)
    form.reset({
      titulo: documento.titulo,
      categoria: documento.categoria,
      proveedor_id: documento.proveedor_id ?? '',
      fecha_vencimiento: documento.fecha_vencimiento ?? '',
      archivo_url: documento.archivo_url ?? '',
    })
  }

  const handleCancel = () => {
    setEditingId(null)
    form.reset(emptyValues)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[var(--color-primary)]/10 p-3 text-[var(--color-primary)]">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[var(--color-text)]">Documentación</h1>
            <p className="text-sm text-[var(--color-muted)]">Repositorio de habilitaciones, procedimientos y certificados.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-muted)]">
            <Search size={16} />
            <select
              value={filtroCategoria}
              onChange={(event) => setFiltroCategoria(event.target.value as 'todos' | DocumentoRow['categoria'])}
              className="bg-transparent text-sm text-[var(--color-text)] outline-none"
            >
              <option value="todos">Todas las categorías</option>
              <option value="habilitacion_proveedor">Habilitación proveedor</option>
              <option value="procedimiento_interno">Procedimiento interno</option>
              <option value="appcc">APPCC</option>
              <option value="analisis_laboratorio">Análisis laboratorio</option>
              <option value="certificado">Certificado</option>
              <option value="otro">Otro</option>
            </select>
          </label>
        </div>
      </div>

      {/* Barra de chips de proveedores para filtrar */}
      {proveedores.length > 0 ? (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="shrink-0 font-medium text-[var(--color-muted)]">Filtrar proveedor:</span>
          <button
            type="button"
            onClick={() => setFiltroProveedor('todos')}
            className={`shrink-0 rounded-full px-3 py-1 font-medium transition ${
              filtroProveedor === 'todos'
                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                : 'border border-[var(--color-border)] bg-white text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]'
            }`}
          >
            Todos ({documentos.length})
          </button>
          <button
            type="button"
            onClick={() => setFiltroProveedor('sin_proveedor')}
            className={`shrink-0 rounded-full px-3 py-1 font-medium transition ${
              filtroProveedor === 'sin_proveedor'
                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                : 'border border-[var(--color-border)] bg-white text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]'
            }`}
          >
            Sin proveedor ({documentos.filter((d) => !d.proveedor_id).length})
          </button>
          {proveedores.map((p) => {
            const count = documentos.filter((d) => d.proveedor_id === p.id).length
            const active = filtroProveedor === p.id
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setFiltroProveedor(active ? 'todos' : p.id)}
                className={`shrink-0 rounded-full px-3 py-1 font-medium transition ${
                  active
                    ? 'bg-[var(--color-primary)] text-white shadow-sm'
                    : 'border border-[var(--color-border)] bg-white text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]'
                }`}
              >
                {p.razon_social} {count > 0 ? `(${count})` : ''}
              </button>
            )
          })}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Listado</h2>
            <span className="text-sm text-[var(--color-muted)]">{documentosFiltrados.length} registros</span>
          </div>

          {loading ? (
            <div className="flex min-h-40 items-center justify-center gap-2 text-[var(--color-muted)]">
              <LoaderCircle className="animate-spin" size={18} />
              Cargando documentación...
            </div>
          ) : documentosFiltrados.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-alt)] p-8 text-center text-[var(--color-muted)]">
              No hay documentos para este filtro.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-[var(--color-muted)]">
                    <th className="py-3 pr-4 font-medium">Título</th>
                    <th className="py-3 pr-4 font-medium">Categoría</th>
                    <th className="py-3 pr-4 font-medium">Proveedor</th>
                    <th className="py-3 pr-4 font-medium">Vence</th>
                    <th className="py-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {documentosFiltrados.map((documento) => (
                    <tr key={documento.id} className="border-b border-[var(--color-border)] last:border-0">
                      <td className="py-3 pr-4">
                        <div className="font-medium text-[var(--color-text)]">{documento.titulo}</div>
                        <div className="text-xs text-[var(--color-muted)]">
                          <a href={documento.archivo_url} target="_blank" rel="noreferrer" className="hover:text-[var(--color-primary)]">
                            Ver archivo
                          </a>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-[var(--color-muted)]">{categoriaLabels[documento.categoria]}</td>
                      <td className="py-3 pr-4 text-[var(--color-muted)]">
                        {documento.proveedores ? (
                          <button
                            type="button"
                            onClick={() => setFiltroProveedor(documento.proveedor_id || 'todos')}
                            className="text-left font-medium text-[var(--color-primary)] hover:underline"
                            title="Filtrar por este proveedor"
                          >
                            {documento.proveedores.razon_social}
                          </button>
                        ) : (
                          'Sin proveedor'
                        )}
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs text-[var(--color-text)]">
                        {documento.fecha_vencimiento ? new Date(documento.fecha_vencimiento).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleEdit(documento)}
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
              {editingId ? 'Editar documento' : 'Nuevo documento'}
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
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Título</label>
              <input {...form.register('titulo')} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-primary)]" placeholder="Ej: Habilitación SENASA 2026" />
              {form.formState.errors.titulo ? <p className="mt-1 text-xs text-[var(--color-danger)]">{form.formState.errors.titulo.message}</p> : null}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Categoría</label>
              <select {...form.register('categoria')} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-primary)]">
                <option value="habilitacion_proveedor">Habilitación proveedor</option>
                <option value="procedimiento_interno">Procedimiento interno</option>
                <option value="appcc">APPCC</option>
                <option value="analisis_laboratorio">Análisis laboratorio</option>
                <option value="certificado">Certificado</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium text-[var(--color-text)]">Proveedor asignado</label>
                {form.watch('proveedor_id') ? (
                  <button
                    type="button"
                    onClick={() => form.setValue('proveedor_id', '')}
                    className="text-xs text-[var(--color-muted)] hover:text-[var(--color-danger)]"
                  >
                    Quitar asignación
                  </button>
                ) : null}
              </div>

              {/* Lista / chips rápidos para seleccionar el proveedor */}
              {proveedores.length > 0 ? (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {proveedores.map((proveedor) => {
                    const selected = form.watch('proveedor_id') === proveedor.id
                    return (
                      <button
                        key={proveedor.id}
                        type="button"
                        onClick={() => form.setValue('proveedor_id', selected ? '' : proveedor.id)}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                          selected
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-sm'
                            : 'border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-white'
                        }`}
                      >
                        {proveedor.razon_social}
                      </button>
                    )
                  })}
                </div>
              ) : null}

              <select {...form.register('proveedor_id')} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-primary)]">
                <option value="">Sin proveedor (general / interno)</option>
                {proveedores.map((proveedor) => (
                  <option key={proveedor.id} value={proveedor.id}>{proveedor.razon_social}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Fecha de vencimiento</label>
              <input type="date" {...form.register('fecha_vencimiento')} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-primary)]" />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Archivo</label>
              <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface-alt)] p-3">
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-text)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]">
                  <FileUp size={16} />
                  {subiendoArchivo ? 'Subiendo...' : 'Seleccionar archivo'}
                  <input type="file" className="hidden" onChange={handleFileChange} />
                </label>
                {form.watch('archivo_url') ? (
                  <a href={form.watch('archivo_url') || undefined} target="_blank" rel="noreferrer" className="mt-3 block truncate text-xs text-[var(--color-primary)] hover:underline">
                    {form.watch('archivo_url')}
                  </a>
                ) : null}
              </div>
              {form.formState.errors.archivo_url ? <p className="mt-1 text-xs text-[var(--color-danger)]">{form.formState.errors.archivo_url.message}</p> : null}
            </div>

            <button
              type="submit"
              disabled={saving || subiendoArchivo}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <LoaderCircle className="animate-spin" size={16} /> : <Save size={16} />}
              {saving ? 'Guardando...' : editingId ? 'Actualizar documento' : 'Guardar documento'}
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
