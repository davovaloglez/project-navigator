# costEngine

Estimación de costos del portafolio y modelo financiero del Excel. Calcula:
- Costo mensual prorrateado por proyecto (cómo se reparte el equipo entre proyectos activos).
- Costo asociado a una persona específica.
- Pricing al cliente aplicando el modelo del Excel (experiencia → admin → margen → IVA).
- Formato monetario abreviado y completo.

**Source:** [../../../src/utils/costEngine.ts](../../../src/utils/costEngine.ts)

## Tipos públicos

```ts
interface ProjectCostEstimate {
  estimatedMonthlyCost: number;
  breakdown: { role: string; person: string; cost: number }[];
  teamSize: number;
}

interface ClientPricing {
  costoInterno: number;
  valorExperiencia: number;
  costoAdministrativo: number;
  subtotalConAdmin: number;
  margen: number;
  subtotalConMargen: number;
  iva: number;
  precioCliente: number;
  utilidad: number;
}
```

## Funciones públicas

### `estimateProjectCost(project, allProjects, costos)`

```ts
function estimateProjectCost(
  project: ProjectRecord,
  allProjects: ProjectRecord[],
  costos: CostoRecord[],
): ProjectCostEstimate
```

#### Algoritmo

1. Si no hay tabla de costos: retorna ceros.
2. `active = allProjects.filter(p => isActive(p.estatus))` — excluye `Done`, `On Hold` y `Cancelado` vía [projectStatus.ts](./projectStatus.md).
3. **Pre-build de contadores** (O(active) una sola vez): para cada proyecto activo construye `arqCounts`, `pmCounts`, `devCounts` — mapas `nombre → N proyectos activos`. Evita el O(active²) de filtrar por cada par rol-persona.
4. Para cada rol del proyecto:
   - **Arquitectos** (`findCostRecord('arquitecto')`): itera `splitNames(p.arquitecto)`. Para cada nombre, `count = arqCounts.get(nombre) || 1`. `share = costoMensual / count`.
   - **PMs** (`findCostRecord('project manager')`): itera `splitNames(p.pm)`. Mismo patrón con `pmCounts`.
   - **DEVs** (`findCostRecord('developer')`): itera `p.devs`. Mismo patrón con `devCounts`.
5. `teamSize = splitNames(arquitecto).length + splitNames(pm).length + devs.length`.
6. `estimatedMonthlyCost = Math.round(total)`.

#### Idea

El costo mensual fijo de un rol (e.g. $50K/mes para PM) se reparte entre los proyectos activos donde esa persona aparece. Un PM que lleva 5 proyectos cuesta $10K a cada uno. Un PM con 1 proyecto se carga el $50K completo a ese proyecto.

### `estimatePersonCost(personId, allProjects, costos)`

```ts
function estimatePersonCost(
  personId: string,
  allProjects: ProjectRecord[],
  costos: CostoRecord[],
): {
  monthlyCost: number;
  role: string;
  costoHora: number;
  projectsCost: { id: string; folio: string; actividad: string; cost: number }[];
}
```

Recibe el `equipo.id` estable (no el nombre), resuelto previamente por el resolver de identidad.

1. Detecta el rol principal por identidad resuelta (orden de prioridad):
   - Si hay algún proyecto con `arquitectoIds.includes(personId)` → "Arquitecto".
   - Sino con `pmIds.includes(personId)` → "PM".
   - Sino con `devIds.includes(personId)` → "Developer".
2. Busca el `CostoRecord` correspondiente. Si no hay → retorna ceros con el rol detectado.
3. Filtra proyectos activos donde la persona participa (por id). `projectsCost[i] = monthlyCost / personActive.length`. Cada item incluye `id` (campo nuevo) además de `folio` y `actividad`.

### `applyFinancialModel(costoInterno, model)`

Aplica el pipeline del Excel:

```
valorExperiencia    = costoInterno     * valorExperienciaRate
costoAdministrativo = valorExperiencia * costoAdminRate
subtotalConAdmin    = valorExperiencia + costoAdministrativo
margen              = subtotalConAdmin * margenRate
subtotalConMargen   = subtotalConAdmin + margen
iva                 = subtotalConMargen * ivaRate
precioCliente       = subtotalConMargen + iva
utilidad            = precioCliente - costoInterno
```

Los `*Rate` vienen del endpoint [`/api/costos-modelo`](../../../src/pages/api/costos-modelo.ts), que normaliza valores cuando vienen formateados como porcentaje en el Sheet.

### `formatMoney(n)` · `formatMoneyFull(n)`

| Fn | Output ejemplo | Cuándo usar |
|---|---|---|
| `formatMoney(2337.5)` | `$2.3K` | KPIs, charts, etiquetas compactas |
| `formatMoney(1_500_000)` | `$1.5M` | Mismo, valores grandes |
| `formatMoney(450)` | `$450` | Valores chicos |
| `formatMoneyFull(2337.5)` | `$2,337.50` | Tablas de detalle, tooltips |
| `formatMoneyFull(-2337.5)` | `-$2,337.50` | Detecta negativos |

`formatMoneyFull` usa `toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })`.

## Helpers internos (no exportados)

### `findCostRecord(costos, roleHint)`

Busca un `CostoRecord` por rol con alias y matching parcial:

1. Tabla de aliases: `'pm' → ['project manager']`, `'developer' → ['desarrollador']`, etc.
2. Match exacto primero (case-insensitive).
3. Por cada término del alias, busca con `includes` bidireccional.
4. Si nada matchea, retorna `null`.

## Quién lo usa

| Caller | Funciones consumidas |
|---|---|
| [`CostosSection`](../../../src/components/sections/CostosSection.tsx) | `estimateProjectCost` (cards por proyecto), `applyFinancialModel`, `formatMoney`, `formatMoneyFull` |
| [`PersonaDetailSection`](../../../src/components/sections/PersonaDetailSection.tsx) | `estimatePersonCost`, `formatMoney`, `formatMoneyFull` |
| [`ProyectoDetailSection`](../../../src/components/sections/ProyectoDetailSection.tsx) | `estimateProjectCost`, `formatMoneyFull` |
| [`PronosticoDetailSection`](../../../src/components/sections/PronosticoDetailSection.tsx) | `estimateProjectCost`, `applyFinancialModel`, `formatMoney` (panel what-if con costo extra) |
| [`DashboardSection`](../../../src/components/sections/DashboardSection.tsx) | KPI de costo del portafolio |
| [`ResumenSection`](../../../src/components/sections/ResumenSection.tsx) | KPI agregado |
| [`SlippageCostCard`](../../../src/components/ui/SlippageCostCard.tsx) | Indirecta vía `forecastEngine.computeSlippageCostImpact` |
| [`forecastEngine.computeSlippageCostImpact`](./forecastEngine.md) | Importa `estimateProjectCost` para calcular costo adicional por slippage |

## Casos de borde

- **`costos.length === 0`**: ambas funciones retornan ceros sin romper.
- **Proyecto sin arquitecto** (`'-'` o vacío): se omite ese bloque del breakdown.
- **PM con 0 proyectos activos** (porque todos están `Done`): `count || 1` evita división por cero, así que se le carga el costo completo. En la práctica `estimateProjectCost` se llama desde proyectos activos, así que el `count` siempre incluye al propio proyecto.
- **Costo mensual prorrateado de devs**: cada dev cuenta independiente. Si "Lore" aparece en 4 proyectos activos, cada uno paga `devCost / 4`. Esto puede inflar el costo total del portafolio si un proyecto tiene 5 devs (suma los shares de los 5).
- **Filtro PM en `CostosSection`**: las divisores deben seguir usando el dataset completo aunque el iterador esté filtrado por PM (ver `Filtro por PM` en [convenciones](../arquitectura/convenciones.md)). De lo contrario el share se infla artificialmente.
- **`applyFinancialModel` con `costoInterno = 0`**: todos los steps quedan en 0 y `utilidad = 0`. Útil para placeholder en UI antes de seleccionar proyecto.
- **`formatMoney(0)`**: devuelve `"$0"`. Cae en el `else` (no abreviado).

## Detalles no obvios

- **Detección del rol en `estimatePersonCost`**: es por orden de prioridad (arquitecto > PM > dev), no por mayoría. Una persona que es arquitecto en 1 proyecto y dev en 10 sale como "Arquitecto". Esto refleja la realidad de roles fijos por persona.
- **`estimatePersonCost` recibe `personId` (no `nombre`)**: el caller es responsable de resolver el nombre a id antes de llamar. `PersonaDetailSection` lo hace vía `resolveId` / `buildMembers`; `CostosSection` lo hace vía los campos `pmId`/`arquitectoId`/`devIds` que ya vienen de `/api/proyectos`.
- **`applyFinancialModel` confía en que las rates ya vienen normalizadas**. El endpoint `costos-modelo` detecta si las rates están en porcentaje (> 1) y las divide entre 100. Si llega un modelo malformado, `applyFinancialModel` no valida — produce valores absurdos.
- **El costo prorrateado asume distribución uniforme**: el modelo divide `monthlyCost` a partes iguales entre todos los proyectos activos. Para análisis más finos haría falta un campo `allocation_pct` en la tabla `equipo` o en el Sheet (ver `db_diagrama.md` `PROJECT_DEVELOPERS`).
- **El total no incluye costos no-personal** (infra, licencias, etc.). Sólo el costo del equipo asignado.
