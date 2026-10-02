# /api/snapshots (GET y POST)

Histórico semanal de snapshots para el motor de pronóstico, anomalías y staleness. Desde mayo 2026 el almacenamiento es **Turso** (tabla `snapshot`), no la tab `Snapshots` del Sheet. La tab del Sheet queda como historial de auditoría pasiva; las escrituras y lecturas nuevas van a Turso.

Dos handlers exportados desde el mismo archivo:

- `GET /api/snapshots` — lee toda la tabla `snapshot` de Turso y agrupa por `weekKey`.
- `POST /api/snapshots` — upsert atómico de un `WeeklySnapshot` completo (borra la semana y reinserta).

| Propiedad | Valor |
|---|---|
| Path | `/api/snapshots` |
| Auth | GET: role-open a cualquier autenticado. POST: requiere `action:snapshot:create` |
| Fuente | Turso, tabla `snapshot` |
| Cache | **Ninguno** — estado mutable |
| Source | [src/pages/api/snapshots.ts](../../../src/pages/api/snapshots.ts) |

## Schema de la tabla `snapshot` (Turso)

PK: `(weekKey, kind, identifier)`.

| Columna | Tipo | Contenido |
|---|---|---|
| `weekKey` | text | ISO yyyy-mm-dd del lunes de la semana |
| `capturedAt` | text | ISO timestamp del momento de captura |
| `kind` | text | `'project'` o `'curso'` |
| `identifier` | text | `ProjectRecord.id` (project) o `equipo.id` / `fullName` (curso) |
| `payload` | text | JSON con los campos restantes |

El `identifier` de `project` es `ProjectRecord.id` (único, numérico). El `folio` (display) se conserva en `payload.folio`. El `identifier` de `curso` es `equipo.id` cuando resuelve; fallback a `fullName` si el colaborador no está en el registro `equipo`.

## Tipos

```ts
interface ProjectSnapshotEntry {
  id: string;           // ProjectRecord.id — NUEVO campo
  folio: string;        // display, puede no ser único
  actividad: string;
  progreso: number;
  finEstimado: string;
  finReal: string;
  estatus: string;
}

interface CursoSnapshotEntry {
  colaborador: string;  // nombre display (preservado en payload.colaborador)
  progreso: number;
}

interface WeeklySnapshot {
  weekKey: string;      // ISO yyyy-mm-dd del lunes
  capturedAt: string;   // ISO timestamp
  projects: ProjectSnapshotEntry[];
  cursos: CursoSnapshotEntry[];
}
```

Tipos espejo de [src/utils/snapshots.ts](../../../src/utils/snapshots.ts).

---

## GET /api/snapshots

Lee toda la tabla `snapshot` de Turso y agrupa por `weekKey` (ordenado asc).

### Response

`200 OK` con `WeeklySnapshot[]`:

```json
[
  {
    "weekKey": "2026-04-27",
    "capturedAt": "2026-04-27T09:00:00.000Z",
    "projects": [
      {
        "id": "42",
        "folio": "H/PROJECT-34",
        "actividad": "Migración de API legacy",
        "progreso": 0.6,
        "finEstimado": "2026-06-15",
        "finReal": "",
        "estatus": "In Progress"
      }
    ],
    "cursos": [
      { "colaborador": "Lorena Raquel Olvera Rodriguez", "progreso": 75 }
    ]
  }
]
```

### Parsing

Por cada fila de Turso:

1. Lee `weekKey, capturedAt, kind, identifier, payload`.
2. Parsea `payload` como JSON; si falla, salta la fila.
3. Agrega al `WeeklySnapshot` correspondiente:
   - `kind === 'project'` → `identifier` es el `id`; `folio` viene de `payload.folio`.
   - `kind === 'curso'` → `colaborador` viene de `payload.colaborador` (fallback a `identifier`).

### Tabla inexistente

Si la tabla `snapshot` no existe (migración pendiente), el GET captura el error y retorna `[]` 200 (no rompe el dashboard).

### Errores

| Código | Cuándo |
|---|---|
| `200` con `[]` | Tabla vacía o inexistente |
| `500` con `{ error }` | Cualquier otro error de Turso |
| `401` | Sin sesión (middleware) |

---

## POST /api/snapshots

Upsert atómico de un `WeeklySnapshot`. La operación es un batch Turso:

1. Valida que el body trae `weekKey`.
2. `DELETE FROM snapshot WHERE weekKey = ?` — limpia la semana entera.
3. Para cada proyecto (`p.id` requerido): `INSERT INTO snapshot ...` con `identifier = p.id`.
4. Para cada curso: `identifier = resolver.resolve(c.colaborador) ?? c.colaborador`.
5. Ejecuta el batch con `db.batch(stmts, 'write')` (atómico).

Requiere permiso `action:snapshot:create` (middleware + `can()` defensivo).

### Request body

```json
{
  "weekKey": "2026-05-11",
  "capturedAt": "2026-05-11T09:00:00.000Z",
  "projects": [
    { "id": "42", "folio": "H/PROJECT-34", "actividad": "...", "progreso": 0.6, "finEstimado": "2026-06-15", "finReal": "", "estatus": "In Progress" }
  ],
  "cursos": [
    { "colaborador": "Lorena Raquel Olvera Rodriguez", "progreso": 75 }
  ]
}
```

Proyectos sin `id` se descartan silenciosamente (no se puede persistir sin identidad).

### Response

```json
{ "ok": true, "rowsWritten": 57, "weekKey": "2026-05-11" }
```

`rowsWritten` = stmts.length - 1 (descuenta el DELETE).

### Idempotencia

POST con el mismo `weekKey` es idempotente: borra la semana y reinserta. Permite re-capturas en la misma semana si el dataset cambia.

### Errores

| Código | Cuándo | Body |
|---|---|---|
| `200 ok: true` | Éxito | `{ ok, rowsWritten, weekKey }` |
| `400` | Body sin `weekKey` | `{ "error": "weekKey requerido" }` |
| `500` | Falla de Turso o JSON inválido | `{ "error": "<mensaje>" }` |
| `401` | Sin sesión | `{ "error": "Unauthorized" }` |

---

## Migración de Sheets a Turso

La tabla `snapshot` se crea con [src/db/migrations/2026-snapshots.sql](../../../src/db/migrations/2026-snapshots.sql):

```sql
create table "snapshot" (
  "weekKey"    text not null,
  "capturedAt" text not null,
  "kind"       text not null check ("kind" in ('project','curso')),
  "identifier" text not null,
  "payload"    text not null,
  primary key ("weekKey", "kind", "identifier")
);
```

El seed inicial histórico está en [src/db/seeds/snapshots-2026-05-18.sql](../../../src/db/seeds/snapshots-2026-05-18.sql) (folios convertidos a ids en el campo `identifier`; folio preservado en `payload`).

## Consumidores

- [`useSnapshotCapture`](../../../src/hooks/useSnapshotCapture.ts) — hook pasivo en secciones con datos de proyectos. Captura con guard 7 días y hace `POST`.
- [`syncSnapshots()`, `fetchRemoteSnapshots()`, `pushRemoteSnapshot()`](../../../src/utils/snapshots.ts) — wrappers del cliente sobre este endpoint.
- [`forecastEngine.ts`](../../../src/utils/forecastEngine.ts) — `computeTeamVelocity()`, anomalías, staleness.
- [`runBacktest()`](../../../src/utils/backtest.ts) — verifica precisión de predicciones.
- [`computeCourseForecasts()`](../../../src/utils/courseForecast.ts) — ritmo de cursos.

## Notas

- Ya no se necesita permiso **Editor** del service account para snapshots (ahora van a Turso). El service account sólo necesita Viewer del Sheet para `proyectos`/`cursos`/`costos`.
- Los utils `stale.ts`, `anomalies.ts` y `backtest.ts` matchean snapshots ↔ proyectos por `id` (no por folio). El seed histórico fue regenerado con la misma conversión.
- No hay borrado por antigüedad. El histórico crece en Turso indefinidamente. Si esto es un problema, agregar un job de retención manual.
