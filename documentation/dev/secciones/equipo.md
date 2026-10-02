# `/equipo` — EquipoSection

Directorio del equipo. Lee el registro canónico `equipo` de Turso, cruza con `/api/proyectos` para calcular métricas por persona y permite agregar/editar miembros si el usuario tiene `action:equipo:manage`.

- **Componente:** [src/components/sections/EquipoSection.tsx](../../../src/components/sections/EquipoSection.tsx)
- **Página:** [src/pages/equipo.astro](../../../src/pages/equipo.astro)
- **LOC:** ~367
- **Filtro PM:** — (excluido por diseño — directorio, no métricas)
- **Snapshot capture:** —
- **Persisted filters:** —

## Datos de entrada

| Fuente | Cómo se carga | Uso |
|---|---|---|
| `GET /api/equipo` | `fetch` + `useState` (no `useSheetData`) | Registro canónico: `{ equipo: EquipoRecord[], roles: RoleOpt[] }` |
| `useSheetData<ProjectRecord>('/api/proyectos')` | Hook estándar | Para calcular `projectCount`, `avgProgress`, `totalPoints`, `statuses` por persona |
| `useSheetData<SprintRecord>('/api/sprints')` | Hook estándar | Para determinar el sprint vigente |
| `useSheetData<CapacidadRecord>('/api/capacidades')` | Hook estándar | Para mostrar horas de capacidad y vacaciones por persona en el sprint vigente |

`/api/equipo` se carga con `fetch` directo (no `useSheetData`) para poder llamar `loadEquipo()` después de un `POST/PUT` exitoso y refrescar la UI sin recargar la página. El estado `loading/error` se gestiona con `useState` local.

### Tipo `EquipoRecord` (local, espejo del endpoint)

```ts
interface EquipoRecord {
  id: string;
  fullName: string;
  nickname: string;
  email: string;
  title: string;
  department: string;
  roleId: string;
  roleName: string;
  managerId: string;
  managerName: string;
  active: boolean;
  hasLogin: boolean;  // true si hay al menos un `user` con equipoId = id
}
```

## Construcción del directorio

```ts
const people = useMemo(() => {
  const reg = payload?.equipo ?? [];
  return reg.map((person) => {
    // Todos los roles son MULTI-persona; comparación por id estable.
    const owned = projects.filter((p) =>
      p.pmIds.includes(person.id) ||
      p.arquitectoIds.includes(person.id) ||
      p.devIds.includes(person.id) ||
      p.poIds.includes(person.id) ||
      p.sqaIds.includes(person.id));
    // Dedup por `id` del proyecto (no por folio — id es el campo único).
    const uniq = [...new Map(owned.map((p) => [p.id, p])).values()];
    // … métricas derivadas
  }).sort(/* activos primero, luego por projectCount desc, luego nombre */);
}, [payload, projects]);
```

La comparación es siempre por `id` estable, no por nombre. Ver [convenciones §11](../arquitectura/convenciones.md#11-resolución-de-identidad-de-personas-equipoid).

### Dedup por `id` de proyecto

Si una persona aparece como PM y como SQA del mismo proyecto, la dedup por `project.id` evita que cuente doble en `projectCount`, `avgProgress` y `totalPoints`. Se usa `id` (no `folio`) porque es el campo único.

### Widget de capacidad por sprint

Cada tarjeta muestra la capacidad del sprint vigente si hay datos disponibles:

```ts
const currentSprint = sprints[sprints.length - 1]; // último sprint definido
const capacity = capacidades.find(
  (c) => c.equipoId === person.id && c.sprint === currentSprint?.sprint
);
// Render: "Capacidad S17: 160h · Vac 8h"
```

El sprint vigente se determina tomando el último `SprintRecord` del array (mayor `sprint` lexicográficamente). Si no hay datos de `capacidades` para esa persona y sprint, el widget no se muestra.

### Métricas por persona

| Campo | Cálculo |
|---|---|
| `projectCount` | `uniq.length` |
| `avgProgress` | `round(sum(progreso) / uniq.length * 100)` si hay proyectos, sino 0 |
| `totalPoints` | `sum(puntos)` |
| `statuses` | `Record<string, number>` con conteo por estatus |

## KPIs

| KPI | Cálculo | ID Glosario |
|---|---|---|
| **Total personas** | `reg.length` | `equipo-kpi-total` |
| **Activos** | `reg.filter(p => p.active).length` | `equipo-kpi-arquitectos` |
| **Con acceso** | `reg.filter(p => p.hasLogin).length` | `equipo-kpi-developers` |

> Los IDs de glosario se heredan de la versión anterior de la sección. Si se crea una entrada dedicada en el glosario para "Activos" y "Con acceso", actualizar los ids aquí.

## Cards de persona

Cada card enlaza a `/persona/${encodeURIComponent(person.fullName)}`. El `fullName` es el nombre canónico del registro `equipo`, no el apodo del Sheet.

Layout interno:

1. Avatar (inicial sobre gradient) + nombre canónico + título funcional (`title || roleName || 'Sin puesto'`) + apodo si existe.
2. Chips: banda de costo (`roleName`), departamento (`department`), badge "Acceso" si `hasLogin`, badge "Inactivo" si `!active`.
3. Grid 3 columnas: Proyectos / Progreso% / Puntos.
4. Barra de progreso (verde ≥80%, amarillo ≥40%, rojo <40%).
5. Mini-badges de estatus.
6. Botón "Editar" (lápiz) visible sólo si `canManage`.

Personas inactivas (`!active`) se muestran con `opacity-60` y `border-slate-700/30`.

## Búsqueda

```ts
const filtered = useMemo(() => {
  if (!search) return people;
  const q = search.toLowerCase();
  return people.filter(({ person }) =>
    [person.fullName, person.nickname, person.title, person.email, person.roleName]
      .some((v) => v.toLowerCase().includes(q)));
}, [people, search]);
```

Busca contra 5 campos: nombre completo, apodo, título funcional, email y banda de costo.

## Modal Agregar/Editar (`EquipoEditModal`)

Visible sólo si `can('action:equipo:manage')` (verificado con `usePermissions()`).

### Campos del formulario

| Campo | Input | Notas |
|---|---|---|
| `full_name` | text | Obligatorio |
| `nickname` | text | Apodo como aparece en la columna PM/Devs del Sheet |
| `email` | email | |
| `title` | text | Título funcional (display) — texto libre |
| `department` | text | OU / departamento |
| `role_id` | select | Opciones de `roles[]` del endpoint; vacío = sin banda |
| `manager_id` | select | Todas las personas del registro menos la misma |
| `active` | checkbox | Activo en el equipo |

En creación (`isNew`): `POST /api/admin/equipo`. En edición: `PUT /api/admin/equipo` con el campo `id`.

Tras `onSaved()`, se llama `loadEquipo()` para refrescar el estado local sin recargar la página.

## Reglas especiales

- **Sin filtro PM**: directorio excluido por diseño — ver [Convenciones §9](../arquitectura/convenciones.md#9-filtro-por-pm-global).
- **Sin `usePersistedFilters`**: la búsqueda es exploratoria; no hay estado útil que guardar entre sesiones.
- **Fuente única**: la sección ya no deriva personas de los campos `pm`/`arquitecto`/`devs` del Sheet. La lista de personas viene de `equipo` (Turso). Si una persona del Sheet no está en el registro canónico, no aparece en el directorio.
- **`encodeURIComponent` en el href del perfil**: el link usa `person.fullName` (con acentos y espacios) → codificación obligatoria.
- **`canManage` evaluado en mount**: `usePermissions()` lee `window.__PN_PERMS__` inyectado por el Layout. No hay fetch extra.

## Convenciones aplicables

- [Resolución de identidad §11](../arquitectura/convenciones.md#11-resolución-de-identidad-de-personas-equipoid) — toda comparación por `id`, no por nombre.
- [Tooltips §13](../arquitectura/convenciones.md#13-tooltips-y-glosario) — un `info={infoFor(...)}` por KPI; el bloque "Directorio del equipo" lleva `GlossaryTooltip` inline.
