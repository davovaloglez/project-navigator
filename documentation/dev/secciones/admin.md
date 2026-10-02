# `/admin` — AdminSection / AdminUserSection

Módulo de administración de usuarios y permisos. Accesible únicamente para usuarios con `action:user:manage` (rol `admin`).

- **Componente (listado):** [src/components/sections/AdminSection.tsx](../../../src/components/sections/AdminSection.tsx)
- **Componente (detalle):** [src/components/sections/AdminUserSection.tsx](../../../src/components/sections/AdminUserSection.tsx)
- **Páginas:** [src/pages/admin.astro](../../../src/pages/admin.astro), [src/pages/admin/[id].astro](../../../src/pages/admin/)
- **Auth:** middleware gatea `page:admin` — sólo rol `admin`. El middleware retorna redirect a `/` para usuarios sin permiso.
- **Filtro PM:** —
- **Snapshot capture:** —
- **Persisted filters:** —

## Datos de entrada

| Componente | Método | Función |
|---|---|---|
| `AdminSection` | `authClient.admin.listUsers(...)` | Lista todos los usuarios (paginación con limit 500) |
| `AdminSection` | `authClient.admin.createUser(...)` | Crea usuario directamente desde UI |
| `AdminUserSection` | `authClient.admin.listUsers({filterField: 'id', ...})` | Carga un usuario por id |
| `AdminUserSection` | `authClient.admin.setRole(...)` | Cambia el rol |
| `AdminUserSection` | `authClient.admin.updateUser(...)` | Persiste nombre o `image` tras subida/remoción de foto |
| `AdminUserSection` | `authClient.admin.banUser/unbanUser(...)` | Desactiva / reactiva la cuenta |
| `AdminUserSection` | `authClient.admin.listUserSessions(...)` | Lista sesiones activas del usuario |
| `AdminUserSection` | `authClient.admin.revokeUserSession/revokeUserSessions(...)` | Cierra sesiones |
| `AdminUserSection` | `POST /api/admin/avatar` | Sube foto del usuario objetivo |
| `AdminUserSection` | `DELETE /api/admin/avatar?userId=` | Borra foto del usuario objetivo |
| `AdminUserSection` | `GET /api/admin/overrides?userId=` | Lee overrides de permiso del usuario |
| `AdminUserSection` | `PUT /api/admin/overrides` | Upsert de un override |
| `AdminUserSection` | `DELETE /api/admin/overrides?userId=&resource=` | Borra un override |

## Composición de AdminSection

```
AdminSection
├── CreateUserBlock   — formulario email + nombre + password + rol
└── UserList
    ├── buscador (local, no persiste)
    └── UserCard[]  → link a /admin/[id]
```

`UserCard` muestra avatar (foto o iniciales), email, badge de rol y badge Activo/Desactivado. El componente `Avatar` es exportado para uso en `AdminUserSection`.

El formulario de creación usa `authClient.admin.createUser` con el rol seleccionado desde `ROLE_NAMES` (`src/lib/permissions/roles.ts`). Los errores del admin plugin se traducen al español con `translateAuthError`.

## Composición de AdminUserSection

```
AdminUserSection
├── ProfileCard    — nombre (editable) + email + avatar con subida/remoción + selector de rol
├── StatusCard     — ban/unban + motivo + expiración opcional
├── SessionsBlock  — listado de sesiones activas + botones de revocación
└── PermissionsBlock — árbol de permisos con TriToggle por recurso
```

### ProfileCard — foto de perfil

El `Avatar` (foto o iniciales) en la ficha del usuario incluye los mismos controles de subida/remoción que `ProfileBlock` en `/cuenta`, pero operan sobre el usuario objetivo en vez del usuario autenticado.

- **"Cambiar foto":** `resizeImageFile` + `POST /api/admin/avatar` con `userId` + `file`. Persiste con `authClient.admin.updateUser({ userId, data: { image: url } })`.
- **"Quitar":** `DELETE /api/admin/avatar?userId=<id>`. Persiste con `authClient.admin.updateUser({ userId, data: { image: null } })`.
- `avatarStatus` es un estado local independiente del `status` de nombre/rol.

Ver [api/admin-avatar.md](../api/admin-avatar.md) y [utils/imageResize.md](../utils/imageResize.md).

### PermissionsBlock — árbol de permisos

El árbol agrupa los recursos por página-padre (definido en `PAGE_TREE`, construido desde `statement.page`). Cada nodo de página es expandible y muestra sus bloques/datos/acciones hijos.

Cada recurso tiene un `TriToggle` con tres estados:

- **Hereda** — usa la resolución del rol (muestra "Hereda ✓" o "Hereda ✗" según `roleCan`).
- **Permitir** — override `allow` persistido en Turso.
- **Denegar** — override `deny` persistido en Turso.

Las mutaciones van a `PUT /api/admin/overrides` (upsert) o `DELETE /api/admin/overrides` (volver a Hereda).

El árbol se carga con `GET /api/admin/overrides?userId=`. Los cambios son inmediatos: el endpoint invalida el cache de permisos del usuario en el server.

### Protecciones anti-bloqueo

- **No se puede cambiar el propio rol** — tanto la UI (`roleLocked = isSelf`) como el server (`adminGuard`) lo bloquean.
- **No se puede degradar/desactivar/eliminar al último admin activo** — la UI detecta `isLastAdmin` comparando `adminCount <= 1`. El server lo verifica en `adminGuard`.
- **No se puede desactivar uno mismo** — Better-Auth lo rechaza por `YOU_CANNOT_BAN_YOURSELF`. La UI también lo deshabilita (`banLocked = isSelf`).
- **Permisos propios no editables** — `permsLocked = isSelf` deshabilita el árbol de permisos.

## Reglas especiales

- El `search` del listado es local (no persiste, no va a Turso).
- `adminCount` se calcula contando usuarios con `role === 'admin'` en el listado completo (limit 500). Si el portafolio crece más allá, actualizar el límite.
- Los hints de cada recurso en el árbol se resuelven así: `RESOURCE_HINTS[id]` para data/actions, `getEntry(id)?.summary` del glosario para bloques (`block:`).
- `action:snapshot:create` aparece como acción general (fuera del árbol de páginas) porque no depende de una página concreta.

## Convenciones aplicables

- [Auth — Sistema de permisos](../arquitectura/auth.md#sistema-de-permisos) — roles, overrides, resolver.
- [api/admin-overrides.md](../api/admin-overrides.md) — CRUD de overrides.
- Esta sección **no** usa `useSheetData`, `usePersistedFilters` ni `useSnapshotCapture`. Usa `authClient.admin.*` y `fetch` directo. Excepción legítima al patrón general porque maneja recursos de auth, no datos del Sheet.
