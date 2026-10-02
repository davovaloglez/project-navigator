# `POST /api/me/avatar` · `DELETE /api/me/avatar`

Sube o elimina la foto de perfil del usuario autenticado. El objeto vive en Amazon S3; la URL se persiste en `user.image` mediante `authClient.updateUser` desde el cliente.

- **Source:** [src/pages/api/me/avatar.ts](../../../src/pages/api/me/avatar.ts)
- **Auth:** middleware (sesión requerida — 401 si no hay sesión). El `userId` se lee de `locals.user.id`.
- **Cache:** `no-store` en todas las respuestas.
- **Dependencia:** [src/lib/avatarBlob.ts](../../../src/lib/avatarBlob.ts) para validación, subida y limpieza del objeto previo.

## POST — subir / reemplazar foto

### Request

`multipart/form-data` con un campo `file` de tipo `File`.

```
POST /api/me/avatar
Content-Type: multipart/form-data

file: <Blob JPEG>
```

El cliente usa `resizeImageFile` de [src/utils/imageResize.ts](../../../src/utils/imageResize.ts) para escalar la imagen a máximo 512×512 px antes de enviarla. El campo lleva nombre `avatar.jpg` aunque el MIME sea `image/jpeg`.

### Response

```ts
// 200 OK
{ url: string }   // URL pública del objeto recién subido

// 400 Bad Request
{ error: string, code: 'BAD_REQUEST' }

// 401 Unauthorized
{ error: 'No autenticado.', code: 'UNAUTHORIZED' }

// 500 Internal Server Error
{ error: string, code: 'UPLOAD_FAILED' }
```

### Flujo interno

1. Lee `file` del `FormData`.
2. Convierte el `File` a `Uint8Array` y llama `validateImage(bytes)` — verifica firma binaria (PNG/JPG/WebP) y tamaño ≤ 2 MB.
3. Llama `currentUserImage(userId)` — lectura de `user.image` en Turso para conocer el objeto previo.
4. Llama `deleteAvatarIfBlob(prevImage)` — borra el objeto sólo si vive en S3 (host con `.s3.` / `.amazonaws.com`, vía `isS3Url`); nunca toca URLs de Google OAuth.
5. Llama `uploadAvatar(image, userId)` — `PutObjectCommand` a S3 con key `avatars/<safeId>-<sufijo>.<ext>` (`sufijo = Date.now().toString(36)`) y `CacheControl: public, max-age=31536000, immutable`. La lectura pública se controla a nivel bucket.
6. Retorna `{ url }`. El cliente llama `authClient.updateUser({ image: url })` para persistir la URL en `user.image`.

## DELETE — eliminar foto

### Request

Sin cuerpo.

```
DELETE /api/me/avatar
```

### Response

```ts
// 200 OK
{ ok: true }

// 401 Unauthorized
{ error: 'No autenticado.', code: 'UNAUTHORIZED' }

// 500 Internal Server Error
{ error: string, code: 'DELETE_FAILED' }
```

### Flujo interno

1. Llama `currentUserImage(userId)`.
2. Llama `deleteAvatarIfBlob(prevImage)` — best-effort (no rompe si falla).
3. Retorna `{ ok: true }`. El cliente llama `authClient.updateUser({ image: null })`.

## Side effects

- Escribe un objeto en el bucket S3 (POST).
- Borra un objeto del bucket S3 si el previo era propio, i.e. vive en S3 (POST y DELETE).
- Lee la columna `image` de la tabla `user` en Turso (lectura).
- **No** escribe en Turso — la URL se persiste vía `authClient.updateUser` (cliente → `/api/auth/update-user`).

## Errores

| Código | Causa |
|---|---|
| `BAD_REQUEST` | FormData malformado, campo `file` ausente, o imagen inválida (firma binaria incorrecta o > 2 MB) |
| `UNAUTHORIZED` | Sin sesión válida (lo captura también el middleware, pero el endpoint lo verifica defensivamente) |
| `UPLOAD_FAILED` | Error de S3 durante el `PutObjectCommand` |
| `DELETE_FAILED` | Error de S3 durante el `DeleteObjectCommand` |

## Decisión de arquitectura: lectura pública (no bucket privado)

El bucket S3 sirve los avatares con **lectura pública** a propósito. S3 también permite buckets privados (lectura sólo con credenciales o URLs firmadas), pero no se usa aquí:

- Los avatares se renderizan con `<img src={user.image}>` directo en el navegador (`CuentaSection`, el `Avatar` de `AdminSection`, el `UserMenu` del sidebar, `/equipo`, `/admin`). Un bucket privado requiere firmar cada lectura → el navegador no tiene credenciales → las fotos saldrían rotas.
- Servir desde un bucket privado obligaría a generar URLs firmadas (presigned) en cada render o a un proxy autenticado, complejidad innecesaria para un avatar.
- Un avatar **no es dato sensible**: ya se muestra a otros usuarios por diseño, así que que la URL sea pública (o incluso adivinable) no abre ningún vector. La **escritura** sí es privada (sólo el server con credenciales AWS; endpoints gateados por sesión / `action:user:manage`). Mismo modelo que GitHub, Gravatar, etc.

**Ruta de migración a privado (si en el futuro se guarda algo realmente sensible — no avatares):** no es cambiar un flag. Habría que (1) guardar en `user.image` la key del objeto S3, no una URL permanente; (2) generar URLs firmadas (presigned) de corta duración server-side en cada render, o un endpoint proxy autenticado (`/api/avatar/[id]`) que haga stream validando sesión (o CloudFront con OAC + signed URLs); (3) regenerar la URL en cada carga (las firmadas caducan, no se pueden cachear en `user.image`). Eso sería un feature aparte con su propio bucket privado; los avatares se quedan con lectura pública. Ver también [seguridad.md](../arquitectura/seguridad.md).

## Detalles no obvios

- El objeto es público vía URL — decisión consciente, ver sección anterior. Las URLs de avatares no son secretas por diseño.
- La key incluye un sufijo de timestamp (`Date.now().toString(36)`): reemplazar la foto genera una URL nueva, forzando revalidación del caché del navegador (las respuestas se sirven con `Cache-Control: immutable`).
- El endpoint **no escribe** `user.image`; delega en el cliente para no duplicar la lógica de auth. Si el `authClient.updateUser` falla tras la subida, el objeto queda huérfano hasta la próxima subida (que limpiará el previo). Frecuencia esperada: muy baja.
- Las env vars de S3 (`AVATAR_S3_BUCKET`, `AWS_REGION`, `AVATAR_CDN_URL`) se leen con un helper que prueba `import.meta.env` primero y luego `process.env`, para compatibilidad con el runtime (donde ambos están disponibles según el contexto). Las credenciales AWS se toman de la cadena por defecto del SDK (rol de ejecución en Amplify; claves locales en dev).
