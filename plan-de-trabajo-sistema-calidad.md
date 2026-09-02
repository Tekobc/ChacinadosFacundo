# Plan de Trabajo — Sistema de Gestión de Calidad para Fábrica de Chacinados

## 1. Contexto y objetivo

Sistema web interno, simple y amigable, para el área de calidad/pedidos de una fábrica de chacinados. Reemplaza controles manuales (Excel/papel) por una app modular que centraliza: proveedores, recepción de materia prima, documentación, vencimientos y recetas/producción.

**No incluye** gestión de stock/inventario — el foco es trazabilidad y control de calidad, no logística de almacén.

**Principio de diseño:** arquitectura modular. Cada módulo es una entidad independiente en la base de datos que puede lanzarse, probarse y usarse por separado, pero se referencian entre sí (proveedor ↔ recepción ↔ producción). Nuevos módulos futuros (no conformidades, auditorías, control de plagas, capacitaciones del personal, etc.) deben poder agregarse sin romper los existentes.

---

## 2. Stack tecnológico propuesto

| Capa | Tecnología | Motivo |
|---|---|---|
| Frontend | React + Vite + TailwindCSS | Simple, rápido de iterar, buena base para UI amigable |
| Formularios / validación | react-hook-form + zod | Manejo de formularios consistente en todos los módulos, validación tipada compartida con TypeScript |
| Backend / DB / Auth / Storage | Supabase (Postgres) | Todo-en-uno: base de datos relacional, autenticación, storage de archivos, API autogenerada. Tier gratuito suficiente para este volumen |
| Hosting frontend | Vercel o Netlify | Deploy automático desde el repo, gratis |
| Control de versiones | Git + GitHub | Requisito para trabajar con agente de código |

> Alternativa más simple si se quiere evitar backend propio: Airtable/Google Sheets + Softr/Glide como capa visual. Se descarta por ahora porque limita la escalabilidad y el control fino de permisos que pide el proyecto.

### Entornos

Dos proyectos Supabase separados desde el inicio: `chacinados-calidad-dev` y `chacinados-calidad-prod`. Las migraciones SQL se prueban primero en dev. Evita romper datos reales de planta mientras se sigue desarrollando.

---

## 3. Modelo de datos

Convención en todas las tablas (salvo `users`, gestionada por Supabase Auth): agregar `actualizado_en timestamptz` y `actualizado_por uuid (FK → users)` además de `creado_en`/`creado_por`, para tener trazabilidad de ediciones — no solo de alta.

### `proveedores`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid (PK) | |
| razon_social | text | |
| cuit | text | único |
| contacto_nombre | text | |
| contacto_telefono | text | |
| contacto_email | text | |
| tipo_insumo | text | ej: carne vacuna, tripas, condimentos, envases |
| rne_rpe | text | Registro Nacional/Provincial de Establecimiento |
| habilitacion_senasa | text | número de registro (si aplica) |
| vencimiento_habilitacion | date | alimenta el módulo de Vencimientos — **indexado** |
| estado | enum | `activo`, `en_evaluacion`, `suspendido` — **indexado** |
| observaciones | text | |
| creado_en | timestamptz | |
| creado_por | uuid (FK → users) | |
| actualizado_en | timestamptz | |
| actualizado_por | uuid (FK → users) | |

### `recepciones_mp`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid (PK) | |
| proveedor_id | uuid (FK → proveedores) | **indexado** |
| producto | text | ej: carne porcina, grasa, tripa natural |
| lote_proveedor | text | |
| fecha_recepcion | timestamptz | **indexado** |
| cantidad | numeric | |
| unidad | text | kg, unidades, litros |
| temperatura_recepcion | numeric | °C |
| estado_organoleptico | enum | `ok`, `observado`, `rechazado` |
| motivo_rechazo | text | nullable, obligatorio si `rechazado` |
| remito_url | text[] | array — permite más de una foto/archivo por recepción |
| controlado_por | uuid (FK → users) | |
| observaciones | text | |
| creado_en / creado_por / actualizado_en / actualizado_por | — | ver convención arriba |

### `documentos`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid (PK) | |
| titulo | text | |
| categoria | enum | `habilitacion_proveedor`, `procedimiento_interno`, `appcc`, `analisis_laboratorio`, `certificado`, `otro` |
| archivo_url | text | Storage |
| proveedor_id | uuid (FK, nullable) | si el doc pertenece a un proveedor |
| fecha_vencimiento | date | nullable — **indexado**, alimenta Vencimientos si existe |
| creado_en / creado_por / actualizado_en / actualizado_por | — | ver convención arriba |

### Vencimientos — función SQL, no solo vista

En vez de una vista simple, definir una **función SQL** `vencimientos_activos()` que calcule el semáforo (vencido / ≤7 días / ≤30 días / vigente) agregando `proveedores.vencimiento_habilitacion` y `documentos.fecha_vencimiento`. Motivo: cuando se implemente la notificación automática (Fase 5, `pg_cron` + Edge Function), va a consultar la misma función — evita duplicar la lógica de rangos de días entre frontend y backend.

### `recetas`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid (PK) | |
| nombre_producto | text | |
| version | int | para versionar cambios de receta |
| ingredientes | jsonb | array de `{ nombre, porcentaje }` — decisión consciente: sin FK a insumos por ahora, solo para mostrar en pantalla. Si más adelante se necesita reportar "qué recetas usan tal insumo", normalizar en tabla aparte |
| pasos | jsonb | array de `{ orden, descripcion }` |
| parametros_control | jsonb | ej: `{ temp_coccion, tiempo_maduracion }` |
| activa | boolean | |
| creado_en / creado_por | — | ver convención arriba (recetas no se editan, se versionan) |

### `partes_produccion`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid (PK) | |
| receta_id | uuid (FK → recetas) | |
| fecha | date | |
| cantidad_producida | numeric | |
| unidad | text | |
| responsable | uuid (FK → users) | |
| observaciones | text | |
| creado_en / creado_por / actualizado_en / actualizado_por | — | ver convención arriba |

### `partes_produccion_recepciones` (nueva — reemplaza el array `recepcion_mp_ids`)
| Campo | Tipo | Notas |
|---|---|---|
| parte_id | uuid (FK → partes_produccion) | |
| recepcion_id | uuid (FK → recepciones_mp) | |

Tabla puente N:N en vez de `uuid[]`. Permite hacer JOIN directo para trazabilidad ("¿en qué partes se usó este lote?" / "¿qué lotes se usaron en este parte?") sin desempaquetar arrays, y admite índices normales sobre ambas FKs.

### `users`
Gestionado por Supabase Auth. Roles sugeridos: `admin`, `calidad`, `operario` (para escalar permisos más adelante).

---

## 4. Seguridad — Row Level Security (RLS)

Supabase expone las tablas directamente vía API REST/Realtime. **Sin RLS habilitado, cualquier usuario autenticado puede leer y escribir cualquier fila de cualquier tabla**, sin importar que hoy no haya roles diferenciados.

Política mínima para Fase 0 (un solo nivel de acceso):
- Habilitar RLS en todas las tablas.
- Policy única: `authenticated` puede `SELECT`/`INSERT`/`UPDATE` sobre todas las filas.
- Dejar comentado en las migraciones dónde se restringiría por rol más adelante (ej: `operario` no puede editar `recetas`), para que agregar roles en el backlog sea una migración incremental y no un rediseño.

---

## 5. Storage — convención de nombres

Todos los archivos subidos (remitos, documentos, fotos) siguen el patrón:

```
{tabla}/{registro_id}/{timestamp}-{nombre_original}
```

Ej: `recepciones_mp/3fa8.../1717000000-remito.jpg`. Evita colisiones de nombres y facilita limpieza/auditoría por registro.

---

## 6. Módulos funcionales

1. **Proveedores** — alta/edición/baja lógica, listado con filtro por estado, ficha con historial de recepciones.
2. **Recepción de Materia Prima** — formulario rápido de carga (pensado para completarse en el momento, desde celular/tablet), listado filtrable por fecha/proveedor/estado.
3. **Documentación** — repositorio con subida de archivos, filtro por categoría, vínculo opcional a proveedor.
4. **Vencimientos** — dashboard tipo semáforo, agregando todas las fuentes de fecha de vencimiento vía `vencimientos_activos()`.
5. **Recetas y Producción** — CRUD de recetas + carga de partes de producción vinculando lotes de MP (trazabilidad sin stock) vía tabla puente.
6. **Dashboard / Home** — resumen general: vencimientos próximos, últimas recepciones, alertas de rechazos recientes.

---

## 7. Requisitos no funcionales

- Responsive (uso desde celular en planta, no solo escritorio).
- Autenticación con usuario/contraseña (Supabase Auth); un solo rol al inicio, con RLS y estructura lista para agregar roles después.
- Carga de archivos con tamaño máximo razonable (ej. 10MB) y tipos permitidos (PDF, JPG, PNG).
- Español (es-AR) como único idioma por ahora.
- Sin requerimientos de integración con sistemas externos en esta etapa.
- Tests mínimos sobre lógica crítica: cálculo de semáforo de vencimientos y validación de `motivo_rechazo` obligatorio.

---

## 8. Estructura de carpetas sugerida

```
chacinados-calidad/
├── src/
│   ├── components/       # componentes UI reutilizables
│   ├── modules/
│   │   ├── proveedores/
│   │   ├── recepciones/
│   │   ├── documentos/
│   │   ├── vencimientos/
│   │   └── produccion/
│   ├── lib/
│   │   ├── supabaseClient.ts
│   │   └── validations/  # esquemas zod compartidos
│   ├── layouts/
│   ├── App.tsx
│   └── main.tsx
├── supabase/
│   ├── migrations/       # SQL de creación de tablas, RLS, funciones
│   └── seed.sql          # datos de prueba para dev
├── public/
├── .env.example
├── package.json
└── README.md
```

---

## 9. Roadmap por fases (para ejecutar con agente de código)

### Fase 0 — Setup del proyecto
- [ ] Inicializar repo Git.
- [ ] Crear proyecto React + Vite + Tailwind.
- [ ] Crear **dos** proyectos Supabase (dev y prod), configurar variables de entorno (`.env`).
- [ ] Definir esquema SQL inicial (tablas de sección 3), incluyendo `partes_produccion_recepciones` y campos de auditoría, como migración.
- [ ] Habilitar RLS en todas las tablas y crear la policy mínima (sección 4).
- [ ] Crear función SQL `vencimientos_activos()`.
- [ ] Configurar Supabase Auth (login simple con email/password).
- [ ] Layout base: sidebar con navegación a los 5 módulos + Home.
- [ ] Deploy inicial vacío a Vercel/Netlify (apuntando a dev) para validar el pipeline.

### Fase 1 — MVP: Proveedores + Recepción de MP
- [ ] CRUD completo de `proveedores` (listado, alta, edición, cambio de estado), con validación zod.
- [ ] CRUD completo de `recepciones_mp`, con selector de proveedor existente.
- [ ] Subida de remito/foto a Storage (convención de nombres de sección 5) y asociación al registro de recepción.
- [ ] Validaciones: campos obligatorios, `motivo_rechazo` requerido si estado = rechazado (con test).
- [ ] Vista de ficha de proveedor mostrando historial de recepciones asociadas.

### Fase 2 — Documentación + Vencimientos
- [ ] CRUD de `documentos` con subida de archivo y categorización.
- [ ] Vincular documento a proveedor (opcional).
- [ ] Vista "Vencimientos" consumiendo `vencimientos_activos()`, con semáforo por rango de días (con test de la función).
- [ ] Filtros en la vista de vencimientos (por tipo, por rango de días).

### Fase 3 — Recetas y Producción
- [ ] CRUD de `recetas` (ingredientes y pasos como listas editables dinámicas).
- [ ] Versionado simple de recetas (nueva versión = nuevo registro, no se pisa el anterior).
- [ ] CRUD de `partes_produccion`, con selector múltiple de lotes de `recepciones_mp` (vía `partes_produccion_recepciones`).
- [ ] Vista de trazabilidad: desde un parte de producción, ver qué lotes/proveedores de MP se usaron (JOIN directo).

### Fase 4 — Dashboard y pulido
- [ ] Home/Dashboard con: próximos vencimientos, últimas recepciones, recepciones rechazadas recientes.
- [ ] Revisión de UX en mobile (formularios de recepción usados en planta).
- [ ] Estados vacíos, mensajes de error amigables, loaders.
- [ ] Revisión de las policies RLS: confirmar que el modelo de un solo rol sigue siendo intencional, no un olvido.

### Fase 5 — Backlog / mejoras futuras (no MVP)
- [ ] Módulo de no conformidades / acciones correctivas.
- [ ] Roles de usuario diferenciados (admin/calidad/operario) — migración incremental sobre las policies RLS ya existentes.
- [ ] Exportar reportes (PDF/Excel) de recepciones o vencimientos.
- [ ] Notificaciones automáticas (email) de vencimientos próximos — `pg_cron` + Edge Function consumiendo `vencimientos_activos()`.
- [ ] Módulo de auditorías internas.

---

## 10. Supuestos y preguntas abiertas

- Se asume un solo establecimiento/planta (no multi-sede).
- Se asume que, por ahora, todos los usuarios logueados tienen el mismo nivel de acceso (sin roles diferenciados) — queda en el backlog, pero ya soportado por el diseño de RLS.
- No se definió aún el volumen esperado de recepciones/mes ni de proveedores, pero el stack elegido soporta holgadamente un uso pyme sin cambios.
- Falta definir: ¿se necesita alguna firma/aprobación formal (ej. supervisor aprueba la recepción) o alcanza con el registro de quién cargó el dato?
- **Nueva:** ¿se necesita registro de quién y cuándo edita un registro ya cargado (no solo quién lo creó)? Ya contemplado en el modelo de datos (`actualizado_en`/`actualizado_por`), pero falta definir si además se necesita un historial completo de cambios (versión anterior visible) o alcanza con saber el último editor.

---

## 11. Cómo usar este plan con el agente de código

Sugerencia de flujo de trabajo:
1. Pegar este documento completo como contexto inicial en la primera conversación con el agente.
2. Pedir que ejecute la **Fase 0** completa —incluyendo RLS y la función de vencimientos— y validar que el deploy vacío funciona antes de seguir.
3. Avanzar fase por fase, marcando los checkboxes a medida que se completan las tareas (podés editar este mismo archivo como changelog del proyecto).
4. Al cerrar cada fase, pedirle al agente un resumen de qué se hizo y qué decisiones técnicas tomó, para mantener este documento actualizado.
