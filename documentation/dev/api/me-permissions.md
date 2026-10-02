# `GET /api/me/permissions`

- **Source:** [src/pages/api/me/permissions.ts](../../../src/pages/api/me/permissions.ts)
- **Auth:** middleware (sesión requerida)
- **Permiso adicional:** ninguno — cualquier usuario autenticado puede leer sus propios permisos
- **Cache:** `Cache-Control: no-store`

## Propósito

Devuelve los permisos efectivos (rol + overrides) del usuario autenticado actual. Úsalo para que las islas React revaliden los permisos inyectados inline en el Layout (`window.__PN_PERMS__`).

## Request

Sin parámetros. Lee el usuario de `Astro.locals.user` (popolado por el middleware).

## Response

```ts
interface EffectivePermissions {
  role: string;
  pages: string[];
  data: string[];
  actions: string[];
  /** Sólo los bloques DENEGADOS (los ~149 del glosario no denegados no aparecen). */
  blockDenies: string[];
}
```

Ejemplo:

```json
{
  "role": "pm",
  "pages": ["dashboard", "resumen", "alertas", "portafolio", "roadmap", "timeline", "cronograma", "pronosticos", "distribucion", "equipo", "cursos", "novedades", "glosario"],
  "data": [],
  "actions": ["snapshot:create"],
  "blockDenies": ["dashboard-cost-overview"]
}
```

## Side effects

Llama a `getEffectivePermissions(locals.user)` que consulta Turso si el cache de permisos del usuario está expirado (TTL 30 s). Puede generar 0 o 1 queries a Turso.

## Quién lo usa

[src/hooks/usePermissions.ts](../../../src/hooks/usePermissions.ts) — `usePermissions()` lo llama en mount para revalidar `window.__PN_PERMS__`.

## Detalles no obvios

- El middleware ya garantiza sesión antes de que el endpoint ejecute; `locals.user` nunca es null aquí.
- Si el usuario está baneado, `getEffectivePermissions` retorna `pages: [], data: [], actions: []`. El middleware ya habría bloqueado el acceso, pero el endpoint devuelve el payload correcto por coherencia.
- `no-store` es intencional: los permisos pueden cambiar en cualquier momento (admin cambia el rol o un override). No se deben cachear en el navegador.
