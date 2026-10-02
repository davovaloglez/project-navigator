# usePermissions

## Propósito

Provee los permisos efectivos del usuario actual a las islas React, sin un fetch por cada componente y sin flash de estado incorrecto entre navegaciones SSR.

## Source

[src/hooks/usePermissions.ts](../../../src/hooks/usePermissions.ts)

## Firma

```ts
/** Permisos inyectados síncronos por Layout.astro. */
export function readInlinePermissions(): EffectivePermissions

/** Evaluador cliente-side (misma lógica que `evaluate()` del server). */
export function canWith(perms: EffectivePermissions, resource: Resource): boolean

/**
 * Hook completo con revalidación en mount.
 *
 * Inicia con `EMPTY` en ambos lados (SSR y primer render cliente) para evitar
 * hydration mismatch — leer `window.__PN_PERMS__` en el `useState` inicial
 * devolvería distinto entre server (sin window) y cliente, abortando la
 * hidratación de React. En el primer `useEffect` (post-mount) sincroniza
 * desde inline (inmediato, anti-flash más allá de un frame) y revalida vía
 * GET /api/me/permissions.
 */
export function usePermissions(): {
  can: (resource: Resource) => boolean;
  perms: EffectivePermissions;
  hydrated: boolean;
}
```

El tipo `Resource` y `EffectivePermissions` vienen de [src/lib/permissions/types.ts](../../../src/lib/permissions/types.ts).

## Comportamiento

### Hidratación síncrona (anti-flash)

`Layout.astro` inyecta los permisos del usuario en cada navegación SSR:

```html
<script>window.__PN_PERMS__ = { role: "pm", pages: [...], ... };</script>
```

`readInlinePermissions()` lee esa variable de forma síncrona. Los componentes que usan `canWith(readInlinePermissions(), ...)` o `<Gate>` / `<PageLink>` nunca muestran un estado incorrecto en el render inicial — ni siquiera por un frame.

`usePermissions()` inicia su `useState` con el payload `EMPTY` (no con `readInlinePermissions()`) para garantizar que SSR y primer render cliente produzcan el mismo estado y React no aborte la hidratación por mismatch. Inmediatamente después del mount, el primer `useEffect` sincroniza desde `window.__PN_PERMS__` (sin esperar la red).

### Revalidación en mount

En el mismo `useEffect`, `usePermissions()` hace un `GET /api/me/permissions` para confirmar que los permisos inline no están stale (p. ej. si un admin cambió el rol del usuario entre el SSR y la hidratación). Si el fetch falla, se queda con los permisos inline.

### `hydrated`

Pasa de `false` a `true` cuando el fetch de revalidación completa (con éxito o error). Úsalo para diferir renders que dependen de permisos y deben ser 100% correctos (en la práctica raramente necesario — `readInlinePermissions()` es confiable en el 99% de los casos).

## Side effects

- Un `GET /api/me/permissions` en mount. El endpoint tiene `Cache-Control: no-store`.
- Sin localStorage, sin timers.
- `AbortController` para limpiar el fetch en unmount.

## Patrón de uso

### Hook completo (cuando necesitas reactividad)

```tsx
import { usePermissions } from '../../hooks/usePermissions';

function MySection() {
  const { can } = usePermissions();
  if (!can('page:costos')) return <AccessDenied />;
  return <CostContent />;
}
```

### Inline síncrono (Gate, PageLink, KPICard, ChartCard)

```tsx
import { canWith, readInlinePermissions } from '../../hooks/usePermissions';

// En Gate.tsx — sin hook, sin re-renders:
const allowed = canWith(readInlinePermissions(), resource);
```

Este patrón es el que usan `Gate`, `PageLink`, `KPICard` y `ChartCard`. No registra un componente como consumidor de React state — el resultado es el correcto desde el primer render sin re-renders posteriores.

## Evaluación de recursos

```ts
canWith(perms, 'page:costos')        // ¿puede ver la página /costos?
canWith(perms, 'data:costos')        // ¿puede ver los datos financieros?
canWith(perms, 'action:snapshot:create') // ¿puede crear snapshots?
canWith(perms, 'block:costos-total') // ¿puede ver ese bloque? (default-ALLOW)
```

Los bloques (`block:`) usan default-ALLOW: retorna `true` a menos que el ID esté en `perms.blockDenies`.

## Casos edge

- **`window.__PN_PERMS__` no existe** (SSR o primer render): `readInlinePermissions()` retorna un payload vacío con `role: 'dev'` — menor privilegio. La revalidación por fetch lo corregirá en mount.
- **Fetch de revalidación falla** (403, red): `hydrated` pasa a `true` y los permisos inline permanecen. La sección sigue usable con los permisos del SSR.
- **Usuario baneado**: `getEffectivePermissions` retorna `pages: [], data: [], actions: []` — el payload inline refleja esto. El middleware ya impide el acceso server-side de todas formas.

## Convenciones relacionadas

- [arquitectura/auth.md — Sistema de permisos](../arquitectura/auth.md#sistema-de-permisos) — modelo RBAC, roles, overrides.
- [componentes/ui.md — Gate y PageLink](../componentes/ui.md) — componentes de UX que usan este hook internamente.
- [api/me-permissions.md](../api/me-permissions.md) — endpoint de revalidación.
