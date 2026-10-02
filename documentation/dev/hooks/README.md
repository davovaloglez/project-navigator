# Hooks

Los hooks de [src/hooks/](../../../src/hooks/) cubren las cuatro responsabilidades transversales del tablero: **fetch** de datos remotos, **persistencia** de UI per-user, **captura** de snapshots semanales y **layout** del dashboard personalizable. Cualquier sección que necesite datos o estado durable pasa por aquí.

## Regla de oro

Sólo los componentes en [src/components/sections/](../../../src/components/sections/) llaman estos hooks. Charts y UI reciben datos por props y no tocan red, localStorage ni snapshots. Ver [arquitectura/convenciones.md](../arquitectura/convenciones.md#1-sections-son-los-únicos-consumidores-de-hooks-de-datos).

## Inventario

| Hook | Source | Resumen |
|---|---|---|
| `useSheetData` | [useSheetData.ts](../../../src/hooks/useSheetData.ts) | Fetch genérico tipado con retry-once, abort en cambio de endpoint/unmount, redirect a `/login` en 401 y flag `forbidden` en 403. Devuelve `{ data, loading, error, forbidden, refetch }`. |
| `usePersistedFilters` | [usePersistedFilters.ts](../../../src/hooks/usePersistedFilters.ts) | Estado per-sección persistido cross-device en Turso vía `/api/user-preferences`. Usa localStorage como cache anti-flash, debounce 500ms y aborta PUTs en vuelo. |
| `useSnapshotCapture` | [useSnapshotCapture.ts](../../../src/hooks/useSnapshotCapture.ts) | Captura pasiva semanal. Sincroniza con Sheets en mount y dispara `captureSnapshot` con guard de 7 días. Drop-in sobre cualquier sección con datos de proyectos. |
| `useDashboardConfig` | [useDashboardConfig.ts](../../../src/hooks/useDashboardConfig.ts) | Visibilidad y orden de widgets del `/`. Persiste en `localStorage['pn-dashboard-config']` y mergea con `DEFAULT_WIDGETS` para que widgets nuevos aparezcan automáticamente. |
| `usePermissions` | [usePermissions.ts](../../../src/hooks/usePermissions.ts) | Permisos efectivos del usuario actual. Inicia con estado vacío (`EMPTY`) para evitar hydration mismatch; sincroniza desde `window.__PN_PERMS__` en el primer `useEffect` y revalida vía `/api/me/permissions`. Expone `can(resource)`. |
| `useScopeView` | [useScopeView.ts](../../../src/hooks/useScopeView.ts) | Lee el rol desde `window.__PN_PERMS__` (síncrono, sin fetch) y devuelve `{ role, isScoped }`. `isScoped = true` si el usuario es `pm` o `dev` (ve sólo sus propias filas porque los endpoints filtran por identidad). Se usa para ocultar filtros redundantes y mostrar el PM en la card cuando el usuario ya sabe que sólo ve lo suyo. |

## Documentos

- [useSheetData](useSheetData.md)
- [usePersistedFilters](usePersistedFilters.md)
- [useSnapshotCapture](useSnapshotCapture.md)
- [useDashboardConfig](useDashboardConfig.md)
- [usePermissions](usePermissions.md)
- [useScopeView](../../../src/hooks/useScopeView.ts) — sin doc propia; ver inventario arriba

## Convenciones relacionadas

- [arquitectura/convenciones.md](../arquitectura/convenciones.md) — reglas globales (filtro por PM, snapshot integrity, persistencia de filtros).
- [arquitectura/data-flow.md](../arquitectura/data-flow.md) — flujo end-to-end desde Google Sheets hasta la sección.
- [arquitectura/overview.md](../arquitectura/overview.md) — topología del stack y dónde encaja cada hook.
