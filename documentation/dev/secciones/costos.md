# `/costos` — CostosSection

Análisis de costos del portafolio: costo mensual por rol, costo por hora, costo estimado por proyecto (prorrateado por persona compartida) y **modelo financiero de pricing** que convierte costo interno → precio cliente.

- **Componente:** [src/components/sections/CostosSection.tsx](../../../src/components/sections/CostosSection.tsx)
- **Página:** [src/pages/costos.astro](../../../src/pages/costos.astro)
- **LOC:** ~466
- **Filtro PM:** ✅ (`usePersistedFilters` key `costos`)
- **Snapshot capture:** ❌ (los snapshots se generan desde otras secciones — este endpoint no captura)

## Datos de entrada

| Hook | Endpoint | Uso |
|---|---|---|
| `useSheetData<CostoRecord>` | `/api/costos` | Tabla de costos por rol (recursos, $/mes, $/hora, horas/recurso) |
| `useSheetData<ProjectRecord>` | `/api/proyectos` | Necesario para prorratear costo entre proyectos activos |
| `useSheetData<FinancialModel>` | `/api/costos-modelo` | Modelo de pricing (rates de experiencia, admin, margen, IVA) |
| `usePersistedFilters('costos', { pmFilter: {} })` | `/api/user-preferences` | Filtro PM |

`financialModel = modelo.data[0] ?? null` — el endpoint devuelve un array por consistencia pero el modelo es un único registro.

## KPIs

```ts
const totalMensual = costos.data.reduce((s, c) => s + c.total, 0);
const totalRecursos = costos.data.reduce((s, c) => s + c.recursos, 0);
const totalHoras = costos.data.reduce((s, c) => s + c.horas, 0);
const avgCostoHora = Math.round(
  costos.data.reduce((s, c) => s + c.costoHora * c.recursos, 0) / Math.max(1, totalRecursos)
);
```

Si hay `financialModel`, se agregan dos KPIs adicionales:

- **Precio al cliente/mes** = `applyFinancialModel(totalMensual, model).precioCliente`
- **Margen bruto** = `Math.round(model.margenRate * 100)%`

> Los KPIs **NO** se recalculan con el filtro PM. La tabla de costos es organizacional y ese filtro sólo afecta a las cards de proyectos abajo. El banner avisa: "(KPIs y tablas de roles son org-wide)".

## Estimación de costo por proyecto (regla crítica)

Aquí vive la lógica que más cuidado pide. Mirror de [estimateProjectCost](../../../src/utils/costEngine.ts) pero implementado **inline** en la sección para tener acceso directo al `pmFilter`.

```ts
const projectCosts = useMemo(() => {
  // ... role lookup ...

  const pmSelected = pmFilter.pm || [];
  return projects.data
    .filter((p) => p.estatus !== 'Done' && p.estatus !== 'On Hold')
    .filter((p) => !pmSelected.length || pmSelected.includes(p.pm))   // ← itera filtrado
    .map((p) => {
      // Arquitecto
      const arqProjects = projects.data.filter(                        // ← divisor usa dataset COMPLETO
        (x) => x.arquitecto === p.arquitecto && x.estatus !== 'Done'
      ).length;
      const share = arqCost.costoMensual / Math.max(1, arqProjects);
      // ...
    });
}, [costos.data, projects.data, pmFilter]);
```

### Regla de integridad de divisores

**El iterador puede estar filtrado por PM, pero los divisores que calculan shares de costo DEBEN usar `projects.data` completo, NO el filtrado.**

Si un arquitecto trabaja en 4 proyectos (2 del PM seleccionado, 2 de otros PMs), su `costoMensual` se divide entre 4. Si filtráramos por PM antes de contar (i.e. dividir entre 2), inflaríamos artificialmente el share que se imputa al PM seleccionado al doble de lo que realmente le toca pagar.

Ver también: [CLAUDE.md → Convenciones → Filtro por PM → Costos prorrateados](../../../CLAUDE.md).

### Función `estimateProjectCost` reutilizable

Para casos fuera de esta sección (e.g. `ProyectoDetailSection`), usar [src/utils/costEngine.ts](../../../src/utils/costEngine.ts):

```ts
export function estimateProjectCost(
  project: ProjectRecord,
  allProjects: ProjectRecord[],   // ← SIEMPRE el dataset completo
  costos: CostoRecord[],
): ProjectCostEstimate
```

Misma lógica: arquitecto + PM + devs, cada uno con costo prorrateado por la cantidad de proyectos activos en los que participa.

## Modelo financiero — pricing al cliente

```ts
export function applyFinancialModel(costoInterno: number, model: FinancialModel): ClientPricing {
  const valorExperiencia    = costoInterno      * model.valorExperienciaRate;
  const costoAdministrativo = valorExperiencia  * model.costoAdminRate;
  const subtotalConAdmin    = valorExperiencia  + costoAdministrativo;
  const margen              = subtotalConAdmin  * model.margenRate;
  const subtotalConMargen   = subtotalConAdmin  + margen;
  const iva                 = subtotalConMargen * model.ivaRate;
  const precioCliente       = subtotalConMargen + iva;
  return { ..., utilidad: precioCliente - costoInterno };
}
```

### Los 4 pasos

| Paso | Base | Rate | Resultado |
|---|---|---|---|
| 1. Valor experiencia | Costo interno | `valorExperienciaRate` | Aplica el multiplicador de "valor de experiencia" sobre el costo crudo |
| 2. Costo administrativo | Valor experiencia | `costoAdminRate` | Suma overhead administrativo |
| 3. Margen | Subtotal con admin | `margenRate` | Aplica margen de utilidad |
| 4. IVA | Subtotal con margen | `ivaRate` | Aplica impuesto |

`precioCliente` = costo interno × experiencia × (1 + admin) × (1 + margen) × (1 + iva).

Cada rate viene del Sheet `Costos!A13:G21` y el endpoint `/api/costos-modelo` normaliza valores que vengan formateados como porcentaje (e.g. `30` → `0.30`).

## Render del modelo financiero

```tsx
{financialModel && (() => {
  const pricing = applyFinancialModel(kpis.totalMensual, financialModel);
  const waterfallData = [
    { name: 'Valor experiencia', value: pricing.valorExperiencia, pct: `${Math.round(rate*100)}% del costo` },
    { name: '+ Admin',            value: pricing.costoAdministrativo, pct: `${...}%` },
    { name: '+ Margen',           value: pricing.margen, pct: `${...}%` },
    { name: '+ IVA',              value: pricing.iva, pct: `${...}%` },
    { name: 'Precio cliente',     value: pricing.precioCliente, pct: 'TOTAL' },
  ];
  // ... waterfall bar chart + tabla con steps del modelo
})()}
```

La tabla a la derecha del waterfall renderiza `financialModel.steps[]` con sus labels originales del Excel.

## Cost by hito

```ts
const costByHito = useMemo(() => {
  const hitoMap = new Map<string, number>();
  for (const pc of projectCosts) {
    const p = projects.data.find((x) => x.folio === pc.folio);
    const hito = p?.hito || 'Sin hito';
    hitoMap.set(hito, (hitoMap.get(hito) || 0) + pc.estimatedMonthlyCost);
  }
  return [...hitoMap.entries()].map(([name, value]) => ({ name, value }))
    .sort((a, b) => a.name.localeCompare(b.name));
}, [projectCosts, projects.data]);
```

Suma del `estimatedMonthlyCost` agrupado por hito. Se ordena alfabéticamente (no por valor) porque los hitos son periodos (Q1 2026 antes que Q2 2026).

## Project cards (abajo)

`projectCosts.slice(0, 12)` — top 12 por costo. Cada card:

- Folio + actividad (link a `/proyecto/[id]`).
- Costo interno mensual estimado.
- Tamaño de equipo + estatus.
- Si hay `financialModel`: precio cliente / mes + utilidad (delta verde si ≥0, rojo si negativo).
- Breakdown línea por línea: cuánto cuesta cada miembro del equipo.

## Reglas especiales

1. **Divisores siempre sobre dataset completo** (regla crítica documentada arriba).
2. **KPIs no se recalculan con PM filter** — la tabla de costos es organizacional, no depende del PM seleccionado.
3. **`Done` y `On Hold` excluidos del prorrateo** — sólo proyectos activos cuentan para repartir el costo de cada persona, porque sólo en esos la persona realmente está dedicada.
4. **El modelo financiero es un solo registro** — `modelo.data[0] ?? null`. Si el Sheet no tiene los rates, la sección esconde los dos KPIs extra y el bloque waterfall.
5. **`formatMoney` (abreviado) vs `formatMoneyFull` (completo)** — KPIs y gráficas usan `formatMoney` (`$2.3K`); la tabla del modelo financiero usa `formatMoneyFull` (`$2,337.50`) porque ahí importa la precisión decimal.

## Convenciones aplicables

- [Filtro PM](../arquitectura/convenciones.md#9-filtro-por-pm-global) — especialmente la subregla "Costos prorrateados".
- [Persistencia](../arquitectura/convenciones.md#10-persistencia-de-filtros-cross-session) — sólo `pmFilter`.
- [Slugs](../arquitectura/convenciones.md#12-slugs-de-folios) — `folioToSlug` para los enlaces de proyecto.
- [Tooltips](../arquitectura/convenciones.md#13-tooltips-y-glosario) — tooltip por cada KPI, gráfica y tabla con título.
