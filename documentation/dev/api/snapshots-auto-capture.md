# GET /api/snapshots/auto-capture

Endpoint server-side dedicado a la captura semanal de snapshots, diseñado para ser invocado por un **scheduler externo (AWS EventBridge Scheduler)**. Lee `proyectos` y `cursos` directamente del Sheet, construye un `WeeklySnapshot` de la semana actual (ISO, lunes 00:00) y lo upserta en Turso (tabla `snapshot`).

Es el único endpoint de `/api/*` que **no** requiere sesión Better-Auth. El middleware lo deja pasar siempre que traiga `Authorization: Bearer <CRON_SECRET>` correcto (o que `CRON_SECRET` no esté configurado en env).

| Propiedad | Valor |
|---|---|
| Método | `GET` |
| Path | `/api/snapshots/auto-capture` |
| Auth | **Bearer token** (no sesión). Opcional si `CRON_SECRET` está vacío. |
| Fuente | `proyectos!A1:AH300` + `cursos!A1:J50` → escribe en Turso (`snapshot`) |
| Cache | **Ninguno** — siempre escribe |
| Source | [src/pages/api/snapshots/auto-capture.ts](../../../src/pages/api/snapshots/auto-capture.ts) |

## Schedule

Un scheduler externo (AWS EventBridge Scheduler) invoca semanalmente este endpoint con `schedule: cron(0 9 ? * MON *)` (lunes 09:00 UTC). El scheduler debe enviar el header `Authorization: Bearer <CRON_SECRET>`. Pendiente de configurar post-migración a AWS Amplify.

## Request

```http
GET /api/snapshots/auto-capture
Authorization: Bearer <CRON_SECRET>
```

Sin query params ni body.

## Response

```json
{
  "ok": true,
  "weekKey": "2026-05-11",
  "projectsWritten": 42,
  "cursosWritten": 15,
  "totalRows": 57
}
```

Si no hay nada que capturar (proyectos y cursos vacíos):

```json
{ "ok": false, "reason": "Sin datos para capturar" }
```

(Status 200, no 500.)

## Autenticación

```ts
const secret = import.meta.env.CRON_SECRET;
if (secret) {
  const auth = request.headers.get('authorization') || '';
  if (auth !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
}
```

Si `CRON_SECRET` está vacío (e.g. en dev local), el endpoint es público. **Setear siempre en producción.**

## Flujo interno

1. **Verifica auth** — bearer header contra `CRON_SECRET`.
2. **Lee Projects** — range `proyectos!A1:AH300`. Parsea con `col()` + `parseProgressPct()` + `parseDateStr()`. Descarta filas sin `id` (`cleanId()`). Dedup por `id` defensivo (`seen: Set<string>`). Extrae: `id, folio, actividad, progreso, finEstimado, finReal, estatus`.
3. **Lee Cursos** — range `cursos!A1:J50`. Parsea con `col()`. Lee `id` de la hoja como `identifier` principal; `equipoResolver.resolve(colaborador)` como red de seguridad; `colaborador` (fullName) como último fallback.
4. **Calcula weekKey** — lunes 00:00 de la semana actual.
5. **Upsert atómico en Turso** — `DELETE FROM snapshot WHERE weekKey = ?` + `INSERT` por proyecto + `INSERT` por curso. Todo en un `db.batch(stmts, 'write')`.

```ts
function weekKey(d: Date): string {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  const day = t.getDay();
  const monday = new Date(t);
  monday.setDate(t.getDate() - ((day + 6) % 7));
  return monday.toISOString().split('T')[0];
}
```

## Diferencias vs POST /api/snapshots

| Aspecto | `POST /api/snapshots` | `GET /api/snapshots/auto-capture` |
|---|---|---|
| Trigger | Cliente (hook `useSnapshotCapture`) | Cron / manual |
| Auth | Sesión Better-Auth | Bearer token |
| Almacén | Turso (Turso) | Turso |
| Data source | Body del request (cliente ya leyó Sheets) | Lee Sheets server-side |
| Idempotente | Sí (DELETE + INSERT) | Sí (DELETE + INSERT) |
| Cuándo correr | Cuando un usuario abre el dashboard (guard 7d) | Lunes 09:00 UTC garantizado |

## Side effects

- Lee tabs `proyectos` y `cursos` del Sheet (sin cache).
- Escribe en Turso `snapshot` (DELETE + INSERT atómico).

No requiere permiso **Editor** del service account — sólo Viewer del Sheet. Turso usa `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN`.

## Errores

| Código | Cuándo | Body |
|---|---|---|
| `200 ok: true` | Captura exitosa | `{ ok, weekKey, projectsWritten, cursosWritten, totalRows }` |
| `200 ok: false` | Sheets vacíos | `{ ok: false, reason: 'Sin datos para capturar' }` |
| `401` | Bearer inválido | `{ "error": "Unauthorized" }` |
| `500` | Falla de Sheets API o Turso | `{ "error": "<mensaje>" }` |

## Setup

1. Definir `CRON_SECRET` (32+ bytes random) en las env vars de AWS Amplify.
2. Configurar un AWS EventBridge Scheduler con `schedule: cron(0 9 ? * MON *)` (lunes 09:00 UTC), target = GET a la URL `/api/snapshots/auto-capture`.
3. El scheduler debe enviar el header `Authorization: Bearer <CRON_SECRET>` en la invocación.
4. Aplicar la migración de Turso: `turso db shell <db-name> < src/db/migrations/2026-snapshots.sql`.

## Notas

- A diferencia de la versión anterior, este endpoint ya **no escribe en la tab `Snapshots` del Sheet**. El Sheet queda como historial de auditoría pasiva.
- El identifier de proyecto es `ProjectRecord.id`; el folio se preserva en `payload.folio` para el render.
- El parser inline duplica algo de lógica con `/api/proyectos` y `/api/cursos`. Decisión consciente: el cron debe ser autocontenido y no depender del cache de otros endpoints.
- Llamada manual de verificación: `curl -H "Authorization: Bearer $CRON_SECRET" https://<dominio>/api/snapshots/auto-capture` — valida que el Sheet responde y Turso está disponible.
