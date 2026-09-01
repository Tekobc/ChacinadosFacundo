-- ============================================================
-- SEED — Datos de prueba para entorno DEV
-- Ejecutar DESPUÉS de la migración 001_initial_schema.sql
-- NO ejecutar en producción
-- ============================================================

-- Proveedores de ejemplo
INSERT INTO public.proveedores (
  razon_social, cuit, contacto_nombre, contacto_telefono, contacto_email,
  tipo_insumo, rne_rpe, habilitacion_senasa, vencimiento_habilitacion, estado, observaciones
) VALUES
  (
    'Carnes del Sur S.A.', '30-71234567-8', 'Roberto Gómez', '011-4555-1234', 'rgomez@carnesdelsur.com',
    'Carne vacuna', 'RNE-00123', 'SENASA-2024-001', CURRENT_DATE + INTERVAL '15 days',
    'activo', 'Proveedor principal de carne vacuna'
  ),
  (
    'Tripas y Envases Norte', '20-22334455-6', 'Ana López', '0341-555-9876', 'alopez@tripas.com.ar',
    'Tripas y envases', 'RPE-00456', NULL, CURRENT_DATE + INTERVAL '5 days',
    'activo', 'Proveedor de tripas naturales y sintéticas'
  ),
  (
    'Condimentos Patagonia', '27-98765432-1', 'Carlos Ruiz', '02944-444-222', NULL,
    'Condimentos y especias', 'RNE-00789', 'SENASA-2024-002', CURRENT_DATE - INTERVAL '10 days',
    'en_evaluacion', 'Habilitación VENCIDA — en proceso de renovación'
  ),
  (
    'Frigorífico Las Flores', '30-55566677-9', 'María Sánchez', '02324-333-111', 'msanchez@lasflores.com.ar',
    'Carne porcina y grasa', 'RNE-00321', 'SENASA-2024-003', CURRENT_DATE + INTERVAL '60 days',
    'activo', NULL
  ),
  (
    'Proveedora Suspendida S.R.L.', '30-99988877-1', 'Sin contacto', NULL, NULL,
    'Carne vacuna', NULL, NULL, NULL,
    'suspendido', 'Suspendido por incumplimiento reiterado de temperatura'
  )
;

-- Recepciones de materia prima de ejemplo
INSERT INTO public.recepciones_mp (
  proveedor_id, producto, lote_proveedor, fecha_recepcion,
  cantidad, unidad, temperatura_recepcion, estado_organoleptico, motivo_rechazo, observaciones
)
SELECT
  p.id, 'Carne vacuna', 'LOTE-2024-001', NOW() - INTERVAL '2 days',
  250, 'kg', 4.2, 'ok', NULL, 'Carga matutina, todo en orden'
FROM public.proveedores p WHERE p.razon_social = 'Carnes del Sur S.A.'

UNION ALL

SELECT
  p.id, 'Carne vacuna', 'LOTE-2024-002', NOW() - INTERVAL '1 day',
  180, 'kg', 8.5, 'observado', NULL, 'Temperatura levemente elevada al llegar, se aceptó por estabilización rápida'
FROM public.proveedores p WHERE p.razon_social = 'Carnes del Sur S.A.'

UNION ALL

SELECT
  p.id, 'Carne porcina', 'LOTE-P-001', NOW() - INTERVAL '3 days',
  120, 'kg', 6.1, 'ok', NULL, NULL
FROM public.proveedores p WHERE p.razon_social = 'Frigorífico Las Flores'

UNION ALL

SELECT
  p.id, 'Tripas naturales', 'TN-2024-045', NOW() - INTERVAL '5 days',
  50, 'unidades', 2.0, 'rechazado', 'Olor fétido pronunciado, signos de descomposición en el 30% de la partida', 'Se devolvió la totalidad de la partida'
FROM public.proveedores p WHERE p.razon_social = 'Tripas y Envases Norte'
;

-- Documentos de ejemplo
INSERT INTO public.documentos (titulo, categoria, archivo_url, proveedor_id, fecha_vencimiento)
SELECT
  'Habilitación SENASA — Carnes del Sur', 'habilitacion_proveedor',
  'documentos/placeholder/habilitacion-senasa-carnes-del-sur.pdf',
  p.id, CURRENT_DATE + INTERVAL '15 days'
FROM public.proveedores p WHERE p.razon_social = 'Carnes del Sur S.A.'

UNION ALL

SELECT
  'Manual APPCC — Planta Interna', 'appcc',
  'documentos/placeholder/manual-appcc-2024.pdf',
  NULL, CURRENT_DATE + INTERVAL '180 days'

UNION ALL

SELECT
  'Procedimiento de Recepción de MP', 'procedimiento_interno',
  'documentos/placeholder/proc-recepcion-mp.pdf',
  NULL, NULL  -- sin vencimiento
;

-- Receta de ejemplo
INSERT INTO public.recetas (nombre_producto, version, ingredientes, pasos, parametros_control, activa)
VALUES (
  'Salame Tipo Milano',
  1,
  '[
    {"nombre": "Carne vacuna magra", "porcentaje": 50},
    {"nombre": "Carne porcina magra", "porcentaje": 30},
    {"nombre": "Grasa porcina", "porcentaje": 15},
    {"nombre": "Sal", "porcentaje": 2.5},
    {"nombre": "Condimentos especiales", "porcentaje": 2.5}
  ]'::jsonb,
  '[
    {"orden": 1, "descripcion": "Picar carnes en dado de 8mm"},
    {"orden": 2, "descripcion": "Mezclar con sal y condimentos por 15 minutos"},
    {"orden": 3, "descripcion": "Embutir en tripa natural calibre 60mm"},
    {"orden": 4, "descripcion": "Madurar en cámara a 12-15°C y 85% HR por 30 días"},
    {"orden": 5, "descripcion": "Control final de pH (objetivo 5.3) y merma"}
  ]'::jsonb,
  '{"temp_maduracion_min": 12, "temp_maduracion_max": 15, "hr_maduracion": 85, "dias_maduracion": 30}'::jsonb,
  TRUE
);
