# Servidor MCP (`mcp-server/`)

Servidor [MCP (Model Context Protocol)](https://modelcontextprotocol.io) que expone los datos de Project Navigator a Claude Desktop, Claude Code y cualquier cliente MCP compatible. Vive en `mcp-server/` con su propio `package.json`; **no** es parte del build de Astro.

- **Versión:** 0.3.0
- **Package:** `project-navigator-mcp` (privado)
- **Entry:** [mcp-server/src/index.ts](../../mcp-server/src/index.ts)
- **Setup para usuarios:** [mcp-server/README.md](../../mcp-server/README.md)

## Arquitectura

El MCP **no** lee Google Sheets ni Turso directamente. Hace fetch HTTP a la API autenticada del Astro app usando un **bearer token MCP** generado por el usuario en `/cuenta`. Esto le da una propiedad clave: hereda automáticamente el rol y permisos del usuario dueño del token.

```
Claude Desktop ──stdio──> MCP server ──HTTPS──> Astro app ──> Turso / Sheets
                          mcp-server/           (middleware: permisos + scoping)
```

### Variables de entorno requeridas

| Variable | Descripción |
|---|---|
| `PN_API_URL` | URL base del Astro app (ej. `https://deployment.amplifyapp.com`) |
| `PN_API_TOKEN` | Token MCP del usuario (`pn_mcp_*`), generado en `/cuenta` |

No requiere `GOOGLE_CREDENTIALS`, `SHEET_ID`, `TURSO_DATABASE_URL` ni `TURSO_AUTH_TOKEN` — todas las lecturas van por la API.

## Estructura interna

```
mcp-server/src/
├── index.ts                # Entry: registra tools, stdio transport
├── data/
│   ├── types.ts            # Interfaces (espejo intencional de src/utils/dataTransforms.ts)
│   ├── parsers.ts          # splitNames y otros helpers de texto
│   ├── api.ts              # Cliente HTTP autenticado + cache 5 min en memoria
│   ├── equipoMatch.ts      # Matcher puro (espejo de src/lib/equipoMatch.ts)
│   ├── equipoResolver.ts   # Wrapper: loadEquipo + matcher
│   ├── healthScore.ts      # calcHealthScore + generateAlerts
│   └── costEngine.ts       # estimateProjectCost/PersonCost + applyFinancialModel
└── tools/
    ├── projects.ts         # list_projects, get_project
    ├── tasks.ts            # list_tasks, get_task, project_tasks, task_throughput
    ├── people.ts           # list_people, get_person
    ├── team.ts             # list_team, resolve_person
    ├── courses.ts          # list_courses
    ├── costs.ts            # get_costs, get_financial_model, estimate_project_cost,
    │                       #   estimate_person_cost, apply_financial_model
    ├── portfolio.ts        # portfolio_summary, calculate_health_score, list_alerts
    ├── glossary.ts         # list_glossary_sections, get_glossary_entry, search_glossary
    └── utils.ts            # textResult + errorResult (con manejo 401/403)
```

## Tools expuestos (22 total)

### Proyectos (2)
- `list_projects` — filtros: estatus, salud, prioridad, cliente/producto, servicio, aliado, sprint, cuatrimestre, tipo, pm, arquitecto, dev, po, sqa, personId, search.
- `get_project` — por `id` (preferido) o `folio`.

### Cronograma (4)
- `list_tasks` — tareas de la hoja `actividades`.
- `get_task` — por id de tarea.
- `project_tasks` — todas las tareas de un proyecto dado su `id`.
- `task_throughput` — throughput semanal + `estimationBias`.

### Personas (2)
- `list_people` — proyectos/tareas/curso/costEstimate agrupados por `equipo.id`.
- `get_person` — por id o nombre; incluye proyectos donde aparece (pmIds/arquitectoIds/devIds), tareas, curso y estimación de costo.

### Equipo (2)
- `list_team` — registro canónico completo (id, fullName, nickname, email, title, department, roleId, managerId, active).
- `resolve_person` — nombre/apodo → `equipo.id` (usa el matcher con alias curado).

### Cursos (1)
- `list_courses` — filtros: equipoId, jefeId, ou, rol, jefe, rango de progreso.

### Costos (5) — gateados por `data:costos`
- `get_costs`, `get_financial_model`, `estimate_project_cost`, `estimate_person_cost`, `apply_financial_model`.

### Portafolio (3)
- `portfolio_summary`, `calculate_health_score`, `list_alerts`.

### Glosario (3) — gateados por `page:glosario`
- `list_glossary_sections` — secciones con `intro`. Filtrado por permisos vía `GET /api/glossary`.
- `get_glossary_entry` — entrada completa por id (fórmula, qué es, por qué importa, archivos fuente).
- `search_glossary` — substring en id/title/summary/whatIs/howCalculated/whyMatters. Retorna metadata; `get_glossary_entry` para el detalle.

## Cliente HTTP (`data/api.ts`)

```ts
// Cache en memoria por proceso, mismo TTL que el Astro app (5 min)
async function fetchAuthenticated<T>(path: string): Promise<T>
async function loadProjects(): Promise<ProjectRecord[]>
async function loadTasks(): Promise<TareaRecord[]>
async function loadTeam(): Promise<EquipoRecord[]>
// … un loader por tipo de dato
async function loadGlossary(): Promise<{ sections: GlossarySection[], entries: GlossaryEntry[] }>
```

El cache es **por proceso**: reiniciar el MCP vacía el cache. No hay invalidación manual.

## Permisos y respuestas

El MCP hereda los permisos del usuario dueño del token:

- **401** (token inválido/expirado) — `errorResult` informa al usuario que debe regenerar el token en `/cuenta`.
- **403** (sin permiso para el recurso) — `errorResult` devuelve un mensaje claro ("tu rol no tiene permiso para ver costos, pídele a un admin"). No se marca como `isError` — es una respuesta válida del sistema de permisos.

## Sincronización de tipos

Los archivos en `mcp-server/src/data/types.ts` son **espejo intencional** de [src/utils/dataTransforms.ts](../../src/utils/dataTransforms.ts). Si cambias el shape de `ProjectRecord`, `TareaRecord`, `CursoRecord`, `EquipoRecord` u otro tipo en la app, actualiza ambos. El MCP no importa directamente los módulos de Astro.

Lo mismo aplica para `equipoMatch.ts` — el matcher puro se copia (no se importa cross-package) para que el MCP pueda resolver nombres sin necesitar Turso.

## Anti-chain

`POST /api/me/mcp-tokens` devuelve `403 MCP_CANNOT_CHAIN` si el caller se autentica con un token MCP. Un token MCP no puede emitir otros tokens — sólo sesiones de browser pueden hacerlo. Esto previene que un cliente MCP comprometido escale sus propios privilegios creando tokens adicionales.

## Migración desde v0.1 / v0.2

La v0.1 y v0.2 del MCP leían Google Sheets y Turso directamente. La v0.3 usa sólo la API autenticada. Para migrar:

1. Elimina de la config del cliente MCP: `GOOGLE_CREDENTIALS`, `SHEET_ID`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`.
2. Genera un token MCP en `/cuenta` → "Tokens MCP".
3. Agrega a la config: `PN_API_URL` y `PN_API_TOKEN`.
4. `npm install && npm run build` en `mcp-server/`.

## Comandos

```bash
cd mcp-server
npm install
npm run build           # compila a mcp-server/dist/
npm run dev             # tsx watch (sin compilar)
npm run inspect         # MCP Inspector UI (útil para probar tools manualmente)
```

Para desarrollo local con env vars:

```bash
export PN_API_URL='http://localhost:4321'
export PN_API_TOKEN='pn_mcp_xxxxxxxx'
npm run inspect
```

Ver [mcp-server/README.md](../../mcp-server/README.md) para configuración de Claude Desktop y Claude Code.
