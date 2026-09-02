-- ============================================================
-- MIGRACIÓN 002 — GRANTs explícitos para Data API
-- Necesario para que las tablas SQL sean accesibles vía REST API de Supabase
-- ============================================================

-- Otorgar acceso a las tablas para el rol authenticated
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

GRANT SELECT, INSERT, UPDATE ON public.proveedores TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.recepciones_mp TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.documentos TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.recetas TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.partes_produccion TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.partes_produccion_recepciones TO authenticated;

-- Permitir ejecución de la función de vencimientos
GRANT EXECUTE ON FUNCTION public.vencimientos_activos() TO authenticated;

-- anon no tiene acceso (requiere login)
-- Si se quiere public read en el futuro, agregar GRANT SELECT... TO anon
