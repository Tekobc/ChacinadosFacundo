# Plan de integración y pendientes — Sistema de Calidad Chacinados

> Este documento reemplaza como fuente de verdad al `plan-de-trabajo-sistema-calidad.md` original para el trabajo día a día del agente de código. Ese archivo sigue sirviendo como brief de contexto general del proyecto; este es el **estado real + checklist accionable**, actualizado a partir de una auditoría del repo el 01/09/2026.
>
> **Regla para el agente:** antes de tocar código, leer la sección 1 (estado actual) completa. No reinventar decisiones ya tomadas (sección 2). Trabajar un ítem de la sección 4 a la vez, de arriba hacia abajo, y marcar el checkbox al terminar.

---

## 1. Estado actual del repo (auditoría)

**Stack confirmado en `package.json`:** React 19 + Vite 8 + TypeScript + TailwindCSS 4 + react-router-dom 7 + react-hook-form + zod 4 + @hookform/resolvers + @supabase/supabase-js + lucide-react + oxlint.

**Lo que YA está hecho:**
- [x] Proyecto Vite + React + TS + Tailwind inicializado y compilando (`dist/` generado).
- [x] Routing (`App.tsx`) con las 6 rutas del brief: `/`, `/proveedores`, `/recepciones`, `/documentos`, `/vencimientos`, `/produccion`, más catch-all a `/`.
- [x] Layout base (`MainLayout.tsx`) con sidebar fijo en desktop + header simple en mobile (sin drawer todavía).
- [x] `Sidebar.tsx` con navegación a los 6 módulos, iconos de `lucide-react`, estado activo con `NavLink`.
- [x] Cliente de Supabase (`lib/supabaseClient.ts`) con validación de variables de entorno.
- [x] `.env` real cargado y apuntando a un proyecto Supabase (`.env` correctamente ignorado en git, no se commiteó).
- [x] **Esquema SQL completo** (`supabase/migrations/001_initial_schema.sql`): las 6 tablas del modelo de datos (`proveedores`, `recepciones_mp`, `documentos`, `recetas`, `partes_produccion`, `partes_produccion_recepciones`), índices, constraint `chk_motivo_rechazo`, función `vencimientos_activos()` que unifica el semáforo de proveedores + documentos, y RLS habilitado con policy abierta para `authenticated`.
- [x] `supabase/migrations/002_grants.sql`: GRANTs explícitos para que las tablas sean accesibles por la Data API (sin esto, RLS activo pero sin grants deja todo inaccesible — buena detección temprana).
- [x] `supabase/seed.sql` con datos de prueba realistas (proveedores con vencimientos vencidos/próximos/vigentes, pensado para probar el semáforo).
- [x] **Validaciones Zod completas** (`lib/validations/schemas.ts`) para las 5 entidades: `proveedorSchema`, `recepcionSchema` (con `superRefine` para exigir motivo de rechazo), `documentoSchema`, `recetaSchema` (+ `ingredienteSchema`, `pasoSchema`), `parteProduccionSchema`. Esto es trabajo de Fase 1–3 adelantado a nivel de esquema, pero **sin UI todavía**.
- [x] 2 commits en git (`feat: Fase 0`, `fix: compatibilidad Zod v4`).

**Lo que está como placeholder (NO hecho, aunque el archivo exista):**
- [ ] Las 6 páginas de módulo (`DashboardPage`, `ProveedoresPage`, `RecepcionesPage`, `DocumentosPage`, `VencimientosPage`, `ProduccionPage`) son **cáscaras visuales**: título + ícono + tarjeta "Módulo en construcción". Ningún módulo tiene CRUD real, ninguno consulta Supabase todavía.
- [ ] No hay pantalla de login ni protección de rutas — cualquiera que abra la app entra directo, aunque Supabase Auth esté disponible como dependencia.
- [ ] No hay componentes de formulario, tabla, ni ningún componente reutilizable en `src/components/` más allá del `Sidebar`.

**Deuda / cosas a corregir apenas se pueda:**
- [ ] `README.md` sigue siendo el default de Vite (copiar/pegar sin editar). Reemplazar por README real del proyecto (qué es, cómo levantarlo, variables de entorno necesarias).
- [ ] El sidebar y las páginas usan una paleta azul genérica de Tailwind (`blue-900`, `blue-700`, etc.) — **todavía no se aplicó ningún sistema de diseño propio**. Ver sección 3.
- [ ] `favicon.svg` / `icons.svg` / `hero.png` en `src/assets` y `public/` parecen placeholders del template de Vite (`vite.svg`, `react.svg` conviven ahí) — limpiar assets que no se usen antes de la Fase 4.
- [ ] La policy de RLS actual (`USING (true) WITH CHECK (true)` para todo `authenticated`) es intencionalmente permisiva para desarrollo — está documentada como TODO en el propio SQL. Bien dejarla así por ahora, pero no perder de vista que hay que endurecerla en la Fase 5 (roles).

---

## 2. Decisiones ya tomadas (no las vuelvas a discutir, respetalas)

Esto evita que el agente re-derive arquitectura ya definida y se desvíe.

1. **Sin inventario/stock.** La trazabilidad de materia prima a producción se resuelve con la tabla puente `partes_produccion_recepciones`, no con conteo de stock. No agregar lógica de descuento de inventario.
2. **Las recetas se versionan, no se editan.** Un cambio de receta = nueva fila con `version` incrementado y `activa = true`; la anterior pasa `activa = false`. Nunca hacer `UPDATE` sobre `ingredientes`/`pasos` de una receta existente.
3. **Convención de nombres:** tablas y campos en `snake_case` español (ya así en el SQL). Mantenerlo — no mezclar con `camelCase` en la base.
4. **Un solo rol de usuario por ahora** (`authenticated`, sin diferenciación admin/calidad/operario). No implementar lógica de roles todavía; está en el backlog (Fase 5 del plan original).
5. **Migraciones numeradas y aditivas.** Cualquier cambio de esquema va en un archivo nuevo `00N_descripcion.sql` dentro de `supabase/migrations/`. Nunca editar `001` o `002` retroactivamente.
6. **Formularios con `react-hook-form` + `@hookform/resolvers/zod`**, reutilizando los schemas ya definidos en `lib/validations/schemas.ts`. No crear validación manual paralela.

---

## 3. Sistema de diseño a aplicar (pendiente de implementar)

El look & feel actual es el default de Tailwind (azul genérico) y hay que reemplazarlo. Lineamientos para que el agente lo aplique de forma consistente en todos los módulos:

**Paleta** (agregar como variables CSS en `src/index.css`, reemplazando `--color-primary`):
- Fondo de página: gris porcelana frío, no blanco puro ni beige cálido — `#EEF1F0`.
- Superficie/tarjetas: blanco `#FFFFFF` con borde hairline `#DADEDA`, sin sombra pronunciada.
- Texto principal: grafito `#1E2422` (casi negro con matiz verdoso, no negro puro).
- Acento primario (marca / acciones principales): pimentón `#C1440E` — un solo uso por vista (botón primario, logo), no decorativo en todos lados.
- Estado OK / aprobado: verde salvia `#4C7A6B`.
- Estado atención / próximo a vencer: ámbar `#D9A441`.
- Estado rechazado / vencido: rojo `#B23A34` (distinto del pimentón de marca, para no confundir "acción" con "alerta").

**Tipografía:** IBM Plex Sans para toda la interfaz (texto, labels, botones) + IBM Plex Mono únicamente para lotes, códigos de proveedor y timestamps (no decorativo — refuerza la idea de "código trazable estampado"). Cargar vía `fonts.googleapis.com` o self-host, no usar la fuente default del sistema.

**Layout:**
- Sidebar: fondo grafito oscuro (no azul), ítem activo con el acento pimentón como borde izquierdo de 2px, no como fondo sólido.
- Tablas densas (filas con borde inferior hairline, sin cards redondeadas por fila) para los listados de proveedores/recepciones — es una herramienta de uso profesional, no un feed de consumo.
- El semáforo de vencimientos se muestra como franja/lista horizontal de estados, no como 3 tarjetas idénticas genéricas.
- Formularios con aspecto de "planilla de control": inputs con label arriba, agrupados por sección con un separador hairline, sin decoración extra.

**Motion:** mínimo. Solo transición corta (150–200ms) en focus/hover de inputs y al confirmar un guardado exitoso. Nada de animaciones de entrada por scroll.

**Checklist de aplicación:**
- [ ] Actualizar `src/index.css`: reemplazar variables de color por la paleta de arriba.
- [ ] Configurar tipografía IBM Plex Sans/Mono en Tailwind (`tailwind.config` o `@theme` en Tailwind 4).
- [ ] Rediseñar `Sidebar.tsx` con la nueva paleta (grafito + acento pimentón en el ítem activo).
- [ ] Definir 3–4 componentes base reutilizables en `src/components/`: `Button`, `Card`/`Panel`, `StatusBadge` (para ok/observado/rechazado y vigente/próximo/vencido), `DataTable` genérica. Construir los módulos sobre estos, no repetir estilos inline en cada página.
- [ ] Aplicar el nuevo estilo recién cuando se construya cada módulo (no hace falta una "pasada de re-styling" separada — se hace módulo por módulo en la sección 4).

---

## 4. Checklist de próximos pasos (orden de ejecución)

### Paso 1 — Autenticación mínima (bloqueante, hacerlo primero)
- [ ] Pantalla de login simple (email + password) usando Supabase Auth.
- [ ] Guard de rutas: redirigir a `/login` si no hay sesión activa.
- [ ] Botón de logout visible en el sidebar/header.
- [ ] Crear al menos un usuario de prueba en el proyecto Supabase para poder testear el resto de los módulos.

> Por qué primero: todos los módulos siguientes dependen de `auth.uid()` para `creado_por`/`controlado_por`. Sin login, esos campos van a quedar `null` y no se puede probar el flujo real.

### Paso 2 — Módulo Proveedores (CRUD completo)
- [ ] Aplicar componentes base del sistema de diseño (sección 3) antes o durante este módulo — es el primero, sirve de referencia para los siguientes.
- [ ] Listado con tabla densa, filtro por `estado` (activo/en_evaluacion/suspendido).
- [ ] Formulario de alta/edición usando `proveedorSchema` + react-hook-form.
- [ ] Ficha de proveedor con historial de recepciones asociadas (join simple contra `recepciones_mp`).
- [ ] Cambio de estado (activo → suspendido, etc.) sin borrado físico.

### Paso 3 — Módulo Recepción de Materia Prima
- [ ] Formulario de carga rápida (pensado para completarse parado, desde el celular): selector de proveedor, producto, lote, cantidad, temperatura, estado organoléptico con `StatusBadge`.
- [ ] Si `estado_organoleptico = rechazado`, mostrar campo `motivo_rechazo` obligatorio (ya validado en el schema, falta la UI condicional).
- [ ] Subida de remito/foto a Supabase Storage (crear bucket si no existe) y guardar la URL en `remito_url`.
- [ ] Listado filtrable por fecha/proveedor/estado.

### Paso 4 — Documentación + Vencimientos
- [ ] CRUD de `documentos` con subida de archivo a Storage y categorización.
- [ ] Vincular documento a proveedor (select opcional).
- [ ] Vista de Vencimientos consumiendo directamente la función SQL `vencimientos_activos()` (ya existe — no reimplementar la lógica de semáforo en el frontend).
- [ ] Filtros por rango de días / tipo de fuente (proveedor vs documento).

### Paso 5 — Recetas y Producción
- [ ] CRUD de `recetas` con listas dinámicas de ingredientes y pasos (usar `ingredienteSchema`/`pasoSchema`).
- [ ] Al "editar" una receta activa, crear una versión nueva en vez de hacer `UPDATE` (regla de la sección 2).
- [ ] Carga de `partes_produccion` con selector múltiple de `recepciones_mp` (tabla puente `partes_produccion_recepciones`).
- [ ] Vista de trazabilidad: desde un parte de producción, listar los lotes/proveedores de MP usados.

### Paso 6 — Dashboard real
- [ ] Reemplazar los 3 placeholders (`—`) por datos reales: próximos vencimientos (desde `vencimientos_activos()`), recepciones del mes, rechazos recientes.
- [ ] Mantener las queries livianas: traer solo lo agregado necesario para el dashboard, no todas las filas (ver guía de performance abajo).

### Paso 7 — Pulido y mobile
- [ ] Drawer de sidebar en mobile (hoy el layout tiene el comentario `placeholder para Fase 4`).
- [ ] Estados vacíos y de error en cada listado (siguiendo el tono de UI: decir qué pasó y qué hacer, sin "Error:" ni disculpas).
- [ ] Limpiar assets sin uso (`vite.svg`, `react.svg`, `hero.png` si no se usa).
- [ ] Reescribir `README.md` con instrucciones reales del proyecto.

### Backlog (no atacar todavía)
- [ ] Roles diferenciados (admin/calidad/operario) + políticas RLS más finas.
- [ ] Reportes exportables (PDF/Excel).
- [ ] Notificaciones automáticas de vencimientos.
- [ ] Módulo de no conformidades / auditorías internas.

---

## 5. Guía de rendimiento (aplicar mientras se construye, no como pasada final)

- **No memoizar por costumbre.** Con React 19, evitar sembrar `useMemo`/`useCallback`/`React.memo` en todos lados "por las dudas" — agrega complejidad sin medir nada. Memoizar solo si se detecta un problema real de renders con React DevTools Profiler.
- **Virtualizar listas largas.** Los listados de `recepciones_mp` van a crecer rápido con el uso diario. A partir de ~100 filas, virtualizar (`@tanstack/react-virtual`) en vez de renderizar todo el DOM. No hace falta desde el día 1, pero dejar el `DataTable` genérico preparado para aceptarlo sin reescribirlo.
- **Code splitting por ruta.** Cada módulo (`ProveedoresPage`, `RecepcionesPage`, etc.) debería cargarse con `React.lazy` + `Suspense` en `App.tsx` en vez de ir todo en el bundle inicial — son pantallas independientes que un usuario no visita todas en la misma sesión.
- **Consultas a Supabase acotadas.** Traer solo las columnas necesarias (`select('id, razon_social, estado')` en vez de `select('*')`) en listados, y paginar (`range()`) en vez de traer todas las filas de entrada. Usar la función `vencimientos_activos()` para el semáforo en vez de traer todos los proveedores/documentos y calcular en el cliente.
- **Media móvil como prioridad real de performance.** El uso principal de Recepción de MP va a ser desde celular en planta, con conexión posiblemente mala — priorizar Largest Contentful Paint bajo y evitar librerías pesadas (ej. no sumar un editor rico o librería de gráficos grande solo para el dashboard inicial).
- **Medir antes de optimizar.** Si en algún momento algo se siente lento, usar el Profiler de React DevTools y Lighthouse antes de aplicar una técnica — no adivinar el cuello de botella.

---

## 6. Cómo seguir usando este documento con el agente de código

1. Pegar este archivo completo como contexto al iniciar cada sesión de trabajo con el agente.
2. Trabajar el **Paso 1** primero sin excepción (autenticación) — todo lo demás depende de tener sesión real.
3. Después, seguir la sección 4 en orden. No saltar al Paso 5 sin haber cerrado el 2, 3 y 4 — cada uno se apoya en componentes/base que deja el anterior (`DataTable`, `StatusBadge`, patrón de formulario).
4. Al cerrar cada paso, tildar los checkboxes de este archivo y hacer commit con mensaje descriptivo (seguir el estilo ya usado: `feat: ...`, `fix: ...`).
5. Si en el camino se toma una decisión de arquitectura nueva (ej. cómo se resuelve la subida de archivos), agregarla a la sección 2 para que quede registrada y no se vuelva a discutir.
