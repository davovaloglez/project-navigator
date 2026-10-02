# Project Navigator MCP

Servidor [MCP (Model Context Protocol)](https://modelcontextprotocol.io) que expone los datos de Project Navigator (proyectos, tareas, personas, equipo, cursos, costos) como herramientas consumibles por Claude Desktop, Claude Code, o cualquier cliente MCP compatible.

## Arquitectura (v0.3+)

El MCP **NO** lee Google Sheets ni Turso directamente. Hace fetch HTTP a la API autenticada de Project Navigator usando un **bearer token MCP** del usuario dueño. Esto le da una propiedad importante:

**Hereda automáticamente el rol y permisos del usuario.** Si tu rol es `dev`, el MCP no puede pedir `/api/costos` (devuelve 403 — `get_costs` responde "tu rol no tiene permiso"). Si tienes acceso a costos pero no a admin, lo mismo. Scoping fila-a-fila (Fase 5, cuando aterrice) también aplica sin más código.

```
Claude Desktop ──stdio──> MCP server ──HTTPS── Astro app ── Turso/Sheets
                          (este repo)          (middleware:
                                               permisos + scoping)
```

## Tools expuestos (22)

### Proyectos
- `list_projects` — filtros por estatus, salud, prioridad, cliente/producto, servicio, aliado, sprint, cuatrimestre, tipo, pm, arquitecto, dev, po, sqa, personId, search.
- `get_project` — por `id` (preferido) o `folio`.

### Cronograma
- `list_tasks`, `get_task`, `project_tasks` (todas las tareas de un proyecto), `task_throughput` (semanal + estimationBias).

### Personas
- `list_people` (agrupado por equipo.id), `get_person` (por id o nombre — incluye proyectos, tareas, curso, costEstimate).

### Equipo
- `list_team` — registro canónico con `id`, `fullName`, `nickname`, **`tag`** (display "First Last"), `email`, `title`, `department`, `roleId`, **`roleName`**, `managerId`, **`managerName`**, `active`, **`hasLogin`** (cuenta vinculada), **`image`** (avatar). Filtros: active, department, roleId, roleName, managerId, hasLogin.
- `resolve_person` — nombre/apodo → equipo.id (alias curado, nickname exacto, full_name exacto, fuzzy único).

### Cursos
- `list_courses` — filtros por equipoId, jefeId, ou, rol, jefe, rango de progreso.

### Costos (gateados por `data:costos`)
- `get_costs`, `get_financial_model`, `estimate_project_cost`, `estimate_person_cost`, `apply_financial_model`.

### Portafolio
- `portfolio_summary`, `calculate_health_score`, `list_alerts`.

### Evaluaciones (HU NAV-78) — autoeval trimestral en 7 dimensiones
- `get_my_evaluations` — tus evaluaciones (filtrado server-side por `user.equipoId`). Cualquier usuario autenticado. Devuelve cada eval con las 7 dimensiones + calificación promedio derivada.
- `list_evaluations` — todas las evaluaciones cross-persona. **Gateado por `action:evaluacion:view-all`** (admin por default; 403 en otros roles). Filtros: equipoId, periodo, desdePeriodo/hastaPeriodo, minCalificacion/maxCalificacion.
- `evaluation_summary` — resumen agregado por persona para un período: quién capturó/no capturó, calificaciones, promedios por dimensión, listado de pendientes de autoevaluar. **Gateado por `action:evaluacion:view-all`**.

> Los endpoints de escritura (`POST/DELETE /api/admin/evaluaciones`) **no se exponen** vía MCP por diseño — editar la evaluación de alguien más es una acción sensible que debe pasar por la UI con confirmación visible.

### Glosario
- `list_glossary_sections` — secciones del glosario con `intro` (whatIs/whenToUse/related). Filtrado por permisos (sólo las secciones cuya página el usuario puede abrir).
- `get_glossary_entry` — entrada completa por `id` (fórmula, qué es, por qué importa, archivos fuente). Si la entrada no existe o el usuario no tiene permiso, responde con `error`.
- `search_glossary` — substring sobre id/title/summary/whatIs/howCalculated/whyMatters. Devuelve metadata; usar `get_glossary_entry` para el detalle.

## Setup

### 1. Genera tu token MCP

Inicia sesión en la app, ve a `/cuenta` → bloque **"Tokens MCP"** → "Nuevo token":
- Dale un nombre descriptivo (ej. "Claude Desktop — MacBook").
- Elige caducidad (30 / 90 / 180 / 365 días — máximo 1 año).
- **Cópialo de inmediato** — la app sólo lo muestra una vez.

El token tiene la forma `pn_mcp_<random>`. Para revocarlo, vuelve al bloque y pulsa "Revocar".

### 2. Instala el MCP

```bash
cd mcp-server
npm install
npm run build
```

### 3. Configura tu cliente MCP

Variables de entorno requeridas:

| Variable | Descripción |
|---|---|
| `PN_API_URL` | URL base de la app Astro (ej. `https://tu-deployment.amplifyapp.com` o `http://localhost:4321`) |
| `PN_API_TOKEN` | El token `pn_mcp_*` generado en `/cuenta` |

#### Claude Desktop

`~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "project-navigator": {
      "command": "node",
      "args": ["/Users/josion99/Documents/Astro/project navigator/mcp-server/dist/index.js"],
      "env": {
        "PN_API_URL": "https://tu-deployment.amplifyapp.com",
        "PN_API_TOKEN": "pn_mcp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

Reinicia Claude Desktop tras editar.

#### Claude Code (CLI)

```bash
claude mcp add project-navigator \
  --env PN_API_URL="https://tu-deployment.amplifyapp.com" \
  --env PN_API_TOKEN="pn_mcp_xxxxxxxx" \
  -- node "/Users/josion99/Documents/Astro/project navigator/mcp-server/dist/index.js"
```

#### Cursor / otros

Misma estructura: `command: "node"`, `args: ["<ruta a dist/index.js>"]`, `env: { PN_API_URL, PN_API_TOKEN }`.

## Desarrollo

```bash
npm run dev        # tsx watch
npm run inspect    # MCP Inspector UI
```

Con env vars exportadas:

```bash
export PN_API_URL='http://localhost:4321'
export PN_API_TOKEN='pn_mcp_xxxxxxxx'
npm run inspect
```

## Permisos y respuestas

El MCP es **espejo** de tus permisos en la app:

- **401 (token inválido/expirado)** — `errorResult` devuelve un mensaje pidiendo regenerar el token en `/cuenta`.
- **403 (rol sin permiso)** — `errorResult` devuelve un mensaje diciendo qué pedirle a un admin. NO se marca como `isError` (es una respuesta válida del sistema de permisos).
- **Datos filtrados por scoping** (cuando Fase 5 aterrice) — las listas que recibes ya vienen filtradas. Un PM ve sólo sus proyectos en `list_projects`, etc.

## Arquitectura interna

```
mcp-server/
├── src/
│   ├── index.ts                # Entry: registra tools, stdio transport
│   ├── data/
│   │   ├── types.ts            # Interfaces (espejo de src/utils/dataTransforms.ts
│   │   │                       #   + EvaluacionRecord, EquipoRecord ampliado,
│   │   │                       #   + Sprint/Capacidad/Hito/Repo records)
│   │   ├── parsers.ts          # splitNames (helper)
│   │   ├── api.ts              # Cliente HTTP autenticado + cache 5min
│   │   ├── equipoMatch.ts      # Matcher puro (espejo de src/lib/equipoMatch.ts)
│   │   ├── equipoResolver.ts   # Wrapper que combina loadEquipo + matcher
│   │   ├── healthScore.ts      # calcHealthScore + generateAlerts
│   │   ├── costEngine.ts       # estimateProjectCost/PersonCost (multi-persona) + applyFinancialModel
│   │   └── evaluacion.ts       # Helpers NAV-78: dimensiones, calcCalificacion, períodos
│   └── tools/
│       ├── projects.ts, tasks.ts, people.ts, courses.ts,
│       ├── costs.ts, portfolio.ts, team.ts, evaluations.ts, glossary.ts
│       └── utils.ts            # textResult + errorResult (con manejo 401/403)
├── package.json
└── tsconfig.json
```

## Notas

- **Cache 5 min** en memoria por proceso (mismo TTL que la app). Refresco = reiniciar el MCP.
- **Sin Google Sheets ni Turso en este repo** — toda la lectura va por la API. Migra a v0.3+ desde v0.2: elimina `GOOGLE_CREDENTIALS`, `SHEET_ID`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` de la config del MCP; añade `PN_API_URL` y `PN_API_TOKEN`.
- **El MCP no puede emitir más tokens MCP** — `POST /api/me/mcp-tokens` rechaza con 403 si el caller se autentica con un token MCP (defensa en profundidad anti-chain).
- **Multi-persona**: los endpoints ya devuelven `pmIds`, `arquitectoIds`, `devIds`, `poIds`, `sqaIds` resueltos.
- **id vs folio**: `id` es la identidad canónica única; `folio` puede colisionar. Preferir `id`.
- **NAV-78 — Evaluaciones privadas**: el Modo A garantiza que un usuario sólo ve su propia autoevaluación vía `get_my_evaluations` (filtrado server-side por `user.equipoId`); pares no se ven entre sí. `list_evaluations`/`evaluation_summary` requieren `action:evaluacion:view-all` y por default sólo lo tiene `admin`. Las tools de escritura no se exponen (admin debe editar vía `/comparativa` UI).
- **NAV-78.2 — Persona detail por id**: la ruta `/persona/[id]` reemplaza a `/persona/[nombre]`. Los tools del MCP siempre han trabajado con `equipo.id` así que no cambia el contrato — si imprimes URLs de perfil para que el usuario las abra, usa `/persona/<equipoId>`.
- **Sincronización de tipos**: si cambias el shape de `ProjectRecord`/`TareaRecord`/`EquipoRecord`/`EvaluacionRecord`/etc. en `src/utils/dataTransforms.ts`, `src/pages/api/equipo.ts`, `src/pages/api/me/evaluaciones.ts` o `src/data/glossary.ts` del Astro app, también actualiza `mcp-server/src/data/types.ts` y `mcp-server/src/data/evaluacion.ts`. El MCP no tiene acceso a los tipos del Astro app.
