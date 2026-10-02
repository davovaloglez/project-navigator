# `/cuenta` — CuentaSection

Configuración de cuenta del usuario actual: perfil, seguridad (sólo para credenciales locales), sesiones activas, tokens MCP y preferencias.

- **Componente:** [src/components/sections/CuentaSection.tsx](../../../src/components/sections/CuentaSection.tsx)
- **Página:** [src/pages/cuenta.astro](../../../src/pages/cuenta.astro)
- **LOC:** ~950 (orquestador + 5 sub-bloques)
- **Auth:** depende exclusivamente de `authClient` y `fetch` directo a `/api/me/*` (no consume `/api/proyectos` ni similares).

## Composición

Cinco sub-componentes más un orquestador:

```tsx
function CuentaSection() {
  const { data: session, isPending } = authClient.useSession();
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);

  // detectar si el user tiene cuenta 'credential' (= puede cambiar password)
  useEffect(() => {
    authClient.listAccounts().then(/* setHasPassword(found credential account) */);
  }, []);

  return (
    <>
      {hasPassword ? <><ProfileBlock /><PasswordBlock /></> : <ProfileBlock full-width />}
      <SessionsBlock currentToken={...} />
      <McpTokensBlock />
      <PreferencesBlock />
    </>
  );
}
```

`hasPassword === null` (durante la detección) renderiza con ambos bloques bajo el supuesto pesimista para no flashear; se reajusta cuando `listAccounts()` responde.

El bloque "Mi evaluación" (`EvaluacionBlock`, HU NAV-78) **fue eliminado** de esta sección. Las evaluaciones trimestrales son ahora exclusivamente admin-only: el admin las captura/edita desde `/comparativa` y `/api/admin/evaluaciones`. El endpoint `/api/me/evaluaciones` responde `403 EVALUACION_DISABLED` para cualquier petición.

## ProfileBlock

```ts
authClient.updateUser({ name: trimmed })
authClient.updateUser({ image: url | null })
```

- Lee `user.email` (readonly) y `user.name` (editable).
- Avatar: estado local `localImage` sobreescribe `user.image` durante la sesión para preview inmediato. `undefined` = usa `user.image`; `null` = muestra iniciales; `string` = URL del blob recién subido.
- **Subir foto ("Cambiar foto"):** input `type="file"` oculto (`accept="image/png,image/jpeg,image/webp"`); el botón hace `.click()` sobre él. Flujo:
  1. `resizeImageFile(file)` — escala a ≤ 512×512 px, convierte a JPEG. Ver [utils/imageResize.md](../utils/imageResize.md).
  2. `POST /api/me/avatar` con el blob JPEG en un `FormData`.
  3. `authClient.updateUser({ image: url })` — persiste la URL en `user.image`.
  4. `setLocalImage(url)` — preview instantáneo sin recargar la página.
- **Quitar foto ("Quitar"):** visible sólo si hay foto (`shownImage != null`). Flujo:
  1. `DELETE /api/me/avatar` — borra el objeto en Amazon S3.
  2. `authClient.updateUser({ image: null })`.
  3. `setLocalImage(null)` — vuelve a iniciales.
- Validación local de nombre: `name.trim() !== ''` y `!== user.name` antes de habilitar Guardar.
- `avatarStatus` es un estado `Status` independiente del `status` del nombre. Ambos muestran su propio `StatusBanner`.

## PasswordBlock

```ts
authClient.changePassword({
  currentPassword,
  newPassword,
  revokeOtherSessions,  // toggle, default true
})
```

- Validaciones locales: `next.length >= 8`, `next === confirm`.
- Reset del form sólo en éxito.
- Sólo renderizado si `hasPassword === true` (i.e. el user tiene `account.providerId === 'credential'`). Para users sólo-Google el bloque entero se oculta y ProfileBlock toma el ancho completo.

## SessionsBlock

```ts
const res = await authClient.listSessions();
// rows: SessionRow[] con id, token, createdAt, expiresAt, ipAddress, userAgent
```

- Sort descendente por `createdAt`.
- Cada fila parsea `userAgent` con `parseUserAgent()` → `{ device: "Chrome en macOS", isMobile }`.
- Identifica la sesión actual por `s.token === currentToken` (del `session.session.token`).
- **Sesión actual** muestra badge "Esta sesión", sin botón de revocar.
- **Otras sesiones** tienen botón "Cerrar" → `authClient.revokeSession({ token })`, con confirm dialog.
- Botón global "Cerrar todas las demás (N)" sólo si hay otras → `authClient.revokeOtherSessions()`.
- Tiempo formatado relativo con `formatRelative()` ("hace 2 h", "en 3 días").

## McpTokensBlock

Gestión de tokens bearer largos para autenticar el servidor MCP como el usuario actual. Los tokens MCP son independientes de las sesiones de browser (tabla `mcp_token` en Turso, no `session`).

```ts
// Lista: metadata solamente, el plaintext nunca se vuelve a exponer
GET /api/me/mcp-tokens
// Crea: devuelve el plaintext UNA SOLA VEZ (mostrar en banner, no almacenar)
POST /api/me/mcp-tokens  body: { name: string, expiresInDays: 30 | 90 | 180 | 365 }
// Revoca por tokenPrefix (primeros 14 chars del token, display id)
DELETE /api/me/mcp-tokens?prefix=pn_mcp_xxxxxxx
```

### Flujo de creación

1. Formulario con campo `name` (1-64 chars) + selector de caducidad (`expiresInDays`).
2. `POST /api/me/mcp-tokens` → responde `{ token: string, summary: McpTokenSummary }`.
3. El componente muestra el `token` plaintext en un banner destacado (texto seleccionable + botón "Copiar").
4. El banner se descarta manualmente o al crear otro token. Una vez cerrado, el plaintext es irrecuperable.
5. La lista se refresca y muestra el nuevo token con `tokenPrefix` (14 chars), `name`, `expiresAt` y `lastUsedAt`.

### Revocación

Botón "Revocar" por fila → modal de confirmación (`ConfirmModal`) → `DELETE /api/me/mcp-tokens?prefix=<tokenPrefix>` → elimina la fila de la lista.

### Anti-chain

El endpoint `POST /api/me/mcp-tokens` detecta si el request lleva el header `Authorization: Bearer pn_mcp_*` (función `isMcpRequest` en el endpoint) y devuelve `403 MCP_CANNOT_CHAIN`. Un token MCP no puede emitir otros tokens — sólo sesiones de browser pueden hacerlo.

### Formato del token

`pn_mcp_<base64url 32 bytes>` (~50 chars totales). En la tabla `mcp_token` se guarda el `sha256` hex del plaintext (campo `id`). El `tokenPrefix` son los primeros 14 caracteres del plaintext (`pn_mcp_` + 7 chars), suficiente para identificación visual sin comprometer el secreto.

Ver [src/lib/mcpToken.ts](../../../src/lib/mcpToken.ts) para `generateMcpToken`, `resolveMcpToken`, `createMcpToken`, `listMcpTokens`, `revokeMcpToken` y [api/me-mcp-tokens.md](../api/me-mcp-tokens.md) para el contrato del endpoint.

## PreferencesBlock

Dos acciones destructivas con confirm:

### Limpiar todos los filtros

```ts
await fetch('/api/user-preferences', { method: 'DELETE', credentials: 'same-origin' });
// DELETE sin ?section= → borra TODAS las prefs del user

// Después:
clearAllPersistedFiltersLocal();  // barre todas las keys localStorage['pn-prefs-*']
```

### Reset del Dashboard

```ts
window.localStorage.removeItem('pn-dashboard-config');
```

Sólo cliente. No hay endpoint remoto para layout del dashboard (es local-only por diseño).

Ambas acciones reportan banner success/error y piden recargar otras pestañas para verlas en limpio (no broadcast).

## Helper: `parseUserAgent`

```ts
function parseUserAgent(ua: string | null): { device: string; isMobile: boolean } {
  const isMobile = /iPhone|iPad|Android|Mobile/i.test(ua);
  // Browser: Edge / Chrome (excl. Edge) / Firefox / Safari (excl. Chrome)
  // OS: iOS / Android / macOS / Windows / Linux
  return { device: `${browser} en ${os}`, isMobile };
}
```

Detección heurística, no exhaustiva. Edge cases (Brave, Opera, Vivaldi) caen a "Navegador en OS".

## Helper: `formatRelative`

Diferencia con `Date.now()`. Buckets: segundos / min / horas / días. Soporta pasado y futuro (las sesiones tienen `expiresAt` en el futuro).

## Endpoints consumidos

| Endpoint | Vía |
|---|---|
| `POST /api/auth/update-user` | `authClient.updateUser` |
| `POST /api/auth/change-password` | `authClient.changePassword` |
| `GET /api/auth/list-sessions` | `authClient.listSessions` |
| `POST /api/auth/revoke-session` | `authClient.revokeSession` |
| `POST /api/auth/revoke-other-sessions` | `authClient.revokeOtherSessions` |
| `GET /api/auth/list-accounts` | `authClient.listAccounts` |
| `POST /api/me/avatar` | `fetch` directo — subir foto |
| `DELETE /api/me/avatar` | `fetch` directo — quitar foto |
| `GET /api/me/mcp-tokens` | `fetch` directo — listar tokens MCP |
| `POST /api/me/mcp-tokens` | `fetch` directo — crear token MCP |
| `DELETE /api/me/mcp-tokens?prefix=` | `fetch` directo — revocar token MCP |
| `DELETE /api/user-preferences` | `fetch` directo |

Ver [arquitectura/auth.md](../arquitectura/auth.md), [api/me-avatar.md](../api/me-avatar.md), [api/me-mcp-tokens.md](../api/me-mcp-tokens.md) y [api/user-preferences.md](../api/user-preferences.md).

## Estados de error

- **`isPending`**: skeleton placeholder.
- **`!session?.user`**: mensaje "No se pudo cargar la sesión".
- Errores de mutaciones: banner local en cada bloque (no derriba la página).
- `listAccounts` falla → `hasPassword: false` (asumimos sólo-Google).

## Convenciones aplicables

- [Auth](../arquitectura/auth.md) — `authClient` API completa.
- Esta sección **no** usa `usePersistedFilters` ni `useSheetData` — usa `authClient` y `fetch` directo. Es una excepción legítima al patrón general porque maneja recursos de auth, no datos del Sheet.
