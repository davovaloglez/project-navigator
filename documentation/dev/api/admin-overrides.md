# `GET|PUT|DELETE /api/admin/overrides`

- **Source:** [src/pages/api/admin/overrides.ts](../../../src/pages/api/admin/overrides.ts)
- **Auth:** middleware (sesión requerida) + permiso `action:user:manage`
- **Cache:** `Cache-Control: no-store`

## Propósito

CRUD de overrides de permiso por usuario. Un override tiene la forma `(userId, resource, effect)` donde `effect` es `allow` o `deny`. Permite afinar los permisos de un usuario sin cambiar su rol.

El endpoint es el canal de comunicación entre `AdminUserSection` (árbol de permisos) y la tabla `user_permission_override` en Turso.

## Request — GET

```
GET /api/admin/overrides?userId=<id>
```

Retorna los overrides activos del usuario.

**Response:**

```json
{
  "overrides": [
    { "resource": "block:dashboard-cost-overview", "effect": "allow" },
    { "resource": "page:costos", "effect": "deny" }
  ]
}
```

## Request — PUT (upsert)

```http
PUT /api/admin/overrides
Content-Type: application/json

{ "userId": "...", "resource": "block:dashboard-cost-overview", "effect": "allow" }
```

- `resource` debe matchear `/^(page|data|action|block):[A-Za-z0-9:_-]{1,80}$/`.
- `effect` debe ser `"allow"` o `"deny"`.
- Body cap: 4 KB.
- Upsert por `(userId, resource)` — si ya existe, reemplaza el `effect`.
- Llama `invalidatePermissions(userId)` tras el upsert.

**Response:** `{ "ok": true }`

## Request — DELETE

```
DELETE /api/admin/overrides?userId=<id>&resource=<resource>
```

Borra un override específico. Si `resource` se omite, borra **todos** los overrides del usuario.

- Llama `invalidatePermissions(userId)` tras el borrado.

**Response:** `{ "ok": true }`

## Errores

| Status | Condición |
|---|---|
| 400 | `userId` faltante, `resource` con formato inválido, `effect` incorrecto, JSON malformado |
| 403 | Usuario sin `action:user:manage` |
| 413 | Body > 4 KB |

## Side effects

- Lee/escribe en `user_permission_override` en Turso (sin cache).
- Invalida el cache in-memory del resolver de permisos del usuario afectado, para que el cambio surta efecto sin esperar el TTL de 30 s.

## Quién lo usa

`PermissionsBlock` en [src/components/sections/AdminUserSection.tsx](../../../src/components/sections/AdminUserSection.tsx) — árbol interactivo de permisos con `TriToggle` (inherit / allow / deny).

## Detalles no obvios

- El middleware ya gatea `/api/admin/*` con `action:user:manage`. El endpoint tiene una doble verificación interna (`ensureManager`) como defensa en profundidad.
- No hay validación de que `resource` exista en el catálogo de statements (permite extensibilidad). El resolver ignora resources desconocidos.
- `resource` sigue el prefijo canónico: `page:`, `data:`, `action:`, `block:`. El resolver aplica el override según ese prefijo.
