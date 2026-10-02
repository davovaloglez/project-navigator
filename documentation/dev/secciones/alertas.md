# `/alertas` — AlertasSection

Centro unificado de alertas del portafolio. Combina cuatro fuentes (health score, pronóstico, anomalías, dependencias) en un listado plano con filtros por tipo y por PM.

- **Componente:** [src/components/sections/AlertasSection.tsx](../../../src/components/sections/AlertasSection.tsx)
- **Página:** [src/pages/alertas.astro](../../../src/pages/alertas.astro)
- **LOC:** ~262
- **Filtro PM:** sí (`usePersistedFilters` key `alertas`)
- **Snapshot capture:** no — lee snapshots existentes pero no captura

## Datos de entrada

| Hook | Endpoint |
|---|---|
| `useSheetData<ProjectRecord>` | `/api/proyectos` |
| `useSheetData<TareaRecord>` | `/api/tareas` (alimenta `forecastProjects`) |
| `usePersistedFilters` | key `alertas` — `{ filter: 'all', pmFilter: {} }` |
| `loadSnapshots()` ([src/utils/snapshots.ts](../../../src/utils/snapshots.ts)) | localStorage `pn-weekly-snapshots` (vía `useEffect` al mount) |

## Constantes y configuración

```ts
type CombinedType = AlertType | ForecastAlertType;

const TYPE_META: Record<CombinedType, { icon: React.ElementType; label: string }> = {
  'overdue':            { icon: Clock,         label: 'Vencido' },
  'blocked':            { icon: Ban,           label: 'Bloqueado' },
  'at-risk':            { icon: AlertTriangle, label: 'En riesgo' },
  'low-progress':       { icon: TrendingDown,  label: 'Sin avance' },
  'action-needed':      { icon: Zap,           label: 'Acción' },
  'upcoming-deadline':  { icon: CalendarClock, label: 'Vence pronto' },
  'forecast-at-risk':   { icon: TrendingUp,    label: 'Pronóstico en riesgo' },
  'stale-data':         { icon: Database,      label: 'Datos sin actualizar' },
  'anomaly-stall':      { icon: PauseCircle,   label: 'Detenido' },
  'anomaly-slowdown':   { icon: Activity,      label: 'Desaceleración' },
  'blocker-unresolved': { icon: Link2,         label: 'Bloqueador pendiente' },
  'blocker-at-risk':    { icon: Link2,         label: 'Bloqueador en riesgo' },
};

const SEVERITY_STYLES = {
  critical: 'border-red-500/40 bg-red-500/5',
  warning:  'border-amber-500/40 bg-amber-500/5',
  info:     'border-blue-500/40 bg-blue-500/5',
};
```

12 tipos × 3 severidades. Los 6 primeros vienen de [`generateAlerts`](../../../src/utils/healthScore.ts) (basados en estatus + fechas + acciones del proyecto). Los 6 últimos vienen de [`generateForecastAlerts`](../../../src/utils/forecastAlerts.ts) (basados en pronóstico, snapshots y dependencias).

## Agregación de alertas

```ts
const alerts = useMemo<CombinedAlert[]>(() => {
  const base = generateAlerts(data);
  const forecasts = [...forecastMap.values()];
  const staleMap = computeStaleness(data, snapshots);
  const anomalies = detectAnomalies(data, snapshots);
  const dependencies = analyzeDependencies(data, forecastMap);
  const forecastAlerts = generateForecastAlerts({ forecasts, staleMap, anomalies, dependencies });
  const combined = [...base, ...forecastAlerts];
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  combined.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  return combined;
}, [data, forecastMap, snapshots]);
```

Cada alerta lleva siempre un `project: ProjectRecord` adjunto. El enlace es `/proyecto/<folioSlug>` excepto los `forecast-at-risk` que apuntan al detalle de pronóstico.

### Pipeline

1. `generateAlerts(data)` — recorre cada proyecto y emite alertas por:
   - Vencido (`finEstimado < hoy` y no `Done`): severidad `critical` si días > 14, si no `warning`.
   - `estatus === 'Blocked / Critical'`: `critical`.
   - `estatus === 'At Risk'`: `warning`.
   - Progreso bajo vs progreso esperado por fechas: `warning`.
   - Acciones pendientes registradas en el Sheet: `info`.
   - Vence en ≤ 7 días: `warning`.
2. `forecastProjects(data, tareas)` — genera `forecastMap` (folio → `ProjectForecast`). Ver [utils/forecastEngine](../../../src/utils/forecastEngine.ts).
3. `computeStaleness(data, snapshots)` — marca proyectos cuyo `progreso` no se mueve en ≥14 días.
4. `detectAnomalies(data, snapshots)` — slowdown/stall vs baseline reciente.
5. `analyzeDependencies(data, forecastMap)` — cascada de bloqueadores parseando `requiereDe`.
6. `generateForecastAlerts(...)` — combina todo lo anterior en alertas de tipos `forecast-at-risk`, `stale-data`, `anomaly-*`, `blocker-*`.

## Filtrado

Dos niveles de filtrado encadenados:

```ts
// 1. PM scoping
const pmScopedAlerts = useMemo(() => {
  const selected = pmFilter.pm || [];
  return selected.length ? alerts.filter((a) => selected.includes(a.project.pm)) : alerts;
}, [alerts, pmFilter]);

// 2. Tipo de alerta (tabs)
const filtered = useMemo(() => {
  if (filter === 'all') return pmScopedAlerts;
  return pmScopedAlerts.filter((a) => a.type === filter);
}, [pmScopedAlerts, filter]);
```

### Conteos en KPIs y tabs

```ts
const counts = { critical: 0, warning: 0, info: 0 };
for (const a of pmScopedAlerts) counts[a.severity]++;
```

Los KPIs (Críticas / Advertencias / Informativas) usan los conteos **post-PM, pre-tipo**. Cada tab de tipo muestra su propio count entre paréntesis y se oculta si `count === 0`.

## Estado persistido vs no persistido

| Estado | Persistido | Razón |
|---|---|---|
| `filter` (tipo de alerta) | sí | El usuario espera volver al mismo subset (e.g. "siempre veo bloqueadas") |
| `pmFilter` | sí | Convención global del filtro PM |
| `snapshots` (`WeeklySnapshot[]`) | no | Cache local, refresca al mount |

## Convenciones aplicables

- [Filtro PM](../arquitectura/convenciones.md#9-filtro-por-pm-global) — `multi: false`, opciones derivadas de `data`.
- [Persistencia](../arquitectura/convenciones.md#10-persistencia-de-filtros-cross-session) — `usePersistedFilters` con key `alertas`.
- [Slugs](../arquitectura/convenciones.md#12-slugs-de-folios) — `folioToSlug` para los enlaces al detalle.
- [Tooltips](../arquitectura/convenciones.md#13-tooltips-y-glosario) — los 3 KPIs y el bloque "Alertas activas" tienen tooltip.

## Notas

- **No captura snapshots aquí.** Otras secciones (Dashboard, Resumen, Portafolio, Timeline, Roadmap, Distribución, Costos) son las que alimentan el histórico; Alertas sólo lee `loadSnapshots()` para que `computeStaleness` y `detectAnomalies` tengan baseline.
- **Severidad de la `forecast-at-risk`** depende del nivel de riesgo: `risk === 'at-risk'` → `critical`, `risk === 'slipping'` → `warning`. Ver `generateForecastAlerts` en [src/utils/forecastAlerts.ts](../../../src/utils/forecastAlerts.ts).
- **Sin alertas:** se renderiza un card verde "Sin alertas" en lugar de lista vacía.
