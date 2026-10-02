# `POST /api/admin/avatar` · `DELETE /api/admin/avatar`

Sube o elimina la foto de perfil de otro usuario. Sólo accesible para usuarios con `action:user:manage` (rol `admin`). Mismo mecanismo que [`/api/me/avatar`](me-avatar.md) pero opera sobre un `userId` objetivo.

- **Source:** [src/pages/api/admin/avatar.ts](../../../src/pages/api/admin/avatar.ts)
- **Auth:** middleware gatea `/api/admin/*` (requiere sesión). El endpoint verifica adicionalmente `can(locals.user, 'action:user:manage')` como defensa en profundidad (403 si falla).
- **Cache:** `no-store` en todas las respuestas.
- **Dependencia:** [src/lib/avatarBlob.ts](../../../src/lib/avatarBlob.ts).

## POST — subir / reemplazar foto de otro usuario

### Request

`multipart/form-data` con dos campos:

| Campo | Tipo | Descripción |
|---|---|---|
| `userId` | `string` | ID del usuario objetivo. Debe matchear `/^[a-zA-Z0-9_-]{1,64}$/`. |
| `file` | `File` | Blob JPEG redimensionado por el cliente. |

```
POST /api/admin/avatar
Content-Type: multipart/form-data

userId: <targetUserId>
file: <Blob JPEG>
```

### Response

```ts
// 200 OK
{ url: string }

// 400 Bad Request
{ error: string, code: 'BAD_REQUEST' }

// 403 Forbidden
{ error: 'No tienes permiso para esta acción.', code: 'FORBIDDEN' }

// 500 Internal Server Error
{ error: string, code: 'UPLOAD_FAILED' }
```

### Flujo interno

Idéntico al de [`POST /api/me/avatar`](me-avatar.md#post--subir--reemplazar-foto), pero usando el `targetId` del campo `userId` en lugar de `locals.user.id`. El cliente persiste la URL con `authClient.admin.updateUser({ userId, data: { image: url } })`.

## DELETE — eliminar foto de otro usuario

### Request

Query param `userId`.

```
DELETE /api/admin/avatar?userId=<targetUserId>
```

### Response

```ts
// 200 OK
{ ok: true }

// 400 Bad Request
{ error: 'userId inválido.', code: 'BAD_REQUEST' }

// 403 Forbidden
{ error: 'No tienes permiso para esta acción.', code: 'FORBIDDEN' }

// 500 Internal Server Error
{ error: string, code: 'DELETE_FAILED' }
```

### Flujo interno

Idéntico al de [`DELETE /api/me/avatar`](me-avatar.md#delete--eliminar-foto). Valida que `userId` matchee `USER_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/` antes de operar. El cliente llama `authClient.admin.updateUser({ userId, data: { image: null } })`.

## Side effects

- Escribe / borra objetos en el bucket S3.
- Lee `user.image` de Turso (para cleanup del objeto previo).
- No escribe en Turso directamente.

## Detalles no obvios

- La validación de `userId` con regex previene path traversal en la key del objeto S3 (`avatars/<safeId>-<sufijo>.<ext>`).
- El middleware ya gatea `/api/admin/*` con sesión válida; la llamada a `can()` es defensa adicional para el caso en que otra ruta inyecte tráfico directamente al endpoint.
- Ver [me-avatar.md](me-avatar.md) para el detalle del modelo de objetos públicos en S3 y el patrón de cleanup.
