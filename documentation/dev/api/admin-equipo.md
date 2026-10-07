# POST /PUT /api/admin/equipo

Gestión del registro canónico del equipo. Permite crear y editar miembros del directorio. Gateado por el statement `action:equipo:manage` (solo rol `admin` por defecto).

| Propiedad | Valor |
|---|---|
| Métodos | `POST` (crear) · `PUT` (editar) |
| Path | `/api/admin/equipo` |
| Auth | Requerida + `action:equipo:manage` |
| Fuente | Turso, tabla `equipo` |
| Cache | Sin cache. Invalida la cache del resolver (`equipoResolver.invalidateEquipoCache()`) tras cada escritura |
| Source | [src/pages/api/admin/equipo.ts](../../../src/pages/api/admin/equipo.ts) |

## Autorización

El middleware evalúa `action:equipo:manage` antes de llegar al handler (ver [src/middleware.ts](../../../src/middleware.ts)). El handler además hace una **segunda verificación defensiva** con `can(locals.user, 'action:equipo:manage')`.

`/api/admin/equipo` está **exento** del gate genérico `action:user:manage`: son permisos distintos. La tabla `equipo` es un registro de personas del equipo; no gestiona usuarios del sistema.

## POST — Crear miembro

### Request

```http
POST /api/admin/equipo
Content-Type: application/json
Cookie: better-auth.session_token=<token>

{
  "full_name": "Lorena Raquel Olivo Iñiguez",
  "nickname": "Lore",
  "email": "lorena@vortex-it.com",
  "title": "Project Manager",
  "role_id": "project-manager",
  "department": "Tech",
  "manager_id": "etorres",
  "active": true
}
```

| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| `full_name` | string | ✅ | Nombre completo canónico |
| `nickname` | string | — | Apodo como aparece en Projects.pm / Projects.devs |
| `email` | string | — | Se normaliza a lowercase |
| `title` | string | — | Título funcional display (texto libre) |
| `role_id` | string | — | Debe existir en la tabla `roles`; vacío = sin banda |
| `department` | string | — | OU / departamento |
| `manager_id` | string | — | Debe existir en `equipo`; vacío = sin jefe |
| `active` | boolean | — | Default `true` si no se envía |

### Response 200

```json
{ "ok": true, "id": "lolvera" }
```

El `id` se deriva del local-part del email (`lorena` → `lolvera` si email = `lorena@vortex-it.com`) o del slug del nombre si no hay email. Si el id ya existe, se agrega un sufijo numérico (`lolvera-2`, etc.).

## PUT — Editar miembro

### Request

```http
PUT /api/admin/equipo
Content-Type: application/json
Cookie: better-auth.session_token=<token>

{
  "id": "lolvera",
  "full_name": "Lorena Raquel Olvera Rodriguez",
  "nickname": "Lore",
  "email": "lorena@vortex-it.com",
  "title": "Senior Project Manager",
  "role_id": "project-manager-officer",
  "department": "Tech",
  "manager_id": "etorres",
  "active": true
}
```

Todos los campos de POST aplican. `id` es obligatorio en PUT.

### Response 200

```json
{ "ok": true }
```

## Errores

| Código | Cuándo | Body |
|---|---|---|
| `400` | `full_name` vacío | `{ "error": "El nombre completo es obligatorio." }` |
| `400` | `role_id` no existe en `roles` | `{ "error": "Banda/puesto inválido: \"<id>\"" }` |
| `400` | `manager_id` no existe en `equipo` | `{ "error": "El jefe seleccionado no existe en el registro." }` |
| `400` | `manager_id === id` (auto-referencia) | `{ "error": "Una persona no puede ser su propio jefe." }` |
| `400` | Asignar `manager_id` crearía un ciclo en la jerarquía | `{ "error": "Esa asignación de jefe crearía un ciclo en la jerarquía." }` |
| `400` | JSON inválido | `{ "error": "JSON inválido" }` |
| `403` | Sin permiso `action:equipo:manage` | `{ "error": "No tienes permiso para esta acción.", "code": "FORBIDDEN" }` |
| `404` | `id` no existe (sólo PUT) | `{ "error": "La persona no existe en el registro." }` |
| `413` | Body > 4 KB | `{ "error": "Body demasiado grande" }` |
| `500` | Error Turso | `{ "error": "<mensaje>" }` |

## Side effects

- `invalidateEquipoCache()` se llama tras `POST` y `PUT` exitosos. Esto hace que la siguiente llamada a `getEquipoResolver()` recargue los miembros de Turso, reflejando el cambio en el parseo de Sheets en los siguientes requests.
- El ID generado en `POST` es permanente (no hay PUT para cambiar el `id`). Elegirlo bien; es la llave referenciada por `user.equipoId` y los campos resueltos de `ProjectRecord`.

## Validaciones server-side

### Detección de ciclos en jerarquía

Antes de asignar un `manager_id`, el handler recorre la cadena de jefes hacia arriba hasta 1000 niveles (cota de seguridad). Si encuentra `targetId` → deniega con 400.

### Derivación del id (POST)

```
base = local-part del email (slugificado) | slug del nombre | "persona"
id   = base | base-2 | base-3 …  (primero libre en la tabla)
```

La slugificación normaliza NFD, elimina diacríticos y reemplaza caracteres no-alfanuméricos con `-`.

## Consumidores

- [`EquipoSection` — `EquipoEditModal`](../../../src/components/sections/EquipoSection.tsx) — modal Agregar/Editar visible sólo si `can('action:equipo:manage')`.

## Convenciones aplicables

- [Resolución de identidad §11](../arquitectura/convenciones.md#11-resolución-de-identidad-de-personas-equipoid) — cada PUT/POST invalida la cache del resolver para que el cambio se refleje en parseos posteriores.
- [Permisos — statements](../../../src/lib/permissions/statements.ts) — `action:equipo:manage` está declarado en `statement.action`; sólo `admin` lo tiene por defecto (ver `roles.ts`).
