# `/comparativa` — ComparativaSection

Vista cross-persona de autoevaluaciones trimestrales (HU NAV-78). Gateada por `page:comparativa` + `action:evaluacion:view-all` — admin-only por default.

- **Componente:** [src/components/sections/ComparativaSection.tsx](../../../src/components/sections/ComparativaSection.tsx)
- **Página:** [src/pages/comparativa.astro](../../../src/pages/comparativa.astro)
- **LOC:** ~550
- **Filtro PM:** — (no aplica — no tiene proyectos)
- **Snapshot capture:** —
- **Persisted filters:** key `comparativa` — `{ categoria, periodo, sortKey, sortDir }`

## Datos de entrada

| Hook / fetch | Endpoint | Uso |
|---|---|---|
| `fetch('/api/evaluaciones')` | `/api/evaluaciones` | Todas las evaluaciones cross-persona (orden `periodo desc, equipo_id asc`) |
| `fetch('/api/equipo')` | `/api/equipo` | Registro canónico del equipo (nombre, avatar, rol, `active`) |
| `usePersistedFilters` | key `comparativa` | `{ categoria, periodo, sortKey, sortDir }` |
| `usePermissions()` | `window.__PN_PERMS__` | Detecta `action:evaluacion:manage` para mostrar controles de edición |

Ambos fetches corren en paralelo con `Promise.all`. Si `/api/evaluaciones` responde 403, la sección muestra el error directamente (no es un recurso suplementario, es el dato principal).

## Estado persistido (key `comparativa`)

```ts
{
  categoria: TeamCategory | 'Todos';   // Filtro por categoría de rol
  periodo: string;                     // Período activo "YYYY-Qn", default quarterOf()
  sortKey: 'name' | 'calificacion' | Dimension;
  sortDir: 'asc' | 'desc';
}
```

El multi-select de personas para el radar **no** persiste — es exploratorio.

## Tipos internos

```ts
interface PersonAggregate {
  equipoId: string;
  name: string;
  image: string | null;
  roleId: string;
  roleName: string;
  category: TeamCategory;       // Tecnología / Management / UX-UI / Servicio / Dirección / Otros
  latestPeriodo: string | null;
  scores: DimensionScores | null;  // null si no capturó en el período seleccionado
  notas: string | null;
  calificacion: number | null;  // calcCalificacion(scores) | null
  evalCount: number;            // total de capturas históricas
  knownPeriods: string[];       // todos los períodos con captura
}
```

## Cálculos memoizados

### `peoplePeriod` (agregado por período)

Cruza `equipo.active` con las filas de `evaluaciones` para el `periodo` seleccionado. Personas sin captura en ese período aparecen con `scores: null` y `calificacion: null` (muestra "—" en la tabla). Incluye sólo miembros activos.

### `filtered` (ranking + tabla)

Aplica en cascade:
1. Filtro por `categoria` (`roleCategory(m.roleId)` de [src/utils/roleCategory.ts](../../../src/utils/roleCategory.ts)).
2. Filtro por `search` libre (sobre `name`, case-insensitive). El search no persiste.
3. Solo para el **ranking** de chips: excluye personas sin `calificacion` (los `null` no aparecen en el ranking).
4. Para la **tabla**: muestra todas, incluyendo las sin captura (para ver quién falta).

### `radarData`

Las 7 dimensiones como ejes de un radar. Para cada persona en `selected` (hasta 3), mapea sus `scores` a `{ subject: 'Actitud', [nombre]: 7, … }`.

## Bloques de UI

### Ranking (chips)

Chips con avatar + nombre + calificación numérica coloreada con `calificacionColor`. Orden descendente por `calificacion`. Click en una chip la agrega al `selected` del radar (máximo 3). Borde azul + ícono X cuando está seleccionada.

### Radar overlay

`ResponsiveContainer > RadarChart` con `PolarGrid + PolarAngleAxis` de Recharts. Hasta 3 `<Radar>` superpuestos con los colores `['#3b82f6', '#10b981', '#f59e0b']`. Se ocupa del dominio 0-10 explícitamente.

### Tabla sortable

Una fila por miembro activo del equipo. Columnas: avatar + nombre + rol, 7 dimensiones numéricas (o "—"), calificación general, cantidad de capturas. Cabecera clickeable invierte `sortDir` si `sortKey === k`, o cambia `sortKey`.

Con `action:evaluacion:manage` (admin): columna "Acción" con botón **Editar** (si hay captura en ese período) o **Capturar** (si falta) que abre `EvaluacionEditModal`.

## Modal de edición (`EvaluacionEditModal`)

[src/components/sections/comparativa/EvaluacionEditModal.tsx](../../../src/components/sections/comparativa/EvaluacionEditModal.tsx)

Formulario con los 7 sliders 1-10, selector de período y campo de notas. El admin puede editar la evaluación de cualquier persona para cualquier período (no hay restricción de usuario propia).

Mutaciones via:
- `POST /api/admin/evaluaciones` — upsert.
- `DELETE /api/admin/evaluaciones?equipoId=&periodo=` — borrar.

Al cerrar o guardar, llama `load()` para refrescar la tabla.

## Reglas especiales

### Privacidad (Modo A)

- Las evaluaciones son **admin-only**: los usuarios no pueden ver ni capturar su propia evaluación desde `/cuenta` (el bloque `EvaluacionBlock` fue eliminado y `/api/me/evaluaciones` retorna `403 EVALUACION_DISABLED`).
- El admin cruza todas en `/comparativa` (gateado por `action:evaluacion:view-all`).
- Los pares no se ven entre sí: ningún role no-admin puede ver la evaluación de otro aunque tenga `page:comparativa` vía override, porque `/api/evaluaciones` requiere `action:evaluacion:view-all`.

### Filtro por categoría

`roleCategory(m.roleId)` de `src/utils/roleCategory.ts` resuelve el rol Turso (slug, e.g. `desarrollador-sr`) a una categoría de alto nivel. Esto permite comparar "PMs entre sí" sin mezclar con Tecnología. La categoría `'Todos'` desactiva el filtro.

## Tooltips de glosario

IDs registrados:

- `comparativa-ranking`
- `comparativa-radar`
- `comparativa-tabla`

## Convenciones aplicables

- [Resolución de identidad §11](../arquitectura/convenciones.md#11-resolución-de-identidad-de-personas-equipoid) — la tabla y los chips cruzan por `equipo.id`.
- [Persistencia §10](../arquitectura/convenciones.md#10-persistencia-de-filtros-cross-session) — key `comparativa`, sin persistir search ni multi-select.
- [Permisos](../arquitectura/auth.md#sistema-de-permisos) — `page:comparativa` para acceder; `action:evaluacion:view-all` para los datos; `action:evaluacion:manage` para el botón de edición.
