# /api/user-preferences (GET, PUT, DELETE)

Persistencia per-user de filtros/toggles por sección, server-side via Turso. Permite que las selecciones del usuario (filtros, tabs, toggles, sortBy, etc.) sobrevivan recargas y se sincronicen entre dispositivos.

Único endpoint **mutante** que no toca Google Sheets — usa la BD Turso (libSQL) compartida con Better-Auth.

| Propiedad | Valor |
|---|---|
| Path | `/api/user-preferences` |
| Auth | Requerida (sesión Better-Auth). Sin sesión → 401. |
| Storage | Turso, tabla `user_preferences` |
| Cache | **Ninguno** |
| Source | [src/pages/api/user-preferences.ts](../../../src/pages/api/user-preferences.ts) |
| Cliente | [`usePersistedFilters`](../../../src/hooks/usePersistedFilters.ts) |

## Schema de la tabla

Definida al final de [src/db/auth-schema.sql](../../../src/db/auth-schema.sql) (manual; **no** la genera `npm run auth:generate` — ver CLAUDE.md):

```sql
create table "user_preferences" (
  "userId" text not null references "user" ("id") on delete cascade,
  "sectionKey" text not null,
  "value" text not null,           -- JSON serializado
  "updatedAt" text not null,
  primary key ("userId", "sectionKey")
);
create index "user_preferences_userId_idx" on "user_preferences" ("userId");
```

PK compuesta `(userId, sectionKey)` permite un único valor por sección por usuario. `ON DELETE CASCADE` borra todas las prefs cuando se elimina el usuario.

## Validaciones comunes

- **`userId`** viene de `Astro.locals.user.id`. Si está vacío → 401 `{ error: 'Unauthorized' }`.
- **`sectionKey`** debe matchear `/^[a-z0-9-]{1,64}$/` (kebab-case, máx 64 chars).
- **`value`** debe ser un objeto plano (no arreglo, no null, no primitivo). Validación: `typeof v === 'object' && v !== null && !Array.isArray(v)`.
- **Body** capeado a `10_000` bytes (`MAX_BODY_BYTES`).

```ts
const SECTION_KEY_RE = /^[a-z0-9-]{1,64}$/;
const MAX_BODY_BYTES = 10_000;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
```

`export const prerender = false` — necesario porque la route es 100% dinámica (depende de sesión).

---

## GET /api/user-preferences

Retorna **todas** las prefs del usuario actual en un único objeto indexado por `sectionKey`.

### Request

```http
GET /api/user-preferences
Cookie: better-auth.session_token=<token>
```

Sin query params.

### Response

`200 OK`:

```json
{
  "proyectos": {
    "filters": { "estatus": ["In Progress"], "salud": [] },
    "includeDone": false,
    "sortBy": "finEstimado"
  },
  "timeline": {
    "filters": { "pm": ["Lore"] },
    "zoomIdx": 2
  },
  "dashboard": { ... }
}
```

Si el usuario no tiene prefs guardadas: `{}` (objeto vacío).

### Lógica

```sql
select sectionKey, value from user_preferences where userId = ?
```

Por cada fila, parsea `value` como JSON. Si una entrada está corrupta (no parsea), se **omite** silenciosamente (no rompe la respuesta).

### Errores

| Código | Cuándo | Body |
|---|---|---|
| `401` | Sin sesión | `{ "error": "Unauthorized" }` |
| `500` (vía exception no caught) | Turso caído | error de runtime |

---

## PUT /api/user-preferences

Upsert atómico de una pref por `(userId, sectionKey)`.

### Request

```http
PUT /api/user-preferences
Cookie: better-auth.session_token=<token>
Content-Type: application/json

{
  "sectionKey": "proyectos",
  "value": {
    "filters": { "estatus": ["In Progress"] },
    "includeDone": false
  }
}
```

Body máximo 10 KB.

### Response

`200 OK`:

```json
{ "ok": true }
```

### Validación

```ts
if (text.length > MAX_BODY_BYTES) return badRequest('Payload too large');
if (!isPlainObject(body)) return badRequest('Body must be an object');
if (typeof sectionKey !== 'string' || !SECTION_KEY_RE.test(sectionKey)) return badRequest('Invalid sectionKey');
if (!isPlainObject(value)) return badRequest('value must be a plain object');
```

### Lógica

```sql
insert into user_preferences (userId, sectionKey, value, updatedAt)
values (?, ?, ?, ?)
on conflict(userId, sectionKey) do update set
  value = excluded.value,
  updatedAt = excluded.updatedAt
```

El `value` se serializa con `JSON.stringify(value)` antes de guardar.

### Errores

| Código | Cuándo | Body |
|---|---|---|
| `400` | Body > 10KB, JSON inválido, body no es objeto, `sectionKey` inválido, `value` no es objeto | `{ "error": "<mensaje>" }` |
| `401` | Sin sesión | `{ "error": "Unauthorized" }` |
| `200` | Éxito | `{ "ok": true }` |

### Side effect

Una fila upserted en Turso `user_preferences` con `updatedAt = new Date().toISOString()`.

---

## DELETE /api/user-preferences

Borra una sección o **todas** las prefs del usuario.

### Request

**Borrar una sección:**

```http
DELETE /api/user-preferences?section=proyectos
```

**Borrar todas:**

```http
DELETE /api/user-preferences
```

### Response

`200 OK`:

```json
{ "ok": true }
```

(Mismo body en los dos casos, incluso si no había filas que borrar — Turso `delete` es idempotente.)

### Lógica

```ts
const sectionKey = url.searchParams.get('section');

if (sectionKey === null) {
  // Borra todas
  await db.execute({ sql: 'delete from user_preferences where userId = ?', args: [userId] });
} else {
  if (!SECTION_KEY_RE.test(sectionKey)) return badRequest('Invalid section');
  await db.execute({
    sql: 'delete from user_preferences where userId = ? and sectionKey = ?',
    args: [userId, sectionKey],
  });
}
```

### Errores

| Código | Cuándo | Body |
|---|---|---|
| `400` | `?section=` inválido (regex no matchea) | `{ "error": "Invalid section" }` |
| `401` | Sin sesión | `{ "error": "Unauthorized" }` |
| `200` | Éxito (incluso si no había nada que borrar) | `{ "ok": true }` |

---

## Consumidores

- [`usePersistedFilters<T>(sectionKey, defaults)`](../../../src/hooks/usePersistedFilters.ts) — único cliente. Lo usan 12 secciones con `sectionKey`: `proyectos`, `timeline`, `cronograma`, `cursos`, `dashboard`, `resumen`, `alertas`, `pronosticos`, `costos`, `distribucion`, `metricas-dev`, `roadmap`.
- [`CuentaSection`](../../../src/components/sections/CuentaSection.tsx) — botón "Limpiar todos" llama `DELETE /api/user-preferences` (sin `?section=`) + barre todas las keys `pn-prefs-*` de localStorage.

## Flujo cliente típico

```
[Section: usePersistedFilters('proyectos', defaults)]
  │ mount:
  │   1. load síncrono de localStorage['pn-prefs-proyectos']  ← anti-flash
  │   2. GET /api/user-preferences → merge sólo la key 'proyectos'
  │
  │ cualquier setState:
  │   - update local cache (síncrono)
  │   - debounce 500ms
  │   - PUT /api/user-preferences { sectionKey: 'proyectos', value: <state> }
  │     (con AbortController para cancelar PUTs en vuelo)
  │
  │ clear():
  │   - reset a defaults
  │   - DELETE /api/user-preferences?section=proyectos
  │   - delete localStorage['pn-prefs-proyectos']
```

Sólo hay sync **al mount**, no polling. Si abres dos tabs y cambias filtros en una, la otra no se entera hasta recargar.

## Notas

- `pn-prefs-*` en localStorage es **cache** (anti-flash), no source of truth. La SoT es Turso.
- El validador `isPlainObject` rechaza arreglos a propósito — esto evita que se guarden listas sin envolver y obliga a que el "estado" siempre sea un dict. Si necesitas guardar un arreglo, ponlo dentro de una key (`{ items: [...] }`).
- El 10 KB cap es defensivo contra abusos. Un estado típico (filtros + toggles + sortBy) pesa < 1 KB.
- No hay índice de timestamp; las queries siempre filtran por `userId` (índice activo) o `(userId, sectionKey)` (PK).
- La validación de `sectionKey` previene path traversal o nombres exóticos. Sólo kebab-case ASCII.
- Para borrar masivamente desde dev tools: `await fetch('/api/user-preferences', { method: 'DELETE' })`.
