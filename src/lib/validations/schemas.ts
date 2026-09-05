import { z } from 'zod'

// ============================================================
// PROVEEDORES
// ============================================================
export const proveedorSchema = z.object({
  razon_social: z.string().min(1, 'La razón social es obligatoria'),
  cuit: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\d{2}-\d{8}-\d{1}$/.test(val),
      'Formato CUIT inválido (ej: 20-12345678-9)'
    ),
  contacto_nombre: z.string().optional(),
  contacto_telefono: z.string().optional(),
  contacto_email: z.string().email('Email inválido').optional().or(z.literal('')),
  tipo_insumo: z.string().optional(),
  rne_rpe: z.string().optional(),
  habilitacion_senasa: z.string().optional(),
  vencimiento_habilitacion: z.string().optional().nullable(),
  estado: z.enum(['activo', 'en_evaluacion', 'suspendido']).default('activo'),
  observaciones: z.string().optional(),
})

export type ProveedorFormData = z.infer<typeof proveedorSchema>

// ============================================================
// RECEPCIONES DE MATERIA PRIMA
// ============================================================
export const recepcionSchema = z
  .object({
    proveedor_id: z.string().uuid('Seleccioná un proveedor'),
    producto: z.string().min(1, 'El producto es obligatorio'),
    lote_proveedor: z.string().optional(),
    fecha_recepcion: z.string().min(1, 'La fecha es obligatoria'),
    cantidad: z.number({ error: 'Ingresá una cantidad válida' }).positive('La cantidad debe ser mayor a 0'),
    unidad: z.string().min(1, 'La unidad es obligatoria'),
    temperatura_recepcion: z.number({ error: 'Temperatura inválida' }).optional().nullable(),
    estado_organoleptico: z.enum(['ok', 'observado', 'rechazado']),
    motivo_rechazo: z.string().optional(),
    observaciones: z.string().optional(),
    remito_url: z.array(z.string()).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    // motivo_rechazo obligatorio si estado = 'rechazado'
    if (data.estado_organoleptico === 'rechazado' && !data.motivo_rechazo?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El motivo de rechazo es obligatorio cuando el estado es "Rechazado"',
        path: ['motivo_rechazo'],
      })
    }
  })

export type RecepcionFormData = z.infer<typeof recepcionSchema>

// ============================================================
// DOCUMENTOS
// ============================================================
export const documentoSchema = z.object({
  titulo: z.string().min(1, 'El título es obligatorio'),
  categoria: z.enum([
    'habilitacion_proveedor',
    'procedimiento_interno',
    'appcc',
    'analisis_laboratorio',
    'certificado',
    'otro',
  ]),
  proveedor_id: z.string().optional().nullable().or(z.literal('')),
  fecha_vencimiento: z.string().optional().nullable().or(z.literal('')),
  archivo_url: z.string().optional().nullable().or(z.literal('')),
})

export type DocumentoFormData = z.infer<typeof documentoSchema>

// ============================================================
// RECETAS
// ============================================================
export const ingredienteSchema = z.object({
  nombre: z.string().min(1, 'El nombre del ingrediente es obligatorio'),
  porcentaje: z.number().min(0).max(100),
})

export const pasoSchema = z.object({
  orden: z.number().int().positive(),
  descripcion: z.string().min(1, 'La descripción del paso es obligatoria'),
})

export const recetaSchema = z.object({
  nombre_producto: z.string().min(1, 'El nombre del producto es obligatorio'),
  version: z.number().int().positive(),
  ingredientes: z.array(ingredienteSchema).min(1, 'Agregá al menos un ingrediente'),
  pasos: z.array(pasoSchema).min(1, 'Agregá al menos un paso'),
  parametros_control: z.record(z.string(), z.union([z.string(), z.number()])),
  activa: z.boolean(),
})

export type RecetaFormData = z.infer<typeof recetaSchema>

// ============================================================
// PARTES DE PRODUCCIÓN
// ============================================================
export const parteProduccionSchema = z.object({
  receta_id: z.string().uuid('Seleccioná una receta'),
  fecha: z.string().min(1, 'La fecha es obligatoria'),
  cantidad_producida: z.number({ error: 'Cantidad inválida' }).positive('La cantidad debe ser mayor a 0'),
  unidad: z.string().min(1, 'La unidad es obligatoria'),
  observaciones: z.string().optional(),
  recepcion_ids: z.array(z.string().uuid()).min(1, 'Seleccioná al menos un lote de MP'),
})

export type ParteProduccionFormData = z.infer<typeof parteProduccionSchema>
