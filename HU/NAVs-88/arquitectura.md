# NAVS-88 — Arquitectura de Control y Consumo de IA para los Navs

> **Tipo:** Spike de arquitectura · **Estado:** Propuesta para revisión del PM
> **Objetivo:** Robustecer el uso y consumo de IA en los Navs mediante una capa
> única de registro (logging), cuantificación, atribución de costo y control
> (límites configurables por usuario).

---

## 1. Contexto y alcance

Hoy existen **dos flujos distintos** que el negocio agrupa bajo "consumo de IA",
y es clave no confundirlos porque tienen naturalezas de costo opuestas:

| Flujo                     | Qué hace                                                                      | ¿Costo de IA para BIT?                                                           | ¿Se mide hoy?                             |
| ------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | ------------------------------------------ |
| **cs-Nav → Nexus** | El tablero CS 360 (`/cs360`) llama a `ai.bit.lat` para evaluar a un aliado | **Sí** — tokens facturados                                                | Parcial:`nexus_request.cost` + `model` |
| **MCP-NAV**         | Claude (Desktop/Code) lee datos del portafolio vía el servidor MCP            | **No directo** — el cómputo del modelo lo paga quien corre Claude, no BIT | No                                         |

**Decisiones del PM que fijan el alcance (NAVS-88):**

1. **Límites configurables por usuario** desde el panel de administrador.
2. **Atribución / conteo de uso** (no se requiere costo en dólares para MCP).
3. Persistir **solo metadata** de la petición (nunca el payload con datos del aliado).

Las 4 consideraciones de la HU se cubren así:

| Consideración HU                                 | Cómo se cubre                                                              |
| ------------------------------------------------- | --------------------------------------------------------------------------- |
| Contener el**origen** de la petición       | `user_id` + `product` (cs-nav/p-nav) + `channel` (web/mcp)            |
| Contener la**información** de la petición | **Solo metadata**: endpoint/tool, focus, tamaño, hash — sin payload |
| Contener la**respuesta**                    | status, tamaño,`model`; `response_data` solo para Nexus (ya existe)    |
| Contener los**costos**                      | Nexus: tokens reales. MCP: conteo/atribución de uso (proxy)                |

---

## 2. Estado actual (lo que ya está construido)

No partimos de cero. El patrón que pide la HU **ya existe parcialmente** para cs-Nav:

- **`nexus_request`** ([src/db/migrations/2026-nexus-requests.sql](../../src/db/migrations/2026-nexus-requests.sql)) — ledger por `ulid` con `user_id`, `tenant_id`, `cost`, `model`, `response_data`, timestamps. Ya registra petición→respuesta→costo de cada análisis de IA.
- **Cliente Nexus** ([src/lib/nexus.ts](../../src/lib/nexus.ts)) — patrón async (start + polling de webhook firmada).
- **Endpoints** ([analyze/index.ts](../../src/pages/api/cs360/analyze/index.ts), [analyze/[requestId].ts](../../src/pages/api/cs360/analyze/[requestId].ts)) — gateados por `page:cs360`.
- **Identidad MCP** — cada petición MCP se resuelve a un usuario real en [src/middleware.ts:199-207](../../src/middleware.ts#L199-L207) vía `resolveMcpToken` ([src/lib/mcpToken.ts:61](../../src/lib/mcpToken.ts#L61)). Hoy solo toca `lastUsedAt`; es el enganche natural para logging.
- **RBAC + overrides por usuario** — `user_permission_override` + editor en `/admin/[id]` ([overrides.ts](../../src/pages/api/admin/overrides.ts)). Es el mismo patrón que reusaremos para los **límites configurables por usuario**.

**Gaps a cerrar:** (a) no se distingue producto/canal en el ledger; (b) no se persiste metadata de la petición; (c) el canal MCP no se loguea en absoluto; (d) no hay límites/cuotas ni enforcement; (e) no hay vista de consumo.

---

## 3. Arquitectura propuesta

Una **capa de control unificada** que ambos flujos atraviesan, con un ledger de
uso común y enforcement de cuotas en el punto donde ya se resuelve identidad y
permisos.

```
                                       ┌─────────────────────────────────┐
 cs-Nav (web)  ──análisis IA──┐        │   Capa de control unificada     │
 p-Nav  (web)  ──análisis IA──┼───────▶│  1. resolver identidad (ya hay) │
                              │        │  2. checar cuota del usuario    │──▶ Nexus (ai.bit.lat)
 p-Nav  (MCP)  ──lectura datos┴───────▶│  3. registrar uso (metadata)    │
                                       │  4. (si excede) 429 + motivo    │
                                       └─────────────────────────────────┘
                                          ledger: ai_usage_log (Turso)
                                          cuotas: ai_usage_quota (Turso)
```

Dos puntos de enganche, ambos ya existentes en el código:

- **Flujo IA (Nexus):** en `POST /api/cs360/analyze` — extender el `insert` actual.
- **Flujo MCP:** en el short-circuit MCP del middleware ([middleware.ts:199](../../src/middleware.ts#L199)) — nuevo `insert` por request.

---

## 4. Modelo de datos

### 4.1 `ai_usage_log` — ledger unificado de uso (nuevo)

Registra **toda** petición de ambos canales, solo con metadata.

```sql
create table if not exists "ai_usage_log" (
  "id"          text not null primary key,        -- ulid
  "user_id"     text references "user" ("id") on delete set null,
  "product"     text not null,                     -- 'cs-nav' | 'p-nav'
  "channel"     text not null,                     -- 'web' | 'mcp'
  "operation"   text not null,                     -- 'ai-analyze' | endpoint/tool MCP
  "request_meta" text,                             -- JSON SOLO metadata: focus, bytes, hash (sin payload)
  "status"      text not null,                     -- 'ok' | 'error' | 'rate_limited'
  "response_bytes" integer,
  "cost_tokens" text,                              -- solo cuando aplica (Nexus); null en MCP
  "model"       text,                              -- solo Nexus
  "nexus_ulid"  text,                              -- FK lógica a nexus_request cuando aplica
  "created_at"  text not null default (datetime('now'))
);
create index if not exists "ai_usage_log_user_idx" on "ai_usage_log" ("user_id", "created_at");
create index if not exists "ai_usage_log_product_idx" on "ai_usage_log" ("product", "channel");
```

> **Privacidad (decisión #3):** `request_meta` nunca guarda el contenido del
> aliado. Para cs-Nav guarda `{ focus, cliente_bytes, cliente_hash }`; para MCP
> guarda `{ endpoint, query_keys }`. El payload completo sigue viajando a Nexus
> en tiempo real pero **no se persiste**.

### 4.2 `ai_usage_quota` — límites por usuario (nuevo)

Configurable desde el panel de admin (decisión #1).

```sql
create table if not exists "ai_usage_quota" (
  "user_id"        text not null primary key references "user" ("id") on delete cascade,
  "ai_daily_limit"  integer,        -- nº análisis IA/día; null = sin límite (hereda default de rol)
  "mcp_daily_limit" integer,        -- nº peticiones MCP/día; null = sin límite
  "enabled"         integer not null default 1,
  "updated_at"      text not null default (datetime('now')),
  "updated_by"      text references "user" ("id")
);
```

Default por rol (sin fila → hereda) definido en código junto a `roles.ts`, igual
que el patrón de permisos. El admin sobreescribe por usuario, replicando el
modelo de `user_permission_override`.

---

## 5. Enforcement (los "límites")

Evaluado en el mismo punto donde ya se resuelve identidad + permisos:

1. Resolver usuario (ya ocurre: sesión o `resolveMcpToken`).
2. Consultar cuota efectiva = `ai_usage_quota[user]` ∨ default del rol.
3. Contar uso del día en `ai_usage_log` para `(user, channel)`.
4. Si excede → **429** con motivo en español (y se registra como `rate_limited`).
5. Si no → continuar y registrar `ok`/`error`.

> Cache corto del conteo (TTL ~30-60s) para no pegar a Turso en cada request MCP,
> mismo criterio que el cache de permisos.

---

## 6. Panel de administración (decisión #1)

Nuevo bloque en `/admin/[id]` ([AdminUserSection.tsx](../../src/components/sections/AdminUserSection.tsx)),
junto a Permisos: **"Límites de IA"** con `ai_daily_limit` y `mcp_daily_limit`
(numérico + toggle "heredar default de rol"). Persiste vía nuevo endpoint
`PUT /api/admin/ai-quota`, gateado por una acción nueva `action:ai:manage` en
[statements.ts](../../src/lib/permissions/statements.ts).

**Vista de consumo** (opcional, recomendada): card por usuario con uso del día/mes
(IA y MCP) leyendo agregados de `ai_usage_log`, para que el admin vea antes de
limitar.

---

## 7. Puntos de integración en el código

| Cambio                     | Archivo                                                                                             | Nota                                          |
| -------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Migración tablas          | `src/db/migrations/2026-ai-usage.sql` (+ reanexar a `auth-schema.sql`)                          | Cuidado con `auth:generate` (ver CLAUDE.md) |
| Helper de registro + cuota | `src/lib/aiUsage.ts` (nuevo)                                                                      | `recordUsage()`, `checkQuota()`           |
| Log + cuota MCP            | [src/middleware.ts:199](../../src/middleware.ts#L199)                                                  | En el short-circuit MCP                       |
| Log + cuota IA             | [analyze/index.ts](../../src/pages/api/cs360/analyze/index.ts)                                         | Extender el `insert` actual                 |
| Acción de permiso         | [statements.ts](../../src/lib/permissions/statements.ts) + [roles.ts](../../src/lib/permissions/roles.ts) | `action:ai:manage` (admin-only)             |
| Endpoint admin             | `src/pages/api/admin/ai-quota.ts` (nuevo)                                                         | GET/PUT, gateado                              |
| UI admin                   | [AdminUserSection.tsx](../../src/components/sections/AdminUserSection.tsx)                             | Bloque "Límites de IA"                       |

---

## 8. Plan por fases

- **Fase 1 — Observabilidad:** tablas + `recordUsage()` en ambos puntos. Solo registra; nada se bloquea. Cierra los 4 requisitos de la HU.
- **Fase 2 — Límites:** `checkQuota()` + 429 + defaults por rol.
- **Fase 3 — Admin:** bloque "Límites de IA" en `/admin/[id]` + endpoint + permiso.
- **Fase 4 — Visibilidad (opcional):** vista de consumo por usuario.

---

## 9. Notas y límites aceptados

- **MCP sin costo en dólares (decisión #2):** el conteo de uso es la métrica; el costo de tokens de Claude vive del lado del cliente y no es facturable a BIT. Si a futuro una tool MCP dispara IA propia (Nexus), ese costo sí cae en `nexus_request` + `ai_usage_log`.
- **Sincronización del esquema:** `npm run auth:generate` reescribe `auth-schema.sql` y borra tablas custom — reanexar a mano (ya documentado en CLAUDE.md).
- **Espejo de tipos MCP:** si el log MCP toca tipos compartidos, recordar el espejo `mcp-server/src/data/types.ts`.
