# `/cursos` — CursosSection

Seguimiento de cursos del equipo: progreso por colaborador, por O.U. y por jefe directo.

- **Componente:** [src/components/sections/CursosSection.tsx](../../../src/components/sections/CursosSection.tsx)
- **Página:** [src/pages/cursos.astro](../../../src/pages/cursos.astro)
- **LOC:** ~265
- **Filtro PM:** ❌ (no relacionado con proyectos)
- **Snapshot capture:** ❌ (se captura desde otras secciones que consumen `/api/cursos`)
- **Persisted key:** `cursos`

## Datos de entrada

| Hook | Endpoint | Uso |
|---|---|---|
| `useSheetData<CursoRecord>` | `/api/cursos` | Registros de cursos (colaborador, rol, ou, jefe directo, progreso 0-100) |
| `usePersistedFilters('cursos', { filters: {} })` | `/api/user-preferences` | Filtros O.U. y Rol |

Estado local (no persistido):

- `search: string` — busca en `colaborador` o `rol`.

## Filtros

```ts
const filterConfigs = [
  { key: 'ou', label: 'O.U.', options: [
    'Tech Ambition', 'Growth Experiences', 'Allies Networking', 'Analytics Solutions'
  ].map(v => ({ value: v, label: v })), multi: true },
  { key: 'rol', label: 'Rol', options: [
    'Software Architect', 'Project Manager', 'QA Analyst',
    'Customer Success Explorer', 'Data Empowerment Explorer', 'Developers'
  ].map(v => ({ value: v, label: v })), multi: true },
];
```

Las opciones son **hardcoded** porque la lista de O.U. y roles es estable y conocida. Si Vortex IT agrega una O.U. nueva, hay que actualizar este array.

### Aplicación

```ts
const filtered = useMemo(() => {
  let result = data;
  const q = search.toLowerCase();
  if (q) {
    result = result.filter(c =>
      c.colaborador.toLowerCase().includes(q) || c.rol.toLowerCase().includes(q)
    );
  }
  for (const [key, values] of Object.entries(activeFilters)) {
    if (!values.length) continue;
    result = result.filter(c => values.includes(String((c as any)[key] || '')));
  }
  return result;
}, [data, activeFilters, search]);
```

`onClear` resetea filtros persistidos **y** vacía la búsqueda local:

```ts
onClear={() => { clearPersisted(); setSearch(''); }}
```

## KPIs

```ts
const total = filtered.length;
const avgProgress = total > 0 ? Math.round(filtered.reduce((s, c) => s + c.progreso, 0) / total) : 0;
const completed = filtered.filter(c => c.progreso === 100).length;
const notStarted = filtered.filter(c => c.progreso === 0).length;
```

El KPI "Sin iniciar" tiene `highlight={kpis.notStarted > 0}` para destacarlo en rojo cuando hay cursos sin empezar.

## Breakdowns

### Distribución por O.U. (donut)

```ts
const ouDistribution = Object.entries(countByField(filtered, 'ou'))
  .map(([name, value]) => ({ name, value }));
```

Colores: `getOUColor(name).chart` desde [src/utils/colors.ts](../../../src/utils/colors.ts) — paleta semántica fija por unidad organizacional.

### Progreso promedio por O.U. (barras)

```ts
const ouProgressData = Object.entries(groupByField(filtered, 'ou'))
  .filter(([name]) => name && name !== 'Sin dato')
  .map(([name, items]) => ({
    name,
    progreso: Math.round(items.reduce((s, c) => s + c.progreso, 0) / items.length),
  }))
  .sort((a, b) => b.progreso - a.progreso);
```

### Equipos por Jefe Directo

```ts
const teamGroups = Object.entries(groupByField(filtered, 'jefeDirecto'))
  .filter(([name]) => name && name !== 'Sin dato')
  .sort(([, a], [, b]) => b.length - a.length);
```

Cada grupo renderiza una card con:

- Header: nombre del jefe + cantidad de miembros + promedio del equipo + barra de progreso colorizada.
- Grid de miembros con `colors` semánticos:
  - `getProgressColor(pct)` → `bg-green-500` (100%) / `bg-yellow-500` (≥50) / `bg-orange-500` (≥1) / `bg-red-500` (0)
  - `getProgressTextColor(pct)` → mismo mapeo en texto

Cada miembro lleva `<a href={`/persona/${encodeURIComponent(member.colaborador.split(' ')[0])}`}>` — sólo el primer nombre, no el nombre completo. Es deliberado: los apodos en `Projects` (e.g. "Lore") matchean por fuzzy contra "Lorena Raquel Olvera Rodriguez" en `Cursos`, así que pasar el primer nombre permite navegar al perfil correcto.

## Course forecast (no integrado en esta sección)

[src/utils/courseForecast.ts](../../../src/utils/courseForecast.ts) expone `computeCourseForecasts()` que proyecta fechas de finalización por curso usando ritmo derivado de snapshots semanales. **Esta sección no lo consume directamente** — el forecast se usa en alertas (`/alertas`) y eventualmente podría integrarse aquí en un futuro tab.

## Reglas especiales

- **Sin filtro PM**: cursos no se relacionan con proyectos. La convención global excluye esta sección.
- **Navegación a perfil con primer nombre**: el split por espacio es lo que cierra el loop con el fuzzy matching de `PersonaDetailSection`. Cambiar a nombre completo rompería los links que vienen desde Projects.
- **Hardcoded O.U. / Rol**: aceptable porque la lista es corta y estable. Si el dataset crece, derivar dinámicamente como hacemos con PM.

## Convenciones aplicables

- [Persistencia](../arquitectura/convenciones.md#10-persistencia-de-filtros-cross-session) — sólo `filters` persiste; `search` no.
- [Name matching](../arquitectura/convenciones.md#11-name-matching-cross-source) — primer nombre en el link permite resolver al perfil correcto desde apodos en Projects.
- [Tooltips](../arquitectura/convenciones.md#13-tooltips-y-glosario) — un tooltip por KPI y por gráfica; bloque "Equipos por Jefe Directo" lleva `GlossaryTooltip` inline.
