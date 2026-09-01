-- ============================================================
-- MIGRACIÓN 001 — Esquema inicial
-- Sistema de Gestión de Calidad — Fábrica de Chacinados
-- ============================================================

-- Habilitar la extensión uuid-ossp para generar UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLA: proveedores
-- ============================================================
CREATE TABLE IF NOT EXISTS public.proveedores (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  razon_social            TEXT NOT NULL,
  cuit                    TEXT NOT NULL UNIQUE,
  contacto_nombre         TEXT,
  contacto_telefono       TEXT,
  contacto_email          TEXT,
  tipo_insumo             TEXT,
  rne_rpe                 TEXT,
  habilitacion_senasa     TEXT,
  vencimiento_habilitacion DATE,           -- alimenta el módulo de Vencimientos
  estado                  TEXT NOT NULL DEFAULT 'activo'
                            CHECK (estado IN ('activo', 'en_evaluacion', 'suspendido')),
  observaciones           TEXT,
  creado_en               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  creado_por              UUID REFERENCES auth.users(id),
  actualizado_en          TIMESTAMPTZ,
  actualizado_por         UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_proveedores_estado
  ON public.proveedores(estado);
CREATE INDEX IF NOT EXISTS idx_proveedores_vencimiento_habilitacion
  ON public.proveedores(vencimiento_habilitacion);

-- ============================================================
-- TABLA: recepciones_mp
-- ============================================================
CREATE TABLE IF NOT EXISTS public.recepciones_mp (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proveedor_id          UUID NOT NULL REFERENCES public.proveedores(id) ON DELETE RESTRICT,
  producto              TEXT NOT NULL,
  lote_proveedor        TEXT,
  fecha_recepcion       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cantidad              NUMERIC NOT NULL,
  unidad                TEXT NOT NULL,          -- kg, unidades, litros, etc.
  temperatura_recepcion NUMERIC,               -- °C
  estado_organoleptico  TEXT NOT NULL DEFAULT 'ok'
                          CHECK (estado_organoleptico IN ('ok', 'observado', 'rechazado')),
  motivo_rechazo        TEXT,                  -- obligatorio si estado_organoleptico = 'rechazado'
  remito_url            TEXT[],                -- array de URLs (Storage)
  controlado_por        UUID REFERENCES auth.users(id),
  observaciones         TEXT,
  creado_en             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  creado_por            UUID REFERENCES auth.users(id),
  actualizado_en        TIMESTAMPTZ,
  actualizado_por       UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_recepciones_mp_proveedor_id
  ON public.recepciones_mp(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_recepciones_mp_fecha_recepcion
  ON public.recepciones_mp(fecha_recepcion DESC);

-- Constraint: motivo_rechazo obligatorio si estado = 'rechazado'
ALTER TABLE public.recepciones_mp
  ADD CONSTRAINT chk_motivo_rechazo
  CHECK (
    estado_organoleptico <> 'rechazado'
    OR (estado_organoleptico = 'rechazado' AND motivo_rechazo IS NOT NULL AND motivo_rechazo <> '')
  );

-- ============================================================
-- TABLA: documentos
-- ============================================================
CREATE TABLE IF NOT EXISTS public.documentos (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo           TEXT NOT NULL,
  categoria        TEXT NOT NULL
                     CHECK (categoria IN (
                       'habilitacion_proveedor',
                       'procedimiento_interno',
                       'appcc',
                       'analisis_laboratorio',
                       'certificado',
                       'otro'
                     )),
  archivo_url      TEXT NOT NULL,              -- Storage
  proveedor_id     UUID REFERENCES public.proveedores(id) ON DELETE SET NULL,
  fecha_vencimiento DATE,                     -- nullable; alimenta Vencimientos si existe
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  creado_por       UUID REFERENCES auth.users(id),
  actualizado_en   TIMESTAMPTZ,
  actualizado_por  UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_documentos_fecha_vencimiento
  ON public.documentos(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_documentos_proveedor_id
  ON public.documentos(proveedor_id);

-- ============================================================
-- TABLA: recetas
-- (Las recetas se versionan: no se editan, se crea una nueva versión)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.recetas (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre_producto     TEXT NOT NULL,
  version             INT NOT NULL DEFAULT 1,
  ingredientes        JSONB NOT NULL DEFAULT '[]'::jsonb,
                      -- array de { nombre: string, porcentaje: number }
  pasos               JSONB NOT NULL DEFAULT '[]'::jsonb,
                      -- array de { orden: number, descripcion: string }
  parametros_control  JSONB NOT NULL DEFAULT '{}'::jsonb,
                      -- ej: { temp_coccion: 72, tiempo_maduracion: "48h" }
  activa              BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  creado_por          UUID REFERENCES auth.users(id)
  -- No tiene actualizado_en/actualizado_por: las recetas no se editan, se versionan
);

-- ============================================================
-- TABLA: partes_produccion
-- ============================================================
CREATE TABLE IF NOT EXISTS public.partes_produccion (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receta_id         UUID NOT NULL REFERENCES public.recetas(id) ON DELETE RESTRICT,
  fecha             DATE NOT NULL,
  cantidad_producida NUMERIC NOT NULL,
  unidad            TEXT NOT NULL,
  responsable       UUID REFERENCES auth.users(id),
  observaciones     TEXT,
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  creado_por        UUID REFERENCES auth.users(id),
  actualizado_en    TIMESTAMPTZ,
  actualizado_por   UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_partes_produccion_fecha
  ON public.partes_produccion(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_partes_produccion_receta_id
  ON public.partes_produccion(receta_id);

-- ============================================================
-- TABLA PUENTE: partes_produccion_recepciones (N:N)
-- Permite trazabilidad: qué lotes de MP se usaron en qué parte
-- ============================================================
CREATE TABLE IF NOT EXISTS public.partes_produccion_recepciones (
  parte_id     UUID NOT NULL REFERENCES public.partes_produccion(id) ON DELETE CASCADE,
  recepcion_id UUID NOT NULL REFERENCES public.recepciones_mp(id) ON DELETE RESTRICT,
  PRIMARY KEY (parte_id, recepcion_id)
);

CREATE INDEX IF NOT EXISTS idx_ppr_parte_id
  ON public.partes_produccion_recepciones(parte_id);
CREATE INDEX IF NOT EXISTS idx_ppr_recepcion_id
  ON public.partes_produccion_recepciones(recepcion_id);

-- ============================================================
-- FUNCIÓN SQL: vencimientos_activos()
-- Centraliza la lógica del semáforo para frontend y notificaciones futuras
-- ============================================================
CREATE OR REPLACE FUNCTION public.vencimientos_activos()
RETURNS TABLE (
  fuente        TEXT,
  referencia_id UUID,
  descripcion   TEXT,
  fecha_vencimiento DATE,
  dias_restantes INT,
  semaforo      TEXT   -- 'vencido' | 'critico' (≤7d) | 'proximo' (≤30d) | 'vigente'
)
LANGUAGE SQL
STABLE
AS $$
  -- Vencimientos de proveedores (habilitacion_senasa)
  SELECT
    'proveedor'                   AS fuente,
    p.id                          AS referencia_id,
    p.razon_social                AS descripcion,
    p.vencimiento_habilitacion    AS fecha_vencimiento,
    (p.vencimiento_habilitacion - CURRENT_DATE)::INT AS dias_restantes,
    CASE
      WHEN p.vencimiento_habilitacion < CURRENT_DATE          THEN 'vencido'
      WHEN p.vencimiento_habilitacion <= CURRENT_DATE + 7     THEN 'critico'
      WHEN p.vencimiento_habilitacion <= CURRENT_DATE + 30    THEN 'proximo'
      ELSE 'vigente'
    END AS semaforo
  FROM public.proveedores p
  WHERE p.vencimiento_habilitacion IS NOT NULL
    AND p.estado <> 'suspendido'

  UNION ALL

  -- Vencimientos de documentos
  SELECT
    'documento'             AS fuente,
    d.id                    AS referencia_id,
    d.titulo                AS descripcion,
    d.fecha_vencimiento     AS fecha_vencimiento,
    (d.fecha_vencimiento - CURRENT_DATE)::INT AS dias_restantes,
    CASE
      WHEN d.fecha_vencimiento < CURRENT_DATE          THEN 'vencido'
      WHEN d.fecha_vencimiento <= CURRENT_DATE + 7     THEN 'critico'
      WHEN d.fecha_vencimiento <= CURRENT_DATE + 30    THEN 'proximo'
      ELSE 'vigente'
    END AS semaforo
  FROM public.documentos d
  WHERE d.fecha_vencimiento IS NOT NULL

  ORDER BY dias_restantes ASC;
$$;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Política mínima Fase 0: todos los usuarios autenticados tienen acceso total.
-- TODO Fase 5: restringir por rol (admin/calidad/operario) modificando estas policies.
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.proveedores                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recepciones_mp               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recetas                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partes_produccion            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partes_produccion_recepciones ENABLE ROW LEVEL SECURITY;

-- Policy única por tabla: usuario autenticado puede SELECT/INSERT/UPDATE
-- (DELETE no habilitado — baja lógica vía campo estado en proveedores)

CREATE POLICY "authenticated_all" ON public.proveedores
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all" ON public.recepciones_mp
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all" ON public.documentos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all" ON public.recetas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all" ON public.partes_produccion
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all" ON public.partes_produccion_recepciones
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
