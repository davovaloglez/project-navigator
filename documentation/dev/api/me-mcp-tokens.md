# `GET/POST/DELETE /api/me/mcp-tokens`

- **Source:** [src/pages/api/me/mcp-tokens.ts](../../../src/pages/api/me/mcp-tokens.ts)
- **Auth:** sesión de browser (middleware). Requests autenticados con un token MCP reciben 403 en el POST (anti-chain).
- **DB:** Turso — tabla `mcp_token`
- **Cache:** no-store

Gestión de tokens bearer largos que permiten al servidor MCP autenticarse como el usuario. Los tokens MCP son completamente independientes de las sesiones de Better-Auth: tienen su propia tabla, sus propios TTLs y no aparecen en `listSessions`.

## GET — Lista de tokens

Devuelve la metadata de todos los tokens del usuario. **Nunca** devuelve el plaintext de ningún token.

### Response

```ts
type McpTokenSummary = {
  tokenPrefix: string;    // `pn_mcp_xxxxxxx` — primeros 14 chars del plaintext (display id)
  name: string;           // etiqueta visible
  createdAt: number;      // unix ms
  lastUsedAt: number | null;
  expiresAt: number;      // unix ms
};

type GetResponse = {
  tokens: McpTokenSummary[];
  allowedExpiresDays: [30, 90, 180, 365];
};
```

## POST — Crear token

Genera un token nuevo y devuelve el plaintext **una sola vez**. Tras esta respuesta, el plaintext es irrecuperable (la tabla guarda sólo el sha256).

### Request body

```ts
{
  name: string;           // 1-64 chars, requerido
  expiresInDays: 30 | 90 | 180 | 365;
}
```

### Response

```ts
// HTTP 201
{
  token: string;          // `pn_mcp_<base64url>` — el plaintext completo, sólo aquí
  summary: McpTokenSummary;
}
```

### Anti-chain

Si el request lleva `Authorization: Bearer pn_mcp_*` (detectado por `isMcpRequest`), el POST devuelve `403 MCP_CANNOT_CHAIN`. Un token MCP no puede emitir otros tokens — sólo sesiones de browser pueden hacerlo.

## DELETE — Revocar token

Elimina el token identificado por `tokenPrefix` del usuario actual.

### Query params

| Param | Tipo | Descripción |
|---|---|---|
| `prefix` | `string` | Obligatorio. El `tokenPrefix` del token a revocar (ej. `pn_mcp_xxxxxxx`). |

### Response

```ts
{ ok: true }          // 200
{ error, code: 'NOT_FOUND' }  // 404 si el token no existe o no es del usuario
```

## Errores

| Status | Code | Causa |
|---|---|---|
| 400 | `BAD_BODY` | Body no es JSON válido |
| 400 | `BAD_NAME` | Nombre vacío o > 64 chars |
| 400 | `BAD_EXPIRES` | `expiresInDays` no es uno de los valores permitidos |
| 400 | `BAD_PREFIX` | Falta el query param `prefix` en DELETE |
| 401 | `UNAUTHORIZED` | Sin sesión (el middleware normalmente corta antes) |
| 403 | `MCP_CANNOT_CHAIN` | El caller usa un token MCP (anti-chain) |
| 404 | `NOT_FOUND` | Token no encontrado para ese userId + tokenPrefix |
| 500 | `INTERNAL` | Error de Turso |

## Formato del token

```
pn_mcp_<base64url 32 bytes>  (~50 chars totales)
```

- `pn_mcp_` — prefijo fijo para que el middleware lo detecte sin buscar en BD.
- `tokenPrefix` — primeros 14 chars del plaintext (= el prefijo completo + 7 chars de la parte aleatoria). Suficiente para identificación visual; no compromete el secreto.
- En la tabla `mcp_token`, el campo `id` es el `sha256` hex del plaintext. El plaintext nunca se almacena.

## Flujo completo de autenticación

1. Usuario genera token en `/cuenta` → `POST /api/me/mcp-tokens`.
2. Configura el servidor MCP con `PN_API_TOKEN=<token>`.
3. El servidor MCP hace requests HTTP con `Authorization: Bearer <token>`.
4. El middleware detecta el prefijo `pn_mcp_`, llama `resolveMcpToken(plain)` en [src/lib/mcpToken.ts](../../../src/lib/mcpToken.ts).
5. `resolveMcpToken` hashea el plain, busca en `mcp_token`, verifica expiración y ban, toca `lastUsedAt` (fire-and-forget).
6. Si ok: `locals.user = user` (reconstruido desde la fila), `locals.session = null`.
7. El pipeline de permisos corre idéntico al de sesiones de browser (rol + overrides + scoping).

## Side effects

- **GET / DELETE**: sólo lectura/escritura en `mcp_token`.
- **POST**: inserta en `mcp_token`.
- `lastUsedAt` se actualiza en `mcp_token` en cada autenticación exitosa (fire-and-forget, no bloquea la request).

## Detalles no obvios

- La tabla `mcp_token` usa `ON DELETE CASCADE` desde `user(id)`, así que al eliminar un usuario sus tokens se limpian automáticamente.
- `tokenPrefix` no es clave única; es sólo un display identifier. La clave real es el `id` (sha256). Sin embargo, la combinación `(userId, tokenPrefix)` debería ser prácticamente única dado el espacio de aleatoriedad.
- El campo `allowedExpiresDays` en el GET response (`[30, 90, 180, 365]`) lo usa el formulario de la UI para construir el selector de caducidad sin hardcodear los valores en el cliente.
