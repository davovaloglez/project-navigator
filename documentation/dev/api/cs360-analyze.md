# `POST /api/cs360/analyze` · `GET /api/cs360/analyze/[requestId]`

Generación asíncrona de insights de IA para el tablero CS 360 (NAV-85). Sustituye al antiguo proxy síncrono de OpenAI que existía en `src/pages/api/cs360/analyze.ts`.

El patrón es de dos pasos: el POST inicia la generación en el servicio Nexus (`ai.bit.lat`) y devuelve un `requestId`; el cliente hace polling al GET hasta recibir `status: 'completed'`. El prompt completo (prefix/suffix, anti-prompt-injection y JSON Schema de la respuesta) vive en el **panel de administración de Nexus** — no en este repositorio.

- **Source POST:** [src/pages/api/cs360/analyze/index.ts](../../../src/pages/api/cs360/analyze/index.ts)
- **Source GET:** [src/pages/api/cs360/analyze/[requestId].ts](../../../src/pages/api/cs360/analyze/[requestId].ts)
- **Cliente Nexus:** [src/lib/nexus.ts](../../../src/lib/nexus.ts)
- **Auth:** middleware (sesión requerida) + `page:cs360` (admin-only por default)
- **Cache:** sin cache — cada petición genera una nueva entrada en `nexus_request`; el GET sirve desde Turso si ya está `completed` (cache permanente por `requestId`)

## POST `/api/cs360/analyze`

### Request

```ts
{
  focus?: 'diagnostico' | 'renovacion' | 'adopcion' | 'relacion'; // default 'diagnostico'
  customQuestion?: string;  // Si se pasa, ignora `focus` (truncado a 500 chars)
  cliente: object;          // Payload compacto del cliente a analizar
}
```

Los cuatro valores de `focus` se mapean a una instrucción textual server-side (`FOCUS_INSTRUCTIONS`). Si viene `customQuestion` no vacío, se usa como instrucción directa envuelta en un prefijo anti-confusión.

### Response

```ts
// 202 Accepted
{ requestId: string; status: 'pending' }

// 400 Bad Request
{ error: string; code: 'BAD_REQUEST' }

// 503 Service Unavailable
{ error: string; code: 'AI_NOT_CONFIGURED' }  // falta AI_BEARER_TOKEN

// 502 Bad Gateway
{ error: string; code: 'AI_UPSTREAM_ERROR' }  // ai.bit.lat no respondió bien
```

### Side effects

1. Llama `startNexusGeneration()` en [src/lib/nexus.ts](../../../src/lib/nexus.ts): genera un ULID local, hace `POST https://ai.bit.lat/api/v1/ai-service` con `template_id = 01KTYKWS28RDRZEVQ1JPM6TWBE`, `client = 'samva'`, `tenant_id = 1` y `parameters { focus_instruction, cliente_json }`. A todo `focus_instruction` se le anexa server-side la regla de los spans de color (`SPAN_RULE`): también vive en el JSON Schema del template, pero gpt-4o-mini sólo la cumple consistentemente cuando va cerca del mensaje de usuario.
2. Inserta una fila en `nexus_request` (Turso) con el `ulid`, `template_id`, `tenant_id`, `user_id` del llamante y la `webhook_url` firmada devuelta por Nexus.

## GET `/api/cs360/analyze/[requestId]`

El `requestId` debe ser un ULID válido (26 caracteres Crockford base32, validado con `ULID_REGEX`).

### Response

```ts
// Pendiente — la generación sigue en proceso
{ requestId: string; status: 'pending' }

// Completado
{
  requestId: string;
  status: 'completed';
  data: {
    recalculated_score: number;  // 0-100, clampeado y redondeado
    markdown_report: string;
  };
  cost: unknown;    // objeto de tokens devuelto por Nexus; null si no disponible
  model: string | null;
}

// Fallido
{ requestId: string; status: 'failed'; error: string }

// 400 — requestId no es ULID válido
{ error: string; code: 'BAD_REQUEST' }

// 404 — requestId no existe en Turso
{ error: string; code: 'NOT_FOUND' }

// 502 — respuesta inesperada de Nexus
{ error: string; code: 'AI_UPSTREAM_ERROR' | 'AI_BAD_FORMAT' }
```

### Lógica de polling server-side

```
1. Busca la fila en nexus_request por ulid.
2. Si status = 'completed' → responde desde response_data (sin llamar a ai.bit.lat).
3. Si status = 'failed'    → responde { status: 'failed' }.
4. Si status = 'pending'   → llama pollNexusWebhook(webhook_url):
     a. Si responseMessage = null → aún en proceso → { status: 'pending' }.
     b. Si responseMessage llegó  → parseAnalysis() valida el JSON:
          - Requiere { recalculated_score: number, markdown_report: string }.
          - Clampea score a [0, 100].
          - Si falla la validación → marca status='failed' en Turso → 502 AI_BAD_FORMAT.
          - Si es válido → persiste response_data + cost + model, marca status='completed'.
```

## Flujo del cliente

El cliente (`ResumenTab.tsx`) sigue este flujo:

1. `POST /api/cs360/analyze` → obtiene `requestId`.
2. Llama `pollAnalysis(requestId)`: hace `GET /api/cs360/analyze/{requestId}` cada 3 s con un timeout máximo de 2 minutos.
3. Al recibir `status: 'completed'` toma `data.recalculated_score` y `data.markdown_report`, construye el `CsAiEntry` (`{ score, html, dateRange, generatedAt }`) y lo persiste en `localStorage['pn-cs360-ai-store']`.

El contrato con el cliente (`CsAiEntry`) sólo agregó `generatedAt` (ISO timestamp de la generación, mostrado junto a "Análisis sobre periodo:"); es opcional porque las entradas guardadas antes del cambio no lo traen.

## Esquema de base de datos

Tabla `nexus_request` en Turso. Migración: [src/db/migrations/2026-nexus-requests.sql](../../../src/db/migrations/2026-nexus-requests.sql).

| Columna | Tipo | Notas |
|---|---|---|
| `ulid` | `text` PK | ULID generado por `ulid()` en `src/lib/nexus.ts` antes del POST a Nexus |
| `template_id` | `text` | ID del template en el panel de Nexus |
| `tenant_id` | `integer` | Siempre `1` para CS 360 (metadata de trazabilidad) |
| `user_id` | `text` FK | Ref. a `user.id`; `ON DELETE SET NULL` — la fila de análisis sobrevive si se borra la cuenta |
| `webhook_url` | `text` | URL firmada devuelta por Nexus; se usa para polling server-side |
| `status` | `text` | `pending` \| `completed` \| `failed` |
| `cost` | `text` | JSON de tokens devuelto por Nexus (`null` si no disponible) |
| `model` | `text` | Nombre del modelo usado por Nexus (`null` mientras pendiente) |
| `response_data` | `text` | JSON `{ recalculated_score, markdown_report }` (sólo cuando `completed`) |
| `created_at` | `text` | `datetime('now')` en SQLite al insertar |
| `completed_at` | `text` | `datetime('now')` al resolver (completado o fallido) |

## Variables de entorno

| Variable | Descripción |
|---|---|
| `AI_BEARER_TOKEN` | Token server-side para autenticarse con `ai.bit.lat`. Requerido para que el POST funcione; sin él el endpoint devuelve 503 `AI_NOT_CONFIGURED` |

## Detalles no obvios

- **El prompt no vive en el repo.** El template `01KTYKWS28RDRZEVQ1JPM6TWBE` en Nexus contiene el prefix/suffix de contexto, la regla anti-prompt-injection y el JSON Schema que fuerza `{ recalculated_score, markdown_report }`. Cambios al prompt se hacen en el panel de Nexus sin desplegar.
- **`AI_BEARER_TOKEN` nunca llega al browser.** El POST del cliente va a `/api/cs360/analyze` (SSR); el token sale sólo desde el lambda hacia `ai.bit.lat`. La `webhook_url` firmada tampoco se expone al browser: se guarda en Turso y se consulta únicamente desde el GET server-side.
- **Idempotencia del polling.** Una vez `completed`, el GET sirve siempre desde `response_data` en Turso sin volver a llamar a Nexus. El browser puede recargar sin riesgo de consumir tokens adicionales.
- **ULID generado en el servidor.** El ULID del `requestId` lo produce `ulid()` de `src/lib/nexus.ts` (sin dependencias externas: 48 bits de timestamp + 80 bits de `crypto.randomBytes`) antes de llamar a Nexus; ese mismo valor se manda a Nexus como `ulid` en el body del POST.
